// model.js — the prediction maths, identical to the standalone page. No HTTP or DB code here.
const FLOOR = 250; // rural floor, INR per sq ft
const IN=[[35.6,74],[35.5,77.8],[34.4,78.9],[32.5,79.3],[30.9,79.1],[30.2,80.2],[28.7,81],[27.5,83.5],[26.4,85.5],[26.4,88.1],[27.9,88.05],[28.1,88.8],[27.3,88.95],[26.75,89.1],[26.8,92],[28.3,92.5],[29.4,96.1],[28,97.3],[25.5,95.5],[23.5,94.2],[22,93.3],[23,92.4],[22.95,91.4],[23.8,91.05],[24.4,91.7],[25.15,92],[25.2,90.2],[25.7,89.8],[26.2,89],[25.4,88.4],[24.3,88.2],[23.4,88.6],[22.5,88.9],[21.7,88.8],[21.6,87.3],[20.3,87],[19.8,86.2],[19.3,85],[18.2,84.2],[17.9,83.6],[17.3,82.6],[16.6,82.3],[15,80.6],[13,80.4],[10.3,79.8],[8.0,77.65],[8.2,76.8],[10,76.2],[13,74.7],[15.5,73.7],[18.9,72.8],[20.7,72.8],[21,72.2],[22.2,69],[22.9,68.6],[23.7,68.3],[24.5,71],[25.7,70.2],[27.5,70],[28.5,70.3],[30,71.9],[31,74.5],[32.6,74.6],[33.6,73.8],[34.5,73.6]];
function isInIndia(la, lo) {
  let c = false;
  for (let i = 0, j = IN.length - 1; i < IN.length; j = i++) {
    const [a, b] = IN[i], [p, q] = IN[j];
    if ((b > lo) != (q > lo) && la < (p - a) * (lo - b) / (q - b) + a) c = !c;
  }
  return c;
}
const hav = (a, b, c, d) => {
  const r = Math.PI / 180, x = Math.sin((c - a) * r / 2) ** 2 + Math.cos(a * r) * Math.cos(c * r) * Math.sin((d - b) * r / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(x));
};

/** Inverse-distance-weighted blend, in log space, of the nearest k reference points.
 *  pts: [{latitude, longitude, rate_per_sqft, ...}]. ex = index to leave out (cross-validation). */
function predict(la, lo, pts, P, ex = -1) {
  const it = [];
  pts.forEach((a, i) => {
    if (i === ex) return;
    const d = hav(la, lo, a.latitude, a.longitude), L = P.L * Math.pow(a.rate_per_sqft / 3000, 0.35);
    it.push({ d, a, v: FLOOR + (a.rate_per_sqft - FLOOR) * Math.exp(-d / L) });
  });
  it.sort((x, y) => x.d - y.d);
  let sw = 0, s = 0;
  it.slice(0, P.k).forEach((o) => { const w = 1 / Math.pow(o.d + 5, P.p); sw += w; s += w * Math.log(o.v); });
  return { rate: Math.exp(s / sw), near: it[0], n3: it.slice(0, 3) };
}

/** Leave-one-out evaluation: mape, median error (md) and mae. */
function evaluate(pts, P) {
  const pr = pts.map((a, i) => predict(a.latitude, a.longitude, pts, P, i).rate);
  const e = pts.map((a, i) => Math.abs(pr[i] - a.rate_per_sqft) / a.rate_per_sqft);
  const ae = pts.map((a, i) => Math.abs(pr[i] - a.rate_per_sqft));
  const s = [...e].sort((x, y) => x - y);
  return { mape: e.reduce((x, y) => x + y, 0) / e.length, md: s[s.length >> 1], mae: ae.reduce((x, y) => x + y, 0) / ae.length };
}

/** Grid search over L, p, k (54 combinations), best first. */
function gridSearch(pts) {
  const TR = [];
  for (const L of [6, 10, 15, 25, 40, 60]) for (const p of [1, 2, 3]) for (const k of [3, 5, 8]) {
    const P = { L, p, k };
    TR.push({ P, m: evaluate(pts, P) });
  }
  TR.sort((x, y) => x.m.md - y.m.md);
  return TR;
}

module.exports = { isInIndia, predict, evaluate, gridSearch, FLOOR };
