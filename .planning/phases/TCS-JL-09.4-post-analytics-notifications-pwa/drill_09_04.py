"""Live-drill seeder for Phase 9.4 (run inside the web container).

Task 9's proofs run against the compose stack in a real browser, so the dev
database needs a known cohort, a known login, and the three notification rows
the §7.10 screen draws. This script creates exactly that and nothing else, tags
every row it creates (the `DRILL_REGION` cohort string and `DRILL_EMAIL_DOMAIN`),
and can remove them again — so the proof data never becomes the next phase's
surprise baseline.

Seeded:
- one verified, profile-complete login (`demo@drill.example` / `DrillPass123!`)
  plus a cohort of candidates (6 per status) so the analytics screen has
  publishable rows rather than suppression copy;
- three community posts by other candidates — one with a threaded comment set,
  one locked (COMM-06's banner);
- three unread notifications for the demo login: a comment, a vote milestone
  and a timeline reminder (the three §7.10 row types).

What it proves (with the browser proofs on top): every 9.4 surface has real
payloads to render, and a denied/absent push path still leaves the screens
usable.

Usage:
    docker compose exec -T web python .planning/phases/<this>/drill_09_04.py
    docker compose exec -T web python .planning/phases/<this>/drill_09_04.py --cleanup
"""

from __future__ import annotations

import os
import sys
from datetime import date, timedelta

sys.path.insert(0, os.path.abspath("."))

import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.local")
django.setup()

from apps.accounts.models import User  # noqa: E402
from apps.candidates.models import CandidateProfile  # noqa: E402
from apps.community.models import Comment, Post  # noqa: E402
from apps.notifications.models import Notification  # noqa: E402

DRILL_REGION = "Drillville"
DRILL_EMAIL_DOMAIN = "drill.example"
DRILL_PASSWORD = "DrillPass123!"

DEMO_EMAIL = f"demo@{DRILL_EMAIL_DOMAIN}"

# 6 per status keeps every §7.9 row at or above the `<5` privacy floor.
COHORT_STATUSES = [
    (CandidateProfile.Status.WAITING_FOR_JOINING_LETTER, 6),
    (CandidateProfile.Status.JOINING_LETTER_RECEIVED, 6),
    (CandidateProfile.Status.JOINING_DATE_RECEIVED, 6),
    (CandidateProfile.Status.JOINED, 6),
    (CandidateProfile.Status.READINESS_SURVEY, 6),
    (CandidateProfile.Status.WITHDRAWN, 6),
]


def cleanup() -> None:
    """Remove every row this drill tags — users first (FKs cascade)."""
    emails = list(
        User.objects.filter(email__endswith=f"@{DRILL_EMAIL_DOMAIN}").values_list(
            "email", flat=True
        )
    )
    Notification.objects.filter(recipient__email__in=emails).delete()
    Comment.objects.filter(author__email__in=emails).delete()
    Post.objects.filter(author__email__in=emails).delete()
    CandidateProfile.objects.filter(region=DRILL_REGION).delete()
    User.objects.filter(email__in=emails).delete()
    print(f"cleanup: removed {len(emails)} drill users and their content")


def seed() -> None:
    cleanup()

    demo, created = User.objects.get_or_create(
        email=DEMO_EMAIL,
        defaults={"is_verified": True, "is_active": True},
    )
    demo.is_verified = True
    demo.is_active = True
    demo.set_password(DRILL_PASSWORD)
    demo.save()
    CandidateProfile.objects.update_or_create(
        user=demo,
        defaults=dict(
            display_name="Demo Candidate",
            public_identity_mode=CandidateProfile.PublicIdentityMode.DISPLAY_NAME,
            batch="2025",
            hiring_type=CandidateProfile.HiringType.DIGITAL,
            region=DRILL_REGION,
            current_status=CandidateProfile.Status.JOINING_LETTER_RECEIVED,
            interview_date=date(2026, 3, 10),
            offer_letter_date=date(2026, 4, 2),
            expected_joining_date=date(2026, 11, 3),
        ),
    )

    authors = []
    for index in range(40):
        email = f"drill-{index}@{DRILL_EMAIL_DOMAIN}"
        user, _ = User.objects.get_or_create(
            email=email, defaults={"is_verified": True, "is_active": True}
        )
        status = COHORT_STATUSES[index % len(COHORT_STATUSES)][0]
        CandidateProfile.objects.update_or_create(
            user=user,
            defaults=dict(
                display_name=f"Candidate {index + 1}",
                batch="2025",
                hiring_type=CandidateProfile.HiringType.DIGITAL,
                region=DRILL_REGION,
                current_status=status,
                offer_letter_date=date(2026, 4, 1) + timedelta(days=index),
            ),
        )
        authors.append(user)

    thread = Post.objects.create(
        author=authors[0],
        title="Anyone from the 2025 Digital Hyderabad batch received the joining letter?",
        body=(
            "Sharing what I have so far: offer letter in April, readiness survey done in "
            "June, and the portal still shows 'in process'.\n\n"
            "Posting here in case others in the same wave have news."
        ),
        category="JOINING_LETTER",
    )
    top = Comment.objects.create(
        post=thread,
        author=authors[1],
        body="Mine arrived last week — Chennai batch 1, joining date is in November.",
    )
    Comment.objects.create(
        post=thread,
        author=authors[2],
        parent=top,
        body="That is encouraging. Did the portal status change before the letter arrived?",
    )
    Comment.objects.create(
        post=thread,
        author=authors[3],
        body="Still waiting here. Following this thread.",
    )
    locked = Post.objects.create(
        author=authors[1],
        title="Pinned: how to share document timelines safely",
        body="Use this thread for document timelines only. Off-topic replies will be removed.",
        category="GENERAL",
        is_locked=True,
    )
    Post.objects.create(
        author=authors[2],
        title="Suggestion: batch-wise wait time averages",
        body="Could the analytics screen break the average wait down by hiring stream?",
        category="SUGGESTIONS" if False else "GENERAL",
    )

    Notification.objects.create(
        recipient=demo,
        type=Notification.NotificationType.REPLY,
        title="New Reply to Your Comment",
        message=(
            "Candidate 3 replied to your comment on 'Anyone from the 2025 Digital "
            "Hyderabad batch received the joining letter?': 'That is encouraging.'"
        ),
        post=thread,
        comment=top,
    )
    Notification.objects.create(
        recipient=demo,
        type=Notification.NotificationType.VOTE_MILESTONE,
        title="Your post reached 40 upvotes",
        message="Your post 'Anyone from the 2025 Digital Hyderabad batch received the joining letter?' just passed 40 upvotes.",
        post=thread,
    )
    Notification.objects.create(
        recipient=demo,
        type=Notification.NotificationType.TIMELINE_REMINDER,
        title="Reminder: update your timeline",
        message="Don't forget to update your timeline if your portal status changed!",
    )

    print(f"login: {DEMO_EMAIL} / {DRILL_PASSWORD}")
    print(f"post detail: /community/posts/{thread.id}")
    print(f"locked post: /community/posts/{locked.id}")
    print(f"notifications: 3 unread for {DEMO_EMAIL}")
    print(
        "cohort: "
        f"{CandidateProfile.objects.filter(region=DRILL_REGION).count()} candidates in {DRILL_REGION}"
    )


if __name__ == "__main__":
    if "--cleanup" in sys.argv:
        cleanup()
    else:
        seed()
