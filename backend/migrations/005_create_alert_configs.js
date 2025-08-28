exports.up = function(knex) {
  return knex.schema.createTable('alert_configs', function(table) {
    table.increments('id').primary();
    table.integer('project_id').unsigned().references('id').inTable('projects').onDelete('CASCADE');
    table.string('alert_type', 50).notNullable();
    table.decimal('threshold_value', 10, 2);
    table.specificType('notification_channels', 'text[]');
    table.boolean('is_enabled').defaultTo(true);
    table.jsonb('config_data');
    table.timestamps(true, true);
    
    table.index(['project_id', 'alert_type']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('alert_configs');
};
