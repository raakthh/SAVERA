
from rest_framework import serializers

from .models import (
    ServiceRequest,
    Customer,
    Vehicle,
    CustomerAccount,
)



from django.contrib.auth import authenticate, get_user_model
from rest_framework import serializers
from rest_framework.authtoken.models import Token


User = get_user_model()


class EmailAuthTokenSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(
        write_only=True,
        trim_whitespace=False,
    )

    def validate(self, attrs):
        email = attrs.get("email", "").strip()
        password = attrs.get("password")

        user_by_email = User.objects.filter(
            email__iexact=email,
            is_active=True,
        ).first()

        if user_by_email is None:
            raise serializers.ValidationError(
                "Email atau password salah."
            )

        user = authenticate(
            request=self.context.get("request"),
            username=user_by_email.get_username(),
            password=password,
        )

        if user is None:
            raise serializers.ValidationError(
                "Email atau password salah."
            )

        attrs["user"] = user
        return attrs


class ServiceRequestSerializer(serializers.ModelSerializer):
    customer_id = serializers.PrimaryKeyRelatedField(
        source="customer",
        queryset=Customer.objects.all(),
    )

    vehicle_id = serializers.PrimaryKeyRelatedField(
        source="vehicle",
        queryset=Vehicle.objects.select_related("customer").all(),
    )

    class Meta:
        model = ServiceRequest
        fields = [
            "service_request_id",
            "request_date",
            "customer_id",
            "vehicle_id",
            "brand",
            "model",
            "year",
            "plate_number",
            "customer_complaint",
            "service_type",
            "photo_count",
            "initial_damage_area",
            "initial_damage_type",
            "initial_severity",
            "initial_estimated_cost",
            "request_status",
            "workshop_notes",
        ]

        read_only_fields = [
            "service_request_id",
            "request_date",
            "brand",
            "model",
            "year",
            "plate_number",
            "photo_count",
            "request_status",
            "workshop_notes",
            "initial_estimated_cost",
        ]


    def validate(self, attrs):
        request = self.context.get("request")
        user = request.user if request else None

        is_staff = bool(
            user
            and user.is_authenticated
            and (user.is_staff or user.is_superuser)
        )

        # Field yang boleh dikirim pelanggan.
        customer_allowed_fields = {
            "customer_id",
            "vehicle_id",
            "customer_complaint",
            "service_type",
            "initial_damage_area",
            "initial_damage_type",
            "initial_severity",
        }
        if user and user.is_authenticated and not is_staff:
            submitted_fields = set(request.data.keys())
            forbidden_fields = submitted_fields - customer_allowed_fields

            if forbidden_fields:
                raise serializers.ValidationError({
                    field: "Field ini tidak boleh diubah oleh pelanggan."
                    for field in sorted(forbidden_fields)
                })

            if self.instance:
                if self.instance.request_status != "Submitted":
                    raise serializers.ValidationError({
                        "detail": (
                            "Permintaan servis hanya dapat diedit "
                            "ketika berstatus Submitted."
                        )
                    })

            # Akun pelanggan wajib terhubung ke data pelanggan.
            try:
                account = CustomerAccount.objects.get(user=user)
            except CustomerAccount.DoesNotExist:
                raise serializers.ValidationError({
                    "detail": "Akun belum terhubung dengan data pelanggan."
                })

            if self.instance and (
                self.instance.customer_id != account.customer_id
            ):
                raise serializers.ValidationError({
                    "detail": "Kamu tidak berhak mengubah permintaan ini."
                })

            customer = attrs.get(
                "customer",
                self.instance.customer if self.instance else None,
            )
            vehicle = attrs.get(
                "vehicle",
                self.instance.vehicle if self.instance else None,
            )

            if customer and customer.customer_id != account.customer_id:
                raise serializers.ValidationError({
                    "customer_id": "Pelanggan tidak sesuai dengan akun login."
                })

            if vehicle and vehicle.customer_id != account.customer_id:
                raise serializers.ValidationError({
                    "vehicle_id": "Kendaraan bukan milik akun pelanggan ini."
                })

        # Validasi hubungan kendaraan dengan pelanggan.
        if self.instance:
            customer = attrs.get("customer", self.instance.customer)
            vehicle = attrs.get("vehicle", self.instance.vehicle)
        else:
            customer = attrs.get("customer")
            vehicle = attrs.get("vehicle")

        if customer and vehicle:
            if vehicle.customer_id != customer.customer_id:
                raise serializers.ValidationError({
                    "vehicle_id": (
                        "Kendaraan ini tidak terdaftar atas nama "
                        "pelanggan yang dipilih."
                    )
                })

        return attrs


class VehicleProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vehicle
        fields = [
            "vehicle_id",
            "plate_number",
            "brand",
            "model",
            "year",
            "vehicle_type",
            "transmission",
            "fuel_type",
        ]


class CustomerProfileSerializer(serializers.ModelSerializer):
    vehicles = VehicleProfileSerializer(many=True, read_only=True)

    class Meta:
        model = Customer
        fields = [
            "customer_id",
            "customer_name",
            "phone",
            "email",
            "address",
            "city",
            "customer_type",
            "registration_date",
            "status",
            "vehicles",
        ]