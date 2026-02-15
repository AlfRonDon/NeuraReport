# NeuraReport Production Deployment

Deployed on **2026-01-30** via prodo.

## Structure

```
prodo/
├── backend/          # FastAPI backend (uvicorn)
│   ├── .env          # Backend environment variables
│   ├── .venv/        # Python virtual environment
│   ├── api.py        # Entry point
│   ├── app/          # Application code
│   ├── legacy/       # Legacy modules
│   ├── uploads/      # File uploads
│   ├── uploads_excel/# Excel uploads
│   ├── state/        # SQLite state & DB files
│   └── ...
├── frontend/         # Static Vite build (React)
│   ├── index.html
│   └── assets/
├── config/
│   ├── ports.env     # Port configuration
│   └── deployment.env# Deployment environment
├── logs/
│   ├── backend.log
│   ├── backend.error.log
│   ├── frontend.log
│   └── frontend.error.log
└── README.md
```

## Services

| Service | Systemd Unit | Port | URL |
|---------|-------------|------|-----|
| Backend (FastAPI/uvicorn) | `neurareport-backend.service` | 9070 | http://0.0.0.0:9070 |
| Frontend (http-server) | `neurareport-frontend.service` | 9071 | http://0.0.0.0:9071 |

## URLs

### Local
- **Frontend:** http://127.0.0.1:9071
- **Backend API:** http://127.0.0.1:9070
- **Backend Docs:** http://127.0.0.1:9070/docs
- **Backend Health:** http://127.0.0.1:9070/health

### Network
- **Frontend:** http://192.168.1.20:9071
- **Backend API:** http://192.168.1.20:9070
- **Backend Docs:** http://192.168.1.20:9070/docs

## Management Commands

### Check status
```bash
systemctl --user status neurareport-backend.service
systemctl --user status neurareport-frontend.service
```

### Restart services
```bash
systemctl --user restart neurareport-backend.service
systemctl --user restart neurareport-frontend.service
```

### Stop services
```bash
systemctl --user stop neurareport-backend.service
systemctl --user stop neurareport-frontend.service
```

### Start services
```bash
systemctl --user start neurareport-backend.service
systemctl --user start neurareport-frontend.service
```

### Reload systemd after editing service files
```bash
systemctl --user daemon-reload
```

## Logs

```bash
# Backend logs
tail -f /home/rohith/desktop/NeuraReport/prodo/logs/backend.log
tail -f /home/rohith/desktop/NeuraReport/prodo/logs/backend.error.log

# Frontend logs
tail -f /home/rohith/desktop/NeuraReport/prodo/logs/frontend.log
tail -f /home/rohith/desktop/NeuraReport/prodo/logs/frontend.error.log

# Systemd journal
journalctl --user -u neurareport-backend.service -f
journalctl --user -u neurareport-frontend.service -f
```

## Health Checks

```bash
# Backend
curl -s http://127.0.0.1:9070/health
curl -s http://127.0.0.1:9070/docs

# Frontend
curl -s http://127.0.0.1:9071/
```

## Configuration

- **Ports:** `prodo/config/ports.env`
- **Environment:** `prodo/config/deployment.env`
- **Backend .env:** `prodo/backend/.env` (read by pydantic-settings and env_loader)

### Key environment variables
| Variable | Description |
|----------|-------------|
| `NEURA_JWT_SECRET` / `JWT_SECRET` | JWT signing secret (required) |
| `NEURA_ALLOW_MISSING_OPENAI` | Allow running without OpenAI key |
| `UPLOAD_ROOT` | Path for file uploads |
| `EXCEL_UPLOAD_ROOT` | Path for Excel uploads |
| `NEURA_STATE_DIR` | Path for state/SQLite DBs |

## Database Backup

```bash
# Backup SQLite databases
cp /home/rohith/desktop/NeuraReport/prodo/backend/state/*.db /path/to/backup/
```

## Troubleshooting

1. **Backend won't start:** Check `prodo/logs/backend.error.log` and ensure `prodo/backend/.env` has a valid `JWT_SECRET` (not "change-me").
2. **Frontend 404s on refresh:** The static server doesn't handle SPA routing. Use the `--proxy` flag or configure a fallback.
3. **Port conflicts:** Edit `prodo/config/ports.env` and `prodo/backend/.env`, then restart services.
4. **Module import errors:** Ensure uvicorn runs from `prodo/` (the WorkingDirectory in the service file).

## Redeployment

```bash
# 1. Stop services
systemctl --user stop neurareport-backend.service neurareport-frontend.service

# 2. Rebuild frontend (from project root)
cd /home/rohith/desktop/NeuraReport/frontend
npm run build
cp -r dist/* /home/rohith/desktop/NeuraReport/prodo/frontend/

# 3. Update backend
cd /home/rohith/desktop/NeuraReport
find backend -type f \
  ! -path '*/__pycache__/*' ! -path '*/.venv/*' ! -path '*/venv/*' \
  ! -path '*/node_modules/*' ! -name '*.pyc' \
  -exec bash -c 'mkdir -p "prodo/$(dirname "$1")" && cp "$1" "prodo/$1"' _ {} \;

# 4. Start services
systemctl --user start neurareport-backend.service neurareport-frontend.service
```

## Uninstall

```bash
# Stop and disable services
systemctl --user stop neurareport-backend.service neurareport-frontend.service
systemctl --user disable neurareport-backend.service neurareport-frontend.service

# Remove service files
rm ~/.config/systemd/user/neurareport-backend.service
rm ~/.config/systemd/user/neurareport-frontend.service
systemctl --user daemon-reload

# Remove deployment
rm -rf /home/rohith/desktop/NeuraReport/prodo
```
