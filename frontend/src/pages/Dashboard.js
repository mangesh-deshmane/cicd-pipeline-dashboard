import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Alert,
  FormControl,
  Select,
  MenuItem,
  InputLabel,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { metricsApi, projectsApi } from '../services/api';
import { useWebSocket } from '../contexts/WebSocketContext';

import MetricCard from '../components/Dashboard/MetricCard';
import ExecutionTrendsChart from '../components/Dashboard/ExecutionTrendsChart';
import DurationTrendsChart from '../components/Dashboard/DurationTrendsChart';
import StatusDistributionChart from '../components/Dashboard/StatusDistributionChart';
import RecentExecutionsTable from '../components/Dashboard/RecentExecutionsTable';
import ProjectsOverview from '../components/Dashboard/ProjectsOverview';

const Dashboard = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('7d');
  const [selectedProject, setSelectedProject] = useState('all');
  const { subscribeToGlobal, addExecutionListener, addMetricsListener } = useWebSocket();

  // Fetch projects
  const { data: projectsData } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsApi.getAll(),
    select: (response) => response.data.projects,
  });

  // Fetch overview metrics
  const { 
    data: overviewData, 
    isLoading: overviewLoading, 
    error: overviewError,
    refetch: refetchOverview 
  } = useQuery({
    queryKey: ['metrics', 'overview', selectedPeriod],
    queryFn: () => metricsApi.getOverview(selectedPeriod),
    select: (response) => response.data,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Fetch project-specific metrics if a project is selected
  const { 
    data: projectMetrics, 
    isLoading: projectLoading,
    refetch: refetchProjectMetrics 
  } = useQuery({
    queryKey: ['metrics', 'project', selectedProject, selectedPeriod],
    queryFn: () => metricsApi.getProjectMetrics(selectedProject, selectedPeriod),
    select: (response) => response.data,
    enabled: selectedProject !== 'all',
    refetchInterval: 30000,
  });

  // Subscribe to real-time updates
  useEffect(() => {
    subscribeToGlobal();

    const removeExecutionListener = addExecutionListener((data) => {
      // Refetch metrics when executions are updated
      refetchOverview();
      if (selectedProject !== 'all') {
        refetchProjectMetrics();
      }
    });

    const removeMetricsListener = addMetricsListener((data) => {
      // Refetch specific metrics
      if (selectedProject === 'all' || data.data.project_id === selectedProject) {
        refetchOverview();
        if (selectedProject !== 'all') {
          refetchProjectMetrics();
        }
      }
    });

    return () => {
      removeExecutionListener();
      removeMetricsListener();
    };
  }, [subscribeToGlobal, addExecutionListener, addMetricsListener, selectedProject, refetchOverview, refetchProjectMetrics]);

  const handlePeriodChange = (event) => {
    setSelectedPeriod(event.target.value);
  };

  const handleProjectChange = (event) => {
    setSelectedProject(event.target.value);
  };

  const isLoading = overviewLoading || (selectedProject !== 'all' && projectLoading);
  const metricsData = selectedProject === 'all' ? overviewData : projectMetrics;

  if (overviewError) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        Error loading dashboard data: {overviewError.message}
      </Alert>
    );
  }

  return (
    <Box>
      {/* Header Controls */}
      <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Period</InputLabel>
          <Select
            value={selectedPeriod}
            label="Period"
            onChange={handlePeriodChange}
          >
            <MenuItem value="1d">Last 24 hours</MenuItem>
            <MenuItem value="7d">Last 7 days</MenuItem>
            <MenuItem value="30d">Last 30 days</MenuItem>
            <MenuItem value="90d">Last 90 days</MenuItem>
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>Project</InputLabel>
          <Select
            value={selectedProject}
            label="Project"
            onChange={handleProjectChange}
          >
            <MenuItem value="all">All Projects</MenuItem>
            {projectsData?.map((project) => (
              <MenuItem key={project.id} value={project.id}>
                {project.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={3}>
          {/* Metrics Cards */}
          <Grid item xs={12}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <MetricCard
                  title="Total Executions"
                  value={selectedProject === 'all' 
                    ? overviewData?.overview?.total_executions || 0
                    : metricsData?.summary?.total_executions || 0
                  }
                  subtitle={`Last ${selectedPeriod}`}
                  color="primary"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <MetricCard
                  title="Success Rate"
                  value={selectedProject === 'all' 
                    ? overviewData?.overview?.success_rate || 0
                    : metricsData?.summary?.success_rate || 0
                  }
                  suffix="%"
                  subtitle={`Last ${selectedPeriod}`}
                  color="success"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <MetricCard
                  title="Avg Duration"
                  value={selectedProject === 'all' 
                    ? overviewData?.overview?.avg_duration_minutes || 0
                    : metricsData?.summary?.avg_duration_minutes || 0
                  }
                  suffix=" min"
                  subtitle={`Last ${selectedPeriod}`}
                  color="info"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <MetricCard
                  title="Active Projects"
                  value={selectedProject === 'all' 
                    ? overviewData?.overview?.active_projects || 0
                    : 1
                  }
                  subtitle="Currently monitored"
                  color="secondary"
                />
              </Grid>
            </Grid>
          </Grid>

          {/* Charts Section */}
          <Grid item xs={12} lg={8}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Execution Trends
                </Typography>
                <ExecutionTrendsChart 
                  data={metricsData?.trends?.daily_executions || []} 
                  period={selectedPeriod}
                />
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} lg={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Status Distribution
                </Typography>
                <StatusDistributionChart 
                  data={metricsData?.trends?.status_distribution || []} 
                />
              </CardContent>
            </Card>
          </Grid>

          {/* Duration Trends */}
          <Grid item xs={12} lg={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Duration Trends
                </Typography>
                <DurationTrendsChart 
                  data={metricsData?.trends?.duration_trend || []} 
                />
              </CardContent>
            </Card>
          </Grid>

          {/* Projects Overview (only show for all projects view) */}
          {selectedProject === 'all' && (
            <Grid item xs={12} lg={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Projects Overview
                  </Typography>
                  <ProjectsOverview 
                    data={overviewData?.project_breakdown || []} 
                  />
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* Recent Executions */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Recent Executions
                </Typography>
                <RecentExecutionsTable 
                  projectId={selectedProject === 'all' ? null : selectedProject}
                />
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
    </Box>
  );
};

export default Dashboard;
