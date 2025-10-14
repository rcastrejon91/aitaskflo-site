#!/bin/bash

echo "🚀 Starting AITaskFlo in development mode..."

# Kill any existing processes
pkill -f "node.*server.js" 2>/dev/null || true
sleep 1

# Set environment
export NODE_ENV=development
export PORT=3000

# Start with nodemon
npx nodemon server.js
