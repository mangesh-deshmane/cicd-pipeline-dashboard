import React, { useState } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  CircularProgress,
  Alert,
  Fab,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  GitHub as GitHubIcon,
  Build as BuildIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

import { projectsApi } from '../services/api';
import MetricCard from '../components/Dashboard/MetricCard';

const Projects = () => {
  const [openDialog, setOpenDialog] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [projectForm, setProjectForm] = useState({
    name: '',
    repository_url: '',
    ci_system: 'github',
    webhook_secret: '',
  });

  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Fetch projects
  const { 
    data: projects = [], 
    isLoading, 
    error 
  } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsApi.getAll(),
    select: (response) => response.data.projects,
  });

  // Create project mutation
  const createProjectMutation = useMutation({
    mutationFn: projectsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries(['projects']);
      setOpenDialog(false);
      resetForm();
      toast.success('Project created successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to create project');
    },
  });

  // Update project mutation
  const updateProjectMutation = useMutation({
    mutationFn: ({ id, data }) => projectsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['projects']);
      setOpenDialog(false);
      resetForm();
      toast.success('Project updated successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to update project');
    },
  });

  // Delete project mutation
  const deleteProjectMutation = useMutation({
    mutationFn: projectsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries(['projects']);
      toast.success('Project deleted successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to delete project');
    },
  });

  const resetForm = () => {
    setProjectForm({
      name: '',
      repository_url: '',
      ci_system: 'github',
      webhook_secret: '',
    });
    setEditingProject(null);
  };

  const handleOpenDialog = (project = null) => {
    if (project) {
      setEditingProject(project);
      setProjectForm({
        name: project.name,
        repository_url: project.repository_url || '',
        ci_system: project.ci_system,
        webhook_secret: project.webhook_secret || '',
      });
    } else {
      resetForm();
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    resetForm();
  };

  const handleSubmit = () => {
    if (!projectForm.name || !projectForm.ci_system) {
      toast.error('Please fill in required fields');
      return;
    }

    if (editingProject) {
      updateProjectMutation.mutate({
        id: editingProject.id,
        data: projectForm,
      });
    } else {
      createProjectMutation.mutate(projectForm);
    }
  };

  const handleDelete = (project) => {
    if (window.confirm(`Are you sure you want to delete "${project.name}"?`)) {
      deleteProjectMutation.mutate(project.id);
    }
  };

  const getCiSystemIcon = (ciSystem) => {
    switch (ciSystem) {
      case 'github':
        return <GitHubIcon />;
      default:
        return <BuildIcon />;
    }
  };

  const getCiSystemColor = (ciSystem) => {
    switch (ciSystem) {
      case 'github':
        return 'primary';
      default:
        return 'default';
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        Error loading projects: {error.message}
      </Alert>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Projects
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Add Project
        </Button>
      </Box>

      {projects.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No projects found
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Get started by adding your first CI/CD project
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            Add First Project
          </Button>
        </Box>
      ) : (
        <Grid container spacing={3}>
          {projects.map((project) => (
            <Grid item xs={12} sm={6} md={4} key={project.id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    {getCiSystemIcon(project.ci_system)}
                    <Typography variant="h6" component="h2" sx={{ flexGrow: 1 }}>
                      {project.name}
                    </Typography>
                    <Chip
                      label={project.ci_system}
                      color={getCiSystemColor(project.ci_system)}
                      size="small"
                    />
                  </Box>

                  {project.repository_url && (
                    <Typography 
                      variant="body2" 
                      color="text.secondary" 
                      sx={{ 
                        mb: 2,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {project.repository_url}
                    </Typography>
                  )}

                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <MetricCard
                        title="Executions"
                        value={project.stats?.total_executions || 0}
                        color="primary"
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <MetricCard
                        title="Success Rate"
                        value={project.stats?.success_rate || 0}
                        suffix="%"
                        color="success"
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <MetricCard
                        title="Avg Duration"
                        value={project.stats?.avg_duration || 0}
                        suffix=" min"
                        color="info"
                      />
                    </Grid>
                  </Grid>

                  {project.stats?.last_execution && (
                    <Box sx={{ mt: 2, p: 1, bgcolor: 'background.default', borderRadius: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        Last execution:
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                        <Chip
                          label={project.stats.last_execution.status}
                          color={project.stats.last_execution.status === 'success' ? 'success' : 'error'}
                          size="small"
                        />
                        <Typography variant="caption" color="text.secondary">
                          {new Date(project.stats.last_execution.completed_at).toLocaleDateString()}
                        </Typography>
                      </Box>
                    </Box>
                  )}
                </CardContent>

                <CardActions>
                  <Button
                    size="small"
                    startIcon={<VisibilityIcon />}
                    onClick={() => navigate(`/projects/${project.id}`)}
                  >
                    View Details
                  </Button>
                  <IconButton
                    size="small"
                    onClick={() => handleOpenDialog(project)}
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => handleDelete(project)}
                    color="error"
                  >
                    <DeleteIcon />
                  </IconButton>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Floating Action Button for mobile */}
      <Fab
        color="primary"
        aria-label="add project"
        sx={{
          position: 'fixed',
          bottom: 16,
          right: 16,
          display: { xs: 'flex', sm: 'none' },
        }}
        onClick={() => handleOpenDialog()}
      >
        <AddIcon />
      </Fab>

      {/* Add/Edit Project Dialog */}
      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editingProject ? 'Edit Project' : 'Add New Project'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TextField
              autoFocus
              label="Project Name"
              fullWidth
              value={projectForm.name}
              onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })}
              sx={{ mb: 2 }}
              required
            />
            <TextField
              label="Repository URL"
              fullWidth
              value={projectForm.repository_url}
              onChange={(e) => setProjectForm({ ...projectForm, repository_url: e.target.value })}
              sx={{ mb: 2 }}
              placeholder="https://github.com/owner/repo"
            />
            <TextField
              select
              label="CI System"
              fullWidth
              value={projectForm.ci_system}
              onChange={(e) => setProjectForm({ ...projectForm, ci_system: e.target.value })}
              sx={{ mb: 2 }}
              required
            >
              <MenuItem value="github">GitHub Actions</MenuItem>
            </TextField>
            <TextField
              label="Webhook Secret"
              fullWidth
              value={projectForm.webhook_secret}
              onChange={(e) => setProjectForm({ ...projectForm, webhook_secret: e.target.value })}
              placeholder="Optional webhook secret for verification"
              helperText="Used to verify webhook authenticity"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={createProjectMutation.isLoading || updateProjectMutation.isLoading}
          >
            {createProjectMutation.isLoading || updateProjectMutation.isLoading ? (
              <CircularProgress size={20} />
            ) : editingProject ? (
              'Update'
            ) : (
              'Create'
            )}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Projects;
