# NeuraReport Production Deployment

Last deployed: **2026-02-16**

## Structure

```
prodo/
├── backend/              # FastAPI backend (uvicorn)
│   ├── .env              # Backend environment variables
│   ├── .venv/            # Python 3.11 virtual environment
│   ├── api.py            # Entry point
│   ├── app/              # Application code (services, routes, schemas)
│   ├── legacy/           # Legacy compatibility modules
│   ├── engine/           # Legacy pipeline engine
│   ├── uploads/          # File uploads & template artifacts
│   ├── uploads_excel/    # Excel uploads
│   ├── state/            # SQLite databases & state store
│   └── requirements.txt  # Python dependencies
├── frontend/             # Static Vite build (React 19)
│   ├── index.html        # SPA entry point
│   ├── assets/           # Compiled JS/CSS bundles
│   ├── dist/             # Full build output
│   └── fonts/            # Web fonts
├── config/
│   ├── ports.env         # BACKEND_PORT=9070, FRONTEND_PORT=9071
│   └── deployment.env    # Deployment metadata
├── logs/
│   ├── backend.log           # Backend stdout
│   ├── backend.error.log     # Backend stderr
│   ├── backend.only-errors.log # Filtered errors
│   ├── frontend.log          # HTTP server access log
│   ├── frontend.error.log    # HTTP server errors
│   └── llm.log               # LLM request/response logs
└── README.md
```

## Services

| Service | Systemd Unit | Port | Technology |
|---------|-------------|------|------------|
| Backend | `neurareport-backend.service` | **9070** | FastAPI + uvicorn (Python 3.11) |
| Frontend | `neurareport-frontend.service` | **9071** | http-server (static files, gzip, CORS, SPA proxy) |

## Access URLs

| Network | Frontend | Backend API | API Docs | Health |
|---------|----------|-------------|----------|--------|
| Localhost | http://127.0.0.1:9071 | http://127.0.0.1:9070 | http://127.0.0.1:9070/docs | http://127.0.0.1:9070/health |
| Tailscale | http://100.90.185.31:9071 | http://100.90.185.31:9070 | http://100.90.185.31:9070/docs | http://100.90.185.31:9070/health |
| LAN | http://192.168.1.20:9071 | http://192.168.1.20:9070 | http://192.168.1.20:9070/docs | http://192.168.1.20:9070/health |

## Service Management

```bash
# Check status
systemctl --user status neurareport-backend.service
systemctl --user status neurareport-frontend.service

# Restart both
systemctl --user restart neurareport-backend.service neurareport-frontend.service

# Stop both
systemctl --user stop neurareport-backend.service neurareport-frontend.service

# Start both
systemctl --user start neurareport-backend.service neurareport-frontend.service

# Reload systemd after editing service files
systemctl --user daemon-reload
```

## Logs

```bash
# Tail backend logs
tail -f /home/rohith/desktop/NeuraReport/prodo/logs/backend.log
tail -f /home/rohith/desktop/NeuraReport/prodo/logs/backend.error.log

# Tail frontend logs
tail -f /home/rohith/desktop/NeuraReport/prodo/logs/frontend.log

# LLM interaction logs
tail -f /home/rohith/desktop/NeuraReport/prodo/logs/llm.log

# Systemd journal
journalctl --user -u neurareport-backend.service -f
journalctl --user -u neurareport-frontend.service -f
```

## Health Checks

```bash
# Backend health (should return {"status": "ok", ...})
curl -s http://127.0.0.1:9070/health | python3 -m json.tool

# Frontend serving (should return 200)
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:9071/

# Templates API
curl -s http://127.0.0.1:9070/templates | python3 -m json.tool | head -20

# Connections API
curl -s http://127.0.0.1:9070/connections | python3 -m json.tool | head -20

# Tailscale access
curl -s http://100.90.185.31:9070/health
curl -s -o /dev/null -w "%{http_code}" http://100.90.185.31:9071/
```

## Configuration

| File | Purpose |
|------|---------|
| `config/ports.env` | Port assignments (backend 9070, frontend 9071) |
| `config/deployment.env` | Deployment timestamps and metadata |
| `backend/.env` | Backend environment (JWT, CORS, paths, email, LLM) |

### Key Environment Variables

| Variable | Description |
|----------|-------------|
| `NEURA_JWT_SECRET` / `JWT_SECRET` | JWT signing secret (required) |
| `NEURA_ALLOW_MISSING_OPENAI` | Allow running without OpenAI key (Claude CLI is primary LLM) |
| `NEURA_CORS_ORIGINS` | Explicit CORS origins (JSON array) |
| `NEURA_CORS_ORIGIN_REGEX` | Regex for CORS origin matching |
| `UPLOAD_ROOT` | Path for file uploads |
| `EXCEL_UPLOAD_ROOT` | Path for Excel uploads |
| `NEURA_STATE_DIR` | Path for SQLite state/DB files |
| `NEURA_ERROR_LOG` | Error-only log file path |
| `NEURA_LLM_LOG` | LLM interaction log path |

## Database Backup

```bash
# Backup all SQLite databases
cp /home/rohith/desktop/NeuraReport/prodo/backend/state/*.db /path/to/backup/

# Backup uploads (template artifacts)
tar czf uploads-backup-$(date +%Y%m%d).tar.gz /home/rohith/desktop/NeuraReport/prodo/backend/uploads/
```

## Redeployment

```bash
# 1. Stop services
systemctl --user stop neurareport-backend.service neurareport-frontend.service

# 2. Rebuild frontend (from project root)
cd /home/rohith/desktop/NeuraReport/frontend && npm run build

# 3. Sync code to prodo
cd /home/rohith/desktop/NeuraReport
cp backend/api.py backend/requirements.txt prodo/backend/
rm -rf prodo/backend/app prodo/backend/legacy prodo/backend/engine
cp -r backend/app backend/legacy backend/engine prodo/backend/
rm -rf prodo/frontend/dist prodo/frontend/assets
cp -r frontend/dist prodo/frontend/dist
cp frontend/dist/index.html prodo/frontend/
cp -r frontend/dist/assets prodo/frontend/assets

# 4. Install new dependencies (if any)
source prodo/backend/.venv/bin/activate && pip install -r prodo/backend/requirements.txt -q

# 5. Restart services
systemctl --user start neurareport-backend.service neurareport-frontend.service

# 6. Verify
curl -s http://127.0.0.1:9070/health | python3 -m json.tool
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:9071/
```

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Backend won't start | Check `logs/backend.error.log`. Ensure `.env` has valid `JWT_SECRET` |
| Frontend 404 on refresh | The `--proxy` flag in the service handles SPA fallback routing |
| Port conflicts | Edit `config/ports.env` + `backend/.env`, restart services |
| Module import errors | Ensure uvicorn runs from `prodo/` (WorkingDirectory in service file) |
| Claude CLI issues | Verify `~/.local/bin/claude` exists; unset `CLAUDECODE` env var in server context |
| CORS errors | Add frontend origin to `NEURA_CORS_ORIGINS` in `backend/.env` |
| Database locked | Stop duplicate backend processes; only one writer at a time |

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
