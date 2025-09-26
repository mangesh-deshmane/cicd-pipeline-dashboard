require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const axios = require('axios');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Simple SQLite database
const db = new sqlite3.Database('./dashboard.db');

// Create tables
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS repositories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE,
    owner TEXT,
    github_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS workflow_runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    repo_id INTEGER,
    run_id INTEGER,
    name TEXT,
    status TEXT,
    conclusion TEXT,
    created_at TEXT,
    updated_at TEXT,
    duration_seconds INTEGER,
    FOREIGN KEY(repo_id) REFERENCES repositories(id)
  )`);
});

// Store connected clients
let connectedClients = [];

// WebSocket connections
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  connectedClients.push(socket.id);

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    connectedClients = connectedClients.filter(id => id !== socket.id);
  });
});

// API Routes

// Get all repositories
app.get('/api/repositories', (req, res) => {
  db.all('SELECT * FROM repositories ORDER BY created_at DESC', (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// Add a repository
app.post('/api/repositories', (req, res) => {
  const { name, owner, github_url } = req.body;
  
  if (!name || !owner) {
    return res.status(400).json({ error: 'Name and owner are required' });
  }

  db.run(
    'INSERT INTO repositories (name, owner, github_url) VALUES (?, ?, ?)',
    [name, owner, github_url || `https://github.com/${owner}/${name}`],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ id: this.lastID, name, owner, github_url });
    }
  );
});

// Get workflow runs for a repository
app.get('/api/repositories/:id/runs', (req, res) => {
  const repoId = req.params.id;
  
  db.all(
    'SELECT * FROM workflow_runs WHERE repo_id = ? ORDER BY created_at DESC LIMIT 50',
    [repoId],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(rows);
    }
  );
});

// Get dashboard metrics
app.get('/api/metrics', (req, res) => {
  const queries = [
    'SELECT COUNT(*) as total_runs FROM workflow_runs',
    'SELECT COUNT(*) as successful_runs FROM workflow_runs WHERE conclusion = "success"',
    'SELECT COUNT(*) as failed_runs FROM workflow_runs WHERE conclusion = "failure"',
    'SELECT AVG(duration_seconds) as avg_duration FROM workflow_runs WHERE duration_seconds IS NOT NULL'
  ];

  Promise.all(queries.map(query => {
    return new Promise((resolve, reject) => {
      db.get(query, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }))
  .then(results => {
    const [totalRuns, successfulRuns, failedRuns, avgDuration] = results;
    
    res.json({
      total_runs: totalRuns.total_runs || 0,
      successful_runs: successfulRuns.successful_runs || 0,
      failed_runs: failedRuns.failed_runs || 0,
      success_rate: totalRuns.total_runs > 0 
        ? ((successfulRuns.successful_runs / totalRuns.total_runs) * 100).toFixed(1)
        : 0,
      avg_duration_minutes: avgDuration.avg_duration 
        ? (avgDuration.avg_duration / 60).toFixed(1)
        : 0
    });
  })
  .catch(err => {
    res.status(500).json({ error: err.message });
  });
});

// Fetch GitHub Actions data
app.post('/api/fetch-github-data', async (req, res) => {
  const { owner, repo } = req.body;
  
  if (!owner || !repo) {
    return res.status(400).json({ error: 'Owner and repo are required' });
  }

  try {
    // Get GitHub token from environment
    const token = process.env.GITHUB_TOKEN;
    const headers = token ? { Authorization: `token ${token}` } : {};

    // Fetch workflow runs from GitHub API
    const response = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}/actions/runs`,
      { headers }
    );

    const runs = response.data.workflow_runs;

    // Get or create repository
    db.get(
      'SELECT id FROM repositories WHERE name = ? AND owner = ?',
      [repo, owner],
      (err, row) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        let repoId = row?.id;

        const processRuns = (repoId) => {
          // Insert workflow runs
          const stmt = db.prepare(`
            INSERT OR REPLACE INTO workflow_runs 
            (repo_id, run_id, name, status, conclusion, created_at, updated_at, duration_seconds)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `);

          runs.forEach(run => {
            const duration = run.updated_at && run.created_at 
              ? Math.round((new Date(run.updated_at) - new Date(run.created_at)) / 1000)
              : null;

            stmt.run([
              repoId,
              run.id,
              run.name,
              run.status,
              run.conclusion,
              run.created_at,
              run.updated_at,
              duration
            ]);
          });

          stmt.finalize();

          // Broadcast update to connected clients
          io.emit('workflow_runs_updated', { repoId, runs: runs.length });

          res.json({ 
            message: `Fetched ${runs.length} workflow runs`,
            runs: runs.length 
          });
        };

        if (!repoId) {
          // Create repository if it doesn't exist
          db.run(
            'INSERT INTO repositories (name, owner, github_url) VALUES (?, ?, ?)',
            [repo, owner, `https://github.com/${owner}/${repo}`],
            function(err) {
              if (err) {
                return res.status(500).json({ error: err.message });
              }
              processRuns(this.lastID);
            }
          );
        } else {
          processRuns(repoId);
        }
      }
    );

  } catch (error) {
    console.error('GitHub API Error:', error.message);
    res.status(500).json({ 
      error: 'Failed to fetch GitHub data',
      details: error.response?.data?.message || error.message
    });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Start server
server.listen(PORT, () => {
  console.log(`🚀 Simple CI/CD Dashboard running on port ${PORT}`);
  console.log(`📊 Dashboard: http://localhost:3000`);
  console.log(`🔧 API: http://localhost:${PORT}`);
});