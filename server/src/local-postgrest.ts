/**
 * Minimal local PostgREST-compatible proxy.
 * Emulates the Supabase REST API (/rest/v1/<table>) backed by local PostgreSQL.
 * This allows the Supabase JS client to work against a local database.
 */
import express from "express";
import { Pool } from "pg";

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    "postgresql://postgres:postgres@localhost:5432/hypbit",
});

const app = express();
app.use(express.json());

// Health check — Supabase connectivity check hits /rest/v1/
app.get("/rest/v1/", (_req, res) => {
  res.json({ message: "local-postgrest OK" });
});

// Generic table query: GET /rest/v1/<table>?select=*&column=eq.value
app.get("/rest/v1/:table", async (req, res) => {
  const table = req.params.table.replace(/[^a-zA-Z0-9_]/g, "");
  const select = (req.query.select as string) || "*";
  const cols = select === "*" ? "*" : select.split(",").map(c => `"${c.trim().replace(/"/g, "")}"`).join(",");

  // Build WHERE from query params (PostgREST style: col=eq.value, col=in.(a,b))
  const conditions: string[] = [];
  const values: any[] = [];
  let idx = 1;

  for (const [key, val] of Object.entries(req.query)) {
    if (["select", "order", "limit", "offset", "apikey"].includes(key)) continue;
    const v = val as string;
    if (v.startsWith("eq.")) {
      conditions.push(`"${key}" = $${idx++}`);
      values.push(v.slice(3));
    } else if (v.startsWith("neq.")) {
      conditions.push(`"${key}" != $${idx++}`);
      values.push(v.slice(4));
    } else if (v.startsWith("gt.")) {
      conditions.push(`"${key}" > $${idx++}`);
      values.push(v.slice(3));
    } else if (v.startsWith("gte.")) {
      conditions.push(`"${key}" >= $${idx++}`);
      values.push(v.slice(4));
    } else if (v.startsWith("lt.")) {
      conditions.push(`"${key}" < $${idx++}`);
      values.push(v.slice(3));
    } else if (v.startsWith("lte.")) {
      conditions.push(`"${key}" <= $${idx++}`);
      values.push(v.slice(4));
    } else if (v.startsWith("in.")) {
      const items = v.slice(3).replace(/[()]/g, "").split(",");
      const placeholders = items.map(() => `$${idx++}`);
      conditions.push(`"${key}" IN (${placeholders.join(",")})`);
      values.push(...items);
    } else if (v.startsWith("like.")) {
      conditions.push(`"${key}" LIKE $${idx++}`);
      values.push(v.slice(5));
    } else if (v.startsWith("ilike.")) {
      conditions.push(`"${key}" ILIKE $${idx++}`);
      values.push(v.slice(6));
    } else if (v.startsWith("is.")) {
      const isVal = v.slice(3);
      if (isVal === "null") conditions.push(`"${key}" IS NULL`);
      else if (isVal === "true") conditions.push(`"${key}" IS TRUE`);
      else if (isVal === "false") conditions.push(`"${key}" IS FALSE`);
    }
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  // Order
  let orderClause = "";
  if (req.query.order) {
    const parts = (req.query.order as string).split(",").map(p => {
      const [col, dir] = p.split(".");
      return `"${col}" ${dir === "desc" ? "DESC" : "ASC"}`;
    });
    orderClause = `ORDER BY ${parts.join(",")}`;
  }

  const limitClause = req.query.limit ? `LIMIT ${parseInt(req.query.limit as string)}` : "";
  const offsetClause = req.query.offset ? `OFFSET ${parseInt(req.query.offset as string)}` : "";

  // Check for Prefer: count header
  const preferCount = req.headers["prefer"]?.includes("count=exact");

  try {
    const sql = `SELECT ${cols} FROM "${table}" ${where} ${orderClause} ${limitClause} ${offsetClause}`;
    const result = await pool.query(sql, values);

    if (preferCount) {
      const countSql = `SELECT count(*) FROM "${table}" ${where}`;
      const countResult = await pool.query(countSql, values);
      res.setHeader("content-range", `0-${result.rows.length}/${countResult.rows[0].count}`);
    }

    // Check for Prefer: return=minimal header (for inserts/updates)
    const single = req.headers["accept"]?.includes("vnd.pgrst.object+json");
    if (single && result.rows.length > 0) {
      return res.json(result.rows[0]);
    }

    res.json(result.rows);
  } catch (err: any) {
    console.error(`[local-postgrest] GET ${table}:`, err.message);
    res.status(400).json({ message: err.message, code: "PGRST000" });
  }
});

// INSERT: POST /rest/v1/<table>
app.post("/rest/v1/:table", async (req, res) => {
  const table = req.params.table.replace(/[^a-zA-Z0-9_]/g, "");
  const rows = Array.isArray(req.body) ? req.body : [req.body];

  try {
    const results = [];
    for (const row of rows) {
      const keys = Object.keys(row);
      const cols = keys.map(k => `"${k}"`).join(",");
      const placeholders = keys.map((_, i) => `$${i + 1}`).join(",");
      const vals = keys.map(k => row[k]);

      const sql = `INSERT INTO "${table}" (${cols}) VALUES (${placeholders}) RETURNING *`;
      const result = await pool.query(sql, vals);
      results.push(...result.rows);
    }

    const prefer = req.headers["prefer"] || "";
    if (prefer.includes("return=minimal")) {
      return res.status(201).send();
    }

    const single = req.headers["accept"]?.includes("vnd.pgrst.object+json");
    res.status(201).json(single ? results[0] : results);
  } catch (err: any) {
    console.error(`[local-postgrest] POST ${table}:`, err.message);
    res.status(400).json({ message: err.message, code: "PGRST000" });
  }
});

// UPDATE: PATCH /rest/v1/<table>?col=eq.val
app.patch("/rest/v1/:table", async (req, res) => {
  const table = req.params.table.replace(/[^a-zA-Z0-9_]/g, "");
  const updates = req.body;
  const keys = Object.keys(updates);

  let idx = 1;
  const setClauses = keys.map(k => `"${k}" = $${idx++}`);
  const values = keys.map(k => updates[k]);

  // Build WHERE from query params
  const conditions: string[] = [];
  for (const [key, val] of Object.entries(req.query)) {
    if (["select", "order", "limit", "offset", "apikey"].includes(key)) continue;
    const v = val as string;
    if (v.startsWith("eq.")) {
      conditions.push(`"${key}" = $${idx++}`);
      values.push(v.slice(3));
    } else if (v.startsWith("in.")) {
      const items = v.slice(3).replace(/[()]/g, "").split(",");
      const placeholders = items.map(() => `$${idx++}`);
      conditions.push(`"${key}" IN (${placeholders.join(",")})`);
      values.push(...items);
    }
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  try {
    const sql = `UPDATE "${table}" SET ${setClauses.join(",")} ${where} RETURNING *`;
    const result = await pool.query(sql, values);

    const single = req.headers["accept"]?.includes("vnd.pgrst.object+json");
    res.json(single ? result.rows[0] || null : result.rows);
  } catch (err: any) {
    console.error(`[local-postgrest] PATCH ${table}:`, err.message);
    res.status(400).json({ message: err.message, code: "PGRST000" });
  }
});

// DELETE: DELETE /rest/v1/<table>?col=eq.val
app.delete("/rest/v1/:table", async (req, res) => {
  const table = req.params.table.replace(/[^a-zA-Z0-9_]/g, "");

  let idx = 1;
  const conditions: string[] = [];
  const values: any[] = [];

  for (const [key, val] of Object.entries(req.query)) {
    if (["select", "apikey"].includes(key)) continue;
    const v = val as string;
    if (v.startsWith("eq.")) {
      conditions.push(`"${key}" = $${idx++}`);
      values.push(v.slice(3));
    }
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  try {
    const sql = `DELETE FROM "${table}" ${where} RETURNING *`;
    const result = await pool.query(sql, values);
    res.json(result.rows);
  } catch (err: any) {
    console.error(`[local-postgrest] DELETE ${table}:`, err.message);
    res.status(400).json({ message: err.message, code: "PGRST000" });
  }
});

// RPC: POST /rest/v1/rpc/<function>
app.post("/rest/v1/rpc/:fn", async (req, res) => {
  const fn = req.params.fn.replace(/[^a-zA-Z0-9_]/g, "");
  const args = req.body || {};
  const keys = Object.keys(args);
  const params = keys.map((_, i) => `$${i + 1}`).join(",");
  const namedParams = keys.map((k, i) => `"${k}" := $${i + 1}`).join(",");
  const values = keys.map(k => args[k]);

  try {
    const sql = keys.length > 0
      ? `SELECT * FROM "${fn}"(${namedParams})`
      : `SELECT * FROM "${fn}"()`;
    const result = await pool.query(sql, values);
    res.json(result.rows);
  } catch (err: any) {
    console.error(`[local-postgrest] RPC ${fn}:`, err.message);
    res.status(400).json({ message: err.message, code: "PGRST000" });
  }
});

// Auth stub
app.post("/auth/v1/token", (_req, res) => {
  res.json({ access_token: "local-dev-token", token_type: "bearer", expires_in: 3600, user: { id: "local-dev-user" } });
});
app.get("/auth/v1/user", (_req, res) => {
  res.json({ id: "local-dev-user", email: "dev@localhost", role: "authenticated" });
});

const POSTGREST_PORT = Number(process.env.POSTGREST_PORT) || 54321;

app.listen(POSTGREST_PORT, () => {
  console.log(`[local-postgrest] Supabase-compatible REST API on http://localhost:${POSTGREST_PORT}`);
});

export default app;
