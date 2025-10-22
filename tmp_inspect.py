from pathlib import Path
from scripts.verify_pipeline import verify_pipeline

TEMPLATE_ID = "ad6a0b1f-d98a-41c2-8ffe-8b651de9100f"
UPLOADS_ROOT = Path("backend/uploads")

success, checks = verify_pipeline(TEMPLATE_ID, UPLOADS_ROOT)
print("success:", success)
for check in checks:
    print(check.name, check.ok, check.detail)
