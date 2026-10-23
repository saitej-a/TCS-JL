"""Django models for the images app."""

from uuid import uuid4

from django.conf import settings
from django.db import models


class Image(models.Model):
    """Represents an uploaded image with metadata.

    Images are stored in Google Cloud Storage and referenced here with paths.
    Supports soft deletion and moderation workflow.
    """

    id = models.UUIDField(primary_key=True, default=uuid4, editable=False)
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="uploaded_images",
        help_text="User who uploaded this image",
    )
    file_path = models.CharField(
        max_length=500,
        help_text="GCS path to the original image (e.g., uploads/<uuid>/original.jpg)",
    )
    original_filename = models.CharField(
        max_length=255,
        help_text="Original filename as uploaded by user",
    )
    file_size = models.PositiveIntegerField(
        help_text="File size in bytes"
    )
    content_type = models.CharField(
        max_length=50,
        help_text="MIME type (e.g., image/jpeg, image/png)",
    )
    width = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="Image width in pixels",
    )
    height = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="Image height in pixels",
    )
    is_moderated = models.BooleanField(
        default=False,
        help_text="Whether this image has been reviewed by moderation",
    )
    moderation_status = models.CharField(
        max_length=20,
        choices=[
            ("PENDING", "Pending"),
            ("APPROVED", "Approved"),
            ("REJECTED", "Rejected"),
        ],
        default="PENDING",
        help_text="Moderation status",
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        help_text="When this image was uploaded",
    )
    is_deleted = models.BooleanField(
        default=False,
        help_text="Soft delete flag",
    )

    class Meta:
        verbose_name = "image"
        verbose_name_plural = "images"
        ordering = ["-created_at"]
        indexes = [
            models.Index(
                fields=["uploaded_by", "-created_at"],
                name="idx_image_user_created",
            ),
            models.Index(
                fields=["is_moderated", "moderation_status"],
                name="idx_image_moderation",
            ),
            models.Index(
                fields=["is_deleted", "created_at"],
                name="idx_image_deleted",
            ),
        ]

    def __str__(self) -> str:
        return f"Image {self.id[:8]}... ({self.original_filename})"

    def get_url(self) -> str:
        """Get the full URL for the original image."""
        from config.settings import gcs

        if gcs.USE_GCS:
            return f"{gcs.GCS_BASE_URL}{self.file_path.lstrip('/')}"
        # Fallback for local development
        return f"/media/{self.file_path}"

    def get_thumbnail_url(self, size: str = "small") -> str:
        """Get the URL for a thumbnail variant."""
        from config.settings import gcs

        # Check if thumbnail exists in GCS
        thumbnail_path = self.file_path.replace("/original.", f"/thumbnail_{size}.")

        if gcs.USE_GCS:
            return f"{gcs.GCS_BASE_URL}{thumbnail_path.lstrip('/')}"
        return f"/media/{thumbnail_path}"

    def is_referenced(self) -> bool:
        """Check if this image is referenced by any post or chat message."""
        from apps.community.models import Post
        from apps.chat.models import ChatMessage

        post_count = Post.objects.filter(image=self, is_deleted=False).count()
        message_count = ChatMessage.objects.filter(
            image=self, is_deleted=False
        ).count()

        return post_count > 0 or message_count > 0

    def soft_delete(self) -> None:
        """Soft delete this image."""
        self.is_deleted = True
        self.save(update_fields=["is_deleted", "updated_at"])

    def hard_delete(self) -> None:
        """Permanently delete this image from GCS and database."""
        if self.is_referenced():
            raise ValueError("Cannot delete image that is still referenced")

        # Delete from GCS
        self._delete_from_gcs()

        # Delete from database
        self.delete()

    def _delete_from_gcs(self) -> None:
        """Delete the image and all variants from GCS."""
        try:
            import google.cloud.storage as storage

            client = storage.Client()
            bucket = client.bucket(self._get_bucket_name())
            blob = bucket.blob(self.file_path)
            blob.delete()

            # Also delete thumbnails
            for size in ["small", "medium", "large"]:
                thumb_path = self.file_path.replace(
                    "/original.", f"/thumbnail_{size}."
                )
                thumb_blob = bucket.blob(thumb_path)
                try:
                    thumb_blob.delete()
                except storage.exceptions.NotFound:
                    pass  # Thumbnail might not exist

        except Exception:
            # Log error but continue with DB deletion
            # In production, use proper logging
            pass

    def _get_bucket_name(self) -> str:
        """Get the bucket name based on environment."""
        from config.settings import gcs, base

        if not gcs.USE_GCS:
            return ""
        if base.DEBUG:
            return gcs.GCS_BUCKET_NAME
        return gcs.GCS_BUCKET_NAME_PROD
