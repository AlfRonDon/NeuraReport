from __future__ import annotations

import json
from types import SimpleNamespace

from backend.app.services.mapping import AutoMapInline as AMI


def _fake_builder(html: str, catalog, schema):
    return {"system": "s", "user": "u", "attachments": []}


def main() -> None:
    html = (
        "<html><table><thead><tr>"
        "<th data-label=\"material_name\">Material Name</th>"
        "</tr></thead><tbody><tr>"
        "<td>{row_material_name}</td>"
        "</tr></tbody></table></html>"
    )
    catalog = ["recipes.material_name"]
    schema = None

    mapping_payload = {
        "mapping": {"material_name": "recipes.material_name"},
        "token_samples": {"row_material_name": "CEMENT"},
        "meta": {"unresolved": [], "hints": {}},
    }

    def _fake_llm_response(*args, **kwargs):
        return SimpleNamespace(
            choices=[
                SimpleNamespace(
                    message=SimpleNamespace(content=json.dumps(mapping_payload))
                )
            ]
        )

    # Monkeypatch the LLM call inside the module
    AMI.call_chat_completion = _fake_llm_response  # type: ignore
    AMI.get_openai_client = lambda: object()  # type: ignore

    result = AMI.run_llm_call_3(
        template_html=html,
        catalog=catalog,
        schema=schema,
        prompt_version="excel_llm_call_3_v1",
        png_path="",
        cache_key="test",
        prompt_builder=_fake_builder,
        allow_missing_tokens=False,
    )

    assert "row_material_name" not in result.constant_replacements
    assert "{row_material_name}" in result.html_constants_applied
    print("OK: Excel automap does not inline row_* tokens")


if __name__ == "__main__":
    main()

