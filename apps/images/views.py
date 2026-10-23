"""Views for the images app."""

import logging

from django.http import Http404
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response

from .models import Image
from .serializers import (
    ImageCreateSerializer,
    ImageResponseSerializer,
    ImageSerializer,
)
from .services import (
    generate_image_variants,
    upload_image_from_request,
)

logger = logging.getLogger(__name__)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def upload_image(request: Request) -> Response:
    """Upload an image to Google Cloud Storage.

    Args:
        request: Django request with uploaded file

    Returns:
        Image data with URLs
    """
    serializer = ImageCreateSerializer(data=request.data)

    if not serializer.is_valid():
        return Response(
            {"errors": serializer.errors},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        # Upload image
        image = upload_image_from_request(request, request.user)

        # Generate variants asynchronously
        from .tasks import generate_image_variants_task

        generate_image_variants_task.delay(str(image.id))

        # Return response
        response_serializer = ImageResponseSerializer(image)
        return Response(
            response_serializer.data,
            status=status.HTTP_201_CREATED,
        )

    except Exception as e:
        logger.error(f"Image upload failed: {str(e)}")
        return Response(
            {"error": f"Upload failed: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def list_user_images(request: Request) -> Response:
    """List all images uploaded by the current user.

    Args:
        request: Django request

    Returns:
        List of user's images
    """
    images = Image.objects.filter(
        uploaded_by=request.user,
        is_deleted=False,
    ).order_by("-created_at")

    serializer = ImageSerializer(images, many=True)
    return Response(serializer.data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_image_detail(request: Request, image_id: str) -> Response:
    """Get details of a specific image.

    Args:
        request: Django request
        image_id: UUID of the image

    Returns:
        Image details
    """
    try:
        image = Image.objects.get(
            id=image_id,
            uploaded_by=request.user,
            is_deleted=False,
        )
    except Image.DoesNotExist:
        raise Http404("Image not found")

    serializer = ImageSerializer(image)
    return Response(serializer.data)


@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def delete_image(request: Request, image_id: str) -> Response:
    """Soft delete an image (mark as deleted).

    Args:
        request: Django request
        image_id: UUID of the image

    Returns:
        Empty response with 204 status
    """
    try:
        image = Image.objects.get(
            id=image_id,
            uploaded_by=request.user,
        )
    except Image.DoesNotExist:
        raise Http404("Image not found")

    # Check if image is referenced
    if image.is_referenced():
        return Response(
            {"error": "Cannot delete image that is referenced by a post or message."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    image.soft_delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(["GET"])
@permission_classes([])
def get_image_thumbnail(
    request: Request,
    image_id: str,
    size: str = "small",
) -> Response:
    """Get thumbnail URL for an image.

    Args:
        request: Django request
        image_id: UUID of the image
        size: Thumbnail size (small, medium, large)

    Returns:
        Thumbnail URL
    """
    try:
        image = Image.objects.get(
            id=image_id,
            is_deleted=False,
        )
    except Image.DoesNotExist:
        raise Http404("Image not found")

    thumbnail_url = image.get_thumbnail_url(size)

    return Response(
        {
            "image_id": str(image.id),
            "thumbnail_url": thumbnail_url,
            "size": size,
        }
    )
