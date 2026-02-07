#!/bin/bash

# Updated credentials from .env.local
SUPABASE_URL="https://ostwoccxgutumkwqkwjc.supabase.co"
SUPABASE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zdHdvY2N4Z3V0dW1rd3Frd2pjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5Njg2NzMsImV4cCI6MjA3NDU0NDY3M30.lLPi6ZE6sGf453MHHsn1zjJbtFLT8cdUbyvW5dxJDSE"

echo "Running Connectivity Check for New Credentials"
echo "--------------------------------------------------"

echo "Testing /api/external-db/check"
curl -X POST "http://localhost:3000/api/external-db/check" \
  -H "Content-Type: application/json" \
  -d "{\"url\": \"$SUPABASE_URL\", \"key\": \"$SUPABASE_KEY\"}"

echo -e "\n--------------------------------------------------"
