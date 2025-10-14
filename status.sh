#!/bin/bash
echo "📊 AITaskFlo Status:"
echo "===================="
npx pm2 status aitaskflo
echo ""
echo "Recent logs:"
npx pm2 logs aitaskflo --lines 10 --nostream
