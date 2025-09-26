#!/bin/bash

# Quick Start Script for CI/CD Dashboard
echo "🚀 Quick Start for CI/CD Dashboard"

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ .env file not found. Run setup_config.sh first."
    exit 1
fi

# Load environment variables
source .env

echo "📋 Current Configuration:"
echo "WRITE_KEY: $WRITE_KEY"
echo "DATABASE_URL: $DATABASE_URL"
echo ""

echo "🔧 Starting Dashboard..."
echo "1. Start the backend: python run_server.py"
echo "2. In another terminal, expose with ngrok: ngrok http 8000"
echo "3. Copy the https URL and add to GitHub secrets"
echo "4. Test with a git push"
echo ""

echo "📚 Useful Commands:"
echo "- View logs: tail -f logs/dashboard.log"
echo "- Test API: curl http://localhost:8000/health"
echo "- Open frontend: open http://localhost:8080"
echo "- Stop server: pkill -f 'run_server.py'"
