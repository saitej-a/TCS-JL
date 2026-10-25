# Phase 11: Image Uploads - Implementation Guide

## Overview

This guide walks through implementing image upload functionality for posts and chat messages using Google Cloud Storage (GCS).

## Prerequisites

- Django 5.2.6+
- Python 3.11+
- Google Cloud Platform account with credits
- Basic knowledge of Django REST Framework

## Step-by-Step Implementation

### Step 1: Install Dependencies

```bash
pip install google-cloud-storage google-cloud-vision Pillow
```

The requirements.txt has been updated with these dependencies.

### Step 2: Configure GCP Service Account

1. Go to [GCP Console](https://console.cloud.google.com/)
2. Navigate to IAM & Admin > Service Accounts
3. Create a new service account with **Storage Object Admin** role
4. Create and download JSON key
5. Encode to base64: `base64 -i key.json | tr -d '\n'`

### Step 3: Environment Variables

Add to `.env`:

```env
# Google Cloud Storage (Phase 11)
GCS_CREDENTIALS_BASE64=<your-base64-encoded-json-key>
GCS_BUCKET_NAME=tcs-jl-images-dev
GCS_BUCKET_NAME_PROD=tcs-jl-images
```

### Step 4: Create GCS Buckets

1. Go to Cloud Storage
2. Create bucket: `tcs-jl-images-dev` (region: your preferred region)
3. Create bucket: `tcs-jl-images` (for production)
4. Enable public access (or configure signed URLs)

### Step 5: CORS Configuration

Configure CORS on both buckets:

```json
[
  {
    "origin": ["https://yourdomain.com", "http://localhost:5173"],
    "method": ["GET", "POST", "PUT", "DELETE"],
    "responseHeader": ["Content-Type", "Authorization"],
    "maxAgeSeconds": 3600
  }
]
```

### Step 6: Apply Django Migrations

```bash
python manage.py makemigrations images
python manage.py migrate images
```

### Step 7: URL Configuration

Add to `config/urls.py`:

```python
urlpatterns = [
    # ... existing URLs ...
    path("api/v1/images/", include("apps.images.urls")),
]
```

### Step 8: Configure Frontend

#### API Client

Create `frontend/src/api/images.ts`:

```typescript
import { apiPost, apiGet, apiDelete } from "@/api/client";
import type { Paginated } from "@/types/api";

export interface Image {
  id: string;
  url: string;
  thumbnail_url: string;
  original_filename: string;
  file_size: number;
  width?: number;
  height?: number;
  created_at: string;
  moderation_status: "PENDING" | "APPROVED" | "REJECTED";
  is_moderated: boolean;
}

export async function uploadImage(
  file: File
): Promise<Image> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("/api/v1/images/upload/", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${localStorage.getItem("access_token")}`,
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error("Upload failed");
  }

  return response.json();
}

export async function listImages(): Promise<Image[]> {
  return apiGet<Image[]>("/api/v1/images/");
}

export async function deleteImage(id: string): Promise<void> {
  await apiDelete(`/api/v1/images/${id}/`);
}

export async function getThumbnail(
  id: string,
  size: "small" | "medium" | "large" = "small"
): Promise<{ thumbnail_url: string }> {
  return apiGet<{ thumbnail_url: string }>(
    `/api/v1/images/${id}/thumbnail/${size}/`
  );
}
```

#### React Components

Create `ImageUploader.tsx`:

```tsx
import { useState } from "react";

interface ImageUploaderProps {
  onUpload: (image: any) => void;
  maxFiles?: number;
}

export function ImageUploader({
  onUpload,
  maxFiles = 1,
}: ImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (!file || !file.type.startsWith("image/")) {
      alert("Please upload an image file");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/v1/images/upload/", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
        body: formData,
      });

      if (!response.ok) throw new Error("Upload failed");

      const image = await response.json();
      onUpload(image);
    } catch (error) {
      console.error("Upload error:", error);
      alert("Failed to upload image");
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Process file similar to drop handler
    }
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      className={`border-2 border-dashed p-8 text-center ${
        isDragging ? "border-indigo-500 bg-indigo-50" : "border-gray-300"
      }`}
    >
      <p className="text-gray-600">
        Drag & drop an image here, or click to select
      </p>
      <input
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        id="file-upload"
      />
      <label htmlFor="file-upload" className="cursor-pointer mt-4">
        <button className="bg-indigo-600 text-white px-4 py-2 rounded">
          Select Image
        </button>
      </label>
      {uploading && (
        <p className="text-indigo-600 mt-2">Uploading...</p>
      )}
    </div>
  );
}
```

Create `ImageLightbox.tsx`:

```tsx
import { useState } from "react";

interface ImageLightboxProps {
  src: string;
  thumbnail?: string;
  alt?: string;
}

export function ImageLightbox({
  src,
  thumbnail,
  alt,
}: ImageLightboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);

  return (
    <>
      <div className="relative group cursor-pointer" onClick={() => setIsOpen(true)}>
        <img
          src={thumbnail || src}
          alt={alt}
          className="max-h-64 object-contain rounded"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-black bg-opacity-20 group-hover:bg-opacity-30 transition-opacity" />
      </div>

      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="relative max-w-5xl max-h-screen"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute -top-10 right-0 text-white text-4xl"
              onClick={() => setIsOpen(false)}
            >
              ×
            </button>
            <img
              src={src}
              alt={alt}
              className="max-w-full max-h-screen object-contain rounded"
              onLoad={() => setLoaded(true)}
            />
            {!loaded && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white" />
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
```

### Step 9: Update Post Creation

Modify the post creation flow to include image upload:

```typescript
interface PostFormState {
  title: string;
  body: string;
  category: string;
  imageId?: string;
}

async function createPost(data: PostFormState) {
  const response = await fetch("/api/v1/community/posts/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("access_token")}`,
    },
    body: JSON.stringify({
      title: data.title,
      body: data.body,
      category: data.category,
      image_id: data.imageId,
    }),
  });

  return response.json();
}
```

### Step 10: Frontend Integration

Display images in post cards:

```tsx
interface PostCardProps {
  post: PostCard;
}

export function PostCard({ post }: PostCardProps) {
  return (
    <div className="bg-white rounded-lg shadow p-4">
      {post.image && (
        <ImageLightbox
          src={post.image.url}
          thumbnail={post.image.thumbnail_url}
          alt={post.image.original_filename}
        />
      )}
      <div className="mt-4">
        <h3 className="font-bold text-lg">{post.title}</h3>
        <p className="text-gray-600 mt-2">{post.body}</p>
      </div>
    </div>
  );
}
```

## Testing

### Backend Tests

```bash
python manage.py test apps.images
```

### Manual Testing

1. Upload an image via Django admin
2. Verify it appears in GCS console
3. Check that thumbnails are generated
4. Test the API endpoint directly with curl

### Frontend Testing

1. Upload an image in post creation form
2. Verify image displays in feed
3. Test lightbox functionality
4. Check responsive behavior on mobile

## Deployment Checklist

### Pre-Deployment

- [ ] GCS credentials configured in production environment
- [ ] Production bucket created and CORS configured
- [ ] Environment variables set in production
- [ ] Test uploads in staging environment

### Deployment

```bash
# Run migrations
python manage.py migrate images

# Collect static if needed
python manage.py collectstatic --noinput

# Restart services
# (Your deployment command here)
```

### Post-Deployment

- [ ] Test upload endpoint in production
- [ ] Verify image appears in GCS console
- [ ] Check that CDN cache is working (if applicable)
- [ ] Monitor for errors in logs

## Monitoring

Set up Cloud Monitoring for:
- Storage usage
- Upload failure rates
- Thumbnail generation failures
- 4xx/5xx errors on image endpoints

## Cost Optimization

1. **Use CDN**: Configure Cloud CDN for frequent images
2. **Cache-Control Headers**: Set appropriate caching
3. **Lifecycle Policies**: Auto-delete old unreferenced images
4. **Storage Classes**: Use Nearline/Coldline for infrequently accessed images

## Troubleshooting

### Common Issues

1. **CORS errors**: Verify bucket CORS configuration
2. **403 Forbidden**: Check service account permissions
3. **Upload fails silently**: Enable debug logging
4. **Thumbnails not generated**: Check Celery worker is running

### Debug Commands

```bash
# Check GCS connectivity
python manage.py shell
>>> from apps.images.services import get_gcs_client
>>> client = get_gcs_client()
>>> client.list_buckets()

# Check Celery tasks
celery -A config inspect active
```

## Next Steps

After Phase 11 is complete:

1. Monitor usage patterns
2. Optimize costs based on actual usage
3. Consider adding image moderation AI
4. Implement image search/filtering
5. Add image galleries for users

## Questions?

Review the detailed plan in:
- `.planning/phase-11-image-uploads.md` - Full phase plan
- `.planning/11-image-uploads/TASKS.md` - Detailed tasks
- `.planning/11-image-uploads/PLAN.md` - Implementation steps
