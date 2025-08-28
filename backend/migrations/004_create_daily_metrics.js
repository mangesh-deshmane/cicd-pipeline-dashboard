exports.up = function(knex) {
  return knex.schema.createTable('daily_metrics', function(table) {
    table.increments('id').primary();
    table.integer('project_id').unsigned().references('id').inTable('projects').onDelete('CASCADE');
    table.date('date').notNullable();
    table.integer('total_executions').defaultTo(0);
    table.integer('successful_executions').defaultTo(0);
    table.integer('failed_executions').defaultTo(0);
    table.decimal('avg_duration_seconds', 10, 2);
    table.bigInteger('total_duration_seconds').defaultTo(0);
    table.timestamps(true, true);
    
    table.unique(['project_id', 'date']);
    table.index(['project_id', 'date']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('daily_metrics');
};
