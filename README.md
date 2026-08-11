# Money Review Page

A personal budget dashboard application that visualizes and analyzes your financial data with interactive charts, multiple time period views, and an AI chatbot that answers natural-language questions about your spending.

## Production Deployment (Ubuntu Server)

**🎯 Live Application**: http://your-server.local/budget

### Before Deploying
Update the server name in these files:
- `deploy-production.sh` - Line 12: `SERVER_IP="your-server.local"`
- `manage-production.sh` - Line 7: `SERVER_IP="your-server.local"`

### Quick Deployment
```bash
# Clone and deploy in one command
cd /var/www/sites/budget
git clone git@github.com:HectorHernandez1/MoneyReviewPage.git .

# Update server name in deployment scripts
sed -i 's/your-server.local/YOUR_SERVER_NAME/g' deploy-production.sh manage-production.sh

chmod +x deploy-production.sh
./deploy-production.sh
```

### Server Management
```bash
# Check status
./manage-production.sh status

# Start services  
./manage-production.sh start

# Update from git
./manage-production.sh update

# View logs
./manage-production.sh logs
```

### Manual Update Process
Prefer `./manage-production.sh update` — it stamps the deployed version automatically. If updating by hand:
```bash
# 1. Update code
cd /var/www/sites/budget
git pull

# 2. Stamp the version being deployed (v<commit count>-<short sha>)
VERSION="v$(git rev-list --count HEAD)-$(git rev-parse --short HEAD)"
echo "$VERSION" > VERSION

# 3. Rebuild frontend with the version baked in
cd frontend
REACT_APP_GIT_SHA="$VERSION" REACT_APP_BUILD_TIME="$(date '+%Y-%m-%d %H:%M')" CI=false npm run build

# 4. Restart services (after VERSION is written, so the backend reads the new stamp)
pm2 restart budget-backend
sudo systemctl reload nginx

# 5. Verify API connectivity
curl -I http://localhost/budget/api/transactions

# 6. Verify the update is live (should show the new version)
curl http://localhost/budget/api/version
```

The version (e.g. `v58-71e7e0f`) appears in the browser tab title and the dashboard footer — `UI v58-71e7e0f · built <time> | API v58-71e7e0f` — with a ⚠ warning if the frontend and backend differ (stale build or unrestarted pm2) or if a production build is missing its stamp. The number goes up on every deploy, so "did the update land?" is one glance at the tab.

## Development Setup

1. **Set up database connection**: Copy `backend/.env.template` to `backend/.env` and add your PostgreSQL credentials
2. **Configure the AI chatbot**: In `backend/.env`, set the API key for your chosen LLM provider (see below)
3. **Create the conda env** (one-time):
   ```bash
   conda create -n budget-env python=3.11 -y
   conda activate budget-env
   pip install -r backend/requirements.txt
   ```
4. **Start backend**: `conda activate budget-env && cd backend && python main.py`
5. **Start frontend**: `cd frontend && npm install && npm start`
6. **View dashboard**: Open http://localhost:3000

### Smoke-test the DB connection
```bash
conda activate budget-env
python test-data.py
```
Prints a row count and date range from `budget_app.transactions_view` if the connection works.

## AI Chatbot

A floating chat bubble on the dashboard answers budget questions ("What did I spend on groceries last month?", "Which credit cards did I use in June?") by querying the database through 15 tools: SQL-backed data lookups, the dashboard's budget-overview/pacing computation, suggested budget limits, and memory tools. For multi-step questions (why-investigations, monthly reviews, recommendations) it first streams a short plan of the lookups it's about to run, then executes them.

### Memory & conversations
The backend creates two tables in the `budget_app` schema on startup (`chat_memory`, `chat_conversations` — idempotent `CREATE TABLE IF NOT EXISTS`; if the DB role lacks CREATE, the chatbot logs a warning and runs statelessly):
- **Memory**: durable facts and preferences the user states ("rent is fixed"), plus one-line insights saved after each substantive analysis (tagged with the period, e.g. `2026-08`) so next month's review can compare. Household-scoped; the bot can `remember` and `forget` on request.
- **Conversations**: chat history is saved server-side after each completed answer, so a conversation started on one device resumes on another. localStorage remains as a cache/offline fallback. Clearing the chat starts a new conversation; old ones stay on the server (`GET/DELETE /chat/conversations/...`).

Note: like the rest of the API, these endpoints have no authentication — memory and history are readable by anyone who can reach the backend, so run it only on a trusted network.

### Model Provider Configuration
Set in `backend/.env`:
- `LLM_PROVIDER` — `anthropic` (default), `openai`, `deepseek`, or `glm`
- `LLM_MODEL` — optional override; defaults: `claude-sonnet-5` / `gpt-5.6-luna` / `deepseek-v4-flash` / `glm-5.2`
- API key for the selected provider: `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `DEEPSEEK_API_KEY`, or `GLM_API_KEY`

DeepSeek and GLM use the OpenAI-compatible client with provider-specific base URLs. Key backend files: `backend/chatbot.py` (prompt + tool execution), `backend/models.py` (provider abstraction), `backend/tools.py` (tool schemas and SQL queries).

## Key Configuration

### API Endpoints
- **Production**: `/budget/api` (proxied by nginx)
- **Development**: `http://localhost:8000`

### Important Files
- `frontend/src/App.js:8` - API URL configuration
- `frontend/src/components/FilterPanel.js:4` - API URL configuration  
- `/etc/nginx/sites-available/budget` - Nginx proxy configuration

## Troubleshooting

### API Not Loading Data
```bash
# Check backend status
pm2 status

# Test backend directly  
curl http://localhost:8000/transactions

# Test nginx proxy (should match above)
curl http://localhost/budget/api/transactions

# Fix nginx proxy if needed (requires trailing slashes)
sudo nano /etc/nginx/sites-available/budget
# Ensure: location /budget/api/ { proxy_pass http://localhost:8000/; }
sudo nginx -t && sudo systemctl reload nginx
```

### Chatbot Returns 503
The API key for the selected `LLM_PROVIDER` is missing from `backend/.env`. Add it and restart the backend:
```bash
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What are my top categories?", "filters": {"period": "monthly", "month": "2026-02"}}'
```

### Chrome Browser Issues  
- **Issue**: Chrome blocks local network requests
- **Solution**: Use Safari/Firefox or disable Chrome security flags
- **Alternative**: `chrome://flags/#block-insecure-private-network-requests` → Disabled

## Features
- Monthly, Quarterly, and Year-to-Date views
- Interactive D3.js visualizations  
- Budget vs Actual panel with per-category progress bars and pace markers
- Spending pace: projected end-of-month total and comparison to last month at the same point
- Cumulative spending view with a budget-pace line on the trend chart
- Recurring-charges panel (likely subscriptions with estimated monthly total)
- Suggested budget limits from recent monthly averages in Manage Categories
- Spending category analysis
- Multi-user support
- AI chatbot for natural-language spending questions (markdown-rendered replies)
- Chatbot plans multi-step analyses out loud, remembers facts/preferences/insights across conversations, and gives data-grounded recommendations
- "Review my month" one-click structured review; server-saved conversations resume across devices
- Responsive design

## Tech Stack
- **Backend**: FastAPI + SQLAlchemy + PostgreSQL
- **Frontend**: React + D3.js
- **AI**: Anthropic Claude (default), OpenAI, DeepSeek, or GLM via a provider abstraction
- **Deployment**: PM2 + Nginx + Ubuntu
- **Styling**: CSS Grid + Flexbox

## Server Environment
- **OS**: Ubuntu 24.04.2 LTS
- **Server**: your-server.local (local network)  
- **Database**: PostgreSQL (money_stuff.budget_app schema)
- **Process Manager**: PM2
- **Web Server**: Nginx
