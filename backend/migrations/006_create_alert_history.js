exports.up = function(knex) {
  return knex.schema.createTable('alert_history', function(table) {
    table.increments('id').primary();
    table.integer('project_id').unsigned().references('id').inTable('projects').onDelete('CASCADE');
    table.integer('execution_id').unsigned().references('id').inTable('pipeline_executions').onDelete('SET NULL');
    table.string('alert_type', 50);
    table.text('message');
    table.specificType('channels_sent', 'text[]');
    table.timestamp('sent_at').defaultTo(knex.fn.now());
    table.timestamps(true, true);
    
    table.index(['project_id', 'sent_at']);
    table.index('sent_at');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('alert_history');
};
