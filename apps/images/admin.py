"""Admin configuration for the images app."""

from django.contrib import admin

from .models import Image


@admin.register(Image)
class ImageAdmin(admin.ModelAdmin):
    """Admin configuration for Image model."""

    list_display = [
        "id",
        "uploaded_by",
        "original_filename",
        "file_size",
        "moderation_status",
        "is_moderated",
        "is_deleted",
        "created_at",
    ]
    list_filter = [
        "moderation_status",
        "is_moderated",
        "is_deleted",
        "created_at",
    ]
    search_fields = [
        "id",
        "original_filename",
        "file_path",
        "uploaded_by__email",
    ]
    readonly_fields = [
        "id",
        "created_at",
        "file_size",
        "width",
        "height",
    ]
    date_hierarchy = "created_at"

    actions = [
        "mark_as_approved",
        "mark_as_rejected",
        "soft_delete",
        "hard_delete",
    ]

    @admin.action(description="Mark selected images as approved")
    def mark_as_approved(self, request, queryset):
        queryset.update(
            is_moderated=True,
            moderation_status="APPROVED",
        )

    @admin.action(description="Mark selected images as rejected")
    def mark_as_rejected(self, request, queryset):
        queryset.update(
            is_moderated=True,
            moderation_status="REJECTED",
        )

    @admin.action(description="Soft delete selected images")
    def soft_delete(self, request, queryset):
        for image in queryset:
            image.soft_delete()

    @admin.action(description="Hard delete selected images")
    def hard_delete(self, request, queryset):
        for image in queryset:
            try:
                image.hard_delete()
            except Exception as e:
                self.message_user(
                    request,
                    f"Failed to delete image {image.id}: {str(e)}",
                    level="ERROR",
                )
