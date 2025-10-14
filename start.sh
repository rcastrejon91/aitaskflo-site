#!/bin/bash
echo "🚀 Starting AITaskFlo..."
npx pm2 start server.js --name aitaskflo
npx pm2 save
echo "✅ Started! Check status with: ./status.sh"
