// server.js — REST API for Bhoomi (Express + SQLite).  Run: npm start  ->  http://localhost:3000
const express = require("express");
const cors = require("cors");
const path = require("path");
const db = require("./db");
const { resolveShortLink } = require("./resolve");
const { isInIndia, predict, gridSearch, FLOOR } = require("./model");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "frontend")));
const PORT = process.env.PORT || 3000;

const FACTOR = { market: 1, circle: 0.55 };
const modeOf = (q) => (q.mode === "circle" ? "circle" : "market");
const clientId = (req) => String(req.get("x-client-id") || "").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 40) || null;

// Load reference points once, clean them (same rules as the standalone page), tune the model.
let CACHE = null;
function model() {
  if (!CACHE) {
    const raw = db.prepare("SELECT city, state, locality, latitude, longitude, rate_per_sqft, rate_type, source FROM reference_points ORDER BY id").all();
    const seen = new Set();
    const pts = raw.filter((r) => {
      const k = r.city + "|" + r.locality;
      if (seen.has(k) || !(r.rate_per_sqft > 0) || !isInIndia(r.latitude, r.longitude)) return false;
      seen.add(k);
      return true;
    }).map((r) => ({ ...r }));
    CACHE = { rawCount: raw.length, pts, grid: gridSearch(pts) };
  }
  return CACHE;
}

const logStmt = db.prepare("INSERT INTO search_log (latitude, longitude, mode, result_rate, nearest_city, distance_km, client_id) VALUES (?,?,?,?,?,?,?)");
const point = (o) => ({ ...o.a, distance_km: o.d });

function estimate(lat, lon, mode, client) {
  const m = model(), r = predict(lat, lon, m.pts, m.grid[0].P), rate = r.rate * FACTOR[mode];
  logStmt.run(lat, lon, mode, rate, r.near.a.city, r.near.d, client);
  return { latitude: lat, longitude: lon, mode, rate_per_sqft: rate, nearest: point(r.near), top_contributors: r.n3.map(point) };
}

// GET /api/points — the cleaned reference points (Cities page and the maps)
app.get("/api/points", (req, res) => {
  const m = model();
  res.json({ raw_count: m.rawCount, count: m.pts.length, points: m.pts });
});

// GET /api/estimate?lat=&lon=&mode=market|circle
app.get("/api/estimate", (req, res) => {
  const lat = parseFloat(req.query.lat), lon = parseFloat(req.query.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return res.status(400).json({ error: "lat and lon query parameters are required numbers." });
  if (!isInIndia(lat, lon)) return res.status(422).json({ error: `(${lat.toFixed(4)}, ${lon.toFixed(4)}) is outside mainland India's boundary. Try a point on Indian land.` });
  res.json(estimate(lat, lon, modeOf(req.query), clientId(req)));
});

// GET /api/compare?points=lat,lon;lat,lon;...&mode=   (2 to 8 points)
app.get("/api/compare", (req, res) => {
  const pts = String(req.query.points || "").split(";").filter((s) => s.trim()).map((s) => s.split(",").map((x) => (x.trim() === "" ? NaN : Number(x))));
  if (pts.length < 2 || pts.length > 8) return res.status(400).json({ error: "Give between 2 and 8 points as points=lat,lon;lat,lon" });
  for (let i = 0; i < pts.length; i++) {
    const [la, lo] = pts[i];
    if (pts[i].length !== 2 || !Number.isFinite(la) || !Number.isFinite(lo)) return res.status(400).json({ error: `Location ${i + 1} must be a 'lat,lon' pair.` });
    if (!isInIndia(la, lo)) return res.status(422).json({ error: `Location ${i + 1} (${la.toFixed(4)}, ${lo.toFixed(4)}) is outside mainland India.` });
  }
  const mode = modeOf(req.query);
  res.json({ mode, count: pts.length, results: pts.map(([la, lo]) => estimate(la, lo, mode, clientId(req))) });
});

// GET /api/resolve?url= — expands a Google Maps short link (needs internet)
app.get("/api/resolve", async (req, res) => {
  try { res.json({ url: await resolveShortLink(String(req.query.url || "")) }); }
  catch (e) { res.status(422).json({ error: e.message }); }
});

// GET /api/method — tuning results (all 54 grid-search combinations, best first)
app.get("/api/method", (req, res) => {
  const m = model();
  res.json({ floor_per_sqft: FLOOR, raw_count: m.rawCount, points_count: m.pts.length, params: m.grid[0].P, accuracy: m.grid[0].m, grid: m.grid });
});

// GET /api/history — this browser's own last 20 searches
app.get("/api/history", (req, res) => {
  const c = clientId(req);
  const rows = c ? db.prepare("SELECT id, latitude, longitude, mode, result_rate, nearest_city, distance_km, created_at FROM search_log WHERE client_id = ? ORDER BY id DESC LIMIT 20").all(c) : [];
  res.json({ count: rows.length, searches: rows });
});

app.use("/api", (req, res) => res.status(404).json({ error: "Unknown API endpoint." }));
app.use((err, req, res, next) => { console.error(err); res.status(500).json({ error: "Server error." }); });

const server = app.listen(PORT, () => console.log(`Bhoomi API + frontend running at http://localhost:${PORT}`));
server.on("error", (e) => {
  console.error(e.code === "EADDRINUSE" ? `Port ${PORT} is already in use. Close the other server, or run with another port (PORT=3001 node server.js).` : e);
  process.exit(1);
});
