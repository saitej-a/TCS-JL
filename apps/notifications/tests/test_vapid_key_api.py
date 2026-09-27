"""`GET /api/v1/devices/vapid-key/` tests (9.4 Task 8).

The endpoint exists so the browser can call `PushManager.subscribe` at all. Its
whole risk surface is therefore disclosure: it must be reachable anonymously
(the key is public) and it must never render, cache or leak the private half.
"""

from __future__ import annotations

import pytest
from django.core.cache import cache
from django.test import override_settings
from django.urls import reverse

from apps.notifications.views import VAPID_KEY_CACHE_KEY

URL_NAME = "device-vapid-key"

PUBLIC = "BKxPublicKeyPublicKeyPublicKeyPublicKeyPublicKeyPublicKey"
PRIVATE = "PRIVATE-KEY-MUST-NEVER-APPEAR"


@pytest.fixture(autouse=True)
def clear_vapid_cache():
    cache.delete(VAPID_KEY_CACHE_KEY)
    yield
    cache.delete(VAPID_KEY_CACHE_KEY)


@override_settings(VAPID_PUBLIC_KEY=PUBLIC, VAPID_PRIVATE_KEY=PRIVATE)
def test_anonymous_reader_gets_the_public_key(anon_api):
    """No session at all: the key is what a subscribing browser needs first."""
    response = anon_api.get(reverse(URL_NAME))

    assert response.status_code == 200
    assert response.json() == {"public_key": PUBLIC, "configured": True}


@override_settings(VAPID_PUBLIC_KEY=PUBLIC, VAPID_PRIVATE_KEY=PRIVATE)
def test_response_never_carries_the_private_key(anon_api):
    """The signing secret must not reach the wire in any field."""
    body = anon_api.get(reverse(URL_NAME)).content.decode()

    assert PRIVATE not in body


@override_settings(VAPID_PUBLIC_KEY="", VAPID_PRIVATE_KEY="")
def test_unconfigured_web_push_reports_itself_plainly(anon_api):
    """No key means no subscription: the client skips the primer instead of
    subscribing against an empty `applicationServerKey`."""
    response = anon_api.get(reverse(URL_NAME))

    assert response.status_code == 200
    assert response.json() == {"public_key": "", "configured": False}


@override_settings(VAPID_PUBLIC_KEY=PUBLIC, VAPID_PRIVATE_KEY=PRIVATE)
def test_payload_is_cached_between_reads(anon_api):
    """One cache entry per deploy: a changed setting is served from cache, which
    is what keeps a cold public page from stampeding the settings read."""
    assert anon_api.get(reverse(URL_NAME)).json()["public_key"] == PUBLIC

    with override_settings(VAPID_PUBLIC_KEY="ROTATED-LATER"):
        assert anon_api.get(reverse(URL_NAME)).json()["public_key"] == PUBLIC

    cache.delete(VAPID_KEY_CACHE_KEY)
    with override_settings(VAPID_PUBLIC_KEY="ROTATED-LATER"):
        assert anon_api.get(reverse(URL_NAME)).json()["public_key"] == "ROTATED-LATER"


def test_route_precedes_the_device_detail_route():
    """`/devices/vapid-key/` must not be parsed as a device id (F3 discipline)."""
    assert reverse(URL_NAME) == "/api/v1/devices/vapid-key/"
