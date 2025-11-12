#!/bin/bash

echo "🚀 Starting AITaskFlo Services..."
echo ""

# IMPORTANT: Update this path to your actual medical AI directory
MEDICAL_AI_DIR=~/medical-ai  # ← CHANGE THIS TO YOUR ACTUAL PATH

# Check if medical AI exists
if [ ! -d "$MEDICAL_AI_DIR" ]; then
  echo "⚠️  Medical AI directory not found: $MEDICAL_AI_DIR"
  echo "   Skipping FastAPI startup..."
  echo "   Only starting Node.js frontend..."
  echo ""
  
  # Start Node.js only
  echo "🌐 Starting Frontend Server (Port 3000)..."
  cd ~/aitaskflo-site
  nohup node server.js > server.log 2>&1 &
  NODEJS_PID=$!
  echo "   PID: $NODEJS_PID"
  
  sleep 2
  
  echo ""
  echo "================================"
  echo "✅ Frontend Started!"
  echo "================================"
  echo "🔗 Frontend: http://localhost:3000"
  echo "   Medical: http://localhost:3000/medical"
  echo "   PID: $NODEJS_PID"
  echo ""
  echo "⚠️  Medical AI not available"
  echo "   Medical predictions will not work"
  echo "================================"
  
  exit 0
fi

# Start FastAPI
echo "📡 Starting Medical AI API (Port 8000)..."
cd "$MEDICAL_AI_DIR"
nohup uvicorn api:app --host 0.0.0.0 --port 8000 > fastapi.log 2>&1 &
FASTAPI_PID=$!
echo "   PID: $FASTAPI_PID"

sleep 3

# Start Node.js
echo "🌐 Starting Frontend Server (Port 3000)..."
cd ~/aitaskflo-site
nohup node server.js > server.log 2>&1 &
NODEJS_PID=$!
echo "   PID: $NODEJS_PID"

sleep 2

echo ""
echo "================================"
echo "✅ Services Started!"
echo "================================"
echo ""
echo "🔗 FastAPI: http://localhost:8000"
echo "   Docs: http://localhost:8000/docs"
echo "   PID: $FASTAPI_PID"
echo ""
echo "🔗 Frontend: http://localhost:3000"
echo "   Medical: http://localhost:3000/medical"
echo "   PID: $NODEJS_PID"
echo ""
echo "================================"
echo ""
echo "📊 Testing services..."
echo ""

# Test FastAPI
echo "Testing FastAPI..."
curl -s http://localhost:8000/health | jq '.' 2>/dev/null || curl -s http://localhost:8000/health

echo ""
echo "Testing Node.js..."
curl -s http://localhost:3000/health | jq '.' 2>/dev/null || curl -s http://localhost:3000/health

echo ""
echo "================================"
echo "✅ All services are running!"
echo ""
echo "To stop services:"
echo "  kill $FASTAPI_PID $NODEJS_PID"
echo ""
echo "Or use: ./stop-all.sh"
echo "================================"
