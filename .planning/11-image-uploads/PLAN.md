# Phase 11: Image Uploads - Implementation Plan

## Overview
This phase adds comprehensive image upload support to community posts and chat messages using Google Cloud Storage (GCS).

## Implementation Steps

### Step 1: GCS Backend Setup
- Create `images` Django app
- Configure GCS integration
- Set up utility functions for upload/download

### Step 2: Database Models
- Create Image model with metadata
- Add indexes for performance

### Step 3: Upload API
- Implement upload endpoint
- Add validation and security checks

### Step 4: Image Processing
- Celery tasks for thumbnail generation
- WebP conversion
- Optimization

### Step 5: Post/Chat Integration
- Update Post model with optional image
- Update ChatMessage model
- Update serializers

### Step 6: Frontend Components
- Upload components (buttons, dropzone)
- Display components (lightboxes, responsive images)

## Dependencies
- Phase 1-10 (existing infrastructure)
- GCP credits (already available)

## Timeline
- Week 1: Backend (T11.1-T11.5)
- Week 2: Integration & Frontend (T11.6-T11.10)

## Files to Create/Modify

### Backend Files
1. `apps/images/models.py` - Image model
2. `apps/images/serializers.py` - Serializers
3. `apps/images/views.py` - Upload endpoint
4. `apps/images/services.py` - GCS utility functions
5. `apps/images/tasks.py` - Celery tasks
6. `config/settings/gcs.py` - GCS configuration

### Frontend Files
1. `frontend/src/components/ImageUploader.tsx` - Upload component
2. `frontend/src/components/ImageLightbox.tsx` - Lightbox
3. `frontend/src/api/images.ts` - Image API client
4. Update existing community/chat components

## Acceptance Criteria
- [ ] Images can be uploaded
- [ ] Thumbnails generated
- [ ] Images display in posts and chat
- [ ] Security validation passes
- [ ] Performance targets met
