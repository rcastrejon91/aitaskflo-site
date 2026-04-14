#!/bin/bash
cd /home/aitaskflo
git pull origin main
npm install --production=false
npm run build
pm2 restart all --update-env
echo "Deploy done"
