const cron = require('node-cron');
const db = require('../config/database');
const redis = require('../config/redis');

class MetricsService {
  constructor() {
    this.isCalculating = false;
  }

  // Start periodic metrics calculation
  startPeriodicCalculation() {
    // Calculate daily metrics every hour
    cron.schedule('0 * * * *', () => {
      this.calculateDailyMetrics();
    });

    // Calculate real-time metrics every 5 minutes
    cron.schedule('*/5 * * * *', () => {
      this.calculateRealTimeMetrics();
    });

    // Clear old cache entries every 30 minutes
    cron.schedule('*/30 * * * *', () => {
      this.clearOldCacheEntries();
    });

    console.log('📊 Metrics service scheduled tasks started');
  }

  // Calculate daily aggregated metrics for all projects
  async calculateDailyMetrics() {
    if (this.isCalculating) {
      console.log('Metrics calculation already in progress, skipping...');
      return;
    }

    this.isCalculating = true;
    console.log('Starting daily metrics calculation...');

    try {
      const projects = await db('projects')
        .where('is_active', true)
        .select('id');

      for (const project of projects) {
        await this.calculateProjectDailyMetrics(project.id);
      }

      console.log('✅ Daily metrics calculation completed');
    } catch (error) {
      console.error('❌ Error calculating daily metrics:', error);
    } finally {
      this.isCalculating = false;
    }
  }

  // Calculate daily metrics for a specific project
  async calculateProjectDailyMetrics(projectId) {
    try {
      // Get the last 30 days of data
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Get executions grouped by date
      const dailyStats = await db('pipeline_executions')
        .where('project_id', projectId)
        .where('created_at', '>=', thirtyDaysAgo)
        .select(
          db.raw('DATE(created_at) as date'),
          db.raw('COUNT(*) as total_executions'),
          db.raw('COUNT(*) FILTER (WHERE status = ?) as successful_executions', ['success']),
          db.raw('COUNT(*) FILTER (WHERE status = ?) as failed_executions', ['failure']),
          db.raw('AVG(duration_seconds) as avg_duration_seconds'),
          db.raw('SUM(duration_seconds) as total_duration_seconds')
        )
        .groupBy(db.raw('DATE(created_at)'))
        .orderBy('date');

      // Insert or update daily metrics
      for (const stat of dailyStats) {
        await db('daily_metrics')
          .insert({
            project_id: projectId,
            date: stat.date,
            total_executions: parseInt(stat.total_executions),
            successful_executions: parseInt(stat.successful_executions),
            failed_executions: parseInt(stat.failed_executions),
            avg_duration_seconds: stat.avg_duration_seconds ? parseFloat(stat.avg_duration_seconds) : null,
            total_duration_seconds: parseInt(stat.total_duration_seconds) || 0
          })
          .onConflict(['project_id', 'date'])
          .merge({
            total_executions: parseInt(stat.total_executions),
            successful_executions: parseInt(stat.successful_executions),
            failed_executions: parseInt(stat.failed_executions),
            avg_duration_seconds: stat.avg_duration_seconds ? parseFloat(stat.avg_duration_seconds) : null,
            total_duration_seconds: parseInt(stat.total_duration_seconds) || 0,
            updated_at: new Date()
          });
      }

      console.log(`✅ Daily metrics calculated for project ${projectId}`);
    } catch (error) {
      console.error(`❌ Error calculating daily metrics for project ${projectId}:`, error);
    }
  }

  // Calculate real-time metrics and cache them
  async calculateRealTimeMetrics() {
    try {
      const projects = await db('projects')
        .where('is_active', true)
        .select('id');

      for (const project of projects) {
        await this.calculateProjectMetrics(project.id);
      }

      console.log('✅ Real-time metrics calculation completed');
    } catch (error) {
      console.error('❌ Error calculating real-time metrics:', error);
    }
  }

  // Calculate metrics for a specific project
  async calculateProjectMetrics(projectId) {
    try {
      const periods = ['1d', '7d', '30d'];

      for (const period of periods) {
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
        }

        // Get aggregated metrics
        const metrics = await db('pipeline_executions')
          .where('project_id', projectId)
          .where('created_at', '>=', startDate)
          .select(
            db.raw('COUNT(*) as total_executions'),
            db.raw('COUNT(*) FILTER (WHERE status = ?) as successful_executions', ['success']),
            db.raw('COUNT(*) FILTER (WHERE status = ?) as failed_executions', ['failure']),
            db.raw('AVG(duration_seconds) as avg_duration_seconds'),
            db.raw('MIN(duration_seconds) as min_duration_seconds'),
            db.raw('MAX(duration_seconds) as max_duration_seconds')
          )
          .first();

        const successRate = metrics.total_executions > 0 
          ? ((metrics.successful_executions / metrics.total_executions) * 100)
          : 0;

        const calculatedMetrics = {
          project_id: projectId,
          period: period,
          total_executions: parseInt(metrics.total_executions) || 0,
          successful_executions: parseInt(metrics.successful_executions) || 0,
          failed_executions: parseInt(metrics.failed_executions) || 0,
          success_rate: parseFloat(successRate.toFixed(1)),
          avg_duration_minutes: metrics.avg_duration_seconds 
            ? parseFloat((metrics.avg_duration_seconds / 60).toFixed(1))
            : 0,
          min_duration_minutes: metrics.min_duration_seconds 
            ? parseFloat((metrics.min_duration_seconds / 60).toFixed(1))
            : 0,
          max_duration_minutes: metrics.max_duration_seconds 
            ? parseFloat((metrics.max_duration_seconds / 60).toFixed(1))
            : 0,
          calculated_at: new Date().toISOString()
        };

        // Cache the metrics for 5 minutes
        const cacheKey = `metrics:${projectId}:${period}:calculated`;
        await redis.setEx(cacheKey, 300, JSON.stringify(calculatedMetrics));
      }

      console.log(`✅ Metrics calculated for project ${projectId}`);
    } catch (error) {
      console.error(`❌ Error calculating metrics for project ${projectId}:`, error);
    }
  }

  // Get cached metrics or calculate if not available
  async getProjectMetrics(projectId, period = '7d') {
    try {
      const cacheKey = `metrics:${projectId}:${period}:calculated`;
      const cached = await redis.get(cacheKey);

      if (cached) {
        return JSON.parse(cached);
      }

      // If not cached, calculate and return
      await this.calculateProjectMetrics(projectId);
      const newCached = await redis.get(cacheKey);
      
      return newCached ? JSON.parse(newCached) : null;
    } catch (error) {
      console.error(`Error getting metrics for project ${projectId}:`, error);
      return null;
    }
  }

  // Calculate trend metrics for a project
  async calculateTrendMetrics(projectId, days = 30) {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - days);

      // Get daily trends
      const trends = await db('pipeline_executions')
        .where('project_id', projectId)
        .where('created_at', '>=', startDate)
        .select(
          db.raw('DATE(created_at) as date'),
          db.raw('COUNT(*) as executions'),
          db.raw('COUNT(*) FILTER (WHERE status = ?) as successful', ['success']),
          db.raw('AVG(duration_seconds) as avg_duration'),
          db.raw('COUNT(DISTINCT branch) as unique_branches')
        )
        .groupBy(db.raw('DATE(created_at)'))
        .orderBy('date');

      return trends.map(trend => ({
        date: trend.date,
        executions: parseInt(trend.executions),
        success_rate: trend.executions > 0 
          ? parseFloat(((trend.successful / trend.executions) * 100).toFixed(1))
          : 0,
        avg_duration_minutes: trend.avg_duration 
          ? parseFloat((trend.avg_duration / 60).toFixed(1))
          : 0,
        unique_branches: parseInt(trend.unique_branches)
      }));
    } catch (error) {
      console.error(`Error calculating trend metrics for project ${projectId}:`, error);
      return [];
    }
  }

  // Calculate comparison metrics (current vs previous period)
  async calculateComparisonMetrics(projectId, period = '7d') {
    try {
      const endDate = new Date();
      const midDate = new Date();
      const startDate = new Date();

      // Calculate date ranges for current and previous periods
      switch (period) {
        case '1d':
          midDate.setDate(endDate.getDate() - 1);
          startDate.setDate(endDate.getDate() - 2);
          break;
        case '7d':
          midDate.setDate(endDate.getDate() - 7);
          startDate.setDate(endDate.getDate() - 14);
          break;
        case '30d':
          midDate.setDate(endDate.getDate() - 30);
          startDate.setDate(endDate.getDate() - 60);
          break;
      }

      // Get current period metrics
      const currentMetrics = await db('pipeline_executions')
        .where('project_id', projectId)
        .where('created_at', '>=', midDate)
        .select(
          db.raw('COUNT(*) as total_executions'),
          db.raw('COUNT(*) FILTER (WHERE status = ?) as successful_executions', ['success']),
          db.raw('AVG(duration_seconds) as avg_duration_seconds')
        )
        .first();

      // Get previous period metrics
      const previousMetrics = await db('pipeline_executions')
        .where('project_id', projectId)
        .where('created_at', '>=', startDate)
        .where('created_at', '<', midDate)
        .select(
          db.raw('COUNT(*) as total_executions'),
          db.raw('COUNT(*) FILTER (WHERE status = ?) as successful_executions', ['success']),
          db.raw('AVG(duration_seconds) as avg_duration_seconds')
        )
        .first();

      // Calculate comparison percentages
      const currentSuccessRate = currentMetrics.total_executions > 0 
        ? (currentMetrics.successful_executions / currentMetrics.total_executions) * 100
        : 0;

      const previousSuccessRate = previousMetrics.total_executions > 0 
        ? (previousMetrics.successful_executions / previousMetrics.total_executions) * 100
        : 0;

      const successRateChange = currentSuccessRate - previousSuccessRate;
      
      const durationChange = currentMetrics.avg_duration_seconds && previousMetrics.avg_duration_seconds
        ? ((currentMetrics.avg_duration_seconds - previousMetrics.avg_duration_seconds) / previousMetrics.avg_duration_seconds) * 100
        : 0;

      return {
        current: {
          total_executions: parseInt(currentMetrics.total_executions),
          success_rate: parseFloat(currentSuccessRate.toFixed(1)),
          avg_duration_minutes: currentMetrics.avg_duration_seconds 
            ? parseFloat((currentMetrics.avg_duration_seconds / 60).toFixed(1))
            : 0
        },
        previous: {
          total_executions: parseInt(previousMetrics.total_executions),
          success_rate: parseFloat(previousSuccessRate.toFixed(1)),
          avg_duration_minutes: previousMetrics.avg_duration_seconds 
            ? parseFloat((previousMetrics.avg_duration_seconds / 60).toFixed(1))
            : 0
        },
        changes: {
          success_rate_change: parseFloat(successRateChange.toFixed(1)),
          duration_change_percent: parseFloat(durationChange.toFixed(1)),
          execution_count_change: parseInt(currentMetrics.total_executions) - parseInt(previousMetrics.total_executions)
        }
      };
    } catch (error) {
      console.error(`Error calculating comparison metrics for project ${projectId}:`, error);
      return null;
    }
  }

  // Clear old cache entries
  async clearOldCacheEntries() {
    try {
      const keys = await redis.keys('metrics:*');
      
      if (keys.length > 100) { // Only clear if we have many keys
        const oldKeys = keys.slice(0, keys.length - 50); // Keep 50 most recent
        if (oldKeys.length > 0) {
          await redis.del(oldKeys);
          console.log(`🧹 Cleared ${oldKeys.length} old cache entries`);
        }
      }
    } catch (error) {
      console.error('Error clearing old cache entries:', error);
    }
  }
}

module.exports = MetricsService;
