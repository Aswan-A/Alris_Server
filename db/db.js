const knex = require("knex");
require("dotenv").config();

const db = knex({
  client: "pg",
  connection: {
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }, 
  },
  pool: { min: 0, max: 10 },
});

module.exports = db;
