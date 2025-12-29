import sqlite3
from pathlib import Path

db_path = Path(r"C:\Users\alfre\Downloads\NeuraReport\test.db")
con = sqlite3.connect(db_path)
cur = con.cursor()
cur.execute("PRAGMA table_info('neuract__RUNHOURS')")
machines_raw = sorted({row[1] for row in cur.fetchall() if len(row) > 1 and "hrs" in str(row[1]).lower()})
machines = []
for name in machines_raw:
    text = str(name or "")
    if text.lower().endswith("_hrs"):
        text = text[:-len("_HRS")]
    machines.append(text)
machines = sorted(set(machines))
cur.execute("DROP TABLE IF EXISTS runtime_machine_keys")
cur.execute("DROP VIEW IF EXISTS runtime_machine_keys")
cur.execute("CREATE TABLE runtime_machine_keys (machine_name TEXT PRIMARY KEY)")
cur.executemany("INSERT INTO runtime_machine_keys(machine_name) VALUES (?)", [(m,) for m in machines])
con.commit()
print(cur.execute("SELECT COUNT(*) FROM runtime_machine_keys").fetchone()[0])
print(cur.execute("SELECT machine_name FROM runtime_machine_keys ORDER BY machine_name LIMIT 10").fetchall())
con.close()
