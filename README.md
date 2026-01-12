# Money Review Page

A personal budget dashboard application that visualizes and analyzes your financial data with interactive charts and multiple time period views.

## Production Deployment (Ubuntu Server)

**🎯 Live Application**: http://your-server.local/budget

### Quick Deployment
```bash
# Clone and deploy in one command
cd /var/www/sites/budget
git clone git@github.com:HectorHernandez1/MoneyReviewPage.git .
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
```bash
# 1. Update code
cd /var/www/sites/budget
git pull

# 2. Rebuild frontend (required for API config changes)  
cd frontend
CI=false npm run build

# 3. Restart services
pm2 restart budget-backend
sudo systemctl reload nginx

# 4. Verify API connectivity
curl -I http://localhost/budget/api/transactions
```

## Development Setup

1. **Set up database connection**: Copy `backend/.env.template` to `backend/.env` and add your PostgreSQL credentials
2. **Start backend**: `cd backend && pip install -r requirements.txt && python main.py`  
3. **Start frontend**: `cd frontend && npm install && npm start`
4. **View dashboard**: Open http://localhost:3000

See `CLAUDE.md` for complete deployment documentation.

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

### Chrome Browser Issues  
- **Issue**: Chrome blocks local network requests
- **Solution**: Use Safari/Firefox or disable Chrome security flags
- **Alternative**: `chrome://flags/#block-insecure-private-network-requests` → Disabled

## Features
- Monthly, Quarterly, and Year-to-Date views
- Interactive D3.js visualizations  
- Spending category analysis
- Multi-user support
- Responsive design

## Tech Stack
- **Backend**: FastAPI + SQLAlchemy + PostgreSQL
- **Frontend**: React + D3.js
- **Deployment**: PM2 + Nginx + Ubuntu
- **Styling**: CSS Grid + Flexbox

## Server Environment
- **OS**: Ubuntu 24.04.2 LTS
- **Server**: your-server.local (local network)  
- **Database**: PostgreSQL (money_stuff.budget_app schema)
- **Process Manager**: PM2
- **Web Server**: Nginx
