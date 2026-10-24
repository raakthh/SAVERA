from pathlib import Path
from uuid import uuid4

from PIL import Image
from supabase import create_client

from django.conf import settings
from django.core.exceptions import PermissionDenied
from django.shortcuts import get_object_or_404

import re

from django.db import connection, transaction
from django.utils import timezone

from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.views import APIView

from .models import ServiceRequest, CustomerAccount, ServiceRequestPhoto
from .serializers import ServiceRequestSerializer
from .serializers import CustomerProfileSerializer
from rest_framework.authtoken.models import Token
from rest_framework.permissions import AllowAny
from rest_framework.views import APIView

from .serializers import (
    ServiceRequestSerializer,
    EmailAuthTokenSerializer,
)

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def health_check(request):
    return Response(
        {
            "success": True,
            "service": "SAVERA API",
            "status": "healthy",
        },
        status=status.HTTP_200_OK,
    )


class EmailAuthTokenView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        serializer = EmailAuthTokenSerializer(
            data=request.data,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)

        user = serializer.validated_data["user"]
        token, _ = Token.objects.get_or_create(user=user)

        return Response({
            "token": token.key,
            "user": {
                "username": user.get_username(),
                "email": user.email,
                "is_staff": user.is_staff,
                "is_superuser": user.is_superuser,
            },
        }, status=status.HTTP_200_OK)


class ServiceRequestListView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = ServiceRequestSerializer

    def get_queryset(self):
        queryset = ServiceRequest.objects.select_related(
            "customer",
            "vehicle",
        )

        user = self.request.user

        # Staf dan admin dapat mengakses seluruh permintaan servis.
        if user.is_staff or user.is_superuser:
            pass
        else:
            # Pelanggan hanya dapat melihat data miliknya.
            try:
                account = CustomerAccount.objects.get(user=user)
            except CustomerAccount.DoesNotExist:
                return queryset.none()

            queryset = queryset.filter(customer=account.customer)

        # Filter tambahan tidak dapat memperluas hak akses.
        request_status = self.request.query_params.get("status")
        if request_status:
            queryset = queryset.filter(
                request_status__iexact=request_status
            )

        customer_id = self.request.query_params.get("customer_id")
        if customer_id:
            queryset = queryset.filter(customer_id=customer_id)

        return queryset.order_by(
            "-request_date",
            "service_request_id",
        )

    @transaction.atomic
    def perform_create(self, serializer):
        user = self.request.user

        # Pelanggan wajib menggunakan identitas pelanggan yang terhubung
        # ke akun login miliknya.
        if not (user.is_staff or user.is_superuser):
            try:
                account = CustomerAccount.objects.get(user=user)
            except CustomerAccount.DoesNotExist:
                raise ValidationError({
                    "detail": (
                        "Akun belum terhubung dengan data pelanggan. "
                        "Hubungi admin bengkel."
                    )
                })

            submitted_customer = serializer.validated_data.get("customer")

            if (
                submitted_customer is None
                or submitted_customer.customer_id != account.customer_id
            ):
                raise ValidationError({
                    "customer_id": (
                        "Permintaan servis hanya dapat dibuat "
                        "untuk akun pelanggan sendiri."
                    )
                })

        # Buat ID dengan format SR-TAHUN-NOMOR.
        # Advisory lock mencegah dua transaksi menghitung nomor
        # berikutnya secara bersamaan untuk tahun yang sama.
        year = timezone.localdate().year

        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT pg_advisory_xact_lock(%s, %s)",
                [year, 1],
            )

        existing_ids = ServiceRequest.objects.filter(
            service_request_id__startswith=f"SR-{year}-"
        ).values_list("service_request_id", flat=True)

        max_number = 0

        for existing_id in existing_ids:
            match = re.fullmatch(
                rf"SR-{year}-(\d+)",
                existing_id or "",
            )
            if match:
                max_number = max(max_number, int(match.group(1)))

        new_id = f"SR-{year}-{max_number + 1:04d}"

        request_date = serializer.validated_data.get("request_date")

        vehicle = serializer.validated_data["vehicle"]


        serializer.save(
            service_request_id=new_id,
            request_date=request_date or timezone.localdate(),
            request_status="Submitted",
            workshop_notes=None,
            initial_estimated_cost=None,
            brand=vehicle.brand,
            model=vehicle.model,
            year=vehicle.year,
            plate_number=vehicle.plate_number,
        )


class ServiceRequestDetailView(generics.RetrieveUpdateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = ServiceRequestSerializer
    lookup_field = "service_request_id"

    def get_queryset(self):
        queryset = ServiceRequest.objects.select_related(
            "customer",
            "vehicle",
        )

        user = self.request.user

        if user.is_staff or user.is_superuser:
            return queryset

        try:
            account = CustomerAccount.objects.get(user=user)
        except CustomerAccount.DoesNotExist:
            return queryset.none()

        return queryset.filter(customer=account.customer)


class ServiceRequestPhotosView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    MAX_PHOTOS = 6
    MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB

    ALLOWED_EXTENSIONS = {
        ".jpg": "JPEG",
        ".jpeg": "JPEG",
        ".png": "PNG",
        ".webp": "WEBP",
    }

    CONTENT_TYPES = {
        "JPEG": "image/jpeg",
        "PNG": "image/png",
        "WEBP": "image/webp",
    }

    def get_service_request(self, request, service_request_id):
        queryset = ServiceRequest.objects.all()

        if not (request.user.is_staff or request.user.is_superuser):
            try:
                account = request.user.customer_account
            except CustomerAccount.DoesNotExist:
                raise PermissionDenied(
                    "Akun belum terhubung dengan data pelanggan."
                )

            queryset = queryset.filter(
                customer_id=account.customer_id
            )

        return get_object_or_404(
            queryset,
            service_request_id=service_request_id,
        )

    def get(self, request, service_request_id):
        service_request = self.get_service_request(
            request, service_request_id
        )

        photos = service_request.photos.all()
        storage = create_client(
            settings.SUPABASE_URL,
            settings.SUPABASE_SECRET_KEY,
        ).storage.from_(settings.SUPABASE_STORAGE_BUCKET)

        results = []

        for photo in photos:
            try:
                signed_result = storage.create_signed_url(
                    photo.storage_path,
                    3600,
                )
                signed_url = (
                    signed_result.get("signedURL")
                    or signed_result.get("signedUrl")
                )
            except Exception:
                return Response(
                    {"detail": "Gagal membuat URL foto sementara."},
                    status=status.HTTP_502_BAD_GATEWAY,
                )

            results.append({
                "photo_id": photo.photo_id,
                "service_request_id": service_request.service_request_id,
                "original_filename": photo.original_filename,
                "content_type": photo.content_type,
                "file_size": photo.file_size,
                "uploaded_at": photo.uploaded_at,
                "url": signed_url,
            })

        return Response({"photos": results})

    def post(self, request, service_request_id):
        service_request = self.get_service_request(
            request, service_request_id
        )

        is_staff = request.user.is_staff or request.user.is_superuser

        if not is_staff and service_request.request_status != "Submitted":
            return Response(
                {
                    "detail": (
                        "Foto hanya dapat ditambahkan ketika "
                        "permintaan servis berstatus Submitted."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        uploaded_file = request.FILES.get("photo")

        if uploaded_file is None:
            return Response(
                {"photo": "File foto wajib disertakan."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if uploaded_file.size == 0:
            return Response(
                {"photo": "File foto kosong."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if uploaded_file.size > self.MAX_FILE_SIZE:
            return Response(
                {"photo": "Ukuran foto maksimal 5 MB."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        extension = Path(uploaded_file.name).suffix.lower()
        expected_format = self.ALLOWED_EXTENSIONS.get(extension)

        if expected_format is None:
            return Response(
                {"photo": "Format foto harus JPG, JPEG, PNG, atau WebP."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            uploaded_file.seek(0)
            image = Image.open(uploaded_file)
            actual_format = image.format
            image.verify()
            uploaded_file.seek(0)
        except Exception:
            return Response(
                {"photo": "File bukan gambar yang valid."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if actual_format != expected_format:
            return Response(
                {"photo": "Ekstensi file tidak sesuai dengan isi gambar."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if service_request.photos.count() >= self.MAX_PHOTOS:
            return Response(
                {"photo": "Maksimal 6 foto per permintaan servis."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        content_type = self.CONTENT_TYPES[actual_format]
        storage_path = (
            f"service-requests/{service_request.service_request_id}/"
            f"{uuid4().hex}{extension}"
        )

        try:
            storage = create_client(
                settings.SUPABASE_URL,
                settings.SUPABASE_SECRET_KEY,
            ).storage.from_(settings.SUPABASE_STORAGE_BUCKET)

            storage.upload(
                storage_path,
                uploaded_file.read(),
                file_options={
                    "content-type": content_type,
                    "upsert": "false",
                },
            )
        except Exception:
            return Response(
                {"detail": "Gagal mengunggah foto ke Storage."},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        try:
            photo = ServiceRequestPhoto.objects.create(
                service_request=service_request,
                storage_path=storage_path,
                original_filename=Path(uploaded_file.name).name[:255],
                content_type=content_type,
                file_size=uploaded_file.size,
                uploaded_by=request.user,
            )

            service_request.photo_count = service_request.photos.count()
            service_request.save(update_fields=["photo_count"])

        except Exception:
            # Hapus file Storage jika penyimpanan metadata gagal.
            try:
                storage.remove([storage_path])
            except Exception:
                pass

            return Response(
                {"detail": "Gagal menyimpan metadata foto."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        return Response(
            {
                "message": "Foto berhasil diunggah.",
                "photo": {
                    "photo_id": photo.photo_id,
                    "service_request_id": service_request.service_request_id,
                    "original_filename": photo.original_filename,
                    "content_type": photo.content_type,
                    "file_size": photo.file_size,
                    "uploaded_at": photo.uploaded_at,
                },
            },
            status=status.HTTP_201_CREATED,
        )


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            account = CustomerAccount.objects.select_related(
                "customer"
            ).get(user=request.user)

        except CustomerAccount.DoesNotExist:
            return Response(
                {
                    "detail": (
                        "Akun ini belum terhubung "
                        "dengan data customer."
                    )
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        customer = account.customer

        return Response(
            {
                "user": {
                    "username": request.user.get_username(),
                    "email": request.user.email,
                    "is_staff": request.user.is_staff,
                    "is_superuser": request.user.is_superuser,
                },
                "customer": CustomerProfileSerializer(
                    customer
                ).data,
            },
            status=status.HTTP_200_OK,
        )