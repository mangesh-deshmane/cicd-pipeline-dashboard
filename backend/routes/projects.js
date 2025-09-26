const express = require('express');
const router = express.Router();
const db = require('../config/database');
const Joi = require('joi');

// Validation schemas
const projectSchema = Joi.object({
  name: Joi.string().required().min(1).max(255),
  repository_url: Joi.string().uri().optional(),
  ci_system: Joi.string().valid('github').required(),
  webhook_secret: Joi.string().optional(),
  api_token_encrypted: Joi.string().optional()
});

const updateProjectSchema = Joi.object({
  name: Joi.string().min(1).max(255),
  repository_url: Joi.string().uri().allow(''),
  ci_system: Joi.string().valid('github'),
  webhook_secret: Joi.string().allow(''),
  api_token_encrypted: Joi.string().allow(''),
  is_active: Joi.boolean()
});

// GET /api/v1/projects
router.get('/', async (req, res) => {
  try {
    const projects = await db('projects')
      .select('*')
      .where('is_active', true)
      .orderBy('created_at', 'desc');

    // Get basic stats for each project
    const projectsWithStats = await Promise.all(
      projects.map(async (project) => {
        const stats = await db('pipeline_executions')
          .where('project_id', project.id)
          .select(
            db.raw('COUNT(*) as total_executions'),
            db.raw('COUNT(*) FILTER (WHERE status = ?) as successful_executions', ['success']),
            db.raw('AVG(duration_seconds) as avg_duration')
          )
          .first();

        const lastExecution = await db('pipeline_executions')
          .where('project_id', project.id)
          .orderBy('created_at', 'desc')
          .first();

        return {
          ...project,
          stats: {
            total_executions: parseInt(stats.total_executions) || 0,
            successful_executions: parseInt(stats.successful_executions) || 0,
            success_rate: stats.total_executions > 0 
              ? ((stats.successful_executions / stats.total_executions) * 100).toFixed(1)
              : 0,
            avg_duration: stats.avg_duration ? parseFloat(stats.avg_duration).toFixed(1) : 0,
            last_execution: lastExecution
          }
        };
      })
    );

    res.json({ projects: projectsWithStats });
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

// GET /api/v1/projects/:id
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const project = await db('projects')
      .where('id', id)
      .first();

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Get detailed stats
    const stats = await db('pipeline_executions')
      .where('project_id', id)
      .select(
        db.raw('COUNT(*) as total_executions'),
        db.raw('COUNT(*) FILTER (WHERE status = ?) as successful_executions', ['success']),
        db.raw('COUNT(*) FILTER (WHERE status = ?) as failed_executions', ['failure']),
        db.raw('AVG(duration_seconds) as avg_duration'),
        db.raw('MIN(duration_seconds) as min_duration'),
        db.raw('MAX(duration_seconds) as max_duration')
      )
      .first();

    const recentExecutions = await db('pipeline_executions')
      .where('project_id', id)
      .orderBy('created_at', 'desc')
      .limit(10);

    res.json({
      project: {
        ...project,
        stats: {
          ...stats,
          total_executions: parseInt(stats.total_executions) || 0,
          successful_executions: parseInt(stats.successful_executions) || 0,
          failed_executions: parseInt(stats.failed_executions) || 0,
          success_rate: stats.total_executions > 0 
            ? ((stats.successful_executions / stats.total_executions) * 100).toFixed(1)
            : 0,
          avg_duration: stats.avg_duration ? parseFloat(stats.avg_duration).toFixed(1) : 0
        },
        recent_executions: recentExecutions
      }
    });
  } catch (error) {
    console.error('Error fetching project:', error);
    res.status(500).json({ error: 'Failed to fetch project' });
  }
});

// POST /api/v1/projects
router.post('/', async (req, res) => {
  try {
    const { error, value } = projectSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const [project] = await db('projects')
      .insert(value)
      .returning('*');

    res.status(201).json({ project });
  } catch (error) {
    console.error('Error creating project:', error);
    if (error.code === '23505') { // Unique violation
      res.status(409).json({ error: 'Project with this name and CI system already exists' });
    } else {
      res.status(500).json({ error: 'Failed to create project' });
    }
  }
});

// PUT /api/v1/projects/:id
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { error, value } = updateProjectSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const [project] = await db('projects')
      .where('id', id)
      .update({
        ...value,
        updated_at: new Date()
      })
      .returning('*');

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json({ project });
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({ error: 'Failed to update project' });
  }
});

// DELETE /api/v1/projects/:id
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const deletedCount = await db('projects')
      .where('id', id)
      .update({ is_active: false });

    if (deletedCount === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

module.exports = router;
