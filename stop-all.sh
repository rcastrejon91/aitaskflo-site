#!/bin/bash

echo "🛑 Stopping AITaskFlo Services..."

# Kill FastAPI
pkill -f "uvicorn api:app"
echo "   ✅ FastAPI stopped"

# Kill Node.js
pkill -f "node server.js"
echo "   ✅ Node.js stopped"

echo ""
echo "✅ All services stopped!"
