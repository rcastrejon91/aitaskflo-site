#!/bin/bash
# slack-debug.sh — checks Slack bot status and fixes common issues

# Fix terminal wrapping
stty cols 220 2>/dev/null || true

cd /home/aitaskflo

echo "=== Slack Debug Report ==="
echo ""

# Load token
TOKEN=$(grep SLACK_BOT_TOKEN .env.local | cut -d= -f2)
CHANNEL=$(grep SLACK_DRAMA_CHANNEL .env.local | cut -d= -f2)

echo "Bot Token: ${TOKEN:0:20}..."
echo "Drama Channel: $CHANNEL"
echo ""

# Check auth
echo "=== Auth Test ==="
AUTH=$(curl -s -H "Authorization: Bearer $TOKEN" https://slack.com/api/auth.test)
echo "$AUTH"
echo ""

# Get bot user ID
BOT_ID=$(echo "$AUTH" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('user_id','unknown'))" 2>/dev/null)
BOT_NAME=$(echo "$AUTH" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('user','unknown'))" 2>/dev/null)
echo "Bot Name: $BOT_NAME"
echo "Bot ID: $BOT_ID"
echo ""

# List channels bot can see
echo "=== Channels Bot Can See ==="
CHANNELS=$(curl -s -H "Authorization: Bearer $TOKEN" "https://slack.com/api/conversations.list?limit=50")
echo "$CHANNELS" | python3 -c "
import sys,json
d=json.load(sys.stdin)
if d.get('ok'):
    for c in d.get('channels',[]):
        print(f\"  #{c['name']} (id: {c['id']})\")
else:
    print('Error:', d.get('error'))
" 2>/dev/null
echo ""

# Check if bot is in drama channel
echo "=== Checking if bot is in #$CHANNEL ==="
CHANNEL_ID=$(echo "$CHANNELS" | python3 -c "
import sys,json
d=json.load(sys.stdin)
ch = '$CHANNEL'
for c in d.get('channels',[]):
    if c['name'] == ch:
        print(c['id'])
" 2>/dev/null)

if [ -z "$CHANNEL_ID" ]; then
    echo "ERROR: Bot cannot see #$CHANNEL — it is not a member"
    echo ""
    echo "=== Attempting to join #$CHANNEL ==="
    JOIN=$(curl -s -X POST -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d "{\"channel\":\"$CHANNEL\"}" \
        https://slack.com/api/conversations.join)
    echo "$JOIN" | python3 -c "
import sys,json
d=json.load(sys.stdin)
if d.get('ok'):
    print('SUCCESS: Bot joined #$CHANNEL')
else:
    print('Failed to join:', d.get('error'))
    print('Fix: Go to Slack, open #$CHANNEL, type /invite @$BOT_NAME')
" 2>/dev/null
else
    echo "OK: Bot is in #$CHANNEL (id: $CHANNEL_ID)"
fi

echo ""
echo "=== Done ==="
