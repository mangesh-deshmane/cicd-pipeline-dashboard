#!/usr/bin/env python3
"""
Test script to simulate builds and add them to the dashboard
This script can create both passing and failing builds for demonstration
"""

import requests
import json
import time
import random
from datetime import datetime, timedelta

# Configuration
DASHBOARD_URL = "http://localhost:8000"
WRITE_KEY = "test-key"  # Use the same key from your .env file

def create_test_build(status="success", branch="main", repository="test-repo"):
    """Create a test build via the webhook API"""
    
    # Generate random data for the build
    run_id = random.randint(100000000, 999999999)
    commit_sha = ''.join(random.choices('abcdef0123456789', k=40))
    
    # Calculate timing
    started_at = datetime.now() - timedelta(minutes=random.randint(1, 10))
    if status in ['success', 'failure']:
        finished_at = started_at + timedelta(seconds=random.randint(60, 600))
        duration = (finished_at - started_at).total_seconds()
    else:
        finished_at = None
        duration = None
    
    # Create webhook payload
    payload = {
        "workflow_run": {
            "id": run_id,
            "name": "CI/CD Pipeline",
            "head_branch": branch,
            "head_sha": commit_sha,
            "status": "completed" if status in ['success', 'failure'] else "in_progress",
            "conclusion": status if status in ['success', 'failure'] else None,
            "html_url": f"https://github.com/myorg/{repository}/actions/runs/{run_id}",
            "run_started_at": started_at.isoformat() + "Z",
            "updated_at": (finished_at or datetime.now()).isoformat() + "Z",
            "run_number": random.randint(1, 100),
            "run_attempt": 1
        },
        "repository": {
            "full_name": f"myorg/{repository}"
        },
        "sender": {
            "login": random.choice(["johndoe", "janedoe", "bobsmith", "alicejohnson", "charliebrown"])
        }
    }
    
    # Send to webhook
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {WRITE_KEY}"
    }
    
    try:
        response = requests.post(
            f"{DASHBOARD_URL}/api/webhook/github-actions",
            headers=headers,
            json=payload,
            timeout=10
        )
        
        if response.status_code == 200:
            print(f"✅ Created {status} build for {repository}/{branch} (Run ID: {run_id})")
            return True
        else:
            print(f"❌ Failed to create build: {response.status_code} - {response.text}")
            return False
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Error sending webhook: {e}")
        return False

def test_api_health():
    """Test if the API is running"""
    try:
        response = requests.get(f"{DASHBOARD_URL}/health", timeout=5)
        if response.status_code == 200:
            print("✅ Dashboard API is running")
            return True
        else:
            print(f"❌ Dashboard API returned {response.status_code}")
            return False
    except requests.exceptions.RequestException as e:
        print(f"❌ Cannot connect to dashboard API: {e}")
        return False

def main():
    print("🚀 CI/CD Dashboard Build Simulator")
    print("=" * 50)
    
    # Check if API is running
    if not test_api_health():
        print("\n💡 Make sure the dashboard backend is running:")
        print("   python run_server.py")
        return
    
    print("\n📊 Creating test builds...")
    
    # Create a mix of successful and failed builds
    repositories = ["frontend-app", "backend-api", "mobile-app", "infrastructure"]
    branches = ["main", "develop", "feature/new-feature", "hotfix/urgent-fix"]
    
    # Create some successful builds
    for i in range(3):
        repo = random.choice(repositories)
        branch = random.choice(branches)
        create_test_build("success", branch, repo)
        time.sleep(1)  # Small delay between requests
    
    # Create some failed builds
    for i in range(2):
        repo = random.choice(repositories)
        branch = random.choice(branches)
        create_test_build("failure", branch, repo)
        time.sleep(1)
    
    # Create some in-progress builds
    for i in range(1):
        repo = random.choice(repositories)
        branch = random.choice(branches)
        create_test_build("in_progress", branch, repo)
        time.sleep(1)
    
    print("\n🎉 Test builds created successfully!")
    print(f"📱 View dashboard at: http://localhost:8080")
    print(f"🔌 API endpoint: {DASHBOARD_URL}")
    
    # Show current build stats
    try:
        response = requests.get(f"{DASHBOARD_URL}/api/metrics/summary", timeout=5)
        if response.status_code == 200:
            data = response.json()
            print(f"\n📈 Current Dashboard Stats:")
            print(f"   Total Builds: {data.get('total_builds', 'N/A')}")
            print(f"   Success Rate: {data.get('success_rate', 'N/A')}%")
            print(f"   Failed Builds: {data.get('failed_builds', 'N/A')}")
    except:
        pass

if __name__ == "__main__":
    main()
