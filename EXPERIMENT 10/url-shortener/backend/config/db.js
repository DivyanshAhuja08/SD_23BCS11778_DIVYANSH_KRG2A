const { Pool } = require("pg");

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error("DATABASE_URL is not configured.");
}

const pool = new Pool({
  connectionString: DATABASE_URL,
});

pool.on("error", (error) => {
  console.error("PostgreSQL pool error:", error.message);
});

const query = (text, params) => pool.query(text, params);

const connectPostgres = async () => {
  const client = await pool.connect();

  try {
    await client.query("SELECT 1");
    console.log("PostgreSQL connected");
  } finally {
    client.release();
  }
};

const initDatabase = async () => {
  await query(`
    CREATE TABLE IF NOT EXISTS urls (
      id BIGSERIAL PRIMARY KEY,
      long_url TEXT NOT NULL UNIQUE,
      short_id TEXT NOT NULL UNIQUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      expires_at TIMESTAMPTZ
    )
  `);

  await query(`
    ALTER TABLE urls
    ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ
  `);
};

module.exports = {
  connectPostgres,
  initDatabase,
  query,
};
