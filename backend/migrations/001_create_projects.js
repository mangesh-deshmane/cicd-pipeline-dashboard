exports.up = function(knex) {
  return knex.schema.createTable('projects', function(table) {
    table.increments('id').primary();
    table.string('name', 255).notNullable();
    table.string('repository_url', 500);
    table.string('ci_system', 50).notNullable();
    table.string('webhook_secret', 255);
    table.text('api_token_encrypted');
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);
    
    table.unique(['name', 'ci_system']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('projects');
};
