"""Device-token routing for push dispatch (9.4 F-94-1).

The bug this file pins: `auto` resolves to Web Push as soon as VAPID keys exist
(the only configuration Web Push works in), and the task used to hand that
backend **every** active device's token. An Android/iOS row holds an opaque FCM
id, which `WebPushBackend` correctly classifies as a non-subscription —
permanent, not retryable — so step 7's stale-token sweep then silently
deactivated a live device on the first notification.

Routing by `Device.device_type` is the fix. These tests assert both halves: the
backend is never handed a token from the other vocabulary, and the row survives.
"""

from __future__ import annotations

import json

import pytest
from django.test import override_settings
from unittest.mock import patch

from apps.notifications.backends import (
    FCM_DEVICE_TYPES,
    WEB_DEVICE_TYPE,
    FirebasePushBackend,
    RecordingPushBackend,
    SendResult,
    WebPushBackend,
    get_push_backend,
)
from apps.notifications.models import Device, Notification
from apps.notifications.tasks import send_push_notification

NATIVE_TOKEN = "fcm_native_opaque_android_token_1234567890"


def web_subscription() -> str:
    """The token column's WEB vocabulary: a `PushManager.subscribe()` JSON."""
    return json.dumps(
        {
            "endpoint": "http://127.0.0.1:9/deadbeef",
            "keys": {"p256dh": "p256dh-key", "auth": "auth-key"},
        }
    )


@pytest.fixture
def auto_webpush(settings):
    """`auto` with VAPID configured — the configuration that triggers the bug."""
    settings.PUSH_BACKEND = "auto"
    settings.VAPID_PUBLIC_KEY = "BFakePublicKey"
    settings.VAPID_PRIVATE_KEY = "RfakePrivateKey"
    return settings


def _notification_for(user) -> Notification:
    # MODERATION is gated by `push_enabled` alone — no category flag, no debounce.
    return Notification.objects.create(
        recipient=user,
        type=Notification.NotificationType.MODERATION,
        title="In-app title",
        message="In-app message",
    )


# --- the vocabulary declarations themselves -------------------------------------


def test_vocabulary_constants_match_the_model_choices():
    """The literals here are model-free by design — so a rename must fail loudly."""
    choices = {value for value, _label in Device.DeviceType.choices}
    assert WEB_DEVICE_TYPE == Device.DeviceType.WEB
    assert FCM_DEVICE_TYPES == choices - {Device.DeviceType.WEB}


def test_each_adapter_declares_the_types_it_speaks():
    with override_settings(VAPID_PUBLIC_KEY="k", VAPID_PRIVATE_KEY="k"):
        webpush = WebPushBackend()
    firebase = FirebasePushBackend()
    recording = RecordingPushBackend()

    assert webpush.handles_device_type(Device.DeviceType.WEB) is True
    assert webpush.handles_device_type(Device.DeviceType.ANDROID) is False
    assert webpush.handles_device_type(Device.DeviceType.IOS) is False
    assert webpush.handles_device_type(Device.DeviceType.FIREBASE_WEB) is False

    assert firebase.handles_device_type(Device.DeviceType.ANDROID) is True
    assert firebase.handles_device_type(Device.DeviceType.IOS) is True
    assert firebase.handles_device_type(Device.DeviceType.FIREBASE_WEB) is True
    # Legacy WEB rows contain a PushManager subscription, not an FCM token.
    assert firebase.handles_device_type(Device.DeviceType.WEB) is False

    # The double stays type-agnostic so it can stand in for either adapter.
    for device_type in ("WEB", "FIREBASE_WEB", "ANDROID", "IOS", "OTHER"):
        assert recording.handles_device_type(device_type) is True


# --- dispatch routing -----------------------------------------------------------


def test_auto_with_vapid_sends_only_the_web_token_and_keeps_native_rows_active(
    auto_webpush, make_user, make_device
):
    """The regression: one push used to deactivate the user's Android device."""
    user = make_user()
    android = make_device(
        user=user, fcm_token=NATIVE_TOKEN, device_type=Device.DeviceType.ANDROID
    )
    firebase_web = make_device(
        user=user,
        fcm_token="firebase-web-token-123456789",
        device_type=Device.DeviceType.FIREBASE_WEB,
    )
    web = make_device(
        user=user, fcm_token=web_subscription(), device_type=Device.DeviceType.WEB
    )
    notification = _notification_for(user)

    backend = get_push_backend()
    assert isinstance(backend, WebPushBackend)

    # Patch the class, not an instance: the task resolves its own backend.
    with patch.object(
        WebPushBackend,
        "send_multicast",
        return_value=SendResult(success_count=1, failure_count=0),
    ) as send:
        send_push_notification.apply(args=[str(notification.id)]).get()

    assert send.call_count == 1
    assert send.call_args.kwargs["tokens"] == [web.fcm_token]

    android.refresh_from_db()
    firebase_web.refresh_from_db()
    web.refresh_from_db()
    assert android.is_active is True, "a native row must never be deactivated by web-push routing"
    assert firebase_web.is_active is True, "an FCM web token must not reach Web Push"
    assert web.is_active is True


def test_auto_with_vapid_skips_a_native_only_user_instead_of_killing_the_device(
    auto_webpush, make_user, make_device
):
    """No compatible device is a skip, not a deactivation — and not a send."""
    user = make_user()
    android = make_device(
        user=user, fcm_token=NATIVE_TOKEN, device_type=Device.DeviceType.ANDROID
    )
    notification = _notification_for(user)

    result = send_push_notification.apply(args=[str(notification.id)]).get()

    assert result is False
    android.refresh_from_db()
    assert android.is_active is True


def test_firebase_backend_never_receives_a_web_subscription(
    make_user, make_device
) -> None:
    """The mirror case: FCM must not be handed the browser's subscription JSON."""
    user = make_user()
    web = make_device(
        user=user, fcm_token=web_subscription(), device_type=Device.DeviceType.WEB
    )
    notification = _notification_for(user)

    backend = FirebasePushBackend()
    assert backend.device_types == FCM_DEVICE_TYPES
    with override_settings(PUSH_BACKEND="firebase"), patch.object(
        FirebasePushBackend,
        "send_multicast",
        return_value=SendResult(success_count=0, failure_count=0),
    ) as send:
        result = send_push_notification.apply(args=[str(notification.id)]).get()

    assert result is False
    assert send.call_count == 0
    web.refresh_from_db()
    assert web.is_active is True


def test_firebase_backend_delivers_to_firebase_web_tokens(
    make_user, make_device
) -> None:
    user = make_user()
    web = make_device(
        user=user,
        fcm_token="firebase-web-token-123456789",
        device_type=Device.DeviceType.FIREBASE_WEB,
    )
    notification = _notification_for(user)

    with override_settings(PUSH_BACKEND="firebase"), patch.object(
        FirebasePushBackend,
        "send_multicast",
        return_value=SendResult(success_count=1, failure_count=0),
    ) as send:
        result = send_push_notification.apply(args=[str(notification.id)]).get()

    assert result is True
    assert send.call_count == 1
    assert send.call_args.kwargs["tokens"] == [web.fcm_token]
    web.refresh_from_db()
    assert web.is_active is True


def test_recording_backend_still_receives_every_device(
    settings, make_user, make_device
):
    """Dev/CI parity: with the double configured, routing must not filter anything."""
    settings.PUSH_BACKEND = "recording"
    user = make_user()
    android = make_device(
        user=user, fcm_token=NATIVE_TOKEN, device_type=Device.DeviceType.ANDROID
    )
    web = make_device(
        user=user, fcm_token=web_subscription(), device_type=Device.DeviceType.WEB
    )
    notification = _notification_for(user)

    backend = get_push_backend()
    assert isinstance(backend, RecordingPushBackend)
    backend.clear()

    send_push_notification.apply(args=[str(notification.id)]).get()

    assert len(backend.sent_messages) == 1
    assert sorted(backend.sent_messages[0]["tokens"]) == sorted(
        [android.fcm_token, web.fcm_token]
    )
