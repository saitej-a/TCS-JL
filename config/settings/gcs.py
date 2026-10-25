"""Google Cloud Storage configuration for TCS Joining Tracker.

This module configures GCS integration for media file storage,
separate from Django's static file handling.
"""

import os
from datetime import timedelta
from pathlib import Path

# --- GCS Configuration ---

#Bucket names (dev vs prod separation)
GCS_BUCKET_NAME = os.environ.get("GCS_BUCKET_NAME", "tcs-jl-images-dev")
GCS_BUCKET_NAME_PROD = os.environ.get("GCS_BUCKET_NAME_PROD", "tcs-jl-images")

# Service account credentials (base64-encoded JSON)
# Set via environment variable in production
GCS_CREDENTIALS_BASE64 = os.environ.get("GCS_CREDENTIALS_BASE64", "")

# Whether we're using GCS (disabled in dev if credentials not set)
USE_GCS = bool(GCS_CREDENTIALS_BASE64)

# --- GCS URL Configuration ---

# Base URL for GCS objects (with trailing slash)
# Format: https://storage.googleapis.com/bucket-name/
GCS_BASE_URL = f"https://storage.googleapis.com/{GCS_BUCKET_NAME}/"

# CDN URL (if using Cloud CDN)
# GCS_CDN_URL = os.environ.get("GCS_CDN_URL", "")

# --- Upload Configuration ---

# Maximum file size (in bytes) - 10MB
MAX_IMAGE_SIZE = 10 * 1024 * 1024

# Allowed content types
ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"]

# Maximum dimensions (pixels)
MAX_IMAGE_WIDTH = 8192
MAX_IMAGE_HEIGHT = 8192

# --- Processing Configuration ---

# Thumbnail sizes (max dimension, keep aspect ratio)
THUMBNAIL_SIZES = {
    "small": 200,  # 200px max dimension
    "medium": 500,  # 500px max dimension
    "large": 1000, # 1000px max dimension
}

# Optimization settings
JPEG_QUALITY = 85
WEBP_QUALITY = 80

# --- File Organization ---

# GCS path structure
# Format: <category>/<uuid>/<variant>.ext
# Categories: uploads, thumbnails, processed
GCS_PATH_PREFIX = ""

# --- Access Control ---

# whether files should be publicly accessible
# Set to False for moderation workflow, True for direct access
PUBLIC_BUCKET = True

# --- Signed URL Configuration ---

# Duration for signed URLs (1 hour)
SIGNED_URL_EXPIRY = timedelta(hours=1)

# --- CDN Cache Control ---

# Cache-Control headers for different file types
CACHE_CONTROL = {
    "original": "public, max-age=31536000, immutable",
    "thumbnail": "public, max-age=86400",
    "webp": "public, max-age=31536000, immutable",
}

# --- Rate Limiting ---

# Maximum uploads per user per time period
IMAGE_UPLOAD_RATE_LIMIT = {
    "hourly": 20,  # 20 uploads per hour per user
    "daily": 100,  # 100 uploads per day per user
    "monthly": 1000,  # 1000 uploads per month per user
}

# --- Security Settings ---

# Scan for malicious content (requires GCP Vision API)
SCAN_FOR_MALICIOUS_CONTENT = False

# Minimum file size (in bytes)
MIN_IMAGE_SIZE = 100  # 100 bytes (prevent empty uploads)

# Required EXIF data to strip (privacy)
EXIF_KEYS_TO_STRIP = [
    "GPSInfo",
    " MakerNote",
    "DateTimeOriginal",
    "Latitude",
    "Longitude",
]

# --- Cleanup Configuration ---

# Auto-delete unreferenced images after N days
AUTO_DELETE_DAYS = 7

# Cleanup cron schedule (3 AM UTC daily)
CLEANUP_HOUR = 3
CLEANUP_MINUTE = 0
