"""Root test isolation: throttle state must not leak between tests.

Two pollution channels exist now that community writes actually throttle
(9.3 D4) and anonymous community reads are throttled (9.3 D1):

1. ``settings.REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"][...] = "2/min"`` mutates
   a dict *in place* — pytest-django's ``settings`` fixture restores attribute
   assignments, not nested dict contents — so a rate shrunk for one test leaks
   into every later test in the process. The autouse fixture snapshots the
   mapping before the test and restores it after. **The restore must happen in
   place** (``clear()`` + ``update()``): DRF's ``api_settings`` caches
   ``DEFAULT_THROTTLE_RATES`` as a reference to the dict object on first
   access, so reassigning a fresh dict desyncs the cache and rate mutations
   silently stop taking effect.
2. DRF's throttle history lives in the cache keyed by ident, and all test
   traffic shares one ident (127.0.0.1 / testserver), so one test's
   half-consumed bucket 429s an unrelated later test. The autouse fixture
   clears the cache *before* each test; cache state within a single test
   behaves exactly as before.

It also carries two **opt-in** fixtures for push configuration (9.4 F-94-3):
`PUSH_BACKEND=auto` resolves to Web Push whenever VAPID keys are configured, and
`_setting_or_env` reads settings *then* the environment, so a developer running
with VAPID exported — or the drill's `docker-compose.override.yml` — changes what
`auto` and the recording-double captures mean. Tests that assert either must pin
it rather than inherit it.
"""

import pytest


@pytest.fixture
def no_vapid_config(monkeypatch, settings):
    """Pin "VAPID is not configured" so `auto` cannot resolve to Web Push.

    Clears both channels `_setting_or_env` reads: the settings attribute (which
    wins) and the environment variable it falls back to. Without this, an
    `auto`-resolution test asserts a different branch depending on the machine it
    runs on — which is exactly how the suite went red for anyone with VAPID set
    while Task 9 recorded a green run (9.4 F-94-3).
    """
    for name in ("VAPID_PUBLIC_KEY", "VAPID_PRIVATE_KEY", "VAPID_SUBJECT"):
        monkeypatch.delenv(name, raising=False)
        setattr(settings, name, "")


@pytest.fixture
def recording_push_backend(settings):
    """Pin the recording double and hand it back cleared.

    For tests that *capture* what was sent: they need the double regardless of
    ambient VAPID configuration, and they need it empty at the start.
    """
    from apps.notifications.backends import get_recording_push_backend

    settings.PUSH_BACKEND = "recording"
    backend = get_recording_push_backend()
    backend.clear()
    return backend


@pytest.fixture(autouse=True)
def _isolated_throttle_state(settings):
    rates = settings.REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"]
    saved = dict(rates)

    from django.core.cache import cache

    cache.clear()
    yield
    rates.clear()  # in-place restore — see module docstring re: DRF's cache
    rates.update(saved)
