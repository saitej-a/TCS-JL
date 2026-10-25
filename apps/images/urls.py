"""URL configuration for the images app."""

from django.urls import path

from .views import (
    delete_image,
    get_image_detail,
    get_image_thumbnail,
    list_user_images,
    upload_image,
)

app_name = "images"

urlpatterns = [
    # Image upload
    path("upload/", upload_image, name="upload-image"),

    # List user's images
    path("", list_user_images, name="list-images"),

    # Get image details
    path("<uuid:image_id>/", get_image_detail, name="get-image-detail"),

    # Delete image
    path("<uuid:image_id>/", delete_image, name="delete-image"),

    # Get thumbnail
    path("<uuid:image_id>/thumbnail/<str:size>/", get_image_thumbnail, name="get-thumbnail"),
]
