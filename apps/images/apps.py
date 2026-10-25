"""Django app configuration for the images app."""

from django.apps import AppConfig


class ImagesConfig(AppConfig):
    """Configuration for the images app."""

    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.images"
    verbose_name = "Images"
