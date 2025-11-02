from pathlib import Path

SOURCE_PATH = Path("frontend/src/pages/Setup/ConnectDB.jsx")
EM_DASH = "\u2014"


def replace_em_dash_with_hyphen(file_path: Path) -> None:
    """Normalize em dashes in the target file so downstream linters stay ASCII-only."""
    text = file_path.read_text(encoding="utf-8")
    updated = text.replace(EM_DASH, "-")
    file_path.write_text(updated, encoding="utf-8")


if __name__ == "__main__":
    replace_em_dash_with_hyphen(SOURCE_PATH)
