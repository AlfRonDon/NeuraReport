import difflib
from pathlib import Path

def show_diff(path, replacements):
    path = Path(path)
    current = path.read_text()
    prev = current
    for new, old in replacements:
        if new not in prev:
            raise SystemExit(f"{new!r} not found in {path}")
        prev = prev.replace(new, old, 1)
    diff = difflib.unified_diff(
        prev.splitlines(),
        current.splitlines(),
        fromfile=str(path) + " (before)",
        tofile=str(path),
        lineterm="",
    )
    print("\n".join(diff))

show_diff('src/pages/Setup/TemplatesPane.jsx', [
    ("import Grid from '@mui/material/Grid2'", "import Grid from '@mui/material/Grid'"),
    ("            <Grid xs={12} sm={6} md={6} key={t.id} sx={{ minWidth: 0 }}>", "            <Grid item xs={12} sm={6} md={6} key={t.id}>")
])
print()
show_diff('src/pages/Setup/UploadVerify.jsx', [
    ("import Grid from '@mui/material/Grid2'", "import Grid from '@mui/material/Grid'"),
    ("            <Grid xs={12} md={7} sx={{ minWidth: 0 }}>", "            <Grid xs={12} md={7}>") ,
    ("            <Grid xs={12} md={5} sx={{ minWidth: 0 }}>", "            <Grid xs_{12} md_{5}>") ,
])
print()
show_diff('src/pages/Generate/GeneratePage.jsx', [
    ("import Grid from '@mui/material/Grid2'", "import Grid from '@mui/material/Unstable_Grid2'"),
    ("            <Grid xs_{12} sm_{6} md_{4} key={t.id} sx={{ minWidth: 0 }}>", "            <Grid item xs_{12} sm_{6} md_{4} key={t.id}>") ,
    ("          <Grid xs_{12} sx={{ minWidth: 0 }}>", "          <Grid item xs_{12}>") ,
    ("      <Grid xs_{12} sx={{ minWidth: 0 }}>", "      <Grid item xs_{12}>") ,
    ("      <Grid xs_{12} sx={{ minWidth: 0 }}>", "      <Grid item xs_{12}>") ,
])
