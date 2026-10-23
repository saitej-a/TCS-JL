"""Images app for TCS Joining Tracker.

This Django app handles image uploads, storage in Google Cloud Storage,
thumbnail generation, and serving images to the frontend.

Key Features:
- Upload images via API
- Generate thumbnails (small, medium, large)
- Convert to WebP for modern browsers
- Moderate content (optional)
- Clean up orphaned images
"""
