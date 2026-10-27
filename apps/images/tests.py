"""Tests for the images app."""

import base64
import json
from unittest.mock import MagicMock, patch

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from .models import Image

User = get_user_model()


class ImageUploadTest(TestCase):
    """Test image upload functionality."""

    def setUp(self):
        """Set up test fixtures."""
        self.user = User.objects.create_user(
            email="test@example.com",
            password="testpass123",
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

        # Create a simple test image
        self.test_image = SimpleUploadedFile(
            "test.jpg",
            b"fake image content",
            content_type="image/jpeg",
        )

    @patch("apps.images.services.upload_image_to_gcs")
    def test_upload_image_success(self, mock_upload):
        """Test successful image upload."""
        mock_upload.return_value = ("uploads/test123/original.jpg", 1024)

        url = reverse("images:upload-image")
        data = {"file": self.test_image}

        response = self.client.post(url, data, format="multipart")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("id", response.data)
        self.assertEqual(
            response.data["original_filename"], "test.jpg"
        )

    def test_upload_image_no_file(self):
        """Test upload without file returns error."""
        url = reverse("images:upload-image")
        data = {}

        response = self.client.post(url, data, format="multipart")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_upload_image_unauthorized(self):
        """Test upload without authentication returns 401."""
        self.client.force_authenticate(user=None)
        url = reverse("images:upload-image")
        data = {"file": self.test_image}

        response = self.client.post(url, data, format="multipart")

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class ImageModelTest(TestCase):
    """Test Image model methods."""

    def setUp(self):
        """Set up test fixtures."""
        self.user = User.objects.create_user(
            email="test@example.com",
            password="testpass123",
        )

        self.image = Image.objects.create(
            uploaded_by=self.user,
            file_path="uploads/test123/original.jpg",
            original_filename="test.jpg",
            file_size=1024,
            content_type="image/jpeg",
            width=1920,
            height=1080,
        )

    def test_get_url(self):
        """Test get_url method."""
        url = self.image.get_url()
        self.assertIn("uploads/test123/original.jpg", url)
        self.assertIn("/media/", url)

    def test_get_thumbnail_url(self):
        """Test get_thumbnail_url method."""
        url = self.image.get_thumbnail_url("small")
        self.assertIn("thumbnail_small", url)

    def test_is_referenced(self):
        """Test is_referenced returns False for unreferenced image."""
        self.assertFalse(self.image.is_referenced())
        # Create a Post with this image
        from apps.community.models import Post
        Post.objects.create(
            author=self.user,
            title="Test Post",
            body="Test body",
            category="help",
            image=self.image
        )
        self.assertTrue(self.image.is_referenced())

    def test_soft_delete(self):
        """Test soft delete marks is_deleted flag."""
        self.image.soft_delete()
        self.image.refresh_from_db()
        self.assertTrue(self.image.is_deleted)

    def test_str_representation(self):
        """Test __str__ method."""
        str_repr = str(self.image)
        self.assertIn("Image", str_repr)
        self.assertIn("test.jpg", str_repr)


class CeleryTasksTest(TestCase):
    """Test Celery tasks."""

    def setUp(self):
        """Set up test fixtures."""
        self.user = User.objects.create_user(
            email="test@example.com",
            password="testpass123",
        )

        self.image = Image.objects.create(
            uploaded_by=self.user,
            file_path="uploads/test123/original.jpg",
            original_filename="test.jpg",
            file_size=1024,
            content_type="image/jpeg",
        )

    @patch("apps.images.services.generate_image_variants")
    @patch("apps.images.services.get_gcs_client")
    def test_generate_variants_task(self, mock_client, mock_generate):
        """Test generate_image_variants_task."""
        from .tasks import generate_image_variants_task

        mock_generate.return_value = {
            "small": "https://example.com/small.jpg",
            "medium": "https://example.com/medium.jpg",
            "large": "https://example.com/large.jpg",
            "webp": "https://example.com/original.webp",
        }

        result = generate_image_variants_task(str(self.image.id))
        self.assertIn("small", result)
