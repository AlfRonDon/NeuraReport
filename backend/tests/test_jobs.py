from __future__ import annotations

import sys
import types
from pathlib import Path

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

fernet_module = types.ModuleType("cryptography.fernet")


class _DummyFernet:
    def __init__(self, key):
        self.key = key

    @staticmethod
    def generate_key():
        return b"A" * 44

    def encrypt(self, payload: bytes) -> bytes:
        return payload

    def decrypt(self, token: bytes) -> bytes:
        return token


setattr(fernet_module, "Fernet", _DummyFernet)
setattr(fernet_module, "InvalidToken", Exception)
crypto_module = types.ModuleType("cryptography")
setattr(crypto_module, "fernet", fernet_module)
sys.modules.setdefault("cryptography", crypto_module)
sys.modules.setdefault("cryptography.fernet", fernet_module)

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from .. import api  # noqa: E402
from ..app.services.connections import db_connection as db_conn_module  # noqa: E402
from ..app.services.state import store as state_store_module  # noqa: E402


@pytest.fixture
def fresh_state(tmp_path, monkeypatch):
    base_dir = tmp_path / "state"
    store = state_store_module.StateStore(base_dir=base_dir)
    state_store_module.state_store = store
    api.state_store = store
    db_conn_module.state_store = store
    api.SCHEDULER_DISABLED = True
    api.SCHEDULER = None

    upload_root = tmp_path / "uploads"
    upload_root.mkdir(parents=True, exist_ok=True)
    monkeypatch.setattr(api, "UPLOAD_ROOT", upload_root)
    monkeypatch.setattr(api, "UPLOAD_ROOT_BASE", upload_root.resolve())
    excel_root = tmp_path / "excel-uploads"
    excel_root.mkdir(parents=True, exist_ok=True)
    monkeypatch.setattr(api, "EXCEL_UPLOAD_ROOT", excel_root)
    monkeypatch.setattr(api, "EXCEL_UPLOAD_ROOT_BASE", excel_root.resolve())
    monkeypatch.setitem(api._UPLOAD_KIND_BASES, "pdf", (upload_root.resolve(), "/uploads"))
    monkeypatch.setitem(api._UPLOAD_KIND_BASES, "excel", (excel_root.resolve(), "/excel-uploads"))
    return store


@pytest.fixture
def client(fresh_state):
    return TestClient(api.app)


def _seed_template(store, template_id="tpl-job", name="Job Template", kind="pdf"):
    store.upsert_template(template_id, name=name, status="approved", template_type=kind)


def test_job_creation_and_retrieval(client: TestClient, fresh_state, monkeypatch):
    _seed_template(fresh_state, template_id="tpl-create")

    scheduled_ids: list[str] = []

    def immediate_schedule(job_id, payload_data, kind, correlation_id, step_progress):
        scheduled_ids.append(job_id)

    monkeypatch.setattr(api, "_schedule_report_job", immediate_schedule)

    payload = {
        "template_id": "tpl-create",
        "start_date": "2024-01-01 00:00:00",
        "end_date": "2024-01-31 23:59:59",
    }
    resp = client.post("/jobs/run-report", json=payload)
    assert resp.status_code == 200
    job_id = resp.json()["job_id"]
    assert job_id
    assert job_id in scheduled_ids

    detail = client.get(f"/jobs/{job_id}")
    assert detail.status_code == 200
    job = detail.json()["job"]
    assert job["status"] in {"queued", "running"}
    assert job["createdAt"] is not None
    assert isinstance(job["steps"], list)

    active_resp = client.get("/jobs", params={"active_only": "true"})
    assert active_resp.status_code == 200
    active_ids = [item["id"] for item in active_resp.json()["jobs"]]
    assert job_id in active_ids


def test_job_run_success_records_steps(client: TestClient, fresh_state, monkeypatch):
    _seed_template(fresh_state, template_id="tpl-success")

    def fake_run_report_with_email(payload, *, kind, correlation_id=None, job_tracker=None):
        if job_tracker:
            job_tracker.step_running("dataLoad", label="Load DB")
            job_tracker.step_succeeded("dataLoad", progress=25)
            job_tracker.step_running("renderPdf", label="Render PDF artifacts")
            job_tracker.step_succeeded("renderPdf", progress=80)
        return {"ok": True, "template_id": payload.template_id}

    def immediate_schedule(job_id, payload_data, kind, correlation_id, step_progress):
        api._run_report_job_sync(job_id, payload_data, kind, correlation_id, step_progress)

    monkeypatch.setattr(api, "_run_report_with_email", fake_run_report_with_email)
    monkeypatch.setattr(api, "_schedule_report_job", immediate_schedule)

    payload = {
        "template_id": "tpl-success",
        "start_date": "2024-02-01 00:00:00",
        "end_date": "2024-02-15 23:59:59",
    }
    resp = client.post("/jobs/run-report", json=payload)
    job_id = resp.json()["job_id"]

    job = client.get(f"/jobs/{job_id}").json()["job"]
    assert job["status"] == "succeeded"
    assert job["progress"] == 100
    step_names = {step["name"]: step["status"] for step in job["steps"]}
    assert step_names.get("dataLoad") == "succeeded"
    assert step_names.get("renderPdf") == "succeeded"


def test_job_run_failure_captures_error(client: TestClient, fresh_state, monkeypatch):
    _seed_template(fresh_state, template_id="tpl-fail")

    def fake_run_report_with_email(payload, *, kind, correlation_id=None, job_tracker=None):
        if job_tracker:
            job_tracker.step_running("dataLoad", label="Load DB")
            job_tracker.step_failed("dataLoad", "Database unreachable")
        raise HTTPException(status_code=400, detail={"message": "Simulated failure"})

    def immediate_schedule(job_id, payload_data, kind, correlation_id, step_progress):
        api._run_report_job_sync(job_id, payload_data, kind, correlation_id, step_progress)

    monkeypatch.setattr(api, "_run_report_with_email", fake_run_report_with_email)
    monkeypatch.setattr(api, "_schedule_report_job", immediate_schedule)

    payload = {
        "template_id": "tpl-fail",
        "start_date": "2024-03-01 00:00:00",
        "end_date": "2024-03-05 23:59:59",
    }
    resp = client.post("/jobs/run-report", json=payload)
    job_id = resp.json()["job_id"]

    job = client.get(f"/jobs/{job_id}").json()["job"]
    assert job["status"] == "failed"
    assert "Simulated failure" in (job["error"] or "")
    step_names = {step["name"]: step["status"] for step in job["steps"]}
    assert step_names.get("dataLoad") == "failed"


def test_job_listing_filters_respect_status_and_type(client: TestClient, fresh_state):
    queued = fresh_state.create_job(
        job_type="run_report",
        template_id="tpl-queued",
        template_name="Queued Template",
        template_kind="pdf",
    )
    running = fresh_state.create_job(
        job_type="run_report",
        template_id="tpl-running",
        template_name="Running Template",
        template_kind="pdf",
    )
    fresh_state.record_job_start(running["id"])
    succeeded = fresh_state.create_job(
        job_type="run_report",
        template_id="tpl-done",
        template_name="Done Template",
        template_kind="pdf",
    )
    fresh_state.record_job_start(succeeded["id"])
    fresh_state.record_job_completion(succeeded["id"], status="succeeded", result={"ok": True})
    verify_job = fresh_state.create_job(
        job_type="verify",
        template_id="tpl-verify",
        template_name="Verify Template",
        template_kind="pdf",
    )
    fresh_state.record_job_completion(verify_job["id"], status="failed", error="verify failed")

    running_only = client.get("/jobs", params={"status": "running"}).json()["jobs"]
    assert {job["id"] for job in running_only} == {running["id"]}

    type_filtered = client.get("/jobs", params={"type": "verify"}).json()["jobs"]
    assert {job["id"] for job in type_filtered} == {verify_job["id"]}

    limited = client.get("/jobs", params={"limit": 1}).json()["jobs"]
    assert len(limited) == 1

    active_only = client.get("/jobs", params={"active_only": "true"}).json()["jobs"]
    assert {job["id"] for job in active_only} == {queued["id"], running["id"]}
