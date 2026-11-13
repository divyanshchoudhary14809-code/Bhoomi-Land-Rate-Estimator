// db.js — SQLite database (built into Node.js 22.13+, nothing to compile).
// reference_points holds the same real, cited data as the standalone page:
// [city, state, locality, lat, lon, rate ₹/sq ft, rate_type, source]
const path = require("path");
let db;
try {
  const { DatabaseSync } = require("node:sqlite");
  db = new DatabaseSync(process.env.DB_PATH || path.join(__dirname, "bhoomi.db"));
} catch (e) {
  console.error(`This app needs Node.js 22.13 or newer (it uses the built-in SQLite). You have ${process.version}.`);
  console.error("Install the current LTS from https://nodejs.org, then run the app again.");
  process.exit(1);
}
db.exec("PRAGMA journal_mode = WAL");

db.exec(`
CREATE TABLE IF NOT EXISTS reference_points (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  city          TEXT NOT NULL,
  state         TEXT NOT NULL,
  locality      TEXT NOT NULL,
  latitude      REAL NOT NULL,
  longitude     REAL NOT NULL,
  rate_per_sqft REAL NOT NULL,   -- INR per sq ft
  rate_type     TEXT,            -- circle_rate / market_listing_median / ...
  source        TEXT             -- cited source URL
);
CREATE TABLE IF NOT EXISTS search_log (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  latitude     REAL NOT NULL,
  longitude    REAL NOT NULL,
  mode         TEXT NOT NULL,    -- 'market' or 'circle'
  result_rate  REAL NOT NULL,
  nearest_city TEXT,
  distance_km  REAL,
  client_id    TEXT,             -- anonymous per-browser id
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);
`);
try { db.exec("ALTER TABLE search_log ADD COLUMN client_id TEXT"); } catch (e) { /* column already exists */ }

// Seed once, only if the table is empty.
if (db.prepare("SELECT COUNT(*) AS n FROM reference_points").get().n === 0) {
  const rows = [
  ["Delhi", "DL", "Golf Links", 28.595, 77.23, 71900, "circle_rate", "https://www.squareyards.com/blog/circle-rate-in-delhi-crc"],
  ["Delhi", "DL", "Vasant Vihar", 28.559, 77.159, 71900, "circle_rate", "https://www.squareyards.com/blog/circle-rate-in-delhi-crc"],
  ["Delhi", "DL", "Greater Kailash", 28.548, 77.241, 22850, "circle_rate", "https://www.squareyards.com/blog/circle-rate-in-delhi-crc"],
  ["Delhi", "DL", "Hauz Khas", 28.549, 77.207, 22850, "circle_rate", "https://www.squareyards.com/blog/circle-rate-in-delhi-crc"],
  ["Delhi", "DL", "Janakpuri", 28.619, 77.089, 14860, "circle_rate", "https://www.squareyards.com/blog/circle-rate-in-delhi-crc"],
  ["Delhi", "DL", "Civil Lines", 28.677, 77.222, 14860, "circle_rate", "https://www.squareyards.com/blog/circle-rate-in-delhi-crc"],
  ["Delhi", "DL", "Dwarka", 28.592, 77.046, 11890, "circle_rate", "https://www.squareyards.com/blog/circle-rate-in-delhi-crc"],
  ["Delhi", "DL", "Pitampura", 28.698, 77.132, 11890, "circle_rate", "https://www.squareyards.com/blog/circle-rate-in-delhi-crc"],
  ["Delhi", "DL", "Rohini", 28.742, 77.071, 6510, "circle_rate", "https://www.squareyards.com/blog/circle-rate-in-delhi-crc"],
  ["Delhi", "DL", "Krishna Nagar", 28.656, 77.273, 5260, "circle_rate", "https://www.squareyards.com/blog/circle-rate-in-delhi-crc"],
  ["Delhi", "DL", "Narela", 28.852, 77.092, 4290, "circle_rate", "https://www.squareyards.com/blog/circle-rate-in-delhi-crc"],
  ["Delhi", "DL", "Burari", 28.752, 77.2, 2160, "circle_rate", "https://www.squareyards.com/blog/circle-rate-in-delhi-crc"],
  ["Bengaluru", "KA", "MG Road", 12.975, 77.607, 21000, "guidance_value", "https://www.ghar.tv/blog/complete-guide-to-bengaluru-guidance-value-bbmp-property-rates-registration-charges/artid4739"],
  ["Bengaluru", "KA", "Indiranagar", 12.972, 77.641, 15000, "guidance_value", "https://www.ghar.tv/blog/complete-guide-to-bengaluru-guidance-value-bbmp-property-rates-registration-charges/artid4739"],
  ["Bengaluru", "KA", "Koramangala", 12.935, 77.624, 15000, "guidance_value", "https://www.ghar.tv/blog/complete-guide-to-bengaluru-guidance-value-bbmp-property-rates-registration-charges/artid4739"],
  ["Bengaluru", "KA", "HSR Layout", 12.912, 77.645, 15000, "guidance_value", "https://www.ghar.tv/blog/complete-guide-to-bengaluru-guidance-value-bbmp-property-rates-registration-charges/artid4739"],
  ["Bengaluru", "KA", "Whitefield", 12.97, 77.75, 10000, "guidance_value", "https://www.ghar.tv/blog/complete-guide-to-bengaluru-guidance-value-bbmp-property-rates-registration-charges/artid4739"],
  ["Bengaluru", "KA", "Sarjapur Road", 12.901, 77.687, 10500, "guidance_value", "https://www.ghar.tv/blog/complete-guide-to-bengaluru-guidance-value-bbmp-property-rates-registration-charges/artid4739"],
  ["Bengaluru", "KA", "Electronic City", 12.845, 77.66, 6750, "guidance_value", "https://www.ghar.tv/blog/complete-guide-to-bengaluru-guidance-value-bbmp-property-rates-registration-charges/artid4739"],
  ["Bengaluru", "KA", "Yelahanka", 13.1005, 77.5963, 8700, "guidance_value", "https://www.ghar.tv/blog/complete-guide-to-bengaluru-guidance-value-bbmp-property-rates-registration-charges/artid4739"],
  ["Bengaluru", "KA", "Bannerghatta Road", 12.899, 77.597, 8500, "guidance_value", "https://www.ghar.tv/blog/complete-guide-to-bengaluru-guidance-value-bbmp-property-rates-registration-charges/artid4739"],
  ["Bengaluru", "KA", "Kanakapura Road", 12.868, 77.549, 7000, "guidance_value", "https://www.ghar.tv/blog/complete-guide-to-bengaluru-guidance-value-bbmp-property-rates-registration-charges/artid4739"],
  ["Bengaluru", "KA", "Mysore Road", 12.942, 77.515, 7000, "guidance_value", "https://www.ghar.tv/blog/complete-guide-to-bengaluru-guidance-value-bbmp-property-rates-registration-charges/artid4739"],
  ["Bengaluru", "KA", "Tumkur Road", 13.045, 77.519, 7000, "guidance_value", "https://www.ghar.tv/blog/complete-guide-to-bengaluru-guidance-value-bbmp-property-rates-registration-charges/artid4739"],
  ["Mumbai", "MH", "Bandra East", 19.0665, 72.84, 36765, "ready_reckoner", "https://www.mumbaipropertyexchange.com/ready-reckoner-rates-mumbai"],
  ["Mumbai", "MH", "Lower Parel", 18.996, 72.83, 29488, "ready_reckoner", "https://www.mumbaipropertyexchange.com/ready-reckoner-rates-mumbai"],
  ["Mumbai", "MH", "Khar West", 19.07, 72.837, 28496, "ready_reckoner", "https://www.mumbaipropertyexchange.com/ready-reckoner-rates-mumbai"],
  ["Mumbai", "MH", "Vile Parle West", 19.099, 72.843, 22657, "ready_reckoner", "https://www.mumbaipropertyexchange.com/ready-reckoner-rates-mumbai"],
  ["Mumbai", "MH", "Bandra West", 19.06, 72.83, 20126, "ready_reckoner", "https://www.mumbaipropertyexchange.com/ready-reckoner-rates-mumbai"],
  ["Mumbai", "MH", "Prabhadevi", 19.017, 72.826, 19089, "ready_reckoner", "https://www.mumbaipropertyexchange.com/ready-reckoner-rates-mumbai"],
  ["Mumbai", "MH", "Vile Parle East", 19.1, 72.85, 18484, "ready_reckoner", "https://www.mumbaipropertyexchange.com/ready-reckoner-rates-mumbai"],
  ["Mumbai", "MH", "Andheri West", 19.136, 72.83, 18243, "ready_reckoner", "https://www.mumbaipropertyexchange.com/ready-reckoner-rates-mumbai"],
  ["Mumbai", "MH", "Santacruz East", 19.081, 72.841, 17250, "ready_reckoner", "https://www.mumbaipropertyexchange.com/ready-reckoner-rates-mumbai"],
  ["Mumbai", "MH", "Santacruz West", 19.081, 72.829, 17114, "ready_reckoner", "https://www.mumbaipropertyexchange.com/ready-reckoner-rates-mumbai"],
  ["Mumbai", "MH", "Andheri East", 19.117, 72.869, 16197, "ready_reckoner", "https://www.mumbaipropertyexchange.com/ready-reckoner-rates-mumbai"],
  ["Mumbai", "MH", "Goregaon East", 19.166, 72.869, 16996, "ready_reckoner", "https://www.mumbaipropertyexchange.com/ready-reckoner-rates-mumbai"],
  ["Mumbai", "MH", "Tardeo", 18.969, 72.811, 16481, "ready_reckoner", "https://www.mumbaipropertyexchange.com/ready-reckoner-rates-mumbai"],
  ["Mumbai", "MH", "Borivali East", 19.229, 72.86, 15982, "ready_reckoner", "https://www.mumbaipropertyexchange.com/ready-reckoner-rates-mumbai"],
  ["Mumbai", "MH", "Kandivali East", 19.205, 72.869, 15826, "ready_reckoner", "https://www.mumbaipropertyexchange.com/ready-reckoner-rates-mumbai"],
  ["Mumbai", "MH", "Kandivali West", 19.205, 72.833, 15418, "ready_reckoner", "https://www.mumbaipropertyexchange.com/ready-reckoner-rates-mumbai"],
  ["Mumbai", "MH", "Borivali West", 19.231, 72.844, 15348, "ready_reckoner", "https://www.mumbaipropertyexchange.com/ready-reckoner-rates-mumbai"],
  ["Mumbai", "MH", "Jogeshwari", 19.137, 72.849, 14308, "ready_reckoner", "https://www.mumbaipropertyexchange.com/ready-reckoner-rates-mumbai"],
  ["Mumbai", "MH", "Mulund West", 19.172, 72.942, 13221, "ready_reckoner", "https://www.mumbaipropertyexchange.com/ready-reckoner-rates-mumbai"],
  ["Mumbai", "MH", "Chembur", 19.062, 72.9, 13385, "ready_reckoner", "https://www.mumbaipropertyexchange.com/ready-reckoner-rates-mumbai"],
  ["Mumbai", "MH", "Malad West", 19.186, 72.849, 12686, "ready_reckoner", "https://www.mumbaipropertyexchange.com/ready-reckoner-rates-mumbai"],
  ["Mumbai", "MH", "Malad East", 19.187, 72.862, 11719, "ready_reckoner", "https://www.mumbaipropertyexchange.com/ready-reckoner-rates-mumbai"],
  ["Hyderabad", "TS", "Banjara Hills", 17.414, 78.448, 34800, "guidance_value", "https://klmprojects.in/land-rates-in-hyderabad/"],
  ["Hyderabad", "TS", "Jubilee Hills", 17.43, 78.407, 34800, "guidance_value", "https://klmprojects.in/land-rates-in-hyderabad/"],
  ["Hyderabad", "TS", "Manikonda", 17.401, 78.376, 12090, "guidance_value", "https://klmprojects.in/land-rates-in-hyderabad/"],
  ["Hyderabad", "TS", "Raidurgam", 17.419, 78.348, 14490, "guidance_value", "https://klmprojects.in/land-rates-in-hyderabad/"],
  ["Hyderabad", "TS", "Kokapet", 17.408, 78.325, 8100, "guidance_value", "https://klmprojects.in/land-rates-in-hyderabad/"],
  ["Hyderabad", "TS", "Narsingi", 17.378, 78.354, 8100, "guidance_value", "https://klmprojects.in/land-rates-in-hyderabad/"],
  ["Hyderabad", "TS", "Puppalaguda", 17.398, 78.345, 11040, "guidance_value", "https://klmprojects.in/land-rates-in-hyderabad/"],
  ["Hyderabad", "TS", "Manchirevula", 17.37, 78.33, 6780, "guidance_value", "https://klmprojects.in/land-rates-in-hyderabad/"],
  ["Hyderabad", "TS", "Bachupally", 17.552, 78.365, 6780, "guidance_value", "https://klmprojects.in/land-rates-in-hyderabad/"],
  ["Jaipur", "RJ", "Bani Park", 26.927, 75.792, 5330, "dlc_rate", "https://2bigha.ai/blogs/dlc-rate-jaipur"],
  ["Jaipur", "RJ", "Vaishali Nagar", 26.914, 75.739, 4190, "dlc_rate", "https://2bigha.ai/blogs/dlc-rate-jaipur"],
  ["Jaipur", "RJ", "Amer", 26.985, 75.851, 2520, "dlc_rate", "https://2bigha.ai/blogs/dlc-rate-jaipur"],
  ["Jaipur", "RJ", "Mansarovar", 26.851, 75.762, 1680, "dlc_rate", "https://2bigha.ai/blogs/dlc-rate-jaipur"],
  ["Jaipur", "RJ", "Pratap Nagar", 26.785, 75.819, 1150, "dlc_rate", "https://2bigha.ai/blogs/dlc-rate-jaipur"],
  ["Jaipur", "RJ", "Sanganer", 26.82, 75.798, 1030, "dlc_rate", "https://2bigha.ai/blogs/dlc-rate-jaipur"],
  ["Jaipur", "RJ", "Sirsi Road", 26.946, 75.668, 610, "dlc_rate", "https://2bigha.ai/blogs/dlc-rate-jaipur"],
  ["Ghaziabad", "UP", "Ghaziabad (city-wide median of 603 real listings)", 28.6692, 77.4538, 3103.7, "market_listing_median", "user-provided scraped listings, cleaned"],
  ["Lucknow", "UP", "Lucknow (city-wide median of 782 real listings)", 26.8467, 80.9462, 1000, "market_listing_median", "user-provided scraped listings, cleaned"],
  ["Pune", "MH", "Pune (city-wide median of 1348 real listings)", 18.5204, 73.8567, 1000, "market_listing_median", "user-provided scraped listings, cleaned"],
  ["Chandigarh", "CH", "Chandigarh (city-wide median of 528 real listings)", 30.7333, 76.7794, 3433, "market_listing_median", "user-provided scraped listings, cleaned"]
];
  const ins = db.prepare("INSERT INTO reference_points (city, state, locality, latitude, longitude, rate_per_sqft, rate_type, source) VALUES (?,?,?,?,?,?,?,?)");
  db.exec("BEGIN");
  for (const r of rows) ins.run(...r);
  db.exec("COMMIT");
  console.log(`Seeded ${rows.length} reference points into the database`);
}

module.exports = db;
