"""Serializers for the images app."""

from rest_framework import serializers

from .models import Image


class ImageSerializer(serializers.ModelSerializer):
    """Serializer for Image model."""

    url = serializers.SerializerMethodField()
    thumbnail_url = serializers.SerializerMethodField()

    class Meta:
        model = Image
        fields = [
            "id",
            "url",
            "thumbnail_url",
            "original_filename",
            "file_size",
            "content_type",
            "width",
            "height",
            "created_at",
            "moderation_status",
            "is_moderated",
        ]
        read_only_fields = [
            "id",
            "url",
            "thumbnail_url",
            "file_size",
            "content_type",
            "width",
            "height",
            "created_at",
            "moderation_status",
            "is_moderated",
        ]

    def get_url(self, obj: Image) -> str:
        """Get the full URL for the original image."""
        return obj.get_url()

    def get_thumbnail_url(self, obj: Image) -> str:
        """Get the URL for the small thumbnail."""
        return obj.get_thumbnail_url("small")


class ImageCreateSerializer(serializers.Serializer):
    """Serializer for image upload requests."""

    file = serializers.ImageField(
        use_url=False,
        required=True,
        help_text="Image file to upload",
    )


class ImageResponseSerializer(serializers.Serializer):
    """Serializer for image upload responses."""

    id = serializers.UUIDField(
        help_text="Unique ID of the uploaded image"
    )
    url = serializers.URLField(
        help_text="Full URL to the original image"
    )
    thumbnail_url = serializers.URLField(
        help_text="URL to the small thumbnail"
    )
    original_filename = serializers.CharField(
        max_length=255,
        help_text="Original filename"
    )
    file_size = serializers.IntegerField(
        help_text="File size in bytes"
    )
    width = serializers.IntegerField(
        required=False,
        allow_null=True,
        help_text="Image width in pixels"
    )
    height = serializers.IntegerField(
        required=False,
        allow_null=True,
        help_text="Image height in pixels"
    )
    created_at = serializers.DateTimeField(
        help_text="Upload timestamp"
    )
