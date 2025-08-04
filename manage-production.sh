#!/bin/bash

# Money Review Page - Production Management Script
# Usage: ./manage-production.sh [start|stop|restart|status|logs|update]

DEPLOY_DIR="/var/www/sites/budget"
SERVER_IP="your-server.local"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

show_usage() {
    echo "Money Review Page - Production Management"
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  start    - Start all services"
    echo "  stop     - Stop all services"
    echo "  restart  - Restart all services"
    echo "  status   - Show service status"
    echo "  logs     - Show backend logs"
    echo "  update   - Update from git and redeploy"
    echo "  health   - Check application health"
    echo ""
}

start_services() {
    log_info "Starting services..."
    
    # Start backend
    cd $DEPLOY_DIR/backend
    source venv/bin/activate
    pm2 start main.py --name budget-backend --interpreter python3 2>/dev/null || pm2 restart budget-backend
    
    # Start nginx
    sudo systemctl start nginx
    
    log_info "Services started!"
    show_status
}

stop_services() {
    log_info "Stopping services..."
    
    # Stop backend
    pm2 stop budget-backend 2>/dev/null || log_warn "Backend was not running"
    
    log_info "Services stopped!"
}

restart_services() {
    log_info "Restarting services..."
    
    # Restart backend
    pm2 restart budget-backend 2>/dev/null || log_error "Failed to restart backend"
    
    # Reload nginx
    sudo systemctl reload nginx
    
    log_info "Services restarted!"
    show_status
}

show_status() {
    echo ""
    echo "=== Service Status ==="
    
    # Check backend
    if pm2 list | grep -q "budget-backend.*online"; then
        echo -e "Backend: ${GREEN}✅ Running${NC}"
    else
        echo -e "Backend: ${RED}❌ Stopped${NC}"
    fi
    
    # Check nginx
    if sudo systemctl is-active --quiet nginx; then
        echo -e "Nginx: ${GREEN}✅ Running${NC}"
    else
        echo -e "Nginx: ${RED}❌ Stopped${NC}"
    fi
    
    echo ""
    echo "=== Access URLs ==="
    echo "• Main App: http://$SERVER_IP/budget"
    echo "• API: http://$SERVER_IP/budget/api"
    echo ""
    
    # Show PM2 status
    echo "=== PM2 Status ==="
    pm2 list
}

show_logs() {
    echo "=== Backend Logs (last 50 lines) ==="
    pm2 logs budget-backend --lines 50
}

update_deployment() {
    log_info "Updating deployment from git..."
    
    # Pull latest changes
    cd ~/deployment/budget
    git pull
    
    # Copy to production
    cp -r ~/deployment/budget/* $DEPLOY_DIR/
    
    # Rebuild frontend
    log_info "Rebuilding frontend..."
    cd $DEPLOY_DIR/frontend
    npm install
    CI=false npm run build
    
    # Restart services
    restart_services
    
    log_info "Update completed!"
}

check_health() {
    echo "=== Health Check ==="
    
    # Check if backend responds
    if curl -s http://localhost:8000/health >/dev/null 2>&1; then
        echo -e "Backend API: ${GREEN}✅ Healthy${NC}"
    else
        echo -e "Backend API: ${RED}❌ Not responding${NC}"
    fi
    
    # Check if frontend is accessible
    if curl -s http://localhost/budget >/dev/null 2>&1; then
        echo -e "Frontend: ${GREEN}✅ Accessible${NC}"
    else
        echo -e "Frontend: ${RED}❌ Not accessible${NC}"
    fi
    
    # Check disk space
    DISK_USAGE=$(df /var/www | awk 'NR==2 {print $5}' | sed 's/%//')
    if [ $DISK_USAGE -lt 80 ]; then
        echo -e "Disk Space: ${GREEN}✅ OK ($DISK_USAGE% used)${NC}"
    else
        echo -e "Disk Space: ${YELLOW}⚠️ Warning ($DISK_USAGE% used)${NC}"
    fi
    
    # Check memory
    MEMORY_USAGE=$(free | awk '/Mem/ {printf "%.0f", ($3/$2)*100}')
    if [ $MEMORY_USAGE -lt 80 ]; then
        echo -e "Memory: ${GREEN}✅ OK ($MEMORY_USAGE% used)${NC}"
    else
        echo -e "Memory: ${YELLOW}⚠️ High ($MEMORY_USAGE% used)${NC}"
    fi
}

# Main script logic
case "$1" in
    start)
        start_services
        ;;
    stop)
        stop_services
        ;;
    restart)
        restart_services
        ;;
    status)
        show_status
        ;;
    logs)
        show_logs
        ;;
    update)
        update_deployment
        ;;
    health)
        check_health
        ;;
    *)
        show_usage
        exit 1
        ;;
esac