# Phase 11 — Image Uploads & Media Management

> **Phase Number:** 11  
> **Status:** Planning  
> **Priority:** High (Post-MVP but essential for engagement)  
> **Estimated Duration:** 2 Weeks  

---

## Executive Summary

Add comprehensive image upload support to community posts and chat messages using **Google Cloud Storage (GCS)**. This phase enables candidates to share photos of their documents, interview experiences, and joining letters with proper moderation, processing, and CDN delivery.

---

## Phase Goals

1. Allow users to upload images in posts and messages
2. Store images securely in Google Cloud Storage
3. Generate thumbnails and optimized variants
4. Implement content moderation for uploaded images
5. Provide responsive image delivery with lazy loading

---

## Architecture Overview

```
User Upload → Backend (Django) → GCS → Cloud CDN → Frontend
                 ↓
            Image Processing (Celery)
                 ↓
            Moderation Check
```

---

## Task Breakdown

### Week 1: Backend Foundation

| Task | Description | Dependencies | Status |
|------|-------------|--------------|--------|
| T11.1 | GCS Configuration & Django Integration | Phase 1-10 | ✅ Planned |
| T11.2 | Image Model & Database Schema | T11.1 | ✅ Planned |
| T11.3 | Image Upload Endpoint & Validation | T11.2 | ✅ Planned |
| T11.4 | Image Processing Pipeline (Thumbnails, Optimization) | T11.3 | ✅ Planned |
| T11.5 | Celery Tasks for Async Processing | T11.4 | ✅ Planned |

### Week 2: Integration & Frontend

| Task | Description | Dependencies | Status |
|------|-------------|--------------|--------|
| T11.6 | Post Model Enhancement (Optional Image) | Phase 5 | ✅ Planned |
| T11.7 | Chat Message Enhancement (Optional Image) | Phase 13 | ✅ Planned |
| T11.8 | Frontend Upload Components | T11.6, T11.7 | ✅ Planned |
| T11.9 | Image Display & Lightbox Components | T11.8 | ✅ Planned |
| T11.10 | Testing, Security Audit & Deployment | T11.1-T11.9 | ✅ Planned |

---

## Detailed Task Specifications

### T11.1: GCS Configuration & Django Integration

**Objective:** Set up Google Cloud Storage with proper credentials, buckets (dev/prod), and Django integration.

**Deliverables:**
- `config/settings/gcs.py` module
- Environment variables: `GCS_BUCKET_NAME`, `GCS_BUCKET_NAME_DEV`, `GCS_CREDENTIALS_JSON`
- Media storage backend using `google-cloud-storage`
- CORS configuration for browser uploads

**Acceptance Criteria:**
- ✅ Dev bucket created (`tcs-jl-images-dev`)
- ✅ Prod bucket created (`tcs-jl-images`)
- ✅ Service account with proper permissions
- ✅ Django can list/upload objects programmatically
- ✅ Static files still served via local/Nginx (images go to GCS only)

---

### T11.2: Image Model & Database Schema

**Objective:** Create a flexible `Image` model to track uploaded media with metadata.

**Model Fields:**
```python
id = models.UUIDField(primary_key=True, default=uuid.uuid4)
uploaded_by = models.ForeignKey(User, on_delete=PROTECT)
file_path = models.CharField(max_length=500)  # GCS path
original_filename = models.CharField(max_length=255)
file_size = models.PositiveIntegerField()
content_type = models.CharField(max_length=50)
width = models.PositiveIntegerField(null=True, blank=True)  # if image
height = models.PositiveIntegerField(null=True, blank=True)  # if image
is_moderated = models.BooleanField(default=False)
moderation_status = models.CharField(max_length=20, choices=[("PENDING", "Pending"), ("APPROVED", "Approved"), ("REJECTED", "Rejected")])
created_at = models.DateTimeField(auto_now_add=True)
is_deleted = models.BooleanField(default=False)
```

**Indexes:**
- `(uploaded_by, -created_at)` for user's uploads
- `(is_moderated, moderation_status)` for admin queue
- `(is_deleted, created_at)` for cleanup

**Acceptance Criteria:**
- ✅ Migration successful
- ✅ Admin interface shows upload metadata
- ✅ Soft-deletion support (is_deleted flag)

---

### T11.3: Image Upload Endpoint & Validation

**Objective:** Implement a secure upload endpoint with proper validation.

**API:**
```http
POST /api/v1/images/upload/
Content-Type: multipart/form-data

Body: { file: <image> }
```

**Validation:**
- File size: Max 10MB
- Content types: `image/jpeg`, `image/png`, `image/gif`, `image/webp`
- Dimensions: Max 8192px on any side
- Security: No executable content (Pillow verification)

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

**Rate Limiting:** 20 uploads/hour per user

**Acceptance Criteria:**
- ✅ Authentication required
- ✅ Validation rejects invalid files
- ✅ GCS upload succeeds
- ✅ Database record created atomically
- ✅ Error responses match our standard format

---

### T11.4: Image Processing Pipeline

**Objective:** Generate optimized variants (thumbnails, web-optimized formats).

**Processing Steps:**
1. **Upload → Original stored in GCS**
2. **Async Task Triggers:**
   - Generate thumbnails: Small (200px), Medium (500px), Large (1000px)
   - Convert to WebP for modern browsers
   - Strip metadata (EXIF) for privacy
   - Optimize JPEG/PNG compression

**Processing Options:**
```python
THUMBNAILS = {
    "small": {"width": 200, "height": 200, "crop": True},
    "medium": {"width": 500, "height": 500, "crop": False},
    "large": {"width": 1000, "height": 1000, "crop": False},
}
```

**Storage Structure:**
```
gs://tcs-jl-images/
├── uploads/
│   └── <uuid>/            # Original file
│       ├── original.jpg
│       ├── thumbnail_s.jpg
│       ├── thumbnail_m.jpg
│       ├── thumbnail_l.jpg
│       └── webp/
│           ├── original.webp
│           └── thumbnail_s.webp
└── thumbnails/
    └── <uuid>/            # Cropped thumbnails only
```

**Acceptance Criteria:**
- ✅ Thumbnails generated within 30 seconds
- ✅ WebP variant created for supported browsers
- ✅ EXIF data stripped
- ✅ File sizes reduced by 60-80%

---

### T11.5: Celery Tasks for Async Processing

**Objective:** Offload processing to background workers.

**Tasks:**
```python
@celery.task
def generate_image_variants(image_id: str) -> None:
    """Generate thumbnails and WebP variants."""
    
@celery.task
def validate_image_content(image_id: str) -> None:
    """Check for explicit/sensitive content (optional GCP Vision API)."""
    
@celery.task
def prune_unreferenced_images() -> None:
    """Delete images not linked to any post/comment (runs daily)."""
```

**Celery Beat Schedule:**
```python
"prune-unreferenced-images-daily": {
    "task": "images.tasks.prune_unreferenced_images",
    "schedule": crontab(hour=3, minute=0),
}
```

**Acceptance Criteria:**
- ✅ Tasks appear in Celery flower/monitoring
- ✅ Failures requeued with exponential backoff
- ✅ Daily cleanup task runs without errors

---

### T11.6: Post Model Enhancement

**Objective:** Add optional image association to posts.

**Changes:**
```python
# In apps/community/models.py
class Post(models.Model):
    # ... existing fields ...
    image = models.ForeignKey(
        "images.Image",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="posts",
        help_text="Optional featured image for this post",
    )
```

**Serializer Update:**
```python
class PostCardSerializer(serializers.ModelSerializer):
    image = ImageSerializer(read_only=True)
    
    class Meta:
        fields = ["id", "author", "title", "body", "image", ...]
```

**Upload Flow:**
1. User uploads image via `/api/v1/images/upload/`
2. Creates post with `image_id` in payload
3. Image displayed below post content (if present)

**Acceptance Criteria:**
- ✅ Post can be created with optional image
- ✅ Image renders below post body on feed
- ✅ Image displays on post detail page
- ✅ Soft-delete image doesn't break post display

---

### T11.7: Chat Message Enhancement

**Objective:** Add image support to chat messages.

**Changes:**
```python
# In apps/chat/models.py
class ChatMessage(models.Model):
    # ... existing fields ...
    image = models.ForeignKey(
        "images.Image",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="chat_messages",
    )
```

**API Update:**
```http
POST /chat/rooms/general/messages/
Body: {
  "body": "I received my joining letter!",
  "image_id": "uuid-here"
}
```

**Frontend:**
- Upload button in chat composer
- Preview before sending
- Inline image display in message bubble

**Acceptance Criteria:**
- ✅ Messages can include images
- ✅ Images render inline in chat view
- ✅ Click to view full-size
- ✅ No performance degradation (lazy loading)

---

### T11.8: Frontend Upload Components

**Objective:** Build reusable image upload components.

**Components:**
- `ImageUploadButton` - Triggers file picker
- `ImageUploadDropZone` - Drag & drop area
- `ImageUploadPreview` - Shows thumbnail before upload
- `ImageUploader` - Complete wrapper with progress + error handling

**State Management:**
```typescript
const [file, setFile] = useState<File | null>(null);
const [preview, setPreview] = useState<string | null>(null);
const [uploading, setUploading] = useState(false);
const [uploadedImageId, setUploadedImageId] = useState<string | null>(null);
```

**Error Handling:**
- File too large (>10MB)
- Invalid file type
- Network errors
- Authentication expired (auto-retry)

**Acceptance Criteria:**
- ✅ Works in Firefox, Chrome, Safari, Edge
- ✅ Mobile-friendly (file picker invoked correctly)
- ✅ Progress indicator during upload
- ✅ Graceful error messages

---

### T11.9: Image Display & Lightbox

**Objective:** Display uploaded images beautifully.

**Components:**
- `PostImage` - Inline in post content (responsive, lazy-loaded)
- `ChatImage` - In message bubbles
- `ImageLightbox` - Full-screen view with close, zoom, download

**Performance:**
- `loading="lazy"` attribute
- `srcset` with multiple resolutions
- Placeholder blur effect while loading
- WebP detection (fallback to JPEG/PNG)

**Example:**
```tsx
<ImageLightbox
  src={image.url}
  thumbnail={image.thumbnail_url}
  alt={image.original_filename}
  width={image.width}
  height={image.height}
/>
```

**Acceptance Criteria:**
- ✅ Images render without layout shift
- ✅ Lightbox closes on escape/overlay click
- ✅ Download button works
- ✅ Mobile touch gestures (pinch zoom)

---

### T11.10: Testing, Security Audit & Deployment

**Objective:** Production-ready implementation.

**Testing:**
- Unit tests for upload endpoint (200, 400, 401, 413 responses)
- Integration tests: full upload → thumbnail generation flow
- Security tests:
  - Verified file types only (no `.exe` masquerading)
  - Size limits enforced (server-side)
  - Authentication required
  - XSS prevented (no HTML in filenames)
- E2E: Post with image → visible on feed

**Deployment Checklist:**
- [ ] GCP service account created with Storage Object Admin role
- [ ] Two buckets created (`tcs-jl-images-dev`, `tcs-jl-images`)
- [ ] CORS configured on buckets
- [ ] Environment variables set (`.env` / CI/CD)
- [ ] Migration `python manage.py migrate images` executed
- [ ] Celery worker restarted with new tasks
- [ ] CDN cache purged (if applicable)
- [ ] Test upload via Django admin
- [ ] Post with image renders in frontend

**Acceptance Criteria:**
- ✅ 95%+ test coverage on image app
- ✅ Security scan passes (no high/medium findings)
- ✅ Zero downtime deployment
- ✅ Rollback plan documented

---

## Cost Estimation

| Service | Estimated Usage | Monthly Cost |
|---------|-----------------|--------------|
| Cloud Storage (Standard) | 500 uploads/day × 2MB avg = ~30GB | ~$0.90 |
| Cloud CDN (optional) | 100GB outbound | ~$5-10 |
| Cloud Run (processing) | ~1000 invocations/day | ~$0.50 |
| **Total** | | **~$6-12/month** |

*Note: Your GCP credits should easily cover this for MVP scale.*

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Image upload success rate | >99% |
| Thumbnail generation time | <10s (p95) |
| Post load time with images | <1.5s (p95) |
| User adoption (uploads/posts) | >30% of posts have images by Week 4 |
| Moderation queue clearance | <2 hours |

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| GCS costs exceed budget | Medium | Set up billing alerts, implement daily cleanup |
| Image processing slows uploads | Medium | Async processing (already mitigated) |
| CDN caching issues | Low | Implement cache-busting with versioned URLs |
| Browser not supporting WebP | Low | Serve fallback JPEG/PNG via `<picture>` tag |

---

## Implementation Checklist

### Phase 11.0 - Setup (Pre-Start)
- [ ] Create GSD phase directory structure
- [ ] Review and approve this plan
- [ ] Set up GCP service account and buckets
- [ ] Configure environment variables

### Phase 11.1 - Backend Foundation
- [ ] Create `images` Django app
- [ ] Implement Image model
- [ ] Create migration
- [ ] Implement GCS utility module
- [ ] Setup Celery tasks for processing

### Phase 11.2 - Upload API
- [ ] Implement upload endpoint
- [ ] Add validation middleware
- [ ] Add rate limiting
- [ ] Write tests

### Phase 11.3 - Post/Chat Integration
- [ ] Update Post model
- [ ] Update ChatMessage model
- [ ] Update serializers
- [ ] Write integration tests

### Phase 11.4 - Frontend
- [ ] Create upload components
- [ ] Create display components
- [ ] Integrate with existing API
- [ ] Write E2E tests

### Phase 11.5 - Deployment
- [ ] CI/CD pipeline
- [ ] Staging deployment
- [ ] Production deployment
- [ ] Monitoring setup

---

## Next Steps

1. **Approve this plan** → Start implementation
2. **Phase 11.0** → Create GSD phase directory and GCP setup
3. **Phase 11.1-11.4** → Complete backend and frontend implementation
4. **Phase 11.5** → Deployment and monitoring

---

*Phase 11 is approved for development pending resource allocation.*
