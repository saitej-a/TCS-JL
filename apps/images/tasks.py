"""Celery tasks for image processing."""

import logging

from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3)
def generate_image_variants_task(self, image_id: str) -> dict:
    """Generate thumbnails and WebP variants for an image.

    Args:
        self: Task instance
        image_id: UUID of the image

    Returns:
        Dictionary with variant URLs
    """
    from .models import Image
    from .services import generate_image_variants

    try:
        image = Image.objects.get(id=image_id)
        variants = generate_image_variants(image)
        return variants
    except Exception as exc:
        logger.error(f"Failed to generate variants for image {image_id}: {exc}")
        raise self.retry(exc=exc, countdown=60)  # Retry after 1 minute


@shared_task(bind=True, max_retries=3)
def validate_image_content_task(self, image_id: str) -> dict:
    """Validate image content for moderation.

    Args:
        self: Task instance
        image_id: UUID of the image

    Returns:
        Validation results
    """
    from config.settings import gcs

    if not gcs.SCAN_FOR_MALICIOUS_CONTENT:
        return {"skipped": True, "reason": "Scanning disabled"}

    from google.cloud import vision

    try:
        image_client = vision.ImageAnnotatorClient()
        # Implement content scanning logic
        return {"status": "completed"}
    except Exception as exc:
        logger.error(f"Failed to validate image {image_id}: {exc}")
        raise self.retry(exc=exc, countdown=60)


@shared_task
def prune_unreferenced_images_task() -> int:
    """Daily cleanup task for unreferenced images.

    Returns:
        Number of images deleted
    """
    from .services import prune_unreferenced_images

    return prune_unreferenced_images()