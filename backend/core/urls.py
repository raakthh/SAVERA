from django.urls import path

from .views import (
    EmailAuthTokenView,
    ServiceRequestListView,
    ServiceRequestDetailView,
    ServiceRequestPhotosView,
    MeView,
)

urlpatterns = [
    path(
        "auth/token/",
        EmailAuthTokenView.as_view(),
        name="api-token-auth",
    ),
    path(
        "service-requests/",
        ServiceRequestListView.as_view(),
        name="service-request-list",
    ),
    path(
        "service-requests/<str:service_request_id>/",
        ServiceRequestDetailView.as_view(),
        name="service-request-detail",
    ),
    path(
        "service-requests/<str:service_request_id>/photos/",
        ServiceRequestPhotosView.as_view(),
        name="service-request-photos",
    ),
    path("me/", 
         MeView.as_view(), 
         name="me"),
]