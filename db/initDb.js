const db = require("./db");

async function initDb() {
  const exists = await db.schema.hasTable("uploads");

if (!exists) {
  await db.schema.createTable("uploads", (table) => {
    table.uuid("id").primary().defaultTo(db.raw("gen_random_uuid()"));
    table.string("department");
    table.string("filename").notNullable();
    table.text("description");
    table.double("latitude");
    table.double("longitude");
    table.string("user_id").notNullable();
    table.string("label");
    table.boolean("is_spam");
    table.boolean("is_fake");
    table.text("public_url");
    table.timestamp("created_at").defaultTo(db.fn.now());
    table.specificType("location", "geometry(Point, 4326)"); 
    table.specificType("embedding", "vector(512)");           
    table.uuid("issue_id");                                   
    table.boolean("is_duplicate").defaultTo(false);           
    table.uuid("duplicate_of_id");                           
  });

    console.log("✅ 'uploads' table created.");
  } else {
    console.log("✅ 'uploads' table already exists.");
  }
}

module.exports = initDb;
