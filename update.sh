#!/bin/bash

# Quick update script for AITaskFlo

echo "🔄 Updating AITaskFlo..."

# Pull latest changes (if using git)
if [ -d ".git" ]; then
    git pull
fi

# Install dependencies
npm install --production

# Restart application
pm2 restart aitaskflo

echo "✅ Update complete!"
