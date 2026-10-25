# Images App

This Django app handles image uploads, storage in Google Cloud Storage, thumbnail generation, and serving images to the frontend.

## Features

- Image upload with validation
- Storage in Google Cloud Storage (GCS)
- Thumbnail generation (small, medium, large)
- WebP conversion for modern browsers
- Optional content moderation
- Automatic cleanup of orphaned images

## Architecture

```
User Upload → Backend (Django) → GCS → CDN → Frontend
                 ↓
            Image Processing (Celery)
                 ↓
            Moderation Check
```

## Installation

1. Add to `INSTALLED_APPS` in settings:
```python
INSTALLED_APPS = [
    ...
    "apps.images",
]
```

2. Configure GCS credentials in environment:
```env
GCS_CREDENTIALS_BASE64=<base64-encoded-service-account-json>
GCS_BUCKET_NAME=tcs-jl-images-dev
GCS_BUCKET_NAME_PROD=tcs-jl-images
```

3. Run migrations:
```bash
python manage.py migrate images
```

## API Endpoints

### Upload Image

```
POST /api/v1/images/upload/
Content-Type: multipart/form-data

Body: { file: <image> }
```

**Response:**
```json
{
  "id": "uuid",
  "url": "https://storage.googleapis.com/...",
  "thumbnail_url": "...",
  "original_filename": "scan.jpg",
  "file_size": 245678,
  "width": 1920,
  "height": 1080
}
```

### List User Images

```
GET /api/v1/images/
```

### Get Image Details

```
GET /api/v1/images/<image_id>/
```

### Delete Image

```
DELETE /api/v1/images/<image_id>/
```

## File Structure

```
apps/images/
├── __init__.py
├── apps.py
├── models.py          # Image model
├── services.py        # GCS operations
├── serializers.py     # DRF serializers
├── views.py           # API views
├── tasks.py           # Celery tasks
├── urls.py            # URL configuration
├── admin.py           # Django admin
├── validators.py      # File validation
├── migrations/
│   └── 0001_initial.py
└── tests.py           # Test suite
```

## Configuration

See `config/settings/gcs.py` for all configuration options:

- Maximum file size
- Allowed content types
- Thumbnail sizes
- Quality settings
- Rate limits

## Running Tests

```bash
python manage.py test apps.images
```

## Deployment

1. Ensure GCP service account has Storage Object Admin role
2. Create two buckets: `tcs-jl-images-dev` and `tcs-jl-images`
3. Configure CORS on buckets
4. Set environment variables
5. Run migrations
6. Restart Celery workers

## Cost Optimization

- Use Cloud CDN for image delivery
- Implement proper caching headers
- Delete unreferenced images daily
- Use cheaper storage classes for older files
