exports.up = function(knex) {
  return knex.schema.createTable('pipeline_executions', function(table) {
    table.increments('id').primary();
    table.integer('project_id').unsigned().references('id').inTable('projects').onDelete('CASCADE');
    table.string('execution_id', 255).notNullable();
    table.string('branch', 255);
    table.string('commit_sha', 40);
    table.string('status', 20).notNullable();
    table.timestamp('started_at');
    table.timestamp('completed_at');
    table.integer('duration_seconds');
    table.string('trigger_type', 50);
    table.string('triggered_by', 255);
    table.jsonb('raw_data');
    table.timestamps(true, true);
    
    table.unique(['project_id', 'execution_id']);
    table.index(['project_id', 'status']);
    table.index(['project_id', 'created_at']);
    table.index('created_at');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('pipeline_executions');
};
