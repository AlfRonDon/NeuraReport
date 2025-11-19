from __future__ import annotations

from types import SimpleNamespace

import pytest

from backend import api


class DummyResponse:
    def __init__(self, content: str):
        self.choices = [
            SimpleNamespace(message=SimpleNamespace(content=content)),
        ]


@pytest.fixture(autouse=True)
def _patch_state_store(monkeypatch):
    monkeypatch.setattr(api.state_store, "set_last_used", lambda *_args, **_kwargs: None)
    monkeypatch.setattr(api.state_store, "get_template_record", lambda *_args, **_kwargs: {})


@pytest.fixture
def chart_suggest_setup(monkeypatch, tmp_path):
    template_dir = tmp_path / "tpl"
    template_dir.mkdir()
    (template_dir / "contract.json").write_text("{}")
    db_path = template_dir / "db.sqlite"
    db_path.touch()

    def fake_template_dir(template_id: str, **_kwargs):
        return template_dir

    def fake_db_path(_connection_id=None):
        return db_path

    monkeypatch.setattr(api, "_template_dir", fake_template_dir)
    monkeypatch.setattr(api, "_db_path_from_payload_or_default", fake_db_path)
    monkeypatch.setattr(api, "load_contract_v2", lambda *_: None)
    monkeypatch.setattr(api, "call_chat_completion", lambda *args, **_kwargs: DummyResponse('{"charts":[{"id":"chart_1","type":"bar","xField":"batch_index","yFields":["rows"]}]}'))
    monkeypatch.setattr(api, "get_openai_client", lambda: object())

    batches: list[dict[str, object]] = [
        {"id": "batch_1", "rows": 25, "parent": 5},
        {"id": "batch_2", "rows": 30, "parent": 3},
    ]

    def configure_batches(new_batches, batch_metadata=None):
        summary = {
            "batches": new_batches,
            "batches_count": len(new_batches),
            "rows_total": sum(int(item.get("rows", 0)) for item in new_batches),
            "batch_metadata": batch_metadata or {},
        }
        monkeypatch.setattr(api, "discover_batches_and_counts", lambda **_kwargs: summary)

    configure_batches(batches, {"batch_1": {"time": "2024-01-01", "category": "North"}})
    return configure_batches


def _make_request():
    return SimpleNamespace(state=SimpleNamespace(correlation_id=None))


def test_sample_data_only_returned_when_requested(chart_suggest_setup):
    request = _make_request()
    payload = api.ChartSuggestPayload(
        start_date="2024-01-01",
        end_date="2024-01-31",
        key_values=None,
        question="Show rows",
    )
    response = api._chart_suggest_route("tpl_1", payload, request)
    assert response.sample_data is None

    payload_with_sample = api.ChartSuggestPayload(
        start_date="2024-01-01",
        end_date="2024-01-31",
        key_values=None,
        question="Show rows",
        include_sample_data=True,
    )
    response_with_sample = api._chart_suggest_route("tpl_1", payload_with_sample, request)
    assert isinstance(response_with_sample.sample_data, list)
    assert len(response_with_sample.sample_data) == 2
    first_row = response_with_sample.sample_data[0]
    for field in ("batch_index", "batch_id", "rows", "parent", "rows_per_parent"):
        assert field in first_row
    assert response_with_sample.sample_data[0]["batch_index"] == 1


def test_sample_data_is_limited_to_100_rows(chart_suggest_setup):
    large_batches = [{"id": f"batch_{i}", "rows": i, "parent": (i % 3) + 1} for i in range(150)]
    chart_suggest_setup(large_batches)
    payload = api.ChartSuggestPayload(
        start_date="2024-01-01",
        end_date="2024-01-31",
        key_values=None,
        question="limit test",
        include_sample_data=True,
    )
    response = api._chart_suggest_route("tpl_limit", payload, _make_request())
    assert response.sample_data is not None
    assert len(response.sample_data) == 100
    assert response.sample_data[0]["batch_index"] == 1
    assert response.sample_data[-1]["batch_index"] == 100


def test_sample_data_failure_does_not_block_response(monkeypatch, chart_suggest_setup):
    def explode(*_args, **_kwargs):
        raise RuntimeError("boom")

    monkeypatch.setattr(api, "_build_sample_data_rows", explode)
    payload = api.ChartSuggestPayload(
        start_date="2024-01-01",
        end_date="2024-01-31",
        key_values=None,
        question="error tolerance",
        include_sample_data=True,
    )
    response = api._chart_suggest_route("tpl_error", payload, _make_request())
    assert response.sample_data is None
    assert isinstance(response.charts, list)
    assert response.charts, "charts should still be returned"
