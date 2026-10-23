---
phase: 16-replace-the-current-screens-with-the-frontend-stitch-designs
plan: 16-04
subsystem: frontend-community
tags: [stitch, react, tailwind, community, discussions, comments, upvoting, skin-v1, material-symbols]

# Dependency graph
requires:
  - phase: 16-03
    provides: candidate dashboard and recruitment timeline components
provides:
  - "Verbatim Stitch Community Discussions Feed matching desktop and mobile layouts (skin-v1)"
  - "Verbatim Stitch Post Detail view with author badge, upvote pill, and 1-level nested comments (skin-v1)"
  - "Create Post modal matching Stitch modal composition with category select and scam/duplicate protection (skin-v1)"
  - "Complete preservation of optimistic upvote toggles with server rollback, Daphne WebSocket chat, and typing wave indicator"
affects: [16-05, 16-06, 16-07]

# Actuals
actuals:
  tasks: 2
  commits: 1

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Verbatim Stitch HTML hierarchy and Tailwind classes scoped with .skin-v1 on CommunityFeedPage, PostDetailPage, and CreatePostModal"
    - "Material Symbols Outlined icons used across post cards, upvote pills, share/report buttons, and composer modal"
    - "Preserved 1-level nested comments tree with autofocus on reply form, draft preservation on failure, and auto-expanding inserted replies"
    - "Complete preservation of all runtime community contracts (listCommunityPosts, vote/unvote rollback, Daphne chat WebSocket)"

key-files:
  created:
    - .planning/phases/TCS-JL-16-replace-the-current-screens-with-the-frontend-stitch-designs/16-04-SUMMARY.md
  modified:
    - frontend/src/pages/CommunityFeedPage.tsx
    - frontend/src/pages/PostDetailPage.tsx
    - frontend/src/components/PostCard.tsx
    - frontend/src/components/CreatePostModal.tsx
---

# Plan 16-04 Summary: Community & Discussions Verbatim Stitch Markup Port

## What Was Done

1. **Community Discussions Feed Port (Task 1):**
   - Ported `CommunityFeedPage.tsx` and `PostCard.tsx` to match `tcs_joining_tracker_community_discussions`, `_feed`, `_empty_filtered_state`, and `_mobile_community_feed` under `.skin-v1`.
   - Updated search input with Material Symbols `search` icon, category filter pills, segmented tab sort control, and pinned announcement card with `push_pin` icon.
   - Updated `PostCard.tsx` with Material Symbols icons for comment count (`chat_bubble`), link copying (`share`), and reporting (`flag`), retaining `UpvotePill` with optimistic vote toggle and server rollback.
   - Preserved debounced search (300ms), URL-synchronized filter state (`category`, `tab`, `search`), pagination footer, and empty/filtered state card.
   - Verified that `CommunityFeedPage.test.tsx`, `CategoryTabs.test.tsx`, and `UpvotePill.test.tsx` pass cleanly (13 tests green).

2. **Post Detail, Comment Thread & Create Post Modal Port (Task 2):**
   - Ported `PostDetailPage.tsx` to match `tcs_joining_tracker_community_post_detail_and_discussion` and `_discussion` under `.skin-v1`.
   - Updated post detail action row with `UpvotePill`, comment count, clipboard link sharing, and report button calling `POST /reports/`.
   - Preserved locked discussion banner, anonymous visitor prompt, and autofocus comment form preserving drafts on failure.
   - Updated `CreatePostModal.tsx` under `.skin-v1` with title input, category selector, discussion body character counter, identity preview (`theater_comedy`), and distinct copy for scam detection (`scam_pattern_detected`) and 60-minute duplicate debounce (`duplicate_post`).
   - Verified complete preservation of real-time WebSocket chat and typing presence wave indicator in `MessagesPage.tsx`.
   - Verified that `PostDetailPage.test.tsx`, `CommentThread.test.tsx`, `CreatePostPage.test.tsx`, and `MessagesPage.test.tsx` pass cleanly (41 tests green).

## Verification

- **Targeted Unit Tests:**
  `npm --prefix frontend run test:run -- src/pages/CommunityFeedPage.test.tsx src/components/CategoryTabs.test.tsx src/components/UpvotePill.test.tsx src/pages/PostDetailPage.test.tsx src/components/CommentThread.test.tsx src/pages/CreatePostPage.test.tsx src/pages/MessagesPage.test.tsx` → **54 passed across 7 test files**.
- **Typecheck:**
  `npm --prefix frontend run typecheck` → **Clean (0 errors)**.
