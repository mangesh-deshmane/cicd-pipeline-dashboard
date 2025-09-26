import React, { useState } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  OutlinedInput,
  CircularProgress,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Switch,
  FormControlLabel,
  Fab,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Send as SendIcon,
  NotificationsActive as NotificationsActiveIcon,
  NotificationsOff as NotificationsOffIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { format, parseISO } from 'date-fns';

import { alertsApi, projectsApi } from '../services/api';

function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`alerts-tabpanel-${index}`}
      aria-labelledby={`alerts-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

const Alerts = () => {
  const [tabValue, setTabValue] = useState(0);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingAlert, setEditingAlert] = useState(null);
  const [alertForm, setAlertForm] = useState({
    project_id: '',
    alert_type: 'failure_rate',
    threshold_value: '',
    notification_channels: ['slack'],
    is_enabled: true,
    config_data: {},
  });

  const queryClient = useQueryClient();

  // Fetch projects for dropdown
  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsApi.getAll(),
    select: (response) => response.data.projects,
  });

  // Fetch alert configurations
  const { 
    data: alertConfigs = [], 
    isLoading: configsLoading 
  } = useQuery({
    queryKey: ['alerts', 'configs'],
    queryFn: () => alertsApi.getConfigs(),
    select: (response) => response.data.alert_configs,
  });

  // Fetch alert history
  const { 
    data: alertHistory, 
    isLoading: historyLoading 
  } = useQuery({
    queryKey: ['alerts', 'history'],
    queryFn: () => alertsApi.getHistory({ limit: 50 }),
    select: (response) => response.data,
  });

  // Fetch alert statistics
  const { data: alertStats } = useQuery({
    queryKey: ['alerts', 'stats'],
    queryFn: () => alertsApi.getStats(),
    select: (response) => response.data,
  });

  // Create alert mutation
  const createAlertMutation = useMutation({
    mutationFn: alertsApi.createConfig,
    onSuccess: () => {
      queryClient.invalidateQueries(['alerts']);
      setOpenDialog(false);
      resetForm();
      toast.success('Alert configuration created successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to create alert configuration');
    },
  });

  // Update alert mutation
  const updateAlertMutation = useMutation({
    mutationFn: ({ id, data }) => alertsApi.updateConfig(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['alerts']);
      setOpenDialog(false);
      resetForm();
      toast.success('Alert configuration updated successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to update alert configuration');
    },
  });

  // Delete alert mutation
  const deleteAlertMutation = useMutation({
    mutationFn: alertsApi.deleteConfig,
    onSuccess: () => {
      queryClient.invalidateQueries(['alerts']);
      toast.success('Alert configuration deleted successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to delete alert configuration');
    },
  });

  // Send test alert mutation
  const testAlertMutation = useMutation({
    mutationFn: alertsApi.sendTest,
    onSuccess: () => {
      toast.success('Test alert sent successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to send test alert');
    },
  });

  const resetForm = () => {
    setAlertForm({
      project_id: '',
      alert_type: 'failure_rate',
      threshold_value: '',
      notification_channels: ['slack'],
      is_enabled: true,
      config_data: {},
    });
    setEditingAlert(null);
  };

  const handleOpenDialog = (alert = null) => {
    if (alert) {
      setEditingAlert(alert);
      setAlertForm({
        project_id: alert.project_id,
        alert_type: alert.alert_type,
        threshold_value: alert.threshold_value,
        notification_channels: Array.isArray(alert.notification_channels) 
          ? alert.notification_channels 
          : JSON.parse(alert.notification_channels || '[]'),
        is_enabled: alert.is_enabled,
        config_data: alert.config_data ? JSON.parse(alert.config_data) : {},
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
    if (!alertForm.project_id || !alertForm.threshold_value) {
      toast.error('Please fill in required fields');
      return;
    }

    const submitData = {
      ...alertForm,
      threshold_value: parseFloat(alertForm.threshold_value),
    };

    if (editingAlert) {
      updateAlertMutation.mutate({
        id: editingAlert.id,
        data: submitData,
      });
    } else {
      createAlertMutation.mutate(submitData);
    }
  };

  const handleDelete = (alert) => {
    if (window.confirm(`Are you sure you want to delete this alert configuration?`)) {
      deleteAlertMutation.mutate(alert.id);
    }
  };

  const handleSendTest = (alert) => {
    testAlertMutation.mutate({
      project_id: alert.project_id,
      alert_type: 'test',
      channels: Array.isArray(alert.notification_channels) 
        ? alert.notification_channels 
        : JSON.parse(alert.notification_channels || '[]'),
    });
  };

  const getAlertTypeDescription = (alertType) => {
    switch (alertType) {
      case 'failure_rate':
        return 'Triggers when failure rate exceeds threshold';
      case 'build_duration':
        return 'Triggers when build duration exceeds threshold';
      case 'consecutive_failures':
        return 'Triggers after consecutive failures';
      case 'queue_time':
        return 'Triggers when builds are queued too long';
      default:
        return 'Unknown alert type';
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Alert Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Add Alert
        </Button>
      </Box>

      {/* Statistics Cards */}
      {alertStats && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Total Alerts
                </Typography>
                <Typography variant="h4">
                  {alertStats.stats?.total_alerts || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Projects with Alerts
                </Typography>
                <Typography variant="h4">
                  {alertStats.stats?.projects_with_alerts || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Failure Rate Alerts
                </Typography>
                <Typography variant="h4">
                  {alertStats.stats?.failure_rate_alerts || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Duration Alerts
                </Typography>
                <Typography variant="h4">
                  {alertStats.stats?.duration_alerts || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={(e, value) => setTabValue(value)}>
          <Tab label="Configurations" />
          <Tab label="History" />
        </Tabs>
      </Box>

      {/* Configurations Tab */}
      <TabPanel value={tabValue} index={0}>
        {configsLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : alertConfigs.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No alert configurations found
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Create your first alert to get notified about pipeline issues
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpenDialog()}
            >
              Create First Alert
            </Button>
          </Box>
        ) : (
          <Grid container spacing={3}>
            {alertConfigs.map((alert) => (
              <Grid item xs={12} md={6} lg={4} key={alert.id}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                      {alert.is_enabled ? (
                        <NotificationsActiveIcon color="success" />
                      ) : (
                        <NotificationsOffIcon color="disabled" />
                      )}
                      <Typography variant="h6" sx={{ flexGrow: 1 }}>
                        {alert.alert_type.replace('_', ' ').toUpperCase()}
                      </Typography>
                      <Chip
                        label={alert.is_enabled ? 'Enabled' : 'Disabled'}
                        color={alert.is_enabled ? 'success' : 'default'}
                        size="small"
                      />
                    </Box>

                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {alert.project_name}
                    </Typography>

                    <Typography variant="body2" sx={{ mb: 2 }}>
                      {getAlertTypeDescription(alert.alert_type)}
                    </Typography>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        Threshold:
                      </Typography>
                      <Chip 
                        label={`${alert.threshold_value}${alert.alert_type === 'failure_rate' ? '%' : ''}`}
                        size="small"
                        variant="outlined"
                      />
                    </Box>

                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 2 }}>
                      {(Array.isArray(alert.notification_channels) 
                        ? alert.notification_channels 
                        : JSON.parse(alert.notification_channels || '[]')
                      ).map((channel) => (
                        <Chip
                          key={channel}
                          label={channel}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                      ))}
                    </Box>

                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button
                        size="small"
                        startIcon={<SendIcon />}
                        onClick={() => handleSendTest(alert)}
                        disabled={testAlertMutation.isLoading}
                      >
                        Test
                      </Button>
                      <IconButton
                        size="small"
                        onClick={() => handleOpenDialog(alert)}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDelete(alert)}
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </TabPanel>

      {/* History Tab */}
      <TabPanel value={tabValue} index={1}>
        {historyLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Alert History
              </Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Project</TableCell>
                      <TableCell>Alert Type</TableCell>
                      <TableCell>Message</TableCell>
                      <TableCell>Channels</TableCell>
                      <TableCell>Sent At</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {alertHistory?.alerts?.map((alert) => (
                      <TableRow key={alert.id}>
                        <TableCell>{alert.project_name}</TableCell>
                        <TableCell>
                          <Chip
                            label={alert.alert_type}
                            size="small"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>{alert.message}</TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 0.5 }}>
                            {JSON.parse(alert.channels_sent || '[]').map((channel) => (
                              <Chip
                                key={channel}
                                label={channel}
                                size="small"
                                color="primary"
                                variant="outlined"
                              />
                            ))}
                          </Box>
                        </TableCell>
                        <TableCell>
                          {format(parseISO(alert.sent_at), 'MMM dd, yyyy HH:mm')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        )}
      </TabPanel>

      {/* Floating Action Button */}
      <Fab
        color="primary"
        aria-label="add alert"
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

      {/* Add/Edit Alert Dialog */}
      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editingAlert ? 'Edit Alert Configuration' : 'Create Alert Configuration'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Project</InputLabel>
              <Select
                value={alertForm.project_id}
                label="Project"
                onChange={(e) => setAlertForm({ ...alertForm, project_id: e.target.value })}
              >
                {projects.map((project) => (
                  <MenuItem key={project.id} value={project.id}>
                    {project.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Alert Type</InputLabel>
              <Select
                value={alertForm.alert_type}
                label="Alert Type"
                onChange={(e) => setAlertForm({ ...alertForm, alert_type: e.target.value })}
              >
                <MenuItem value="failure_rate">Failure Rate</MenuItem>
                <MenuItem value="build_duration">Build Duration</MenuItem>
                <MenuItem value="consecutive_failures">Consecutive Failures</MenuItem>
                <MenuItem value="queue_time">Queue Time</MenuItem>
              </Select>
            </FormControl>

            <TextField
              label="Threshold Value"
              type="number"
              fullWidth
              value={alertForm.threshold_value}
              onChange={(e) => setAlertForm({ ...alertForm, threshold_value: e.target.value })}
              sx={{ mb: 2 }}
              helperText={
                alertForm.alert_type === 'failure_rate' 
                  ? 'Percentage (0-100)'
                  : alertForm.alert_type === 'build_duration'
                  ? 'Minutes'
                  : alertForm.alert_type === 'consecutive_failures'
                  ? 'Number of failures'
                  : 'Minutes'
              }
            />

            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Notification Channels</InputLabel>
              <Select
                multiple
                value={alertForm.notification_channels}
                onChange={(e) => setAlertForm({ ...alertForm, notification_channels: e.target.value })}
                input={<OutlinedInput label="Notification Channels" />}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((value) => (
                      <Chip key={value} label={value} size="small" />
                    ))}
                  </Box>
                )}
              >
                <MenuItem value="slack">Slack</MenuItem>
                <MenuItem value="email">Email</MenuItem>
              </Select>
            </FormControl>

            <FormControlLabel
              control={
                <Switch
                  checked={alertForm.is_enabled}
                  onChange={(e) => setAlertForm({ ...alertForm, is_enabled: e.target.checked })}
                />
              }
              label="Enable Alert"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={createAlertMutation.isLoading || updateAlertMutation.isLoading}
          >
            {createAlertMutation.isLoading || updateAlertMutation.isLoading ? (
              <CircularProgress size={20} />
            ) : editingAlert ? (
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

export default Alerts;
