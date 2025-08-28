const nodemailer = require('nodemailer');
const axios = require('axios');
const db = require('../config/database');

class AlertService {
  constructor() {
    this.setupEmailTransporter();
    this.cooldowns = new Map(); // Track alert cooldowns
  }

  setupEmailTransporter() {
    if (process.env.SMTP_HOST) {
      this.emailTransporter = nodemailer.createTransporter({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_PORT === '465',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD
        }
      });

      // Verify connection
      this.emailTransporter.verify((error, success) => {
        if (error) {
          console.error('❌ Email transporter verification failed:', error);
        } else {
          console.log('✅ Email transporter ready');
        }
      });
    } else {
      console.warn('⚠️ Email configuration not found, email alerts disabled');
    }
  }

  // Check and trigger alerts for a project execution
  async checkAndTriggerAlerts(projectId, execution) {
    try {
      const alertConfigs = await db('alert_configs')
        .where('project_id', projectId)
        .where('is_enabled', true);

      for (const config of alertConfigs) {
        await this.evaluateAlert(config, execution);
      }
    } catch (error) {
      console.error('Error checking alerts:', error);
    }
  }

  // Evaluate a specific alert configuration
  async evaluateAlert(alertConfig, execution) {
    try {
      const alertType = alertConfig.alert_type;
      const shouldTrigger = await this.shouldTriggerAlert(alertConfig, execution);

      if (shouldTrigger) {
        const alert = await this.buildAlert(alertConfig, execution);
        await this.sendAlert(alert);
        await this.logAlert(alert, execution);
      }
    } catch (error) {
      console.error('Error evaluating alert:', error);
    }
  }

  // Determine if alert should be triggered
  async shouldTriggerAlert(alertConfig, execution) {
    const projectId = alertConfig.project_id;
    const alertType = alertConfig.alert_type;
    const threshold = alertConfig.threshold_value;
    const configData = alertConfig.config_data ? JSON.parse(alertConfig.config_data) : {};

    // Check cooldown
    const cooldownKey = `${projectId}-${alertType}`;
    if (this.isInCooldown(cooldownKey)) {
      return false;
    }

    switch (alertType) {
      case 'failure_rate':
        return await this.checkFailureRate(projectId, threshold, configData);

      case 'build_duration':
        return await this.checkBuildDuration(projectId, execution, threshold, configData);

      case 'consecutive_failures':
        return await this.checkConsecutiveFailures(projectId, threshold, configData);

      case 'queue_time':
        return await this.checkQueueTime(projectId, threshold, configData);

      default:
        return false;
    }
  }

  // Check failure rate alert
  async checkFailureRate(projectId, threshold, config) {
    const timeWindow = config.time_window || '1h';
    const minExecutions = config.min_executions || 5;

    // Calculate time range
    const endTime = new Date();
    const startTime = new Date();
    
    switch (timeWindow) {
      case '1h':
        startTime.setHours(endTime.getHours() - 1);
        break;
      case '24h':
        startTime.setDate(endTime.getDate() - 1);
        break;
      case '7d':
        startTime.setDate(endTime.getDate() - 7);
        break;
      default:
        startTime.setHours(endTime.getHours() - 1);
    }

    const stats = await db('pipeline_executions')
      .where('project_id', projectId)
      .where('created_at', '>=', startTime)
      .select(
        db.raw('COUNT(*) as total_executions'),
        db.raw('COUNT(*) FILTER (WHERE status = ?) as failed_executions', ['failure'])
      )
      .first();

    const totalExecutions = parseInt(stats.total_executions);
    const failedExecutions = parseInt(stats.failed_executions);

    if (totalExecutions < minExecutions) {
      return false;
    }

    const failureRate = (failedExecutions / totalExecutions) * 100;
    return failureRate >= threshold;
  }

  // Check build duration alert
  async checkBuildDuration(projectId, execution, threshold, config) {
    if (!execution.duration_seconds) {
      return false;
    }

    const durationMinutes = execution.duration_seconds / 60;
    const comparison = config.comparison || 'greater_than';

    switch (comparison) {
      case 'greater_than':
        return durationMinutes > threshold;

      case 'percentage_increase':
        const baseline = await this.getBaselineDuration(projectId, config.baseline || '7d');
        if (!baseline) return false;
        const increase = ((durationMinutes - baseline) / baseline) * 100;
        return increase >= threshold;

      default:
        return durationMinutes > threshold;
    }
  }

  // Check consecutive failures alert
  async checkConsecutiveFailures(projectId, threshold, config) {
    const branches = config.branches || ['main', 'master', 'develop'];
    
    for (const branch of branches) {
      const recentExecutions = await db('pipeline_executions')
        .where('project_id', projectId)
        .where('branch', branch)
        .whereIn('status', ['success', 'failure'])
        .orderBy('created_at', 'desc')
        .limit(threshold);

      if (recentExecutions.length >= threshold) {
        const allFailures = recentExecutions.every(exec => exec.status === 'failure');
        if (allFailures) {
          return true;
        }
      }
    }

    return false;
  }

  // Check queue time alert
  async checkQueueTime(projectId, threshold, config) {
    const pendingExecutions = await db('pipeline_executions')
      .where('project_id', projectId)
      .where('status', 'pending')
      .where('created_at', '<', new Date(Date.now() - (threshold * 60 * 1000))) // threshold in minutes
      .count('* as count')
      .first();

    return parseInt(pendingExecutions.count) > 0;
  }

  // Get baseline duration for comparison
  async getBaselineDuration(projectId, baselinePeriod) {
    const endDate = new Date();
    const startDate = new Date();

    switch (baselinePeriod) {
      case '7d':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(endDate.getDate() - 30);
        break;
      default:
        startDate.setDate(endDate.getDate() - 7);
    }

    const result = await db('pipeline_executions')
      .where('project_id', projectId)
      .where('created_at', '>=', startDate)
      .where('status', 'success')
      .whereNotNull('duration_seconds')
      .avg('duration_seconds as avg_duration')
      .first();

    return result.avg_duration ? parseFloat(result.avg_duration) / 60 : null;
  }

  // Build alert object
  async buildAlert(alertConfig, execution) {
    const project = await db('projects').where('id', alertConfig.project_id).first();
    const channels = JSON.parse(alertConfig.notification_channels);

    let message = '';
    let severity = 'medium';

    switch (alertConfig.alert_type) {
      case 'failure_rate':
        message = `🚨 High failure rate detected in ${project.name}`;
        severity = 'high';
        break;

      case 'build_duration':
        const duration = execution.duration_seconds / 60;
        message = `⏰ Build duration alert for ${project.name}: ${duration.toFixed(1)} minutes`;
        severity = 'medium';
        break;

      case 'consecutive_failures':
        message = `🔴 Consecutive failures detected in ${project.name}`;
        severity = 'critical';
        break;

      case 'queue_time':
        message = `⏳ Builds queued too long in ${project.name}`;
        severity = 'medium';
        break;
    }

    return {
      project_id: alertConfig.project_id,
      project_name: project.name,
      alert_type: alertConfig.alert_type,
      message: message,
      severity: severity,
      channels: channels,
      execution_id: execution?.id,
      threshold_value: alertConfig.threshold_value,
      timestamp: new Date().toISOString()
    };
  }

  // Send alert through configured channels
  async sendAlert(alert) {
    const results = {
      success: false,
      channels_sent: [],
      errors: []
    };

    for (const channel of alert.channels) {
      try {
        switch (channel) {
          case 'slack':
            await this.sendSlackAlert(alert);
            results.channels_sent.push('slack');
            break;

          case 'email':
            await this.sendEmailAlert(alert);
            results.channels_sent.push('email');
            break;

          default:
            console.warn(`Unknown alert channel: ${channel}`);
        }
      } catch (error) {
        console.error(`Error sending ${channel} alert:`, error);
        results.errors.push({ channel, error: error.message });
      }
    }

    results.success = results.channels_sent.length > 0;

    // Set cooldown
    const cooldownKey = `${alert.project_id}-${alert.alert_type}`;
    this.setCooldown(cooldownKey);

    return results;
  }

  // Send Slack alert
  async sendSlackAlert(alert) {
    if (!process.env.SLACK_WEBHOOK_URL) {
      throw new Error('Slack webhook URL not configured');
    }

    const color = this.getSeverityColor(alert.severity);
    const dashboardUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/projects/${alert.project_id}`;

    const payload = {
      username: 'CI/CD Monitor',
      icon_emoji: ':gear:',
      attachments: [
        {
          color: color,
          title: 'CI/CD Pipeline Alert',
          text: alert.message,
          fields: [
            {
              title: 'Project',
              value: alert.project_name,
              short: true
            },
            {
              title: 'Alert Type',
              value: alert.alert_type.replace('_', ' ').toUpperCase(),
              short: true
            },
            {
              title: 'Severity',
              value: alert.severity.toUpperCase(),
              short: true
            },
            {
              title: 'Time',
              value: new Date(alert.timestamp).toLocaleString(),
              short: true
            }
          ],
          actions: [
            {
              type: 'button',
              text: 'View Dashboard',
              url: dashboardUrl
            }
          ]
        }
      ]
    };

    await axios.post(process.env.SLACK_WEBHOOK_URL, payload);
    console.log(`✅ Slack alert sent for project ${alert.project_name}`);
  }

  // Send email alert
  async sendEmailAlert(alert) {
    if (!this.emailTransporter) {
      throw new Error('Email transporter not configured');
    }

    const dashboardUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/projects/${alert.project_id}`;

    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.SMTP_USER,
      to: process.env.ALERT_EMAIL_TO || process.env.SMTP_USER,
      subject: `[CI/CD Alert] ${alert.severity.toUpperCase()}: ${alert.project_name} - ${alert.alert_type}`,
      html: `
        <h2 style="color: ${this.getSeverityColor(alert.severity)};">CI/CD Pipeline Alert</h2>
        <p><strong>Project:</strong> ${alert.project_name}</p>
        <p><strong>Alert Type:</strong> ${alert.alert_type.replace('_', ' ').toUpperCase()}</p>
        <p><strong>Message:</strong> ${alert.message}</p>
        <p><strong>Severity:</strong> ${alert.severity.toUpperCase()}</p>
        <p><strong>Time:</strong> ${new Date(alert.timestamp).toLocaleString()}</p>
        <p><a href="${dashboardUrl}" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">View Dashboard</a></p>
      `
    };

    await this.emailTransporter.sendMail(mailOptions);
    console.log(`✅ Email alert sent for project ${alert.project_name}`);
  }

  // Log alert to database
  async logAlert(alert, execution) {
    try {
      await db('alert_history').insert({
        project_id: alert.project_id,
        execution_id: execution?.id,
        alert_type: alert.alert_type,
        message: alert.message,
        channels_sent: JSON.stringify(alert.channels),
        sent_at: new Date()
      });
    } catch (error) {
      console.error('Error logging alert:', error);
    }
  }

  // Get severity color
  getSeverityColor(severity) {
    switch (severity) {
      case 'critical':
        return '#ff0000';
      case 'high':
        return '#ff6600';
      case 'medium':
        return '#ffcc00';
      case 'low':
        return '#00cc00';
      default:
        return '#666666';
    }
  }

  // Cooldown management
  isInCooldown(key) {
    const cooldownEnd = this.cooldowns.get(key);
    if (cooldownEnd && new Date() < cooldownEnd) {
      return true;
    }
    this.cooldowns.delete(key);
    return false;
  }

  setCooldown(key, minutes = 15) {
    const cooldownEnd = new Date(Date.now() + (minutes * 60 * 1000));
    this.cooldowns.set(key, cooldownEnd);
  }

  // Cleanup old cooldowns
  cleanupCooldowns() {
    const now = new Date();
    for (const [key, cooldownEnd] of this.cooldowns.entries()) {
      if (now >= cooldownEnd) {
        this.cooldowns.delete(key);
      }
    }
  }
}

module.exports = AlertService;
