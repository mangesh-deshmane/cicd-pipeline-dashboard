# 🚀 Simple CI/CD Pipeline Health Dashboard

A simplified, easy-to-use dashboard for monitoring GitHub Actions workflows. Perfect for running on your local laptop with minimal setup!

## ✨ Features

- **📊 Real-time Metrics**: View overall success rates, run counts, and average durations
- **📁 Repository Management**: Add and monitor multiple GitHub repositories
- **🏃‍♂️ Workflow Monitoring**: See detailed workflow runs with status and duration
- **🔄 Live Updates**: Real-time updates via WebSocket connections
- **🐳 Docker Ready**: Simple Docker setup for easy deployment
- **💾 Local Storage**: Uses SQLite for data persistence (no complex database setup needed)

## 🏗️ Simple Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   GitHub API    │───▶│   Node.js API   │───▶│  React Frontend │
│ (Actions Data)  │    │  (SQLite + WS)  │    │   (Dashboard)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

- **Frontend**: Simple React app with real-time dashboard
- **Backend**: Node.js API that fetches GitHub Actions data
- **Database**: SQLite for easy local storage
- **Real-time**: WebSocket for live updates

## 🚀 Quick Start

### Option 1: Docker (Recommended)

1. **Clone the repository**
   ```bash
   git clone https://github.com/mangesh-deshmane/cicd-pipeline-dashboard.git
   cd cicd-pipeline-dashboard
   ```

2. **Set up environment (optional)**
   ```bash
   cp backend/env.example backend/.env
   # Edit backend/.env and add your GitHub token for higher API limits
   ```

3. **Start with Docker**
   ```bash
   docker-compose up --build
   ```

4. **Access the dashboard**
   - Dashboard: http://localhost:3000
   - API: http://localhost:3001

### Option 2: Local Development

1. **Clone and setup backend**
   ```bash
   git clone https://github.com/mangesh-deshmane/cicd-pipeline-dashboard.git
   cd cicd-pipeline-dashboard/backend
   npm install
   cp env.example .env
   npm run dev
   ```

2. **Setup frontend** (in another terminal)
   ```bash
   cd frontend
   npm install
   npm start
   ```

3. **Access**
   - Dashboard: http://localhost:3000
   - API: http://localhost:3001

## 📖 How to Use

### 1. Add a Repository
1. Open the dashboard at http://localhost:3000
2. Enter the repository name and owner (e.g., "my-app" and "username")
3. Click "Add Repository"

### 2. Fetch GitHub Actions Data
1. Click the "🔄 Fetch Data" button on any repository card
2. The system will fetch recent workflow runs from GitHub
3. Metrics will update automatically

### 3. Monitor Workflows
1. Click on a repository card to view its workflow runs
2. See real-time status updates
3. View run durations and timestamps

## 🔧 Configuration

### GitHub Token (Optional but Recommended)

To avoid GitHub API rate limits, add a personal access token:

1. Go to [GitHub Personal Access Tokens](https://github.com/settings/tokens)
2. Create a new token with `repo` scope (or `public_repo` for public repos only)
3. Add it to `backend/.env`:
   ```bash
   GITHUB_TOKEN=your_token_here
   ```

### Environment Variables

Create `backend/.env` file:
```bash
# Optional: GitHub token for higher API rate limits
GITHUB_TOKEN=your_github_token_here

# Server configuration (defaults are fine)
PORT=3001
NODE_ENV=development
```

## 📁 Project Structure

```
cicd-pipeline-dashboard/
├── backend/                 # Node.js API server
│   ├── server.js           # Main server file
│   ├── package.json        # Dependencies
│   ├── Dockerfile          # Docker configuration
│   └── .env.example        # Environment template
├── frontend/               # React dashboard
│   ├── src/
│   │   ├── App.js          # Main React component
│   │   └── App.css         # Styles
│   ├── package.json        # Dependencies
│   └── Dockerfile          # Docker configuration
├── docker-compose.yml      # Docker compose setup
└── README.md              # This file
```

## 🔗 API Endpoints

- `GET /api/repositories` - List all repositories
- `POST /api/repositories` - Add a new repository
- `GET /api/repositories/:id/runs` - Get workflow runs for a repository
- `POST /api/fetch-github-data` - Fetch latest data from GitHub
- `GET /api/metrics` - Get overall metrics
- `GET /health` - Health check

## 🎯 Example Usage

### Add Your Repository
1. Repository name: `cicd-pipeline-dashboard`
2. Owner: `mangesh-deshmane`
3. Click "Add Repository"
4. Click "🔄 Fetch Data" to load GitHub Actions data

### Monitor Multiple Projects
- Add all your repositories
- Each repository shows its own metrics
- Real-time updates when new workflows run

## 🔍 Monitoring Your GitHub Actions

The dashboard shows:
- ✅ **Successful runs** (green)
- ❌ **Failed runs** (red)
- 🔄 **In-progress runs** (yellow)
- ⏳ **Queued runs** (gray)

Plus metrics like:
- Success rate percentage
- Average run duration
- Total run counts

## 🚨 Troubleshooting

### Common Issues

**"Error fetching GitHub data"**
- Check if the repository name and owner are correct
- Ensure the repository has GitHub Actions workflows
- Add a GitHub token if hitting rate limits

**Dashboard not updating**
- Check if backend is running on port 3001
- Look for WebSocket connection status (should be green)
- Refresh the page if needed

**Docker issues**
- Make sure Docker is running
- Try `docker-compose down` then `docker-compose up --build`

### Debug Mode
Set environment variables for more detailed logging:
```bash
NODE_ENV=development
```

## 🎉 That's It!

You now have a simple but effective CI/CD pipeline health dashboard running locally. It's perfect for:
- Monitoring your personal projects
- Keeping track of team repositories
- Getting quick insights into workflow performance
- Learning about CI/CD monitoring concepts

## 🔗 Links

- **Repository**: [https://github.com/mangesh-deshmane/cicd-pipeline-dashboard](https://github.com/mangesh-deshmane/cicd-pipeline-dashboard)
- **GitHub Actions**: Learn more about [GitHub Actions](https://docs.github.com/en/actions)
- **API Documentation**: GitHub [REST API](https://docs.github.com/en/rest/actions/workflow-runs)

## 📄 License

MIT License - feel free to use and modify!

---

**Happy monitoring! 🎉**