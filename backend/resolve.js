// resolve.js — turns a Google Maps short link (maps.app.goo.gl/...) into a full URL
// that contains coordinates, by following the redirects on the server side.
// Browsers cannot do this themselves (CORS), which is why the server does it.
const HOST_OK = (h) => /(^|\.)(goo\.gl|g\.co)$/i.test(h) || /(^|\.)google\.[a-z.]{2,6}$/i.test(h);
const hasCoords = (u) =>
  /!3d-?\d|@-?\d+\.\d+,-?\d+\.\d+|[?&](?:q|ll|query|center|destination|daddr)=-?\d+\.\d+(?:,|%2C)-?\d+\.\d+/i.test(u);

async function resolveShortLink(input, { allow = HOST_OK, fetchFn = fetch, maxHops = 6 } = {}) {
  let url;
  try { url = new URL(input); } catch { throw new Error("That is not a valid link."); }
  for (let i = 0; i < maxHops; i++) {
    if (!/^https?:$/.test(url.protocol) || !allow(url.hostname)) throw new Error("Only Google Maps short links can be resolved.");
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    let r;
    try {
      r = await fetchFn(url, { redirect: "manual", signal: ctrl.signal, headers: { "user-agent": "Mozilla/5.0 (compatible; Bhoomi)" } });
    } catch {
      throw new Error("Could not reach the link. Check your internet connection, or paste the full URL instead.");
    } finally { clearTimeout(timer); }
    const loc = r.headers.get("location");
    if (r.status >= 300 && r.status < 400 && loc) {
      let next = new URL(loc, url);
      const cont = next.searchParams.get("continue"); // Google consent pages wrap the real URL
      if (cont && /consent\./i.test(next.hostname)) next = new URL(cont);
      if (hasCoords(next.href)) return next.href;
      url = next;
      continue;
    }
    if (hasCoords(url.href)) return url.href;
    if (r.status === 200) { // last resort: look for @lat,lon in the page itself
      const m = (await r.text()).slice(0, 300000).match(/@(-?\d{1,3}\.\d{3,}),(-?\d{1,3}\.\d{3,})/);
      if (m) return `https://www.google.com/maps/@${m[1]},${m[2]}`;
    }
    break;
  }
  throw new Error("This short link did not reveal coordinates. Open it in your browser and paste the full address-bar URL, or paste lat,lon.");
}

module.exports = { resolveShortLink };
