#!/bin/bash

clear
echo "╔════════════════════════════════════════════════════╗"
echo "║        AITaskFlo System Status Dashboard           ║"
echo "╚════════════════════════════════════════════════════╝"
echo ""

# Check if server is running
if pgrep -f "node server.js" > /dev/null; then
    PID=$(pgrep -f "node server.js")
    echo "✅ Server Status: RUNNING (PID: $PID)"
else
    echo "❌ Server Status: STOPPED"
    echo ""
    echo "💡 Start with: npm start"
    exit 1
fi

# Check database
if [ -f "db/users.db" ]; then
    USER_COUNT=$(sqlite3 db/users.db "SELECT COUNT(*) FROM users;" 2>/dev/null)
    echo "✅ Database: CONNECTED"
    echo "   👥 Total Users: $USER_COUNT"
else
    echo "❌ Database: NOT FOUND"
fi

# Check pages
echo ""
echo "📄 Page Availability:"
PAGES=("/" "/login.html" "/register.html" "/dashboard.html")
PAGE_NAMES=("Homepage" "Login" "Register" "Dashboard")

for i in "${!PAGES[@]}"; do
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001${PAGES[$i]} 2>/dev/null)
    if [ "$STATUS" = "200" ]; then
        echo "   ✅ ${PAGE_NAMES[$i]}: OK"
    else
        echo "   ❌ ${PAGE_NAMES[$i]}: $STATUS"
    fi
done

# Check API
echo ""
echo "🔌 API Health:"
API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/auth/users 2>/dev/null)
if [ "$API_STATUS" = "200" ]; then
    echo "   ✅ Auth API: OPERATIONAL"
else
    echo "   ❌ Auth API: $API_STATUS"
fi

HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/health 2>/dev/null)
if [ "$HEALTH_STATUS" = "200" ]; then
    echo "   ✅ Health Check: PASSED"
else
    echo "   ❌ Health Check: $HEALTH_STATUS"
fi

# Recent users
echo ""
echo "👤 Recent User Activity:"
sqlite3 db/users.db "SELECT username, email, last_login FROM users WHERE last_login IS NOT NULL ORDER BY last_login DESC LIMIT 3;" 2>/dev/null | while IFS='|' read -r username email last_login; do
    echo "   • $username ($email) - $last_login"
done

echo ""
echo "╔════════════════════════════════════════════════════╗"
echo "║  🌐 Access: http://localhost:3001/                ║"
echo "║  🔑 Test Login: you@email.com / YourPass123!      ║"
echo "╚════════════════════════════════════════════════════╝"
