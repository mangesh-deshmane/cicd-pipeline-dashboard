import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Chip,
  Button,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  Link,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  OpenInNew as OpenInNewIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { projectsApi, metricsApi, executionsApi } from '../services/api';
import { useWebSocket } from '../contexts/WebSocketContext';

import MetricCard from '../components/Dashboard/MetricCard';
import ExecutionTrendsChart from '../components/Dashboard/ExecutionTrendsChart';
import DurationTrendsChart from '../components/Dashboard/DurationTrendsChart';
import StatusDistributionChart from '../components/Dashboard/StatusDistributionChart';
import RecentExecutionsTable from '../components/Dashboard/RecentExecutionsTable';

function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`project-tabpanel-${index}`}
      aria-labelledby={`project-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

const ProjectDetail = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [selectedPeriod, setSelectedPeriod] = useState('7d');
  const [tabValue, setTabValue] = useState(0);
  const { subscribeToProject, addExecutionListener, addMetricsListener } = useWebSocket();

  // Subscribe to real-time updates for this project
  useEffect(() => {
    if (projectId) {
      subscribeToProject(parseInt(projectId));

      const removeExecutionListener = addExecutionListener((data) => {
        if (data.data.project_id === parseInt(projectId)) {
          // Refetch project data when executions are updated
          refetchProject();
          refetchMetrics();
        }
      });

      const removeMetricsListener = addMetricsListener((data) => {
        if (data.data.project_id === parseInt(projectId)) {
          refetchMetrics();
        }
      });

      return () => {
        removeExecutionListener();
        removeMetricsListener();
      };
    }
  }, [projectId, subscribeToProject, addExecutionListener, addMetricsListener]);

  // Fetch project details
  const { 
    data: project, 
    isLoading: projectLoading, 
    error: projectError,
    refetch: refetchProject 
  } = useQuery({
    queryKey: ['projects', projectId],
    queryFn: () => projectsApi.getById(projectId),
    select: (response) => response.data.project,
    enabled: !!projectId,
  });

  // Fetch project metrics
  const { 
    data: metrics, 
    isLoading: metricsLoading,
    refetch: refetchMetrics 
  } = useQuery({
    queryKey: ['metrics', 'project', projectId, selectedPeriod],
    queryFn: () => metricsApi.getProjectMetrics(projectId, selectedPeriod),
    select: (response) => response.data,
    enabled: !!projectId,
    refetchInterval: 30000,
  });

  // Handle specific execution from URL params
  const executionId = searchParams.get('execution');
  const { data: executionDetail } = useQuery({
    queryKey: ['executions', executionId],
    queryFn: () => executionsApi.getById(executionId),
    select: (response) => response.data.execution,
    enabled: !!executionId,
  });

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const getCiSystemColor = (ciSystem) => {
    switch (ciSystem) {
      case 'github':
        return 'primary';
      case 'jenkins':
        return 'error';
      case 'gitlab':
        return 'warning';
      default:
        return 'default';
    }
  };

  if (projectLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (projectError) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        Error loading project: {projectError.message}
      </Alert>
    );
  }

  if (!project) {
    return (
      <Alert severity="warning" sx={{ mb: 2 }}>
        Project not found
      </Alert>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <IconButton onClick={() => navigate('/projects')} color="primary">
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h4" component="h1" sx={{ flexGrow: 1 }}>
          {project.name}
        </Typography>
        <Chip
          label={project.ci_system}
          color={getCiSystemColor(project.ci_system)}
        />
        {project.repository_url && (
          <Tooltip title="Open Repository">
            <IconButton
              component="a"
              href={project.repository_url}
              target="_blank"
              rel="noopener noreferrer"
              color="primary"
            >
              <OpenInNewIcon />
            </IconButton>
          </Tooltip>
        )}
        <IconButton onClick={() => { refetchProject(); refetchMetrics(); }} color="primary">
          <RefreshIcon />
        </IconButton>
      </Box>

      {project.repository_url && (
        <Box sx={{ mb: 3 }}>
          <Link
            href={project.repository_url}
            target="_blank"
            rel="noopener noreferrer"
            color="text.secondary"
            variant="body2"
          >
            {project.repository_url}
          </Link>
        </Box>
      )}

      {/* Show specific execution details if requested */}
      {executionDetail && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Execution Details
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={3}>
                <Typography variant="caption" color="text.secondary">Status</Typography>
                <Box>
                  <Chip
                    label={executionDetail.status}
                    color={executionDetail.status === 'success' ? 'success' : 'error'}
                    size="small"
                  />
                </Box>
              </Grid>
              <Grid item xs={12} sm={3}>
                <Typography variant="caption" color="text.secondary">Execution ID</Typography>
                <Typography variant="body2">{executionDetail.execution_id}</Typography>
              </Grid>
              <Grid item xs={12} sm={3}>
                <Typography variant="caption" color="text.secondary">Branch</Typography>
                <Typography variant="body2">{executionDetail.branch || 'N/A'}</Typography>
              </Grid>
              <Grid item xs={12} sm={3}>
                <Typography variant="caption" color="text.secondary">Duration</Typography>
                <Typography variant="body2">
                  {executionDetail.duration_minutes ? `${executionDetail.duration_minutes} min` : 'N/A'}
                </Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Metrics Cards */}
      {!metricsLoading && metrics && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <MetricCard
              title="Total Executions"
              value={metrics.summary?.total_executions || 0}
              subtitle={`Last ${selectedPeriod}`}
              color="primary"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <MetricCard
              title="Success Rate"
              value={metrics.summary?.success_rate || 0}
              suffix="%"
              subtitle={`Last ${selectedPeriod}`}
              color="success"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <MetricCard
              title="Avg Duration"
              value={metrics.summary?.avg_duration_minutes || 0}
              suffix=" min"
              subtitle={`Last ${selectedPeriod}`}
              color="info"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <MetricCard
              title="Queue Status"
              value={metrics.summary?.queue_status?.pending || 0}
              subtitle="Pending builds"
              color="warning"
            />
          </Grid>
        </Grid>
      )}

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab label="Overview" />
          <Tab label="Executions" />
          <Tab label="Analytics" />
        </Tabs>
      </Box>

      {/* Tab Panels */}
      <TabPanel value={tabValue} index={0}>
        {metricsLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Grid container spacing={3}>
            <Grid item xs={12} lg={8}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Execution Trends
                  </Typography>
                  <ExecutionTrendsChart 
                    data={metrics?.trends?.daily_executions || []} 
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
                    data={metrics?.trends?.status_distribution || []} 
                  />
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Duration Trends
                  </Typography>
                  <DurationTrendsChart 
                    data={metrics?.trends?.duration_trend || []} 
                  />
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              All Executions
            </Typography>
            <RecentExecutionsTable 
              projectId={projectId}
              limit={25}
            />
          </CardContent>
        </Card>
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Detailed Analytics
                </Typography>
                <Typography color="text.secondary">
                  Advanced analytics and insights coming soon...
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>
    </Box>
  );
};

export default ProjectDetail;
