const express = require('express');
const router = express.Router();
const db = require('../config/database');
const AlertService = require('../services/alertService');
const Joi = require('joi');

const alertService = new AlertService();

// Validation schemas
const alertConfigSchema = Joi.object({
  project_id: Joi.number().integer().required(),
  alert_type: Joi.string().valid('failure_rate', 'build_duration', 'consecutive_failures', 'queue_time').required(),
  threshold_value: Joi.number().required(),
  notification_channels: Joi.array().items(Joi.string().valid('slack', 'email')).required(),
  is_enabled: Joi.boolean().default(true),
  config_data: Joi.object().optional()
});

// GET /api/v1/alerts/configs
router.get('/configs', async (req, res) => {
  try {
    const { project_id } = req.query;

    let query = db('alert_configs')
      .join('projects', 'alert_configs.project_id', 'projects.id')
      .select(
        'alert_configs.*',
        'projects.name as project_name'
      );

    if (project_id) {
      query = query.where('alert_configs.project_id', project_id);
    }

    const configs = await query.orderBy('alert_configs.created_at', 'desc');

    res.json({ alert_configs: configs });
  } catch (error) {
    console.error('Error fetching alert configs:', error);
    res.status(500).json({ error: 'Failed to fetch alert configurations' });
  }
});

// GET /api/v1/alerts/configs/:id
router.get('/configs/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const config = await db('alert_configs')
      .join('projects', 'alert_configs.project_id', 'projects.id')
      .where('alert_configs.id', id)
      .select(
        'alert_configs.*',
        'projects.name as project_name'
      )
      .first();

    if (!config) {
      return res.status(404).json({ error: 'Alert configuration not found' });
    }

    res.json({ alert_config: config });
  } catch (error) {
    console.error('Error fetching alert config:', error);
    res.status(500).json({ error: 'Failed to fetch alert configuration' });
  }
});

// POST /api/v1/alerts/configs
router.post('/configs', async (req, res) => {
  try {
    const { error, value } = alertConfigSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    // Check if project exists
    const project = await db('projects').where('id', value.project_id).first();
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const [config] = await db('alert_configs')
      .insert({
        ...value,
        notification_channels: JSON.stringify(value.notification_channels),
        config_data: value.config_data ? JSON.stringify(value.config_data) : null
      })
      .returning('*');

    res.status(201).json({ alert_config: config });
  } catch (error) {
    console.error('Error creating alert config:', error);
    res.status(500).json({ error: 'Failed to create alert configuration' });
  }
});

// PUT /api/v1/alerts/configs/:id
router.put('/configs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const allowedFields = [
      'alert_type', 'threshold_value', 'notification_channels', 'is_enabled', 'config_data'
    ];
    
    const updateData = {};
    Object.keys(req.body).forEach(key => {
      if (allowedFields.includes(key)) {
        if (key === 'notification_channels' && Array.isArray(req.body[key])) {
          updateData[key] = JSON.stringify(req.body[key]);
        } else if (key === 'config_data' && req.body[key]) {
          updateData[key] = JSON.stringify(req.body[key]);
        } else {
          updateData[key] = req.body[key];
        }
      }
    });

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    updateData.updated_at = new Date();

    const [config] = await db('alert_configs')
      .where('id', id)
      .update(updateData)
      .returning('*');

    if (!config) {
      return res.status(404).json({ error: 'Alert configuration not found' });
    }

    res.json({ alert_config: config });
  } catch (error) {
    console.error('Error updating alert config:', error);
    res.status(500).json({ error: 'Failed to update alert configuration' });
  }
});

// DELETE /api/v1/alerts/configs/:id
router.delete('/configs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const deletedCount = await db('alert_configs')
      .where('id', id)
      .del();

    if (deletedCount === 0) {
      return res.status(404).json({ error: 'Alert configuration not found' });
    }

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting alert config:', error);
    res.status(500).json({ error: 'Failed to delete alert configuration' });
  }
});

// GET /api/v1/alerts/history
router.get('/history', async (req, res) => {
  try {
    const { 
      project_id, 
      alert_type,
      limit = 50,
      offset = 0
    } = req.query;

    let query = db('alert_history')
      .join('projects', 'alert_history.project_id', 'projects.id')
      .leftJoin('pipeline_executions', 'alert_history.execution_id', 'pipeline_executions.id')
      .select(
        'alert_history.*',
        'projects.name as project_name',
        'pipeline_executions.execution_id as pipeline_execution_id',
        'pipeline_executions.branch'
      );

    if (project_id) {
      query = query.where('alert_history.project_id', project_id);
    }

    if (alert_type) {
      query = query.where('alert_history.alert_type', alert_type);
    }

    // Get total count
    const totalQuery = query.clone();
    const [{ count: total }] = await totalQuery.count('* as count');

    const alerts = await query
      .orderBy('alert_history.sent_at', 'desc')
      .limit(parseInt(limit))
      .offset(parseInt(offset));

    res.json({
      alerts,
      pagination: {
        total: parseInt(total),
        limit: parseInt(limit),
        offset: parseInt(offset),
        has_next: (parseInt(offset) + parseInt(limit)) < parseInt(total)
      }
    });
  } catch (error) {
    console.error('Error fetching alert history:', error);
    res.status(500).json({ error: 'Failed to fetch alert history' });
  }
});

// POST /api/v1/alerts/test
router.post('/test', async (req, res) => {
  try {
    const { project_id, alert_type = 'test', channels = ['slack'] } = req.body;

    if (!project_id) {
      return res.status(400).json({ error: 'project_id is required' });
    }

    const project = await db('projects').where('id', project_id).first();
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const testAlert = {
      project_id: project_id,
      project_name: project.name,
      alert_type: alert_type,
      message: `🧪 Test alert for project ${project.name}`,
      severity: 'info',
      channels: channels,
      timestamp: new Date().toISOString()
    };

    // Send test alert
    const result = await alertService.sendAlert(testAlert);

    if (result.success) {
      // Log the test alert
      await db('alert_history').insert({
        project_id: project_id,
        alert_type: 'test',
        message: testAlert.message,
        channels_sent: JSON.stringify(channels),
        sent_at: new Date()
      });

      res.json({ 
        message: 'Test alert sent successfully',
        channels_sent: channels,
        result: result
      });
    } else {
      res.status(500).json({ 
        error: 'Failed to send test alert',
        details: result.errors
      });
    }
  } catch (error) {
    console.error('Error sending test alert:', error);
    res.status(500).json({ error: 'Failed to send test alert' });
  }
});

// GET /api/v1/alerts/stats
router.get('/stats', async (req, res) => {
  try {
    const { project_id, period = '7d' } = req.query;

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    
    switch (period) {
      case '1d':
        startDate.setDate(endDate.getDate() - 1);
        break;
      case '7d':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(endDate.getDate() - 30);
        break;
      default:
        startDate.setDate(endDate.getDate() - 7);
    }

    let query = db('alert_history')
      .where('sent_at', '>=', startDate);

    if (project_id) {
      query = query.where('project_id', project_id);
    }

    // Get alert statistics
    const stats = await query
      .select(
        db.raw('COUNT(*) as total_alerts'),
        db.raw('COUNT(DISTINCT project_id) as projects_with_alerts'),
        db.raw('COUNT(*) FILTER (WHERE alert_type = ?) as failure_rate_alerts', ['failure_rate']),
        db.raw('COUNT(*) FILTER (WHERE alert_type = ?) as duration_alerts', ['build_duration']),
        db.raw('COUNT(*) FILTER (WHERE alert_type = ?) as consecutive_failure_alerts', ['consecutive_failures'])
      )
      .first();

    // Get daily breakdown
    const dailyBreakdown = await query.clone()
      .select(
        db.raw('DATE(sent_at) as date'),
        db.raw('COUNT(*) as alert_count'),
        'alert_type'
      )
      .groupBy(db.raw('DATE(sent_at)'), 'alert_type')
      .orderBy('date');

    res.json({
      stats: {
        total_alerts: parseInt(stats.total_alerts),
        projects_with_alerts: parseInt(stats.projects_with_alerts),
        failure_rate_alerts: parseInt(stats.failure_rate_alerts),
        duration_alerts: parseInt(stats.duration_alerts),
        consecutive_failure_alerts: parseInt(stats.consecutive_failure_alerts)
      },
      daily_breakdown: dailyBreakdown,
      period,
      generated_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching alert stats:', error);
    res.status(500).json({ error: 'Failed to fetch alert statistics' });
  }
});

module.exports = router;
