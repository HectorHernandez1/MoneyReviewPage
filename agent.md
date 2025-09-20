# Agent Deployment Notes

This file tracks Codex automation touchpoints and the deployment context surfaced during assistance sessions.

## Recent Automations
- Update category transaction table header to visualize limit deltas and effective limits (Mar 2025).
- Provide local deployment checklist for backend (FastAPI) and frontend (React).

## Production Reference 
- **Server**: Ubuntu 24.04.2 LTS at `192.168.x.x`, user `hector`; backend runs via PM2 (`budget-backend`) on port 8000 and is proxied by nginx at `/budget/api`.
- **Directory layout**: `/var/www/sites/budget/{frontend,backend,logs,database}` with deployment scripts `deploy-production.sh` and `manage-production.sh` in repo root.
- **Quick deploy**: clone repo into `/var/www/sites/budget`, `chmod +x deploy-production.sh`, then run `./deploy-production.sh`.
- **Manual essentials**: create Python venv (`python3 -m venv venv`), install `pip install -r requirements.txt`, copy `.env.template` → `.env` with DB creds, run `CI=false npm run build` for frontend, and ensure nginx config keeps the `/budget/api/` trailing slash pair.
- **Verification commands**: `pm2 status`, `curl http://localhost/budget/api/transactions`, `./manage-production.sh status`, `sudo systemctl reload nginx`.
- **Known production issue**: Chrome blocks local network requests; Safari/Firefox work or disable the `block-insecure-private-network-requests` flag.

## Next Updates
- Expand troubleshooting guidance for agent-led redeployments (permissions, DB connectivity, nginx cache).
- Document any new automation scripts or environment changes that impact local/production parity.
