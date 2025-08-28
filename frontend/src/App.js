import React, { useState, useEffect } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import './App.css';

const API_BASE = 'http://localhost:3001/api';

function App() {
  const [repositories, setRepositories] = useState([]);
  const [metrics, setMetrics] = useState({});
  const [newRepo, setNewRepo] = useState({ name: '', owner: '' });
  const [selectedRepo, setSelectedRepo] = useState(null);
  const [workflowRuns, setWorkflowRuns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);

  // WebSocket connection
  useEffect(() => {
    const socket = io('http://localhost:3001');
    
    socket.on('connect', () => {
      setConnected(true);
      console.log('Connected to server');
    });

    socket.on('disconnect', () => {
      setConnected(false);
      console.log('Disconnected from server');
    });

    socket.on('workflow_runs_updated', (data) => {
      console.log('Workflow runs updated:', data);
      fetchMetrics();
      if (selectedRepo && selectedRepo.id === data.repoId) {
        fetchWorkflowRuns(data.repoId);
      }
    });

    return () => socket.disconnect();
  }, [selectedRepo]);

  // Fetch repositories
  const fetchRepositories = async () => {
    try {
      const response = await axios.get(`${API_BASE}/repositories`);
      setRepositories(response.data);
    } catch (error) {
      console.error('Error fetching repositories:', error);
    }
  };

  // Fetch metrics
  const fetchMetrics = async () => {
    try {
      const response = await axios.get(`${API_BASE}/metrics`);
      setMetrics(response.data);
    } catch (error) {
      console.error('Error fetching metrics:', error);
    }
  };

  // Fetch workflow runs for a repository
  const fetchWorkflowRuns = async (repoId) => {
    try {
      const response = await axios.get(`${API_BASE}/repositories/${repoId}/runs`);
      setWorkflowRuns(response.data);
    } catch (error) {
      console.error('Error fetching workflow runs:', error);
    }
  };

  // Add repository
  const addRepository = async (e) => {
    e.preventDefault();
    if (!newRepo.name || !newRepo.owner) return;

    try {
      await axios.post(`${API_BASE}/repositories`, newRepo);
      setNewRepo({ name: '', owner: '' });
      fetchRepositories();
    } catch (error) {
      console.error('Error adding repository:', error);
      alert('Error adding repository: ' + error.response?.data?.error);
    }
  };

  // Fetch GitHub data
  const fetchGitHubData = async (owner, name) => {
    setLoading(true);
    try {
      await axios.post(`${API_BASE}/fetch-github-data`, { owner, repo: name });
      fetchMetrics();
      if (selectedRepo) {
        fetchWorkflowRuns(selectedRepo.id);
      }
    } catch (error) {
      console.error('Error fetching GitHub data:', error);
      alert('Error fetching GitHub data: ' + error.response?.data?.error);
    } finally {
      setLoading(false);
    }
  };

  // Initial data fetch
  useEffect(() => {
    fetchRepositories();
    fetchMetrics();
  }, []);

  // Fetch workflow runs when repository is selected
  useEffect(() => {
    if (selectedRepo) {
      fetchWorkflowRuns(selectedRepo.id);
    }
  }, [selectedRepo]);

  const getStatusColor = (status, conclusion) => {
    if (status === 'completed') {
      return conclusion === 'success' ? '#28a745' : '#dc3545';
    }
    return status === 'in_progress' ? '#ffc107' : '#6c757d';
  };

  const getStatusIcon = (status, conclusion) => {
    if (status === 'completed') {
      return conclusion === 'success' ? '✅' : '❌';
    }
    return status === 'in_progress' ? '🔄' : '⏳';
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>🚀 Simple CI/CD Dashboard</h1>
        <div className="connection-status">
          Status: <span style={{ color: connected ? '#28a745' : '#dc3545' }}>
            {connected ? '🟢 Connected' : '🔴 Disconnected'}
          </span>
        </div>
      </header>

      <main className="App-main">
        {/* Metrics Dashboard */}
        <section className="metrics-section">
          <h2>📊 Overall Metrics</h2>
          <div className="metrics-grid">
            <div className="metric-card">
              <h3>Total Runs</h3>
              <div className="metric-value">{metrics.total_runs || 0}</div>
            </div>
            <div className="metric-card">
              <h3>Success Rate</h3>
              <div className="metric-value">{metrics.success_rate || 0}%</div>
            </div>
            <div className="metric-card">
              <h3>Successful Runs</h3>
              <div className="metric-value" style={{ color: '#28a745' }}>
                {metrics.successful_runs || 0}
              </div>
            </div>
            <div className="metric-card">
              <h3>Failed Runs</h3>
              <div className="metric-value" style={{ color: '#dc3545' }}>
                {metrics.failed_runs || 0}
              </div>
            </div>
            <div className="metric-card">
              <h3>Avg Duration</h3>
              <div className="metric-value">{metrics.avg_duration_minutes || 0} min</div>
            </div>
          </div>
        </section>

        {/* Repository Management */}
        <section className="repo-section">
          <h2>📁 Repositories</h2>
          
          {/* Add Repository Form */}
          <form onSubmit={addRepository} className="add-repo-form">
            <input
              type="text"
              placeholder="Repository name (e.g., my-app)"
              value={newRepo.name}
              onChange={(e) => setNewRepo({ ...newRepo, name: e.target.value })}
            />
            <input
              type="text"
              placeholder="Owner (e.g., username)"
              value={newRepo.owner}
              onChange={(e) => setNewRepo({ ...newRepo, owner: e.target.value })}
            />
            <button type="submit">Add Repository</button>
          </form>

          {/* Repository List */}
          <div className="repo-list">
            {repositories.map(repo => (
              <div 
                key={repo.id} 
                className={`repo-card ${selectedRepo?.id === repo.id ? 'selected' : ''}`}
                onClick={() => setSelectedRepo(repo)}
              >
                <h3>{repo.owner}/{repo.name}</h3>
                <div className="repo-actions">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      fetchGitHubData(repo.owner, repo.name);
                    }}
                    disabled={loading}
                  >
                    {loading ? '⏳ Fetching...' : '🔄 Fetch Data'}
                  </button>
                  <a 
                    href={repo.github_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                  >
                    🔗 GitHub
                  </a>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Workflow Runs */}
        {selectedRepo && (
          <section className="runs-section">
            <h2>🏃‍♂️ Workflow Runs - {selectedRepo.owner}/{selectedRepo.name}</h2>
            
            {workflowRuns.length === 0 ? (
              <div className="no-data">
                <p>No workflow runs found. Click "Fetch Data" to load GitHub Actions data.</p>
              </div>
            ) : (
              <div className="runs-list">
                {workflowRuns.map(run => (
                  <div key={run.id} className="run-card">
                    <div className="run-header">
                      <span className="run-icon">
                        {getStatusIcon(run.status, run.conclusion)}
                      </span>
                      <span className="run-name">{run.name}</span>
                      <span 
                        className="run-status"
                        style={{ color: getStatusColor(run.status, run.conclusion) }}
                      >
                        {run.status} {run.conclusion && `(${run.conclusion})`}
                      </span>
                    </div>
                    <div className="run-details">
                      <span>Duration: {run.duration_seconds ? Math.round(run.duration_seconds / 60) : 'N/A'} min</span>
                      <span>Started: {new Date(run.created_at).toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}

export default App;