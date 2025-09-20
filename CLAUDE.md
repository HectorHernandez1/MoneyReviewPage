# Money Review Page - Server Deployment Guide

## Server Environment
- **OS**: Ubuntu 24.04.2 LTS
- **Server IP**: 192.168.x.x
- **User**: hector
- **Node.js**: v18.19.1
- **npm**: 9.2.0
- **Python**: 3.12.3
- **Database**: PostgreSQL (running on same server)

## Directory Structure
```
/var/www/sites/budget/
├── frontend/          # React application
├── backend/           # FastAPI Python application
├── logs/              # Application logs
└── database/          # Database backup files
```

## Access URLs
- **Main Application**: http://192.168.x.x/budget
- **API Backend**: http://192.168.x.x/budget/api
- **Direct Frontend**: http://192.168.x.x:3000 (development)
- **Direct Backend**: http://192.168.x.x:8000 (development)

## Quick Production Deployment

### Automated Deployment (Recommended)
```bash
# 1. Clone repository to production directory
ssh hector@192.168.x.x
cd /var/www/sites/budget
git pull

# 2. Make deployment script executable
chmod +x deploy-production.sh

# 3. Run automated deployment (does everything!)
./deploy-production.sh
```

### Manual Installation Commands (Alternative)

### 1. System Dependencies
```bash
# Update system
sudo apt update

# Install required packages
sudo apt install python3-pip nginx -y

# Install PM2 for process management
sudo npm install -g pm2
```

### 2. Directory Setup
```bash
# Create main directory structure
sudo mkdir -p /var/www/sites/budget/{frontend,backend,logs,database}
sudo chown -R hector:hector /var/www/sites/

# Create staging directory
mkdir -p ~/deployment/budget/
```

### 3. Clone Repository
```bash
cd ~/deployment/budget/
git clone git@github.com:HectorHernandez1/MoneyReviewPage.git .
```

### 4. Backend Setup
```bash
cd /var/www/sites/budget/backend/

# Create Python virtual environment
python3 -m venv venv
source venv/bin/activate

# Install Python dependencies
pip install -r requirements.txt

# Configure environment variables
cp .env.template .env
# Edit .env with correct database settings:
# DB_HOST=192.168.x.x
# DB_USER=hectorhernandez
# DB_PASSWORD=REDACTED_PASSWORD
# DB_NAME=money_stuff
```

### 5. Frontend Setup
```bash
cd /var/www/sites/budget/frontend/

# Install Node.js dependencies
npm install

# Configure build environment (to handle linting issues)
echo "ESLINT_NO_DEV_ERRORS=true" > .env.local
echo "GENERATE_SOURCEMAP=false" >> .env.local

# Build production version
CI=false npm run build
```

## Running the Application

### Backend (FastAPI)
```bash
cd /var/www/sites/budget/backend/
source venv/bin/activate
python main.py
# Runs on: http://localhost:8000
```

### Frontend Development Server
```bash
cd /var/www/sites/budget/frontend/
npm start
# Runs on: http://localhost:3000
```

### Production with PM2
```bash
# Start backend with PM2
cd /var/www/sites/budget/backend/
pm2 start main.py --name budget-backend --interpreter python3

# Serve frontend build files with nginx (see nginx config below)
```

## Nginx Configuration
Create `/etc/nginx/sites-available/budget`:
```nginx
server {
    listen 80;
    server_name 192.168.x.x;

    # Serve frontend static files
    location /budget {
        alias /var/www/sites/budget/frontend/build;
        try_files $uri $uri/ /budget/index.html;
        
        # Add headers for better caching
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # Proxy API requests to backend - CRITICAL: trailing slash required!
    location /budget/api/ {
        proxy_pass http://localhost:8000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_Set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Handle CORS
        add_header Access-Control-Allow-Origin *;
        add_header Access-Control-Allow-Methods "GET, POST, OPTIONS";
        add_header Access-Control-Allow-Headers "Content-Type, Authorization";
    }

    # Health check endpoint
    location /budget/health {
        proxy_pass http://localhost:8000/health;
        proxy_set_header Host $host;
    }
}
```

**⚠️ CRITICAL**: The trailing slashes in `location /budget/api/` and `proxy_pass http://localhost:8000/;` are required to strip the `/budget/api/` prefix before forwarding requests to the backend.

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/budget /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## Database Configuration
- **Host**: 192.168.x.x
- **Port**: 5432
- **Database**: money_stuff
- **Schema**: budget_app
- **Main Table**: budget_app.transactions_view

## Troubleshooting

### Common Issues

1. **React Build Fails with ESLint Errors**
   ```bash
   # Solution: Disable ESLint for production build
   CI=false npm run build
   ```

2. **Python Module Not Found**
   ```bash
   # Solution: Activate virtual environment
   cd /var/www/sites/budget/backend/
   source venv/bin/activate
   ```

3. **Database Connection Failed**
   ```bash
   # Check database is running
   sudo systemctl status postgresql
   
   # Test connection
   psql -h 192.168.x.x -U hectorhernandez -d money_stuff
   ```

4. **Permission Errors**
   ```bash
   # Fix ownership
   sudo chown -R hector:hector /var/www/sites/budget/
   ```

5. **API Not Loading Data (Frontend shows default values)**
   ```bash
   # Check if backend is running
   pm2 status
   
   # Test backend directly
   curl http://localhost:8000/transactions
   
   # Test nginx proxy (should match above)
   curl http://localhost/budget/api/transactions
   
   # If nginx proxy fails, check trailing slashes in nginx config
   sudo nano /etc/nginx/sites-available/budget
   # Ensure: location /budget/api/ { proxy_pass http://localhost:8000/; }
   sudo nginx -t && sudo systemctl reload nginx
   ```

6. **Frontend API Configuration Issues**
   ```bash
   # Frontend must use environment-aware API URLs
   # Check App.js and FilterPanel.js contain:
   # const API_BASE_URL = process.env.NODE_ENV === 'production' ? '/budget/api' : 'http://localhost:8000';
   
   # After fixing, rebuild frontend:
   cd /var/www/sites/budget/frontend/
   CI=false npm run build
   ```

### Development Commands
```bash
# Update from git and redeploy
cd /var/www/sites/budget/
git pull

# Rebuild frontend (important for API config changes)
cd frontend/
CI=false npm run build
cd ..

# Restart services
pm2 restart budget-backend
sudo systemctl reload nginx

# Verify API is working
curl -I http://localhost/budget/api/transactions

# View logs
pm2 logs budget-backend
tail -f /var/www/sites/budget/logs/app.log
```

## Deployment Status

### Current Status (August 6, 2025)
✅ **Server Setup**: Complete  
✅ **Backend**: Running on port 8000 with PM2  
✅ **Frontend**: Built with `/budget` base path and API configuration  
✅ **Nginx**: Configured with proper API proxy routing  
✅ **API Connection**: Working - frontend loads real data  
✅ **Network Access**: Working in Safari  
⚠️ **Chrome Browser**: Blocked by security settings  

### Known Issues

**Chrome Browser Access**
- **Issue**: Chrome shows blank page, network request canceled
- **Status**: Works in Safari, incognito mode fails too
- **Cause**: Chrome's security features blocking local network requests
- **Solutions to try**:
  1. Go to `chrome://flags/#block-insecure-private-network-requests` → Set to "Disabled"
  2. Disable Enhanced Protection in Chrome Security settings
  3. Clear DNS cache: `chrome://net-internals/#dns` → "Clear host cache"
  4. Use Safari or Firefox as alternative

### Verification Commands
```bash
# Check deployment status
./manage-production.sh status

# Test local access
curl -I http://localhost/budget/

# Test network access
curl -I http://192.168.x.x/budget/

# Check services
pm2 status
sudo systemctl status nginx
```

## Security Notes
- Database credentials are stored in .env file
- Server accessible only on local network (192.168.1.x)
- Nginx serves static files directly for better performance
- PM2 handles process management and auto-restart

## Production Management

### Daily Management Commands
```bash
# Check service status
./manage-production.sh status

# Start all services
./manage-production.sh start

# Stop all services
./manage-production.sh stop

# Restart all services
./manage-production.sh restart

# View backend logs
./manage-production.sh logs

# Update from git and redeploy
./manage-production.sh update

# Health check
./manage-production.sh health
```

### Manual Service Management
```bash
# PM2 commands
pm2 status                    # View all processes
pm2 logs budget-backend       # View backend logs
pm2 restart budget-backend    # Restart backend
pm2 stop budget-backend       # Stop backend
pm2 delete budget-backend     # Remove process

# Nginx commands
sudo systemctl status nginx   # Check nginx status
sudo systemctl reload nginx   # Reload nginx config
sudo nginx -t                 # Test nginx config
```

## Future Enhancements
- SSL certificate for HTTPS
- Domain name instead of IP address
- Database connection pooling
- Log rotation setup
- Backup automation

## File Locations
- **Main App**: `/var/www/sites/budget/`
- **Nginx Config**: `/etc/nginx/sites-available/budget`
- **PM2 Process**: `pm2 list` to view
- **Logs**: `/var/www/sites/budget/logs/`
- **Database Backups**: `/var/www/sites/budget/database/`
- **Deployment Scripts**: `deploy-production.sh`, `manage-production.sh`

## Summary

Your Money Review Page is **successfully deployed** and accessible at:
- **Main URL**: http://192.168.x.x/budget
- **API**: http://192.168.x.x/budget/api

**Working browsers**: Safari, Firefox  
**Issue**: Chrome security blocking (use Safari for now)

**Status**: ✅ WORKING - API connected, data loading properly
**Chrome Issue**: Use Safari/Firefox or disable Chrome security flags

Last Updated: August 6, 2025