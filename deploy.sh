#!/bin/bash

# AITaskFlo In-House Deployment System
# =====================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="aitaskflo"
APP_DIR="/var/www/$APP_NAME"
BACKUP_DIR="/var/backups/$APP_NAME"
LOG_DIR="/var/log/$APP_NAME"
PORT=3000
NODE_ENV="production"

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
check_root() {
    if [ "$EUID" -ne 0 ]; then 
        log_error "Please run as root (use sudo)"
        exit 1
    fi
}

# Install system dependencies
install_dependencies() {
    log_info "Installing system dependencies..."
    
    # Update system
    apt-get update
    
    # Install Node.js (if not installed)
    if ! command -v node &> /dev/null; then
        curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
        apt-get install -y nodejs
    fi
    
    # Install Nginx
    if ! command -v nginx &> /dev/null; then
        apt-get install -y nginx
    fi
    
    # Install PM2 globally
    if ! command -v pm2 &> /dev/null; then
        npm install -g pm2
    fi
    
    # Install certbot for SSL
    if ! command -v certbot &> /dev/null; then
        apt-get install -y certbot python3-certbot-nginx
    fi
    
    log_success "Dependencies installed"
}

# Create necessary directories
create_directories() {
    log_info "Creating directories..."
    
    mkdir -p $APP_DIR
    mkdir -p $BACKUP_DIR
    mkdir -p $LOG_DIR
    mkdir -p $APP_DIR/uploads
    mkdir -p $APP_DIR/db
    mkdir -p $APP_DIR/memory
    
    log_success "Directories created"
}

# Backup current deployment
backup_current() {
    if [ -d "$APP_DIR" ] && [ "$(ls -A $APP_DIR)" ]; then
        log_info "Creating backup..."
        
        BACKUP_FILE="$BACKUP_DIR/backup-$(date +%Y%m%d-%H%M%S).tar.gz"
        tar -czf $BACKUP_FILE -C $APP_DIR .
        
        # Keep only last 5 backups
        cd $BACKUP_DIR
        ls -t | tail -n +6 | xargs -r rm
        
        log_success "Backup created: $BACKUP_FILE"
    fi
}

# Deploy application
deploy_app() {
    log_info "Deploying application..."
    
    # Copy files
    cp -r ./* $APP_DIR/
    cd $APP_DIR
    
    # Install dependencies
    log_info "Installing npm dependencies..."
    npm install --production
    
    # Set permissions
    chown -R www-data:www-data $APP_DIR
    chmod -R 755 $APP_DIR
    
    log_success "Application deployed"
}

# Configure Nginx
configure_nginx() {
    log_info "Configuring Nginx..."
    
    cat > /etc/nginx/sites-available/$APP_NAME << 'NGINX_EOF'
server {
    listen 80;
    server_name _;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # Logging
    access_log /var/log/aitaskflo/access.log;
    error_log /var/log/aitaskflo/error.log;
    
    # Static files
    location /public {
        alias /var/www/aitaskflo/public;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
    
    location /uploads {
        alias /var/www/aitaskflo/uploads;
        expires 30d;
    }
    
    # Proxy to Node.js
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Health check endpoint
    location /health {
        access_log off;
        proxy_pass http://localhost:3000/health;
    }
}
NGINX_EOF
    
    # Enable site
    ln -sf /etc/nginx/sites-available/$APP_NAME /etc/nginx/sites-enabled/
    rm -f /etc/nginx/sites-enabled/default
    
    # Test Nginx config
    nginx -t
    
    # Reload Nginx
    systemctl reload nginx
    
    log_success "Nginx configured"
}

# Configure PM2
configure_pm2() {
    log_info "Configuring PM2..."
    
    cd $APP_DIR
    
    # Create PM2 ecosystem file
    cat > ecosystem.config.js << 'PM2_EOF'
module.exports = {
  apps: [{
    name: 'aitaskflo',
    script: './server.js',
    instances: 1,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/var/log/aitaskflo/pm2-error.log',
    out_file: '/var/log/aitaskflo/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    max_memory_restart: '512M',
    autorestart: true,
    watch: false,
    max_restarts: 10,
    min_uptime: '10s'
  }]
};
PM2_EOF
    
    # Stop existing process
    pm2 delete $APP_NAME 2>/dev/null || true
    
    # Start with PM2
    pm2 start ecosystem.config.js
    
    # Save PM2 configuration
    pm2 save
    
    # Setup PM2 startup script
    pm2 startup systemd -u root --hp /root
    
    log_success "PM2 configured and application started"
}

# Setup SSL with Let's Encrypt
setup_ssl() {
    read -p "Enter your domain name (or press Enter to skip SSL): " DOMAIN
    
    if [ -z "$DOMAIN" ]; then
        log_warning "Skipping SSL setup"
        return
    fi
    
    log_info "Setting up SSL for $DOMAIN..."
    
    # Update Nginx config with domain
    sed -i "s/server_name _;/server_name $DOMAIN www.$DOMAIN;/" /etc/nginx/sites-available/$APP_NAME
    systemctl reload nginx
    
    # Get SSL certificate
    certbot --nginx -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN
    
    log_success "SSL configured for $DOMAIN"
}

# Create monitoring script
create_monitoring() {
    log_info "Setting up monitoring..."
    
    cat > /usr/local/bin/aitaskflo-monitor << 'MONITOR_EOF'
#!/bin/bash

# AITaskFlo Monitoring Script

APP_NAME="aitaskflo"
LOG_FILE="/var/log/$APP_NAME/monitor.log"

# Check if app is running
if ! pm2 list | grep -q "$APP_NAME.*online"; then
    echo "[$(date)] App is down, restarting..." >> $LOG_FILE
    pm2 restart $APP_NAME
fi

# Check disk space
DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ $DISK_USAGE -gt 80 ]; then
    echo "[$(date)] WARNING: Disk usage is ${DISK_USAGE}%" >> $LOG_FILE
fi

# Check memory
MEM_USAGE=$(free | grep Mem | awk '{print ($3/$2) * 100.0}' | cut -d. -f1)
if [ $MEM_USAGE -gt 80 ]; then
    echo "[$(date)] WARNING: Memory usage is ${MEM_USAGE}%" >> $LOG_FILE
fi

# Log status
echo "[$(date)] Health check passed" >> $LOG_FILE
MONITOR_EOF
    
    chmod +x /usr/local/bin/aitaskflo-monitor
    
    # Add to crontab (run every 5 minutes)
    (crontab -l 2>/dev/null; echo "*/5 * * * * /usr/local/bin/aitaskflo-monitor") | crontab -
    
    log_success "Monitoring configured"
}

# Create management scripts
create_management_scripts() {
    log_info "Creating management scripts..."
    
    # Start script
    cat > /usr/local/bin/aitaskflo-start << 'EOF'
#!/bin/bash
pm2 start aitaskflo
systemctl start nginx
echo "✅ AITaskFlo started"
