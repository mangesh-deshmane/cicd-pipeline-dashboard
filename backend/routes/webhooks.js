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

const verifyJenkinsSignature = (req, res, next) => {
  // Jenkins doesn't use signatures by default, but you can implement custom verification
  // For now, we'll just check for a simple token
  const token = req.get('X-Jenkins-Token');
  if (token !== process.env.JENKINS_WEBHOOK_SECRET) {
    return res.status(401).json({ error: 'Invalid token' });
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

// Jenkins webhook handler
router.post('/jenkins', verifyJenkinsSignature, async (req, res) => {
  try {
    const { name, url, build } = req.body;

    if (!build) {
      return res.status(200).json({ message: 'Event ignored' });
    }

    // Find the project by name or URL pattern
    const project = await db('projects')
      .where('name', name)
      .where('ci_system', 'jenkins')
      .first();

    if (!project) {
      console.log(`No project found for Jenkins job: ${name}`);
      return res.status(200).json({ message: 'Project not found' });
    }

    // Map Jenkins status to our status
    const statusMap = {
      'STARTED': 'running',
      'SUCCESS': 'success',
      'FAILURE': 'failure',
      'ABORTED': 'cancelled',
      'UNSTABLE': 'failure'
    };

    const status = statusMap[build.status] || 'pending';

    // Calculate duration
    let durationSeconds = null;
    if (build.duration) {
      durationSeconds = Math.round(build.duration / 1000);
    }

    const executionData = {
      project_id: project.id,
      execution_id: build.number.toString(),
      branch: build.parameters?.BRANCH_NAME || 'main',
      commit_sha: build.parameters?.GIT_COMMIT,
      status: status,
      started_at: build.timestamp ? new Date(build.timestamp) : null,
      completed_at: status !== 'running' && build.timestamp && build.duration 
        ? new Date(build.timestamp + build.duration) 
        : null,
      duration_seconds: durationSeconds,
      trigger_type: build.parameters?.BUILD_CAUSE || 'manual',
      triggered_by: build.parameters?.BUILD_USER_ID,
      raw_data: req.body
    };

    // Insert or update execution
    const existingExecution = await db('pipeline_executions')
      .where('project_id', project.id)
      .where('execution_id', build.number.toString())
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

    // Create a basic step entry for Jenkins
    const stepData = {
      execution_id: execution.id,
      step_name: name,
      status: status,
      started_at: build.timestamp ? new Date(build.timestamp) : null,
      completed_at: executionData.completed_at,
      duration_seconds: durationSeconds,
      logs_url: build.log_url || `${url}/${build.number}/console`,
      step_order: 1
    };

    await db('pipeline_steps')
      .insert(stepData)
      .onConflict(['execution_id', 'step_name'])
      .merge();

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
    console.error('Error processing Jenkins webhook:', error);
    res.status(500).json({ error: 'Failed to process webhook' });
  }
});

// GitLab webhook handler
router.post('/gitlab', async (req, res) => {
  try {
    const { object_kind, project, pipeline } = req.body;

    if (object_kind !== 'pipeline' || !pipeline) {
      return res.status(200).json({ message: 'Event ignored' });
    }

    // Find the project by repository URL
    const dbProject = await db('projects')
      .where('repository_url', project.web_url)
      .where('ci_system', 'gitlab')
      .first();

    if (!dbProject) {
      console.log(`No project found for GitLab repository: ${project.web_url}`);
      return res.status(200).json({ message: 'Project not found' });
    }

    // Map GitLab status to our status
    const statusMap = {
      'pending': 'pending',
      'running': 'running',
      'success': 'success',
      'failed': 'failure',
      'canceled': 'cancelled',
      'skipped': 'cancelled'
    };

    const status = statusMap[pipeline.status] || pipeline.status;

    // Calculate duration
    let durationSeconds = null;
    if (pipeline.created_at && pipeline.finished_at) {
      const startTime = new Date(pipeline.created_at);
      const endTime = new Date(pipeline.finished_at);
      durationSeconds = Math.round((endTime - startTime) / 1000);
    }

    const executionData = {
      project_id: dbProject.id,
      execution_id: pipeline.id.toString(),
      branch: pipeline.ref,
      commit_sha: pipeline.sha,
      status: status,
      started_at: pipeline.created_at ? new Date(pipeline.created_at) : null,
      completed_at: pipeline.finished_at ? new Date(pipeline.finished_at) : null,
      duration_seconds: durationSeconds,
      trigger_type: pipeline.source,
      triggered_by: pipeline.user?.username,
      raw_data: req.body
    };

    // Insert or update execution
    const existingExecution = await db('pipeline_executions')
      .where('project_id', dbProject.id)
      .where('execution_id', pipeline.id.toString())
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

    // Notify WebSocket clients
    const wsService = req.app.get('wsService');
    wsService.broadcastExecutionUpdate(execution);

    // Trigger metrics recalculation if execution completed
    if (status === 'success' || status === 'failure') {
      const metricsService = req.app.get('metricsService');
      metricsService.calculateProjectMetrics(dbProject.id);
    }

    res.status(200).json({ message: 'Webhook processed successfully' });
  } catch (error) {
    console.error('Error processing GitLab webhook:', error);
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
