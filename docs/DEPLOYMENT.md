# AITaskFlo Deployment Guide

## Security-First Deployment

This guide outlines how to deploy AITaskFlo with all security features properly configured.

## Prerequisites

- Node.js 18+ 
- npm 9+
- SSL certificate for HTTPS
- Firewall configuration access
- Email account for notifications

## Environment Setup

### 1. Create Environment File

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

### 2. Generate Strong Secrets

```bash
# Generate JWT secret (32+ characters)
JWT_SECRET=$(openssl rand -base64 32)

# Generate encryption key (exactly 32 characters)
ENCRYPTION_KEY=$(openssl rand -hex 16)

# Generate session secret
SESSION_SECRET=$(openssl rand -base64 32)
```

### 3. Configure Email

Set up Gmail with App Password:
```bash
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-16-char-app-password
ADMIN_EMAIL=admin@yourdomain.com
```

## Production Deployment

### 1. Install Dependencies

```bash
npm ci --only=production
```

### 2. Security Hardening

**File Permissions:**
```bash
# Secure sensitive files
chmod 600 .env
chmod 600 config/security-config.js
chmod 755 logs/

# Create upload directories
mkdir -p uploads quarantine
chmod 755 uploads quarantine
```

**System Configuration:**
```bash
# Disable server tokens
echo "server_tokens off;" >> /etc/nginx/nginx.conf

# Set security headers in reverse proxy
# Add to nginx configuration:
add_header X-Frame-Options DENY;
add_header X-Content-Type-Options nosniff;
add_header X-XSS-Protection "1; mode=block";
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";
```

### 3. Process Management

**Using PM2:**
```bash
npm install -g pm2

# Create ecosystem file
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'aitaskflo-security',
    script: 'server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_file: './logs/pm2-combined.log',
    time: true,
    max_memory_restart: '1G',
    restart_delay: 4000
  }]
}
EOF

# Start application
pm2 start ecosystem.config.js
pm2 startup
pm2 save
```

### 4. Reverse Proxy Configuration

**Nginx Configuration:**
```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com;
    
    # SSL Configuration
    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers EECDH+AESGCM:EDH+AESGCM;
    ssl_prefer_server_ciphers on;
    
    # Security Headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";
    add_header Referrer-Policy "strict-origin-when-cross-origin";
    
    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=20r/m;
    limit_req_zone $binary_remote_addr zone=general:10m rate=100r/m;
    
    location / {
        limit_req zone=general burst=50 nodelay;
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    location /api/ {
        limit_req zone=api burst=10 nodelay;
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Block common attack patterns
    location ~* \.(php|jsp|asp|aspx)$ {
        return 444;
    }
    
    location ~* /(wp-admin|phpmyadmin|admin|config) {
        return 444;
    }
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}
```

## Monitoring Setup

### 1. Log Monitoring

**Logrotate Configuration:**
```bash
cat > /etc/logrotate.d/aitaskflo << EOF
/path/to/aitaskflo/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 nodeuser nodeuser
    postrotate
        systemctl reload nginx
    endscript
}
EOF
```

### 2. Security Monitoring

**Fail2ban Configuration:**
```ini
# /etc/fail2ban/jail.local
[aitaskflo-security]
enabled = true
port = 80,443
logpath = /path/to/aitaskflo/logs/security.log
maxretry = 3
bantime = 3600
findtime = 600
```

### 3. Health Checks

**Monitor Script:**
```bash
#!/bin/bash
# /usr/local/bin/aitaskflo-health.sh

HEALTH_URL="https://yourdomain.com/health"
ALERT_EMAIL="admin@yourdomain.com"

response=$(curl -s -o /dev/null -w "%{http_code}" $HEALTH_URL)

if [ $response -ne 200 ]; then
    echo "AITaskFlo health check failed - HTTP $response" | \
    mail -s "AITaskFlo Alert" $ALERT_EMAIL
fi
```

## Security Checklist

### Pre-Deployment

- [ ] Strong secrets generated and configured
- [ ] SSL certificate installed and configured
- [ ] Firewall rules configured
- [ ] File permissions secured
- [ ] Email notifications configured
- [ ] Security headers configured in reverse proxy

### Post-Deployment

- [ ] Health check endpoint responding
- [ ] Security Guardian active
- [ ] Logs being written correctly
- [ ] Rate limiting working
- [ ] SSL certificate valid
- [ ] Security headers present
- [ ] Admin account secured with MFA

### Ongoing Maintenance

- [ ] Regular security updates
- [ ] Log monitoring active
- [ ] Backup procedures tested
- [ ] Security metrics reviewed
- [ ] Threat reports analyzed
- [ ] Performance monitoring active

## Troubleshooting

### Common Issues

**1. Server Won't Start**
```bash
# Check logs
tail -f logs/application.log

# Verify configuration
node -e "console.log(require('./config/security-config'))"

# Check dependencies
npm audit
```

**2. Security Guardian Not Active**
```bash
# Check security status
curl -H "Authorization: Bearer YOUR_TOKEN" \
     https://yourdomain.com/security/status
```

**3. High Memory Usage**
```bash
# Monitor memory
pm2 monit

# Restart if needed
pm2 restart aitaskflo-security
```

**4. Log File Issues**
```bash
# Check log permissions
ls -la logs/

# Verify log rotation
logrotate -d /etc/logrotate.d/aitaskflo
```

## Backup Procedures

### 1. Application Backup

```bash
#!/bin/bash
# Daily backup script

BACKUP_DIR="/backups/aitaskflo/$(date +%Y%m%d)"
APP_DIR="/path/to/aitaskflo"

mkdir -p $BACKUP_DIR

# Backup application files
tar -czf $BACKUP_DIR/app.tar.gz \
    --exclude=node_modules \
    --exclude=logs \
    --exclude=uploads \
    $APP_DIR

# Backup database
cp $APP_DIR/database.json $BACKUP_DIR/

# Backup logs
tar -czf $BACKUP_DIR/logs.tar.gz $APP_DIR/logs/

# Cleanup old backups (keep 30 days)
find /backups/aitaskflo -type d -mtime +30 -exec rm -rf {} \;
```

### 2. Security Backup

```bash
# Backup security configurations
tar -czf security-config-$(date +%Y%m%d).tar.gz \
    .env \
    config/security-config.js \
    admins.json \
    security-logs.json
```

## Performance Optimization

### 1. Caching

**Redis Setup:**
```bash
# Install Redis
apt-get install redis-server

# Configure Redis for sessions
echo "session.store = redis" >> .env
echo "REDIS_URL=redis://localhost:6379" >> .env
```

### 2. Database Optimization

**Regular Maintenance:**
```bash
# Database cleanup (run via cron)
#!/bin/bash
cd /path/to/aitaskflo
node -e "
const fs = require('fs');
const db = JSON.parse(fs.readFileSync('database.json'));
const oneWeekAgo = new Date(Date.now() - 7*24*60*60*1000);
db.logs = db.logs.filter(log => new Date(log.timestamp) > oneWeekAgo);
fs.writeFileSync('database.json.backup', JSON.stringify(db, null, 2));
fs.writeFileSync('database.json', JSON.stringify(db, null, 2));
"
```

## Support

For deployment support:
- Documentation: `/docs/`
- Health endpoint: `/health`
- Security status: `/security/status` (admin only)
- Email: admin@yourdomain.com