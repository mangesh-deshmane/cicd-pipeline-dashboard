const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../config/database');

// Middleware to verify webhook signatures
const verifyGitHubSignature = (req, res, next) => {
  const signature = req.get('X-Hub-Signature-256');
  const payload = JSON.stringify(req.body);
  
  if (!signature) {
    return res.status(401).json({ error: 'Missing signature' });
  }

  const expectedSignature = `sha256=${crypto
    .createHmac('sha256', process.env.GITHUB_WEBHOOK_SECRET)
    .update(payload)
    .digest('hex')}`;

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  next();
};


// GitHub Actions webhook handler
router.post('/github', verifyGitHubSignature, async (req, res) => {
  try {
    const { action, workflow_run, repository } = req.body;

    // Only process workflow_run events
    if (!workflow_run) {
      return res.status(200).json({ message: 'Event ignored' });
    }

    // Find the project by repository URL
    const project = await db('projects')
      .where('repository_url', repository.html_url)
      .where('ci_system', 'github')
      .first();

    if (!project) {
      console.log(`No project found for repository: ${repository.html_url}`);
      return res.status(200).json({ message: 'Project not found' });
    }

    // Map GitHub workflow status to our status
    const statusMap = {
      'queued': 'pending',
      'in_progress': 'running',
      'completed': workflow_run.conclusion === 'success' ? 'success' : 'failure',
      'cancelled': 'cancelled'
    };

    const status = statusMap[workflow_run.status] || workflow_run.status;

    // Calculate duration
    let durationSeconds = null;
    if (workflow_run.created_at && workflow_run.updated_at) {
      const startTime = new Date(workflow_run.created_at);
      const endTime = new Date(workflow_run.updated_at);
      durationSeconds = Math.round((endTime - startTime) / 1000);
    }

    const executionData = {
      project_id: project.id,
      execution_id: workflow_run.id.toString(),
      branch: workflow_run.head_branch,
      commit_sha: workflow_run.head_sha,
      status: status,
      started_at: workflow_run.created_at ? new Date(workflow_run.created_at) : null,
      completed_at: workflow_run.updated_at ? new Date(workflow_run.updated_at) : null,
      duration_seconds: durationSeconds,
      trigger_type: workflow_run.event,
      triggered_by: workflow_run.actor?.login,
      raw_data: req.body
    };

    // Insert or update execution
    const existingExecution = await db('pipeline_executions')
      .where('project_id', project.id)
      .where('execution_id', workflow_run.id.toString())
      .first();

    let execution;
    if (existingExecution) {
      [execution] = await db('pipeline_executions')
        .where('id', existingExecution.id)
        .update({
          ...executionData,
          updated_at: new Date()
        })
        .returning('*');
    } else {
      [execution] = await db('pipeline_executions')
        .insert(executionData)
        .returning('*');
    }

    // Process workflow jobs if available
    if (workflow_run.jobs_url) {
      // In a real implementation, you would fetch jobs from GitHub API
      // For now, we'll create a basic step entry
      const stepData = {
        execution_id: execution.id,
        step_name: workflow_run.name || 'Workflow',
        status: status,
        started_at: workflow_run.created_at ? new Date(workflow_run.created_at) : null,
        completed_at: workflow_run.updated_at ? new Date(workflow_run.updated_at) : null,
        duration_seconds: durationSeconds,
        logs_url: workflow_run.html_url,
        step_order: 1
      };

      await db('pipeline_steps')
        .insert(stepData)
        .onConflict(['execution_id', 'step_name'])
        .merge();
    }

    // Notify WebSocket clients
    const wsService = req.app.get('wsService');
    wsService.broadcastExecutionUpdate(execution);

    // Trigger metrics recalculation if execution completed
    if (status === 'success' || status === 'failure') {
      const metricsService = req.app.get('metricsService');
      metricsService.calculateProjectMetrics(project.id);
    }

    res.status(200).json({ message: 'Webhook processed successfully' });
  } catch (error) {
    console.error('Error processing GitHub webhook:', error);
    res.status(500).json({ error: 'Failed to process webhook' });
  }
});



// Test webhook endpoint for development
router.post('/test', async (req, res) => {
  try {
    console.log('Test webhook received:', req.body);
    res.status(200).json({ 
      message: 'Test webhook received',
      timestamp: new Date().toISOString(),
      body: req.body
    });
  } catch (error) {
    console.error('Error processing test webhook:', error);
    res.status(500).json({ error: 'Failed to process test webhook' });
  }
});

module.exports = router;
