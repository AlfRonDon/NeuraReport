#!/usr/bin/env python

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from backend.app.services.utils.validation import (  # noqa: E402  # pylint: disable=wrong-import-position
    validate_contract_v2,
    validate_mapping_inline_v4,
)


def iter_raw_outputs(path: Path):
    text = path.read_text(encoding="utf-8").replace("\r", "")
    pattern = re.compile(r"##\s+[^\n]+\s+-\s+([^\n]+)\s+```json\s+(.*?)```", re.S)
    for match in pattern.finditer(text):
        call_name = match.group(1).strip()
        outer_payload = json.loads(match.group(2))
        choices = outer_payload.get("choices") or []
        if not choices:
            continue
        content = choices[0].get("message", {}).get("content", "").strip()
        if not content:
            continue
        yield call_name, json.loads(content)


def main() -> int:
    raw_path = REPO_ROOT / "backend" / "llm_raw_outputs.md"
    issues: list[str] = []
    for call_name, payload in iter_raw_outputs(raw_path):
        try:
            if "call_3" in call_name:
                validate_mapping_inline_v4(payload)
            elif "call_4" in call_name:
                contract = payload.get("contract")
                if contract is None:
                    raise ValueError("call_4 payload missing contract")
                require_join = bool(contract.get("join"))
                validate_contract_v2(contract, require_join=require_join)
            elif "call_5" in call_name:
                contract = payload.get("contract")
                if contract is None:
                    raise ValueError("call_5 payload missing contract")
                require_join = bool(contract.get("join"))
                validate_contract_v2(contract, require_join=require_join)
            else:
                continue
        except Exception as exc:  # pragma: no cover - test harness
            issues.append(f"{call_name}: {exc}")

    if issues:
        for issue in issues:
            print(issue)
        return 1

    print("All LLM raw outputs validated successfully.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
