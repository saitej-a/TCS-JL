"""Services for image management in Google Cloud Storage."""

import base64
import hashlib
import json
import os
import uuid
from typing import Optional, Tuple
from urllib.parse import quote

from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.core.validators import FileExtensionValidator
from django.http import HttpRequest
from django.utils import timezone

from .models import Image


def get_gcs_client():
    """Get a Google Cloud Storage client."""
    try:
        import google.cloud.storage as storage

        # Try to get credentials from environment
        credentials_base64 = os.environ.get("GCS_CREDENTIALS_BASE64")
        if credentials_base64:
            credentials_json = base64.b64decode(credentials_base64).decode("utf-8")
            credentials = json.loads(credentials_json)
            client = storage.Client.from_service_account_info(credentials)
        else:
            client = storage.Client()
        return client
    except Exception:
        return None


def get_bucket(client, is_prod: bool = False):
    """Get the GCS bucket for images."""
    from config.settings import gcs

    if not client:
        return None

    bucket_name = gcs.GCS_BUCKET_NAME_PROD if is_prod else gcs.GCS_BUCKET_NAME
    return client.bucket(bucket_name)


def generate_file_path(
    filename: str,
    file_type: str = "original",
    subdirectory: str = "uploads",
) -> str:
    """Generate a unique file path in GCS.

    Args:
        filename: Original filename
        file_type: Type of file (original, thumbnail_s, webp)
        subdirectory: Subdirectory within bucket (uploads, thumbnails)

    Returns:
        GCS path string (e.g., "uploads/abc123/original.jpg")
    """
    ext = filename.split(".")[-1].lower()
    unique_id = uuid.uuid4().hex[:12]

    if file_type == "original":
        path = f"{subdirectory}/{unique_id}/original.{ext}"
    elif file_type.startswith("thumbnail"):
        size = file_type.split("_")[-1] if "_" in file_type else "s"
        path = f"{subdirectory}/{unique_id}/thumbnail_{size}.{ext}"
    elif file_type == "webp":
        path = f"{subdirectory}/{unique_id}/webp/original.webp"
    else:
        path = f"{subdirectory}/{unique_id}/{file_type}.{ext}"

    return path


def upload_image_to_gcs(
    file_content: bytes,
    filename: str,
    content_type: str,
) -> Tuple[str, int]:
    """Upload an image file to Google Cloud Storage.

    Args:
        file_content: Raw bytes of the image
        filename: Original filename
        content_type: MIME type

    Returns:
        Tuple of (gcs_path, file_size)

    Raises:
        Exception: If upload fails
    """
    client = get_gcs_client()
    if not client:
        raise Exception("GCS client not configured")

    bucket = get_bucket(client)
    if not bucket:
        raise Exception("GCS bucket not configured")

    file_size = len(file_content)

    # Generate path
    gcs_path = generate_file_path(filename, "original")

    # Upload to GCS
    blob = bucket.blob(gcs_path)
    blob.upload_from_string(
        file_content,
        content_type=content_type,
        timeout=60,
    )

    # Make it publicly accessible if configured
    if hasattr(bucket, "acl") and os.environ.get("GCS_PUBLIC_BUCKET", "true").lower() == "true":
        blob.make_public()

    return gcs_path, file_size


def upload_image_from_request(
    request: HttpRequest,
    user,
) -> Image:
    """Process an image upload from a Django request.

    Args:
        request: Django HTTP request with file upload
        user: User uploading the image

    Returns:
        Created Image model instance

    Raises:
        ValueError: If validation fails
    """
    from .validators import validate_image_file

    # Get the uploaded file
    uploaded_file = request.FILES.get("file")
    if not uploaded_file:
        raise ValueError("No file provided in request")

    # Validate the file
    validate_image_file(uploaded_file)

    # Read file content
    file_content = uploaded_file.read()
    file_size = len(file_content)

    # Generate GCS path
    gcs_path, _ = upload_image_to_gcs(
        file_content,
        uploaded_file.name,
        uploaded_file.content_type,
    )

    # Optionally get dimensions using Pillow
    width, height = None, None
    try:
        from PIL import Image as PILImage
        from io import BytesIO

        pil_image = PILImage.open(BytesIO(file_content))
        width, height = pil_image.size
    except Exception:
        pass

    # Create database record
    image = Image.objects.create(
        uploaded_by=user,
        file_path=gcs_path,
        original_filename=uploaded_file.name,
        file_size=file_size,
        content_type=uploaded_file.content_type,
        width=width,
        height=height,
        moderation_status="PENDING" if not hasattr(request, "skip_moderation") else "APPROVED",
    )

    return image


def generate_image_variants(image: Image) -> dict:
    """Generate thumbnails and WebP variants for an image.

    Args:
        image: Image model instance

    Returns:
        Dictionary with URLs for all variants
    """
    from config.settings import gcs

    if not gcs.USE_GCS:
        raise Exception("GCS not configured for variant generation")

    client = get_gcs_client()
    if not client:
        raise Exception("GCS client not configured")

    bucket = get_bucket(client)
    blob = bucket.blob(image.file_path)

    # Download original
    original_content = blob.download_as_bytes()
    file_path = image.file_path

    # Generate variants
    variants = {}

    try:
        from PIL import Image as PILImage
        from io import BytesIO

        pil_image = PILImage.open(BytesIO(original_content))

        # Strip EXIF data for privacy
        if hasattr(pil_image, "_getexif") and pil_image._getexif():
            from PIL.Imageops import exif_transpose
            pil_image = exif_transpose(pil_image)

        # Generate thumbnails
        for size_name, max_dimension in gcs.THUMBNAIL_SIZES.items():
            thumb_path = file_path.replace(
                "/original.", f"/thumbnail_{size_name}."
            )

            # Create thumbnail
            thumb_image = pil_image.copy()
            thumb_image.thumbnail((max_dimension, max_dimension), PILImage.LANCZOS)

            # Convert to bytes
            thumb_bytes = BytesIO()
            thumb_image.save(
                thumb_bytes,
                format="JPEG",
                quality=gcs.JPEG_QUALITY,
            )
            thumb_bytes.seek(0)

            # Upload thumbnail
            thumb_blob = bucket.blob(thumb_path)
            thumb_blob.upload_from_string(
                thumb_bytes.getvalue(),
                content_type="image/jpeg",
            )
            thumb_blob.make_public()

            # Generate URL
            variants[size_name] = (
                f"{gcs.GCS_BASE_URL}{thumb_path.lstrip('/')}"
            )

        # Generate WebP version
        webp_bytes = BytesIO()
        pil_image.save(webp_bytes, format="WEBP", quality=gcs.WEBP_QUALITY)
        webp_bytes.seek(0)

        webp_path = file_path.replace("/original.", "/webp/original.webp")
        webp_blob = bucket.blob(webp_path)
        webp_blob.upload_from_string(
            webp_bytes.getvalue(),
            content_type="image/webp",
        )
        webp_blob.make_public()

        variants["webp"] = f"{gcs.GCS_BASE_URL}{webp_path.lstrip('/')}"

    except Exception as e:
        # Log error but return what we have
        variants["error"] = str(e)

    return variants


def get_signed_url(image: Image, expiry_seconds: int = 3600) -> str:
    """Get a signed URL for a private image.

    Args:
        image: Image model instance
        expiry_seconds: How long the URL should be valid

    Returns:
        Signed URL string
    """
    from config.settings import gcs

    if not gcs.USE_GCS:
        return image.get_url()

    client = get_gcs_client()
    if not client:
        return image.get_url()

    bucket = get_bucket(client)
    blob = bucket.blob(image.file_path)

    return blob.generate_signed_url(expiration=expiry_seconds)


def prune_unreferenced_images() -> int:
    """Delete images that are no longer referenced by posts or messages.

    Returns:
        Number of images deleted
    """
    from apps.chat.models import ChatMessage
    from apps.community.models import Post

    # Find unreferenced images
    unreferenced = Image.objects.filter(
        is_deleted=False,
    ).exclude(
        id__in=Post.objects.filter(image__isnull=False).values_list(
            "image_id", flat=True
        )
    ).exclude(
        id__in=ChatMessage.objects.filter(image__isnull=False).values_list(
            "image_id", flat=True
        )
    )

    count = 0
    for image in unreferenced:
        try:
            image.hard_delete()
            count += 1
        except Exception:
            # Log error but continue
            pass

    return count
