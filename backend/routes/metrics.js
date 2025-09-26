const express = require('express');
const router = express.Router();
const db = require('../config/database');
const redis = require('../config/redis');

// GET /api/v1/metrics/projects/:projectId
router.get('/projects/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { period = '7d' } = req.query;

    // Check if project exists
    const project = await db('projects').where('id', projectId).first();
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Calculate date range based on period
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
      case '90d':
        startDate.setDate(endDate.getDate() - 90);
        break;
      default:
        startDate.setDate(endDate.getDate() - 7);
    }

    // Check cache first
    const cacheKey = `metrics:${projectId}:${period}`;
    const cached = await redis.get(cacheKey);
    if (cached) {
      return res.json(JSON.parse(cached));
    }

    // Get summary metrics
    const summary = await db('pipeline_executions')
      .where('project_id', projectId)
      .where('created_at', '>=', startDate)
      .select(
        db.raw('COUNT(*) as total_executions'),
        db.raw('COUNT(*) FILTER (WHERE status = ?) as successful_executions', ['success']),
        db.raw('COUNT(*) FILTER (WHERE status = ?) as failed_executions', ['failure']),
        db.raw('AVG(duration_seconds) as avg_duration_seconds')
      )
      .first();

    const successRate = summary.total_executions > 0 
      ? ((summary.successful_executions / summary.total_executions) * 100) 
      : 0;

    // Get last execution
    const lastExecution = await db('pipeline_executions')
      .where('project_id', projectId)
      .orderBy('created_at', 'desc')
      .first();

    // Get daily trends
    const dailyTrends = await db('pipeline_executions')
      .where('project_id', projectId)
      .where('created_at', '>=', startDate)
      .select(
        db.raw('DATE(created_at) as date'),
        db.raw('COUNT(*) as executions'),
        db.raw('COUNT(*) FILTER (WHERE status = ?) as successful', ['success']),
        db.raw('AVG(duration_seconds) as avg_duration')
      )
      .groupBy(db.raw('DATE(created_at)'))
      .orderBy('date');

    // Get hourly trends for last 24 hours if period is 1d
    let hourlyTrends = [];
    if (period === '1d') {
      hourlyTrends = await db('pipeline_executions')
        .where('project_id', projectId)
        .where('created_at', '>=', new Date(Date.now() - 24 * 60 * 60 * 1000))
        .select(
          db.raw('EXTRACT(hour FROM created_at) as hour'),
          db.raw('COUNT(*) as executions'),
          db.raw('COUNT(*) FILTER (WHERE status = ?) as successful', ['success'])
        )
        .groupBy(db.raw('EXTRACT(hour FROM created_at)'))
        .orderBy('hour');
    }

    // Get status distribution
    const statusDistribution = await db('pipeline_executions')
      .where('project_id', projectId)
      .where('created_at', '>=', startDate)
      .select('status')
      .count('* as count')
      .groupBy('status');

    // Get duration trends (last 30 executions)
    const durationTrends = await db('pipeline_executions')
      .where('project_id', projectId)
      .whereNotNull('duration_seconds')
      .orderBy('created_at', 'desc')
      .limit(30)
      .select('created_at', 'duration_seconds', 'execution_id');

    // Get queue metrics (pending/running)
    const queueMetrics = await db('pipeline_executions')
      .where('project_id', projectId)
      .whereIn('status', ['pending', 'running'])
      .select(
        db.raw('COUNT(*) FILTER (WHERE status = ?) as pending', ['pending']),
        db.raw('COUNT(*) FILTER (WHERE status = ?) as running', ['running'])
      )
      .first();

    const result = {
      summary: {
        total_executions: parseInt(summary.total_executions) || 0,
        successful_executions: parseInt(summary.successful_executions) || 0,
        failed_executions: parseInt(summary.failed_executions) || 0,
        success_rate: parseFloat(successRate.toFixed(1)),
        avg_duration_minutes: summary.avg_duration_seconds 
          ? parseFloat((summary.avg_duration_seconds / 60).toFixed(1))
          : 0,
        last_execution: lastExecution ? {
          id: lastExecution.id,
          execution_id: lastExecution.execution_id,
          status: lastExecution.status,
          duration_minutes: lastExecution.duration_seconds 
            ? parseFloat((lastExecution.duration_seconds / 60).toFixed(1))
            : null,
          completed_at: lastExecution.completed_at,
          branch: lastExecution.branch
        } : null,
        queue_status: {
          pending: parseInt(queueMetrics.pending) || 0,
          running: parseInt(queueMetrics.running) || 0
        }
      },
      trends: {
        daily_executions: dailyTrends.map(trend => ({
          date: trend.date,
          executions: parseInt(trend.executions),
          success_rate: trend.executions > 0 
            ? parseFloat(((trend.successful / trend.executions) * 100).toFixed(1))
            : 0,
          avg_duration: trend.avg_duration 
            ? parseFloat((trend.avg_duration / 60).toFixed(1))
            : 0
        })),
        hourly_executions: hourlyTrends.map(trend => ({
          hour: parseInt(trend.hour),
          executions: parseInt(trend.executions),
          success_rate: trend.executions > 0 
            ? parseFloat(((trend.successful / trend.executions) * 100).toFixed(1))
            : 0
        })),
        duration_trend: durationTrends.reverse().map(trend => ({
          execution_id: trend.execution_id,
          duration_minutes: parseFloat((trend.duration_seconds / 60).toFixed(1)),
          created_at: trend.created_at
        })),
        status_distribution: statusDistribution.map(status => ({
          status: status.status,
          count: parseInt(status.count)
        }))
      },
      period,
      generated_at: new Date().toISOString()
    };

    // Cache the result for 5 minutes
    await redis.setEx(cacheKey, 300, JSON.stringify(result));

    res.json(result);
  } catch (error) {
    console.error('Error fetching metrics:', error);
    res.status(500).json({ error: 'Failed to fetch metrics' });
  }
});

// GET /api/v1/metrics/overview
router.get('/overview', async (req, res) => {
  try {
    const { period = '7d' } = req.query;

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

    // Get overall metrics across all projects
    const overallMetrics = await db('pipeline_executions')
      .join('projects', 'pipeline_executions.project_id', 'projects.id')
      .where('projects.is_active', true)
      .where('pipeline_executions.created_at', '>=', startDate)
      .select(
        db.raw('COUNT(*) as total_executions'),
        db.raw('COUNT(*) FILTER (WHERE pipeline_executions.status = ?) as successful_executions', ['success']),
        db.raw('COUNT(DISTINCT pipeline_executions.project_id) as active_projects'),
        db.raw('AVG(pipeline_executions.duration_seconds) as avg_duration_seconds')
      )
      .first();

    // Get project breakdown
    const projectBreakdown = await db('pipeline_executions')
      .join('projects', 'pipeline_executions.project_id', 'projects.id')
      .where('projects.is_active', true)
      .where('pipeline_executions.created_at', '>=', startDate)
      .select(
        'projects.id',
        'projects.name',
        'projects.ci_system',
        db.raw('COUNT(*) as executions'),
        db.raw('COUNT(*) FILTER (WHERE pipeline_executions.status = ?) as successful', ['success']),
        db.raw('AVG(pipeline_executions.duration_seconds) as avg_duration')
      )
      .groupBy('projects.id', 'projects.name', 'projects.ci_system')
      .orderBy('executions', 'desc');

    const successRate = overallMetrics.total_executions > 0 
      ? ((overallMetrics.successful_executions / overallMetrics.total_executions) * 100)
      : 0;

    res.json({
      overview: {
        total_executions: parseInt(overallMetrics.total_executions) || 0,
        successful_executions: parseInt(overallMetrics.successful_executions) || 0,
        success_rate: parseFloat(successRate.toFixed(1)),
        active_projects: parseInt(overallMetrics.active_projects) || 0,
        avg_duration_minutes: overallMetrics.avg_duration_seconds
          ? parseFloat((overallMetrics.avg_duration_seconds / 60).toFixed(1))
          : 0
      },
      project_breakdown: projectBreakdown.map(project => ({
        id: project.id,
        name: project.name,
        ci_system: project.ci_system,
        executions: parseInt(project.executions),
        success_rate: project.executions > 0
          ? parseFloat(((project.successful / project.executions) * 100).toFixed(1))
          : 0,
        avg_duration_minutes: project.avg_duration
          ? parseFloat((project.avg_duration / 60).toFixed(1))
          : 0
      })),
      period,
      generated_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching overview metrics:', error);
    res.status(500).json({ error: 'Failed to fetch overview metrics' });
  }
});

module.exports = router;
