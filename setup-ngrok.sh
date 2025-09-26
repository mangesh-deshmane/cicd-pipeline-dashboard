#!/bin/bash

# Setup ngrok for exposing local dashboard
echo "🌐 Setting up ngrok for public access..."

# Check if ngrok is installed
if ! command -v ngrok &> /dev/null; then
    echo "❌ ngrok not found. Installing..."
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        brew install ngrok
    else
        echo "Please install ngrok from https://ngrok.com/download"
        exit 1
    fi
fi

echo "✅ ngrok is installed"
echo ""
echo "🚀 To expose your dashboard:"
echo "1. Start your dashboard: python run_server.py"
echo "2. In another terminal: ngrok http 8000"
echo "3. Copy the https URL (e.g., https://abcd-1234.ngrok-free.app)"
echo "4. Use this URL in GitHub secrets: DASHBOARD_WEBHOOK_URL"
echo ""

echo "📋 Example ngrok command:"
echo "ngrok http 8000 --log=stdout"
