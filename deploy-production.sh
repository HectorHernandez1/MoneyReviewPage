#!/bin/bash

echo "🚀 Money Review Page - Production Deployment Script"
echo "=================================================="

# Exit on any error
set -e

# Configuration
DEPLOY_DIR="/var/www/sites/budget"
STAGING_DIR="~/deployment/budget"
SERVER_IP="your-server.local"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as correct user
if [ "$USER" != "hector" ]; then
    log_error "This script should be run as user 'hector'"
    exit 1
fi

log_info "Starting production deployment..."

# Step 1: Create directories
log_info "Creating directory structure..."
sudo mkdir -p $DEPLOY_DIR/{frontend,backend,logs,database}
sudo chown -R hector:hector /var/www/sites/

# Step 2: Copy files from staging
log_info "Copying files from staging..."
if [ -d "$STAGING_DIR" ]; then
    cp -r $STAGING_DIR/* $DEPLOY_DIR/
else
    log_error "Staging directory $STAGING_DIR not found!"
    log_info "Please copy your project files to $STAGING_DIR first"
    exit 1
fi

# Step 3: Setup backend
log_info "Setting up backend..."
cd $DEPLOY_DIR/backend

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    log_info "Creating Python virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install dependencies
log_info "Installing Python dependencies..."
pip install -r requirements.txt

# Check if .env file exists
if [ ! -f ".env" ]; then
    log_warn ".env file not found! Copying from template..."
    if [ -f ".env.template" ]; then
        cp .env.template .env
        log_warn "Please edit .env file with your database settings!"
    else
        log_error ".env.template file not found!"
        exit 1
    fi
fi

# Modify main.py to listen on all interfaces
log_info "Configuring backend for network access..."
sed -i 's/host="localhost"/host="0.0.0.0"/g' main.py
sed -i 's/host='\''localhost'\''/host="0.0.0.0"/g' main.py

# Step 4: Setup frontend
log_info "Setting up frontend..."
cd $DEPLOY_DIR/frontend

# Install Node.js dependencies
log_info "Installing Node.js dependencies..."
npm install

# Create environment file for build
log_info "Creating build environment..."
echo "ESLINT_NO_DEV_ERRORS=true" > .env.local
echo "GENERATE_SOURCEMAP=false" >> .env.local

# Build production version
log_info "Building frontend for production..."
CI=false npm run build

# Step 5: Install system dependencies
log_info "Installing system dependencies..."
sudo apt update -qq
sudo apt install -y nginx

# Install PM2 if not already installed
if ! command -v pm2 &> /dev/null; then
    log_info "Installing PM2..."
    sudo npm install -g pm2
fi

# Step 6: Configure Nginx
log_info "Configuring Nginx..."
sudo tee /etc/nginx/sites-available/budget > /dev/null << 'EOF'
server {
    listen 80;
    server_name your-server.local;

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

    # Proxy API requests to backend
    location /budget/api {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
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
EOF

# Enable the site
if [ ! -L "/etc/nginx/sites-enabled/budget" ]; then
    log_info "Enabling Nginx site..."
    sudo ln -s /etc/nginx/sites-available/budget /etc/nginx/sites-enabled/
fi

# Test Nginx configuration
log_info "Testing Nginx configuration..."
sudo nginx -t

# Step 7: Start services
log_info "Starting backend with PM2..."
cd $DEPLOY_DIR/backend
source venv/bin/activate

# Stop existing PM2 process if running
pm2 delete budget-backend 2>/dev/null || true

# Start backend with PM2
pm2 start main.py --name budget-backend --interpreter python3
pm2 save

# Setup PM2 startup
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u hector --hp /home/hector

# Restart Nginx
log_info "Restarting Nginx..."
sudo systemctl reload nginx

# Step 8: Verify deployment
log_info "Verifying deployment..."
sleep 3

# Check if services are running
if pm2 list | grep -q "budget-backend.*online"; then
    log_info "✅ Backend is running"
else
    log_error "❌ Backend failed to start"
    pm2 logs budget-backend --lines 10
fi

if sudo systemctl is-active --quiet nginx; then
    log_info "✅ Nginx is running"
else
    log_error "❌ Nginx is not running"
fi

# Final success message
echo ""
echo "🎉 Deployment completed successfully!"
echo "=================================================="
echo "Your application is now accessible at:"
echo "• Main App: http://$SERVER_IP/budget"
echo "• API: http://$SERVER_IP/budget/api"
echo ""
echo "Management commands:"
echo "• Check status: pm2 status"
echo "• View logs: pm2 logs budget-backend"
echo "• Restart backend: pm2 restart budget-backend"
echo "• Restart nginx: sudo systemctl reload nginx"
echo ""
echo "Log files:"
echo "• Backend logs: pm2 logs budget-backend"
echo "• Nginx logs: sudo tail -f /var/log/nginx/error.log"
echo "=================================================="