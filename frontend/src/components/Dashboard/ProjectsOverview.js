import React from 'react';
import {
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Chip,
  Box,
  Typography,
  LinearProgress,
  Avatar,
  ListItemAvatar,
} from '@mui/material';
import {
  GitHub as GitHubIcon,
  Build as BuildIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const ProjectsOverview = ({ data }) => {
  const navigate = useNavigate();

  if (!data || data.length === 0) {
    return (
      <Box sx={{ py: 4, textAlign: 'center' }}>
        <Typography color="text.secondary">
          No projects data available
        </Typography>
      </Box>
    );
  }

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
        return '#333';
      default:
        return '#666';
    }
  };

  const getSuccessRateColor = (rate) => {
    if (rate >= 90) return 'success';
    if (rate >= 70) return 'warning';
    return 'error';
  };

  return (
    <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
      <List dense>
        {data.map((project, index) => (
          <ListItem
            key={project.id}
            button
            onClick={() => navigate(`/projects/${project.id}`)}
            sx={{
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1,
              mb: 1,
              '&:hover': {
                backgroundColor: 'action.hover',
              },
            }}
          >
            <ListItemAvatar>
              <Avatar 
                sx={{ 
                  bgcolor: getCiSystemColor(project.ci_system),
                  width: 32,
                  height: 32,
                }}
              >
                {getCiSystemIcon(project.ci_system)}
              </Avatar>
            </ListItemAvatar>
            
            <ListItemText
              primary={
                <Typography variant="subtitle2" component="div">
                  {project.name}
                </Typography>
              }
              secondary={
                <Box sx={{ mt: 0.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <Typography variant="caption" color="text.secondary">
                      {project.executions} executions
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      •
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {project.avg_duration_minutes}min avg
                    </Typography>
                  </Box>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ flexGrow: 1 }}>
                      <LinearProgress
                        variant="determinate"
                        value={project.success_rate}
                        color={getSuccessRateColor(project.success_rate)}
                        sx={{ height: 4, borderRadius: 2 }}
                      />
                    </Box>
                    <Typography variant="caption" color="text.secondary" sx={{ minWidth: 35 }}>
                      {project.success_rate}%
                    </Typography>
                  </Box>
                </Box>
              }
            />
            
            <ListItemSecondaryAction>
              <Chip
                label={project.ci_system}
                size="small"
                variant="outlined"
                sx={{
                  borderColor: getCiSystemColor(project.ci_system),
                  color: getCiSystemColor(project.ci_system),
                  fontSize: '0.7rem',
                }}
              />
            </ListItemSecondaryAction>
          </ListItem>
        ))}
      </List>
    </Box>
  );
};

export default ProjectsOverview;
