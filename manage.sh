#!/bin/bash

case "$1" in
    start)
        echo "🚀 Starting AITaskFlo server..."
        npm start
        ;;
    stop)
        echo "🛑 Stopping AITaskFlo server..."
        pkill -f "node server.js"
        echo "✅ Server stopped"
        ;;
    restart)
        echo "🔄 Restarting AITaskFlo server..."
        pkill -f "node server.js"
        sleep 2
        npm start &
        sleep 3
        echo "✅ Server restarted"
        ;;
    status)
        ./status.sh
        ;;
    users)
        echo "👥 All Users:"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        sqlite3 db/users.db "SELECT id, username, email, last_login FROM users;" | while IFS='|' read -r id username email last_login; do
            echo "ID: $id | User: $username | Email: $email | Last Login: ${last_login:-Never}"
        done
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        ;;
    test)
        echo "🧪 Testing all endpoints..."
        echo ""
        echo "Testing Homepage..."
        curl -s -o /dev/null -w "Homepage: %{http_code}\n" http://localhost:3001/
        echo "Testing Login..."
        curl -s -o /dev/null -w "Login: %{http_code}\n" http://localhost:3001/login.html
        echo "Testing Register..."
        curl -s -o /dev/null -w "Register: %{http_code}\n" http://localhost:3001/register.html
        echo "Testing Dashboard..."
        curl -s -o /dev/null -w "Dashboard: %{http_code}\n" http://localhost:3001/dashboard.html
        echo "Testing API..."
        curl -s -o /dev/null -w "API: %{http_code}\n" http://localhost:3001/auth/users
        ;;
    logs)
        echo "📋 Server logs (last 50 lines):"
        tail -50 nohup.out 2>/dev/null || echo "No logs found. Server might not be running in background."
        ;;
    *)
        echo "AITaskFlo Management Script"
        echo ""
        echo "Usage: ./manage.sh [command]"
        echo ""
        echo "Commands:"
        echo "  start    - Start the server"
        echo "  stop     - Stop the server"
        echo "  restart  - Restart the server"
        echo "  status   - Show system status"
        echo "  users    - List all users"
        echo "  test     - Test all endpoints"
        echo "  logs     - Show server logs"
        echo ""
        echo "Examples:"
        echo "  ./manage.sh start"
        echo "  ./manage.sh status"
        echo "  ./manage.sh users"
        ;;
esac
