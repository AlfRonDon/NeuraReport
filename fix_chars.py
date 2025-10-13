from pathlib import Path
path = Path(r'frontend/src/pages/Setup/ConnectDB.jsx')
data = path.read_text(encoding='utf-8')
data = data.replace("'�?"'", "'—'")
path.write_text(data, encoding='utf-8')
