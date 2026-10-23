# Phase 11: Image Uploads - Implementation Tasks

## Week 1: Backend Foundation

### T11.1: GCS Configuration & Django Integration
**Files:** `config/settings/gcs.py`, `.env.example`, `.env`

**Tasks:**
- [ ] Install `google-cloud-storage` package
- [ ] Create GCS configuration module
- [ ] Set up dev/prod buckets
- [ ] Configure service account credentials
- [ ] Setup CORS configuration
- [ ] Test GCS connectivity

**Acceptance:**
- Django can list/upload objects to GCS
- Environment variables configured correctly

---

### T11.2: Image Model & Database Schema
**Files:** `apps/images/models.py`

**Tasks:**
- [ ] Create Image model with all fields
- [ ] Add database indexes
- [ ] Create migration file
- [ ] Verify migration succeeds

**Model Fields:**
- id (UUIDv4)
- uploaded_by (User FK)
- file_path (GCS path)
- original_filename
- file_size
- content_type
- width, height (optional)
- is_moderated, moderation_status
- created_at, is_deleted

---

### T11.3: Image Upload Endpoint & Validation
**Files:** `apps/images/views.py`, `apps/images/serializers.py`

**Tasks:**
- [ ] Create upload view
- [ ] Add validation middleware
- [ ] Implement file type checking (Pillow)
- [ ] Add rate limiting (20/hr/user)
- [ ] Return proper response format
- [ ] Write tests

**API Endpoint:** `POST /api/v1/images/upload/`

---

### T11.4: Image Processing Pipeline
**Files:** `apps/images/services.py`

**Tasks:**
- [ ] Implement thumbnail generation
- [ ] Add WebP conversion
- [ ] Strip EXIF data
- [ ] Optimize file sizes
- [ ] Implement progress tracking

**Processing Options:**
- Small: 200x200px
- Medium: 500x500px
- Large: 1000x1000px

---

### T11.5: Celery Tasks for Async Processing
**Files:** `apps/images/tasks.py`, `config/celery.py`

**Tasks:**
- [ ] Create `generate_image_variants` task
- [ ] Create `validate_image_content` task
- [ ] Create `prune_unreferenced_images` task
- [ ] Add to Celery Beat schedule
- [ ] Test task execution

---

## Week 2: Integration & Frontend

### T11.6: Post Model Enhancement
**Files:** `apps/community/models.py`, `apps/community/serializers.py`

**Tasks:**
- [ ] Add optional image field to Post model
- [ ] Update Post serializer
- [ ] Modify create post flow
- [ ] Test post creation with image
- [ ] Verify image display on feed

---

### T11.7: Chat Message Enhancement
**Files:** `apps/chat/models.py`, `apps/chat/serializers.py`

**Tasks:**
- [ ] Add optional image field to ChatMessage
- [ ] Update ChatMessage serializer
- [ ] Modify send message flow
- [ ] Test message with image
- [ ] Verify inline display

---

### T11.8: Frontend Upload Components
**Files:** `frontend/src/components/ImageUploader.tsx`, `frontend/src/api/images.ts`

**Tasks:**
- [ ] Create ImageUploader component
- [ ] Add drag & drop support
- [ ] Implement preview functionality
- [ ] Add progress indicator
- [ ] Error handling
- [ ] Write tests

**Features:**
- File picker
- Drag & drop zone
- Preview before upload
- Progress indicator
- Error messages

---

### T11.9: Image Display & Lightbox
**Files:** `frontend/src/components/ImageLightbox.tsx`, `frontend/src/components/PostImage.tsx`

**Tasks:**
- [ ] Create ImageLightbox component
- [ ] Implement PostImage component
- [ ] Add ChatImage component
- [ ] Lazy loading implementation
- [ ] Responsive sizing
- [ ] Write tests

**Features:**
- Full-screen lightbox
- Zoom functionality
- Download button
- Responsive sizing
- Placeholder blur

---

### T11.10: Testing, Security Audit & Deployment
**Tasks:**
- [ ] Unit tests (95%+ coverage)
- [ ] Integration tests
- [ ] Security audit
- [ ] Performance testing
- [ ] E2E tests
- [ ] Deployment checklist

**Security Checks:**
- File type validation
- Size limits (server-side)
- Authentication required
- XSS prevention

**Deployment Checklist:**
- [ ] GCP service account created
- [ ] Buckets created and configured
- [ ] CORS configured
- [ ] Environment variables set
- [ ] Migration executed
- [ ] Celery restarted
- [ ] CDN purged (if applicable)
- [ ] Test upload verified
- [ ] Frontend integration tested

---

## Summary

**Total Tasks:** 10 major tasks  
**Estimated Duration:** 2 weeks  
**Dependencies:** Phase 1-10 complete  
**Priority:** High  

**Deliverables:**
- Image upload functionality
-Thumbnail generation
- Integration with posts and chat
- Frontend components
- Complete test suite
- Deployment-ready
