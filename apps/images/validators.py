"""Validators for image uploads."""

import os
from typing import Any

from django.core.exceptions import ValidationError
from django.core.validators import validate_image_file_extension


def validate_image_file(file: Any) -> None:
    """Validate an uploaded image file.

    Args:
        file: Django UploadedFile object

    Raises:
        ValidationError: If validation fails
    """
    from config.settings import gcs

    errors = []

    # Check file size
    if file.size > gcs.MAX_IMAGE_SIZE:
        errors.append(
            f"File too large. Maximum size is {gcs.MAX_IMAGE_SIZE / (1024 * 1024)}MB."
        )

    # Check content type
    if file.content_type not in gcs.ALLOWED_IMAGE_TYPES:
        errors.append(
            f"Invalid file type. Allowed types: {', '.join(gcs.ALLOWED_IMAGE_TYPES)}"
        )

    # Check file extension
    ext = os.path.splitext(file.name)[1].lower()
    allowed_extensions = [".jpg", ".jpeg", ".png", ".gif", ".webp"]
    if ext not in allowed_extensions:
        errors.append(
            f"Invalid file extension. Allowed extensions: {', '.join(allowed_extensions)}"
        )

    # Check minimum size
    if file.size < gcs.MIN_IMAGE_SIZE:
        errors.append("File too small.")

    if errors:
        raise ValidationError(errors)


def validate_image_dimensions(file: Any) -> None:
    """Validate image dimensions using Pillow.

    Args:
        file: Django UploadedFile object

    Raises:
        ValidationError: If dimensions exceed limits
    """
    from PIL import Image
    from io import BytesIO

    try:
        image = Image.open(BytesIO(file.read()))
        width, height = image.size

        if width > gcs.MAX_IMAGE_WIDTH:
            raise ValidationError(
                f"Image width exceeds maximum ({gcs.MAX_IMAGE_WIDTH}px)."
            )
        if height > gcs.MAX_IMAGE_HEIGHT:
            raise ValidationError(
                f"Image height exceeds maximum ({gcs.MAX_IMAGE_HEIGHT}px)."
            )
    except Exception as e:
        raise ValidationError(f"Could not process image: {str(e)}")
