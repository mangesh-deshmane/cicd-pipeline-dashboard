exports.seed = async function(knex) {
  // Deletes ALL existing entries
  await knex('alert_history').del();
  await knex('alert_configs').del();
  await knex('daily_metrics').del();
  await knex('pipeline_steps').del();
  await knex('pipeline_executions').del();
  await knex('projects').del();

  // Inserts seed entries
  await knex('projects').insert([
    {
      id: 1,
      name: 'frontend-app',
      repository_url: 'https://github.com/company/frontend-app',
      ci_system: 'github',
      webhook_secret: 'secret123',
      is_active: true
    },
    {
      id: 2,
      name: 'backend-api',
      repository_url: 'https://github.com/company/backend-api',
      ci_system: 'github',
      webhook_secret: 'secret456',
      is_active: true
    },
  ]);

  // Insert sample pipeline executions
  const now = new Date();
  const executions = [];
  
  for (let i = 0; i < 50; i++) {
    const projectId = Math.floor(Math.random() * 2) + 1;
    const status = Math.random() > 0.2 ? 'success' : 'failure';
    const duration = Math.floor(Math.random() * 600) + 60; // 1-10 minutes
    const startTime = new Date(now.getTime() - (i * 2 * 60 * 60 * 1000)); // Every 2 hours back
    const endTime = new Date(startTime.getTime() + (duration * 1000));
    
    executions.push({
      project_id: projectId,
      execution_id: `run-${1000 + i}`,
      branch: Math.random() > 0.3 ? 'main' : 'develop',
      commit_sha: Math.random().toString(36).substring(2, 42),
      status: status,
      started_at: startTime,
      completed_at: endTime,
      duration_seconds: duration,
      trigger_type: Math.random() > 0.5 ? 'push' : 'pull_request',
      triggered_by: `user${Math.floor(Math.random() * 5) + 1}`,
      raw_data: JSON.stringify({ source: 'seed' })
    });
  }
  
  await knex('pipeline_executions').insert(executions);

  // Insert sample alert configs
  await knex('alert_configs').insert([
    {
      project_id: 1,
      alert_type: 'failure_rate',
      threshold_value: 20.0,
      notification_channels: JSON.stringify(['slack', 'email']),
      is_enabled: true,
      config_data: JSON.stringify({ time_window: '1h', min_executions: 5 })
    },
    {
      project_id: 2,
      alert_type: 'build_duration',
      threshold_value: 600.0, // 10 minutes
      notification_channels: JSON.stringify(['slack']),
      is_enabled: true,
      config_data: JSON.stringify({ comparison: 'greater_than' })
    }
  ]);
};
