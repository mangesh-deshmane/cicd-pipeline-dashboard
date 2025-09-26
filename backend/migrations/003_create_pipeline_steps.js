exports.up = function(knex) {
  return knex.schema.createTable('pipeline_steps', function(table) {
    table.increments('id').primary();
    table.integer('execution_id').unsigned().references('id').inTable('pipeline_executions').onDelete('CASCADE');
    table.string('step_name', 255).notNullable();
    table.string('status', 20).notNullable();
    table.timestamp('started_at');
    table.timestamp('completed_at');
    table.integer('duration_seconds');
    table.string('logs_url', 500);
    table.integer('step_order');
    table.timestamps(true, true);
    
    table.index(['execution_id', 'step_order']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('pipeline_steps');
};
