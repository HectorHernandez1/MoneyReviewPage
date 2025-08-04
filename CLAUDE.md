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

## Installation Commands

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
    }

    # Proxy API requests to backend
    location /budget/api {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

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

### Development Commands
```bash
# Update from git
cd ~/deployment/budget/
git pull
cp -r frontend/* /var/www/sites/budget/frontend/
cp -r backend/* /var/www/sites/budget/backend/

# Restart services
pm2 restart budget-backend
sudo systemctl reload nginx

# View logs
pm2 logs budget-backend
tail -f /var/www/sites/budget/logs/app.log
```

## Security Notes
- Database credentials are stored in .env file
- Server accessible only on local network (192.168.1.x)
- Nginx serves static files directly for better performance
- PM2 handles process management and auto-restart

## Future Enhancements
- SSL certificate for HTTPS
- Domain name instead of IP address
- Automated deployment script
- Database connection pooling
- Log rotation setup
- Backup automation

## File Locations
- **Main App**: `/var/www/sites/budget/`
- **Nginx Config**: `/etc/nginx/sites-available/budget`
- **PM2 Process**: `pm2 list` to view
- **Logs**: `/var/www/sites/budget/logs/`
- **Database Backups**: `/var/www/sites/budget/database/`

Last Updated: August 4, 2025