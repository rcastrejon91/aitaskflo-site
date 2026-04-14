#!/bin/bash
curl -X POST http://localhost:3000/api/slack/drama \
  -H "Content-Type: application/json" \
  -d '{"secret":"lyra-guardian-f27fc06d4e8d090e","channel":"a-project","count":4}'
