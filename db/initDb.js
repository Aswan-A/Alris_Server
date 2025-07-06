const db = require("./db");

async function initDb() {
  const exists = await db.schema.hasTable("uploads");

  if (!exists) {
    await db.schema.createTable("uploads", (table) => {
      table.uuid("id").primary().defaultTo(db.raw("gen_random_uuid()"));
      table.string("filename").notNullable();
      table.text("description");
      table.double("latitude");
      table.double("longitude");
      table.string("user_id").notNullable();
      table.string("classification");
      table.boolean("is_spam");
      table.boolean("is_fake");
      table.text("public_url"); 
      table.timestamp("created_at").defaultTo(db.fn.now());
    });

    console.log("✅ 'uploads' table created.");
  } else {
    console.log("✅ 'uploads' table already exists.");
  }
}

module.exports = initDb;
