import os
import uuid
import warnings

import pytest
from fastapi.testclient import TestClient

# Silence noisy deprecation warnings from framework/deps during tests
warnings.filterwarnings("ignore", category=DeprecationWarning)

# Allow "testserver" hostname used by Starlette TestClient.
# Note: pydantic-settings v2 reads field name (ALLOWED_HOSTS_ALL), not
# the Field(env=...) alias.  Set both to be safe.
os.environ["ALLOWED_HOSTS_ALL"] = "true"
os.environ["NEURA_ALLOWED_HOSTS_ALL"] = "true"

# Clear cached settings so the env override takes effect
try:
    from backend.app.services.config import get_settings
    get_settings.cache_clear()
except Exception:
    pass


_ORIGINAL_REQUEST = TestClient.request


def _intent_headers() -> dict[str, str]:
    return {
        "X-Intent-Id": uuid.uuid4().hex,
        "X-Intent-Type": "update",
        "Idempotency-Key": uuid.uuid4().hex,
    }


@pytest.fixture(autouse=True, scope="session")
def _inject_intent_headers():
    def _patched_request(self, method, url, **kwargs):
        if str(method).upper() in {"POST", "PUT", "PATCH", "DELETE"}:
            headers = dict(kwargs.get("headers") or {})
            headers.setdefault("X-Intent-Id", uuid.uuid4().hex)
            headers.setdefault("X-Intent-Type", "update")
            headers.setdefault("Idempotency-Key", uuid.uuid4().hex)
            kwargs["headers"] = headers
        return _ORIGINAL_REQUEST(self, method, url, **kwargs)

    TestClient.request = _patched_request
    yield
    TestClient.request = _ORIGINAL_REQUEST
