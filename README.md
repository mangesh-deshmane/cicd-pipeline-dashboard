# 🚀 CI/CD Pipeline Dashboard

A comprehensive monitoring solution for CI/CD pipelines with support for multiple providers and deployment strategies.

## ✨ Features

### Core Monitoring
- **Real-time Pipeline Monitoring**: Track success/failure rates, build times, and status
- **Comprehensive Metrics**: Success rate, failure rate, average build time, last build status
- **Multi-Provider Support**: GitHub Actions, Jenkins, and extensible for other tools
- **Alert System**: Slack and email notifications for pipeline failures

### User Interface
- **Modern UI**: Responsive dashboard with real-time updates
- **Multiple Implementations**: Both Python/FastAPI and Node.js/React versions
- **Real-time Updates**: Live data updates and status monitoring
- **Mobile Responsive**: Works on desktop, tablet, and mobile devices

## 🏗️ Architecture Options

### Option 1: Python FastAPI Backend (Recommended)
- **FastAPI**: Modern, fast web framework for building APIs
- **SQLAlchemy**: SQL toolkit and ORM for database operations
- **SQLite/PostgreSQL**: Flexible database options
- **Async Support**: Full async/await support for high performance

### Option 2: Node.js Backend (Alternative)
- **Node.js**: JavaScript runtime for backend services
- **Express**: Web framework for Node.js
- **SQLite**: Lightweight database
- **Real-time**: WebSocket support for live updates

### Frontend Options
- **Vanilla JavaScript**: Pure JS implementation (lightweight)
- **React**: Modern React-based dashboard (feature-rich)
- **Responsive Design**: Mobile-first approach with CSS Grid and Flexbox

## 🛠️ Tech Stack

### Python Implementation
- **Backend**: Python 3.8+, FastAPI, SQLAlchemy
- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Database**: SQLite (development), PostgreSQL (production)
- **Infrastructure**: Terraform, AWS ECS, Docker

### Node.js Implementation  
- **Backend**: Node.js, Express
- **Frontend**: React, JavaScript
- **Database**: SQLite
- **Deployment**: Docker, simple setup

## 📦 Quick Start

### Option 1: Docker (Recommended)

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd cicd-health-dashboard
   ```

2. **Set up Python environment**
   ```bash
   python -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   pip install -r requirements.txt
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Initialize database**
   ```bash
   cd backend
   python init_db.py
   ```

5. **Start the backend**
   ```bash
   python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
   ```

6. **Open the frontend**
   - Navigate to `frontend/` directory
   - Open `index.html` in your browser
   - Or serve with a simple HTTP server: `python -m http.server 8080`

## 🔧 Configuration

### Environment Variables
```bash
# Database
DATABASE_URL=sqlite:///./data.db

# Frontend Origin (for CORS)
FRONTEND_ORIGIN=http://localhost:8080

# Alert Configuration
SLACK_WEBHOOK_URL=your_slack_webhook_url
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your_email@gmail.com
SMTP_PASSWORD=your_app_password

# Security
WRITE_KEY=your_secret_write_key
```

### Alert Setup
1. **Slack**: Create a webhook in your Slack workspace
2. **Email**: Configure SMTP settings for your email provider

## 📊 API Endpoints

### Core Endpoints
- `GET /health` - Health check
- `GET /api/metrics/summary` - Dashboard metrics
- `GET /api/builds` - List of builds
- `GET /api/builds/{build_id}` - Build details
- `POST /api/webhook/github-actions` - GitHub webhook receiver
- `POST /api/webhook/jenkins` - Jenkins webhook receiver

### Alert Endpoints
- `POST /api/alert/test` - Test alert delivery
- `GET /api/alerts` - Alert history
- `POST /api/alerts/configure` - Configure alert settings

## 🎨 Frontend Components

### Dashboard Layout
- **Header**: Title and refresh button
- **Summary Cards**: Key metrics display
- **Builds Table**: Recent pipeline executions
- **Status Indicators**: Color-coded build statuses
- **Responsive Design**: Mobile and desktop optimized

### Real-time Features
- **Auto-refresh**: Configurable polling intervals
- **Live Updates**: Real-time status changes
- **Error Handling**: Graceful failure states
- **Loading States**: User feedback during operations

## 🚢 Deployment

### Docker
```bash
# Build the image
docker build -t cicd-dashboard .

# Run the container
docker run -p 8000:8000 -p 8080:8080 cicd-dashboard
```

### Production Considerations
- Use PostgreSQL instead of SQLite
- Configure proper CORS origins
- Set up reverse proxy (nginx)
- Enable HTTPS
- Configure monitoring and logging

## 🔍 Monitoring & Observability

### Built-in Metrics
- Request/response times
- Database query performance
- Error rates and types
- Alert delivery success rates

### Health Checks
- Database connectivity
- External service availability
- Alert service status
- Overall system health

## 🚀 Alternative: Simple Node.js Implementation

For a simpler setup, you can also use the Node.js implementation:
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

### **Container Management Commands**

```bash
# Start containers (build if needed)
docker-compose up --build

# Start containers in background
docker-compose up -d

# Stop containers
docker-compose down

# Stop and remove volumes
docker-compose down -v

# Stop and remove images
docker-compose down --rmi all

# View container logs
docker-compose logs

# View specific service logs
docker-compose logs backend
docker-compose logs frontend

# Restart containers
docker-compose restart

# Rebuild and restart specific service
docker-compose up --build backend
```

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
- Stop containers: `docker-compose down`
- Rebuild and start: `docker-compose up --build`
- Check container status: `docker-compose ps`
- View logs: `docker-compose logs`

**Permission issues (macOS/Linux)**
```bash
# If you get permission denied errors
sudo chown -R $USER:$USER .
chmod -R 755 .
```

**Port conflicts**
```bash
# If ports 3000 or 3001 are in use
docker-compose down
# Kill processes using the ports
lsof -ti:3000 | xargs kill -9
lsof -ti:3001 | xargs kill -9
# Restart containers
docker-compose up --build
```

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
