const express = require('express');
const router = express.Router();
const db = require('../config/database');
const Joi = require('joi');

// Validation schema
const executionSchema = Joi.object({
  project_id: Joi.number().integer().required(),
  execution_id: Joi.string().required(),
  branch: Joi.string().optional(),
  commit_sha: Joi.string().max(40).optional(),
  status: Joi.string().valid('pending', 'running', 'success', 'failure', 'cancelled').required(),
  started_at: Joi.date().optional(),
  completed_at: Joi.date().optional(),
  duration_seconds: Joi.number().integer().min(0).optional(),
  trigger_type: Joi.string().optional(),
  triggered_by: Joi.string().optional(),
  raw_data: Joi.object().optional()
});

// GET /api/v1/executions
router.get('/', async (req, res) => {
  try {
    const {
      project_id,
      status,
      branch,
      limit = 20,
      offset = 0,
      sort_by = 'created_at',
      sort_order = 'desc'
    } = req.query;

    let query = db('pipeline_executions')
      .join('projects', 'pipeline_executions.project_id', 'projects.id')
      .select(
        'pipeline_executions.*',
        'projects.name as project_name',
        'projects.ci_system'
      );

    // Apply filters
    if (project_id) {
      query = query.where('pipeline_executions.project_id', project_id);
    }
    if (status) {
      query = query.where('pipeline_executions.status', status);
    }
    if (branch) {
      query = query.where('pipeline_executions.branch', branch);
    }

    // Get total count for pagination
    const totalQuery = query.clone();
    const [{ count: total }] = await totalQuery.count('* as count');

    // Apply pagination and sorting
    const executions = await query
      .orderBy(`pipeline_executions.${sort_by}`, sort_order)
      .limit(parseInt(limit))
      .offset(parseInt(offset));

    // Get steps for each execution
    const executionIds = executions.map(exec => exec.id);
    const steps = await db('pipeline_steps')
      .whereIn('execution_id', executionIds)
      .orderBy(['execution_id', 'step_order']);

    // Group steps by execution
    const stepsByExecution = steps.reduce((acc, step) => {
      if (!acc[step.execution_id]) {
        acc[step.execution_id] = [];
      }
      acc[step.execution_id].push(step);
      return acc;
    }, {});

    const executionsWithSteps = executions.map(execution => ({
      ...execution,
      duration_minutes: execution.duration_seconds 
        ? parseFloat((execution.duration_seconds / 60).toFixed(1))
        : null,
      steps: stepsByExecution[execution.id] || []
    }));

    res.json({
      executions: executionsWithSteps,
      pagination: {
        total: parseInt(total),
        limit: parseInt(limit),
        offset: parseInt(offset),
        has_next: (parseInt(offset) + parseInt(limit)) < parseInt(total)
      }
    });
  } catch (error) {
    console.error('Error fetching executions:', error);
    res.status(500).json({ error: 'Failed to fetch executions' });
  }
});

// GET /api/v1/executions/:id
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const execution = await db('pipeline_executions')
      .join('projects', 'pipeline_executions.project_id', 'projects.id')
      .where('pipeline_executions.id', id)
      .select(
        'pipeline_executions.*',
        'projects.name as project_name',
        'projects.ci_system'
      )
      .first();

    if (!execution) {
      return res.status(404).json({ error: 'Execution not found' });
    }

    // Get steps for this execution
    const steps = await db('pipeline_steps')
      .where('execution_id', id)
      .orderBy('step_order');

    res.json({
      execution: {
        ...execution,
        duration_minutes: execution.duration_seconds 
          ? parseFloat((execution.duration_seconds / 60).toFixed(1))
          : null,
        steps: steps.map(step => ({
          ...step,
          duration_minutes: step.duration_seconds 
            ? parseFloat((step.duration_seconds / 60).toFixed(1))
            : null
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching execution:', error);
    res.status(500).json({ error: 'Failed to fetch execution' });
  }
});

// POST /api/v1/executions
router.post('/', async (req, res) => {
  try {
    const { error, value } = executionSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    // Check if project exists
    const project = await db('projects').where('id', value.project_id).first();
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const [execution] = await db('pipeline_executions')
      .insert(value)
      .returning('*');

    // Notify WebSocket clients
    const wsService = req.app.get('wsService');
    wsService.broadcastExecutionUpdate(execution);

    res.status(201).json({ execution });
  } catch (error) {
    console.error('Error creating execution:', error);
    if (error.code === '23505') { // Unique violation
      res.status(409).json({ error: 'Execution with this ID already exists for this project' });
    } else {
      res.status(500).json({ error: 'Failed to create execution' });
    }
  }
});

// PUT /api/v1/executions/:id
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const allowedFields = [
      'status', 'completed_at', 'duration_seconds', 'raw_data'
    ];
    
    const updateData = {};
    Object.keys(req.body).forEach(key => {
      if (allowedFields.includes(key)) {
        updateData[key] = req.body[key];
      }
    });

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    updateData.updated_at = new Date();

    const [execution] = await db('pipeline_executions')
      .where('id', id)
      .update(updateData)
      .returning('*');

    if (!execution) {
      return res.status(404).json({ error: 'Execution not found' });
    }

    // Notify WebSocket clients
    const wsService = req.app.get('wsService');
    wsService.broadcastExecutionUpdate(execution);

    // Trigger metrics recalculation if execution completed
    if (execution.status === 'success' || execution.status === 'failure') {
      const metricsService = req.app.get('metricsService');
      metricsService.calculateProjectMetrics(execution.project_id);
    }

    res.json({ execution });
  } catch (error) {
    console.error('Error updating execution:', error);
    res.status(500).json({ error: 'Failed to update execution' });
  }
});

// GET /api/v1/executions/:id/logs
router.get('/:id/logs', async (req, res) => {
  try {
    const { id } = req.params;
    const { step_id } = req.query;

    let query = db('pipeline_steps')
      .join('pipeline_executions', 'pipeline_steps.execution_id', 'pipeline_executions.id')
      .where('pipeline_executions.id', id)
      .select('pipeline_steps.*');

    if (step_id) {
      query = query.where('pipeline_steps.id', step_id);
    }

    const steps = await query.orderBy('pipeline_steps.step_order');

    if (steps.length === 0) {
      return res.status(404).json({ error: 'No logs found' });
    }

    // In a real implementation, you would fetch actual logs from your CI system
    // For now, we'll return mock log data
    const logs = steps.map(step => ({
      step_id: step.id,
      step_name: step.step_name,
      status: step.status,
      logs: step.logs_url ? [
        `[${step.started_at}] Starting ${step.step_name}`,
        `[${step.started_at}] Executing step...`,
        `[${step.completed_at}] Step ${step.status === 'success' ? 'completed successfully' : 'failed'}`
      ] : []
    }));

    res.json({ logs });
  } catch (error) {
    console.error('Error fetching logs:', error);
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

// POST /api/v1/executions/:id/retry
router.post('/:id/retry', async (req, res) => {
  try {
    const { id } = req.params;

    const execution = await db('pipeline_executions')
      .where('id', id)
      .first();

    if (!execution) {
      return res.status(404).json({ error: 'Execution not found' });
    }

    if (execution.status === 'running' || execution.status === 'pending') {
      return res.status(400).json({ error: 'Cannot retry running or pending execution' });
    }

    // Create a new execution for retry
    const retryExecution = {
      project_id: execution.project_id,
      execution_id: `${execution.execution_id}-retry-${Date.now()}`,
      branch: execution.branch,
      commit_sha: execution.commit_sha,
      status: 'pending',
      trigger_type: 'manual_retry',
      triggered_by: req.body.triggered_by || 'system',
      raw_data: execution.raw_data
    };

    const [newExecution] = await db('pipeline_executions')
      .insert(retryExecution)
      .returning('*');

    // Notify WebSocket clients
    const wsService = req.app.get('wsService');
    wsService.broadcastExecutionUpdate(newExecution);

    res.status(201).json({ execution: newExecution });
  } catch (error) {
    console.error('Error retrying execution:', error);
    res.status(500).json({ error: 'Failed to retry execution' });
  }
});

module.exports = router;
