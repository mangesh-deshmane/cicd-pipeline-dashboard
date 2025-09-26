import React from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Switch,
  Button,
  Chip,
  Alert,
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  Security as SecurityIcon,
  Storage as StorageIcon,
  Api as ApiIcon,
  Webhook as WebhookIcon,
} from '@mui/icons-material';
import { useWebSocket } from '../contexts/WebSocketContext';

const Settings = () => {
  const { connected, connectionStatus, subscribedProjects } = useWebSocket();

  const webhookEndpoints = [
    {
      name: 'GitHub Actions',
      url: `${window.location.origin}/api/v1/webhooks/github`,
      description: 'Configure this URL as a webhook in your GitHub repository settings',
    },
    {
      name: 'Jenkins',
      url: `${window.location.origin}/api/v1/webhooks/jenkins`,
      description: 'Configure this URL in your Jenkins job post-build actions',
    },
    {
      name: 'GitLab CI',
      url: `${window.location.origin}/api/v1/webhooks/gitlab`,
      description: 'Configure this URL in your GitLab project webhook settings',
    },
  ];

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Settings
      </Typography>

      <Grid container spacing={3}>
        {/* System Status */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <ApiIcon color="primary" />
                <Typography variant="h6">System Status</Typography>
              </Box>
              
              <List dense>
                <ListItem>
                  <ListItemText
                    primary="Real-time Connection"
                    secondary="WebSocket connection status"
                  />
                  <ListItemSecondaryAction>
                    <Chip
                      label={connectionStatus}
                      color={connected ? 'success' : 'error'}
                      size="small"
                    />
                  </ListItemSecondaryAction>
                </ListItem>
                
                <ListItem>
                  <ListItemText
                    primary="Subscribed Projects"
                    secondary={`Monitoring ${subscribedProjects.length} projects`}
                  />
                  <ListItemSecondaryAction>
                    <Typography variant="body2" color="text.secondary">
                      {subscribedProjects.length}
                    </Typography>
                  </ListItemSecondaryAction>
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Notifications */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <NotificationsIcon color="primary" />
                <Typography variant="h6">Notifications</Typography>
              </Box>
              
              <List dense>
                <ListItem>
                  <ListItemText
                    primary="Browser Notifications"
                    secondary="Show notifications in browser"
                  />
                  <ListItemSecondaryAction>
                    <Switch defaultChecked />
                  </ListItemSecondaryAction>
                </ListItem>
                
                <ListItem>
                  <ListItemText
                    primary="Alert Sounds"
                    secondary="Play sound for critical alerts"
                  />
                  <ListItemSecondaryAction>
                    <Switch />
                  </ListItemSecondaryAction>
                </ListItem>
                
                <ListItem>
                  <ListItemText
                    primary="Email Notifications"
                    secondary="Receive email alerts"
                  />
                  <ListItemSecondaryAction>
                    <Switch defaultChecked />
                  </ListItemSecondaryAction>
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Webhook Configuration */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <WebhookIcon color="primary" />
                <Typography variant="h6">Webhook Endpoints</Typography>
              </Box>
              
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Configure these webhook URLs in your CI/CD systems to receive real-time updates
              </Typography>

              <Grid container spacing={2}>
                {webhookEndpoints.map((endpoint) => (
                  <Grid item xs={12} key={endpoint.name}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="subtitle1" gutterBottom>
                          {endpoint.name}
                        </Typography>
                        <Typography 
                          variant="body2" 
                          color="text.secondary" 
                          sx={{ mb: 2 }}
                        >
                          {endpoint.description}
                        </Typography>
                        <Box sx={{ 
                          backgroundColor: 'grey.100', 
                          p: 1, 
                          borderRadius: 1,
                          fontFamily: 'monospace',
                          fontSize: '0.875rem',
                          wordBreak: 'break-all'
                        }}>
                          {endpoint.url}
                        </Box>
                        <Button 
                          size="small" 
                          sx={{ mt: 1 }}
                          onClick={() => navigator.clipboard.writeText(endpoint.url)}
                        >
                          Copy URL
                        </Button>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Security */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <SecurityIcon color="primary" />
                <Typography variant="h6">Security</Typography>
              </Box>
              
              <Alert severity="info" sx={{ mb: 2 }}>
                Webhook signature verification is enabled for all endpoints
              </Alert>
              
              <List dense>
                <ListItem>
                  <ListItemText
                    primary="API Rate Limiting"
                    secondary="100 requests per 15 minutes"
                  />
                  <ListItemSecondaryAction>
                    <Chip label="Active" color="success" size="small" />
                  </ListItemSecondaryAction>
                </ListItem>
                
                <ListItem>
                  <ListItemText
                    primary="HTTPS Only"
                    secondary="All API endpoints use HTTPS"
                  />
                  <ListItemSecondaryAction>
                    <Chip label="Enabled" color="success" size="small" />
                  </ListItemSecondaryAction>
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Data Management */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <StorageIcon color="primary" />
                <Typography variant="h6">Data Management</Typography>
              </Box>
              
              <List dense>
                <ListItem>
                  <ListItemText
                    primary="Data Retention"
                    secondary="Pipeline data kept for 90 days"
                  />
                </ListItem>
                
                <ListItem>
                  <ListItemText
                    primary="Metrics Calculation"
                    secondary="Automated every 5 minutes"
                  />
                </ListItem>
                
                <ListItem>
                  <ListItemText
                    primary="Cache Refresh"
                    secondary="Real-time metrics cached for 5 minutes"
                  />
                </ListItem>
              </List>

              <Divider sx={{ my: 2 }} />

              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button variant="outlined" size="small">
                  Export Data
                </Button>
                <Button variant="outlined" size="small" color="error">
                  Clear Cache
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Environment Information */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Environment Information
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="caption" color="text.secondary">
                    Version
                  </Typography>
                  <Typography variant="body2">
                    v1.0.0
                  </Typography>
                </Grid>
                
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="caption" color="text.secondary">
                    Environment
                  </Typography>
                  <Typography variant="body2">
                    {process.env.NODE_ENV || 'development'}
                  </Typography>
                </Grid>
                
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="caption" color="text.secondary">
                    API URL
                  </Typography>
                  <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
                    {process.env.REACT_APP_API_URL || 'http://localhost:3001/api/v1'}
                  </Typography>
                </Grid>
                
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="caption" color="text.secondary">
                    WebSocket URL
                  </Typography>
                  <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
                    {process.env.REACT_APP_WS_URL || 'http://localhost:3001'}
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Settings;
