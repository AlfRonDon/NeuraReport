import json
import re
from pathlib import Path
text = Path('backend/llm_raw_outputs.md').read_text(encoding='utf-8')
# Find the last block like "content": "{...}" (with escaped quotes)
matches = list(re.finditer(r'"content": "(\{[\s\S]*?)"\n\s*}\n\s*}\n\s*}', text))
if not matches:
    raise SystemExit('no match')
raw = matches[-1].group(1)
# Unescape JSON string
raw_json = raw.encode('utf-8').decode('unicode_escape')
contract_payload = json.loads(raw_json)['contract']
blueprint = json.loads(Path('uploads/ae0bf650-f57a-4d7e-b32f-5c8c67673847/contract_v2_meta.json').read_text(encoding='utf-8'))['contract_payload']
import sys
if contract_payload == blueprint:
    print('equal')
else:
    from pprint import pprint
    print('differences found')
    keys = set(contract_payload.keys()) | set(blueprint.keys())
    for key in sorted(keys):
        if contract_payload.get(key) != blueprint.get(key):
            print('key', key)
            print('contract:', contract_payload.get(key))
            print('blueprint:', blueprint.get(key))
            print()
