// app.js — frontend: the same page as standalone/index.html, but the data and model now come from the backend API.

const $=id=>document.getElementById(id);
// ---------- DATA: [city, state, locality, lat, lon, rate ₹/sq ft, rate_type, source] ----------
// Real, cited reference points: circle rate / guidance value / ready-reckoner / DLC-rate figures
// for named localities (see the source column), plus 4 city-wide medians computed from real
// scraped plot listings (Ghaziabad, Lucknow, Pune, Chandigarh). Built by pipeline.py.
// ---------- state loaded from the backend (SQLite via /api) ----------
let A=[],TR=[],M={md:0,mape:0,mae:0},RAW={length:0};
const API=location.protocol==="file:"?"http://localhost:3000":"";
const CID=(()=>{try{let c=localStorage.getItem("bhoomi_cid");if(!c){c=Math.random().toString(36).slice(2)+Date.now().toString(36);localStorage.setItem("bhoomi_cid",c)}return c}catch(e){return"anon"}})();
async function api(p){let r;try{r=await fetch(API+p,{headers:{"x-client-id":CID}})}catch(e){throw"Cannot reach the server. Start it with node server.js in the backend folder, then open http://localhost:3000."}
 let d;try{d=await r.json()}catch(e){throw"Unexpected server response."}if(!r.ok)throw d.error||"Request failed.";return d}
const toRow=p=>[p.city,p.state,p.locality,p.latitude,p.longitude,p.rate_per_sqft,p.rate_type,p.source];
const adapt=d=>({la:d.latitude,lo:d.longitude,v:d.rate_per_sqft,near:{a:toRow(d.nearest),d:d.nearest.distance_km},n3:d.top_contributors.map(t=>({a:toRow(t),d:t.distance_km}))});
const FLOOR=250;
const U=[["sq ft",1],["sq yd (gaj)",9],["sq m",10.7639],["guntha",1089],["cent",435.6],["kanal",5445],["marla",272.25],["acre",43560],["hectare",107639.1]];
const IN=[[35.6,74],[35.5,77.8],[34.4,78.9],[32.5,79.3],[30.9,79.1],[30.2,80.2],[28.7,81],[27.5,83.5],[26.4,85.5],[26.4,88.1],[27.9,88.05],[28.1,88.8],[27.3,88.95],[26.75,89.1],[26.8,92],[28.3,92.5],[29.4,96.1],[28,97.3],[25.5,95.5],[23.5,94.2],[22,93.3],[23,92.4],[22.95,91.4],[23.8,91.05],[24.4,91.7],[25.15,92],[25.2,90.2],[25.7,89.8],[26.2,89],[25.4,88.4],[24.3,88.2],[23.4,88.6],[22.5,88.9],[21.7,88.8],[21.6,87.3],[20.3,87],[19.8,86.2],[19.3,85],[18.2,84.2],[17.9,83.6],[17.3,82.6],[16.6,82.3],[15,80.6],[13,80.4],[10.3,79.8],[8.0,77.65],[8.2,76.8],[10,76.2],[13,74.7],[15.5,73.7],[18.9,72.8],[20.7,72.8],[21,72.2],[22.2,69],[22.9,68.6],[23.7,68.3],[24.5,71],[25.7,70.2],[27.5,70],[28.5,70.3],[30,71.9],[31,74.5],[32.6,74.6],[33.6,73.8],[34.5,73.6]];
const inIndia=(la,lo)=>{let c=false;for(let i=0,j=IN.length-1;i<IN.length;j=i++){const[a,b]=IN[i],[p,q]=IN[j];if((b>lo)!=(q>lo)&&la<(p-a)*(lo-b)/(q-b)+a)c=!c}return c};
// ---------- helpers ----------
function parseCoords(t){t=t.trim();try{t=decodeURIComponent(t.replace(/\+/g," "))}catch(e){}
 const dms=t.match(/(\d+)\s*°\s*(\d+)\s*['′]\s*(\d+(?:\.\d+)?)\s*["″]?\s*([NS])[\s,]*(\d+)\s*°\s*(\d+)\s*['′]\s*(\d+(?:\.\d+)?)\s*["″]?\s*([EW])/i);
 if(dms){const c=(d,m,s,h)=>(+d+m/60+s/3600)*(/[SW]/i.test(h)?-1:1);return[c(dms[1],dms[2],dms[3],dms[4]),c(dms[5],dms[6],dms[7],dms[8])]}
 const dh=t.match(/(\d+(?:\.\d+)?)\s*°?\s*([NS])[\s,]+(\d+(?:\.\d+)?)\s*°?\s*([EW])/i);if(dh)return[+dh[1]*(/S/i.test(dh[2])?-1:1),+dh[3]*(/W/i.test(dh[4])?-1:1)];
 const N="(-?\\d+(?:\\.\\d+)?)",pats=[new RegExp("!3d"+N+"!4d"+N),new RegExp("@"+N+","+N),new RegExp("[?&](?:q|ll|query|center|daddr|destination)="+N+"\\s*,\\s*"+N),new RegExp("/place/"+N+"\\s*,\\s*"+N),new RegExp("^"+N+"\\s*[, ]\\s*"+N+"$")];
 for(const p of pats){const m=t.match(p);if(m)return[+m[1],+m[2]]}
 if(/goo\.gl|maps\.app|g\.co/.test(t))throw"Short links hide the coordinates. Open the link in your browser first, then copy the full address-bar URL, or paste lat,lon.";
 throw"Could not find coordinates. Paste a Google Maps / Earth URL, decimal lat,lon (28.8152,79.0250) or degrees-minutes-seconds (28°48'54.7\"N 79°01'30.0\"E)."}
const fmt=n=>"₹"+Math.round(n).toLocaleString("en-IN");
const fmtS=n=>n>=1e7?"₹"+(n/1e7).toFixed(2)+" Cr":n>=1e5?"₹"+(n/1e5).toFixed(2)+" L":fmt(n);
const zone=d=>d<15?"Urban / city limits":d<50?"Peri-urban / outskirts":d<150?"Semi-rural":"Rural / remote";
const gm=(la,lo)=>`https://www.google.com/maps/search/?api=1&query=${la},${lo}`,ge=(la,lo)=>`https://earth.google.com/web/@${la},${lo},200a,3000d,35y,0h,0t,0r`;
const SHORT=/https?:\/\/(?:maps\.app\.goo\.gl|goo\.gl\/maps|g\.co\/(?:kgs|maps))[^\s]*/i;
async function getCoords(t){const m=t.trim().match(SHORT);if(m){const d=await api("/api/resolve?url="+encodeURIComponent(m[0]));return parseCoords(d.url)}return parseCoords(t)}
async function calc(txt,f){const[la,lo]=await getCoords(txt);if(!inIndia(la,lo))throw`(${la.toFixed(4)}, ${lo.toFixed(4)}) is outside mainland India's boundary. Try a point on Indian land.`;return adapt(await api(`/api/estimate?lat=${la}&lon=${lo}&mode=${f<1?"circle":"market"}`))}
function linksFor(val){try{const[la,lo]=parseCoords(val);return[gm(la,lo),ge(la,lo)]}catch(e){return["https://www.google.com/maps/@22.5,79,5z","https://earth.google.com/web/@22.5,79,0a,4500000d,35y,0h,0t,0r"]}}
function mapSVG(la,lo){const W=260,H=300,X=x=>((x-68)/30*W).toFixed(1),Y=y=>((38-y)/32*H).toFixed(1);
 return `<svg viewBox="0 0 ${W} ${H}" style="max-width:240px;width:100%"><path d="M${IN.map(p=>X(p[1])+","+Y(p[0])).join("L")}Z" fill="var(--acc2)" stroke="var(--line)" stroke-width="1.5"/>${A.map(a=>`<circle cx="${X(a[4])}" cy="${Y(a[3])}" r="2.2" fill="var(--olive)" opacity=".7"/>`).join("")}<circle cx="${X(lo)}" cy="${Y(la)}" r="6" fill="var(--acc)" stroke="#fff" stroke-width="2"/></svg>`}
function multiMapSVG(pts){const W=260,H=300,X=x=>((x-68)/30*W).toFixed(1),Y=y=>((38-y)/32*H).toFixed(1),cols=["var(--acc)","var(--olive)","#3a6ea8","#a83a8e","#a89b3a","#3aa88e","#a85a3a"];
 return `<svg viewBox="0 0 ${W} ${H}" style="max-width:240px;width:100%"><path d="M${IN.map(p=>X(p[1])+","+Y(p[0])).join("L")}Z" fill="var(--acc2)" stroke="var(--line)" stroke-width="1.5"/>${A.map(a=>`<circle cx="${X(a[4])}" cy="${Y(a[3])}" r="1.6" fill="var(--olive)" opacity=".4"/>`).join("")}${pts.map((p,i)=>`<circle cx="${X(p.lo)}" cy="${Y(p.la)}" r="6" fill="${cols[i%cols.length]}" stroke="#fff" stroke-width="2"/><text x="${X(p.lo)}" y="${Y(p.la)-9}" font-size="9" text-anchor="middle" fill="${cols[i%cols.length]}" font-family="system-ui,sans-serif" font-weight="700">${i+1}</text>`).join("")}</svg>`}
const unitOpts=(sel=0)=>U.map((u,i)=>`<option value="${i}"${i==sel?" selected":""}>${u[0]}</option>`).join("");
const modeSel=id=>`<select id="${id}"><option value="1">Market rate</option><option value="0.55">Approx. circle rate</option></select>`;
let LASTIN="",ACC=0;
// ---------- PAGE: estimator ----------
function pgEst(v){v.innerHTML=`<div class="card"><button class="locbtn" id="loc">📍 Use my current location</button>
<div class="or">— or pick the spot on Google Maps / Google Earth —</div>
<div class="row"><a class="btn" id="ogm" target="_blank" rel="noopener">🗺️ Open Google Maps</a><a class="btn" id="oge" target="_blank" rel="noopener">🌍 Open Google Earth</a></div><details style="border:0;padding:6px 0 0"><summary class="note">Says blocked? Copy a link instead</summary><input id="lm" type="text" readonly style="margin-top:6px"><input id="le" type="text" readonly style="margin-top:6px"><p class="note">Tap a box to select it, copy, and paste the link into a new browser tab.</p></details>
<p class="note">Find your plot, right-click it (long-press on a phone) and copy the coordinates, or copy the page URL. Come back here and press <b>Paste &amp; estimate</b>.</p>
<input id="in" type="text" placeholder="Google Maps / Earth URL, 28.8152,79.0250 or 28°48'54.7&quot;N 79°01'30.0&quot;E" autocomplete="off">
<div class="row"><button id="pst">📋 Paste &amp; estimate</button>${modeSel("mode")}<button class="p" id="go">Estimate rate</button></div><div class="row" id="chips"></div></div>
<div class="card" id="out" style="display:none"></div>
<p class="note">Rates are modeled from ${A.length} real, cited reference points (circle rates, guidance values, ready-reckoner / DLC rates, and real-listing medians) — not official circle rates for your exact plot. See the <a href="#/about">About</a> and <a href="#/method">Method</a> pages.</p>`;
 $("in").value=LASTIN;let cur=null;
 const show=async()=>{upd();const o=$("out");o.style.display="block";o.innerHTML="Loading…";
  try{const f=+$("mode").value,r=await calc($("in").value,f);LASTIN=$("in").value;cur=r;const m=Math.min(M.md,.6),h=Math.min(M.md,.9);
   o.innerHTML=`<div class="note">${r.la.toFixed(5)}, ${r.lo.toFixed(5)} · ${f<1?"Approx. circle rate":"Market rate"}${ACC?` · GPS accuracy ±${Math.round(ACC)} m`:""}</div>
   <div class="big">${fmt(r.v)} <span style="font-size:1rem;font-weight:500">per sq ft</span></div><div class="note">Rough range ${fmt(r.v*(1-m))} – ${fmt(r.v*(1+h))} per sq ft</div>
   <div class="grid">${[1,2,3,7,8].map(i=>`<div class="k"><b>${fmtS(r.v*U[i][1])}</b><span>per ${U[i][0]}</span></div>`).join("")}</div>
   <h3>Your plot</h3><div class="row"><input id="qty" type="number" min="0" value="1000" style="width:120px"><select id="qu">${unitOpts(0)}</select><b id="tot"></b></div>
   <div class="grid"><div class="k"><b>${r.near.a[2]}, ${r.near.a[0]}</b><span>nearest reference point</span></div><div class="k"><b>${r.near.d.toFixed(1)} km</b><span>distance to it</span></div><div class="k"><b>${zone(r.near.d)}</b><span>zone type</span></div></div>
   <div class="two"><div><h3>Nearest contributing reference points (real, cited data)</h3><table><tr><th>Locality</th><th>City</th><th>km</th><th>₹/sq ft</th><th>Source</th></tr>${r.n3.map(x=>`<tr><td>${x.a[2]}</td><td>${x.a[0]}</td><td>${x.d.toFixed(0)}</td><td>${fmt(x.a[5])}</td><td><a href="${x.a[7]}" target="_blank" rel="noopener">source ↗</a></td></tr>`).join("")}</table>
   <div class="row"><a class="btn" target="_blank" rel="noopener" href="${gm(r.la,r.lo)}">View on Google Maps ↗</a><a class="btn" target="_blank" rel="noopener" href="${ge(r.la,r.lo)}">View on Google Earth ↗</a></div></div>${mapSVG(r.la,r.lo)}</div>`;
   const t=()=>{$("tot").textContent="≈ "+fmtS(+$("qty").value*U[+$("qu").value][1]*cur.v)};$("qty").oninput=t;$("qu").onchange=t;t()}
  catch(e){o.innerHTML=`<div class="err">${e}</div>`}};
 $("go").onclick=()=>{ACC=0;show()};$("mode").onchange=()=>{if($("in").value)show()};$("in").onkeydown=e=>{if(e.key==="Enter"){ACC=0;show()}};
 const upd=()=>{const[m,e]=linksFor($("in").value);$("ogm").href=m;$("oge").href=e;$("lm").value=m;$("le").value=e};$("in").addEventListener("input",upd);["lm","le"].forEach(i=>$(i).onclick=()=>$(i).select());upd();
 $("pst").onclick=()=>{ACC=0;(navigator.clipboard&&navigator.clipboard.readText?navigator.clipboard.readText():Promise.reject()).then(t=>{$("in").value=t;show()}).catch(()=>{$("out").style.display="block";$("out").innerHTML='<div class="err">Your browser blocked clipboard access. Long-press the box above, paste manually, then press Estimate rate.</div>'})};
 $("loc").onclick=()=>{const b=$("loc"),fail=m=>{b.disabled=false;b.textContent="📍 Use my current location";$("out").style.display="block";$("out").innerHTML=`<div class="err">${m}</div>`};
  if(!navigator.geolocation)return fail("This browser can't share location. Paste coordinates or a Google Maps link instead.");
  b.disabled=true;b.textContent="Finding your location…";
  navigator.geolocation.getCurrentPosition(p=>{b.disabled=false;b.textContent="📍 Use my current location";ACC=p.coords.accuracy;$("in").value=p.coords.latitude.toFixed(6)+","+p.coords.longitude.toFixed(6);show()},
   e=>fail(e.code===1?"Location permission was blocked. Allow location for this page in your browser or site settings and try again, or paste a Google Maps link instead.":e.code===3?"Locating timed out. Move to an open area or check GPS, then try again.":"Couldn't get your location. Paste coordinates or a Google Maps link instead."),{enableHighAccuracy:true,timeout:15000,maximumAge:0})};
 [["Delhi · GK","28.548,77.241"],["Mumbai · Bandra","19.066,72.84"],["Bengaluru · Koramangala","12.935,77.624"],["Jaipur · Mansarovar","26.851,75.762"],["Hyderabad · Kokapet","17.408,78.325"],["Ghaziabad","28.6692,77.4538"],["Rural Bihar","25.9,86.1"]].forEach(([n,c])=>{const b=document.createElement("button");b.className="chip";b.textContent=n;b.onclick=()=>{$("in").value=c;ACC=0;show()};$("chips").appendChild(b)});
 if(LASTIN)show()}
// ---------- PAGE: compare (N locations at once) ----------
let CMP=["28.548,77.241","19.066,72.84","12.935,77.624"]; // seed with example locations
function pgCmp(v){
 v.innerHTML=`<div class="card"><h2>Compare multiple locations</h2><p class="note">Add as many plots as you want — Google Maps/Earth URLs, decimal lat,lon, or DMS — and compare their estimated rates side by side, in the same table.</p>
 <div id="locs"></div>
 <div class="row"><button id="add">➕ Add another location</button>${modeSel("cm")}<button class="p" id="cg">Compare all</button><button class="chip" id="cx">Reset example</button></div></div>
 <div class="card" id="co" style="display:none"></div>`;
 function drawInputs(){
  $("locs").innerHTML=CMP.map((val,i)=>`<div class="loc"><div class="row" style="margin-top:0"><b style="min-width:1.4em">${i+1}.</b><input data-i="${i}" class="cin" type="text" value="${val.replace(/"/g,"&quot;")}" placeholder="Location ${i+1} — URL or lat,lon" style="flex:1"><button class="rm" data-rm="${i}" ${CMP.length<=2?"disabled":""}>Remove</button></div></div>`).join("");
  $("locs").querySelectorAll(".cin").forEach(inp=>inp.oninput=()=>{CMP[+inp.dataset.i]=inp.value});
  $("locs").querySelectorAll("[data-rm]").forEach(b=>b.onclick=()=>{if(CMP.length>2){CMP.splice(+b.dataset.rm,1);drawInputs()}});
 }
 drawInputs();
 $("add").onclick=()=>{CMP.push("");drawInputs()};
 $("cx").onclick=()=>{CMP=["28.548,77.241","19.066,72.84","12.935,77.624"];drawInputs()};
 $("cg").onclick=async()=>{
  const o=$("co");o.style.display="block";o.innerHTML="Loading…";const f=+$("cm").value,R=[],errs=[];
  for(let i=0;i<CMP.length;i++){try{R.push({i,...await calc(CMP[i],f)})}catch(e){errs.push(`Location ${i+1}: ${e}`)}}
  if(errs.length){o.innerHTML=errs.map(e=>`<div class="err">${e}</div>`).join("");return}
  if(R.length<2){o.innerHTML=`<div class="err">Add at least 2 valid locations to compare.</div>`;return}
  const maxV=Math.max(...R.map(r=>r.v)),minV=Math.min(...R.map(r=>r.v)),bestI=R.reduce((b,r)=>r.v<R[b].v?r.i:b,R[0].i);
  const cols=["var(--acc)","var(--olive)","#3a6ea8","#a83a8e","#a89b3a","#3aa88e","#a85a3a"];
  o.innerHTML=`<h2 style="margin-top:0">Comparing ${R.length} locations</h2>
  <div class="wrap"><table><tr><th>#</th><th>Coordinates</th><th>Rate/sq ft</th><th>Rate/sq yd</th><th>Rate/acre</th><th>Nearest reference</th><th>Zone</th></tr>
  ${R.map(r=>`<tr${r.v===minV?' class="best"':''}><td><span class="tag" style="background:${cols[r.i%cols.length]};color:#fff">${r.i+1}</span></td><td>${r.la.toFixed(4)}, ${r.lo.toFixed(4)}</td><td><b>${fmt(r.v)}</b></td><td>${fmt(r.v*9)}</td><td>${fmtS(r.v*43560)}</td><td>${r.near.a[2]}, ${r.near.a[0]} (${r.near.d.toFixed(0)} km)</td><td>${zone(r.near.d)}</td></tr>`).join("")}
  </table></div>
  <h3>Rate comparison</h3>${R.map(r=>`<div class="bar"><em style="color:${cols[r.i%cols.length]}">#${r.i+1} ${r.near.a[0]}</em><i style="width:${Math.max(3,r.v/maxV*55)}%;background:${cols[r.i%cols.length]}"></i>${fmt(r.v)}</div>`).join("")}
  <p class="note" style="margin-top:10px">Lowest-rate location is highlighted in the table. Highest is about <b>${(maxV/minV).toFixed(1)}×</b> the lowest.</p>
  <div class="two" style="margin-top:10px"><div></div>${multiMapSVG(R.map(r=>({la:r.la,lo:r.lo})))}</div>`;
 };
}
// ---------- PAGE: cities ----------
function pgCity(v){v.innerHTML=`<div class="card"><h2>Reference data (${A.length} points, real &amp; cited)</h2><p class="note">Circle-rate / guidance-value / ready-reckoner / DLC-rate figures for named localities, each with a source link, plus city-wide medians from real scraped plot listings.</p>
<div class="row"><input id="cq" type="text" placeholder="Search city, state or locality" style="flex:1;min-width:180px"><select id="cs"><option value="r">Highest rate first</option><option value="n">A → Z</option><option value="s">By state</option></select></div><div class="wrap" id="ct" style="margin-top:10px"></div></div>`;
 const draw=()=>{const q=$("cq").value.toLowerCase(),s=$("cs").value;let L=A.filter(a=>(a[0]+" "+a[1]+" "+a[2]).toLowerCase().includes(q));
  L.sort(s==="n"?(x,y)=>x[0].localeCompare(y[0]):s==="s"?(x,y)=>x[1].localeCompare(y[1])||y[5]-x[5]:(x,y)=>y[5]-x[5]);
  $("ct").innerHTML=`<table><tr><th>Locality</th><th>City</th><th>State</th><th>₹/sq ft</th><th>Type</th><th>Source</th><th></th></tr>${L.map(a=>`<tr><td>${a[2]}</td><td>${a[0]}</td><td>${a[1]}</td><td>${fmt(a[5])}</td><td>${a[6]}</td><td>${/^https?:/.test(a[7])?`<a href="${a[7]}" target="_blank" rel="noopener">link ↗</a>`:'<span class="note">—</span>'}</td><td><button class="chip" data-c="${a[3]},${a[4]}">Estimate</button></td></tr>`).join("")||"<tr><td>No match</td></tr>"}</table>`;
  $("ct").querySelectorAll("button").forEach(b=>b.onclick=()=>{LASTIN=b.dataset.c;ACC=0;location.hash="#/"})};
 $("cq").oninput=draw;$("cs").onchange=draw;draw()}
// ---------- PAGE: converter ----------
function pgConv(v){v.innerHTML=`<div class="card"><h2>Area converter</h2><div class="row"><input id="av" type="number" value="1" style="width:130px"><select id="au">${unitOpts(7)}</select></div><div class="wrap" id="ar" style="margin-top:8px"></div></div>
<div class="card"><h2>Rate converter</h2><div class="row"><b>₹</b><input id="rv" type="number" value="2500" style="width:130px"><span>per</span><select id="ru">${unitOpts(0)}</select></div><div class="wrap" id="rr" style="margin-top:8px"></div>
<p class="note">Bigha and biswa are not listed because their size differs from state to state. Ask your local registry for the exact conversion.</p></div>`;
 const d=()=>{const s=+$("av").value*U[+$("au").value][1];$("ar").innerHTML=`<table>${U.map(u=>`<tr><td>${u[0]}</td><td><b>${(s/u[1]).toLocaleString("en-IN",{maximumFractionDigits:4})}</b></td></tr>`).join("")}</table>`;
  const r=+$("rv").value/U[+$("ru").value][1];$("rr").innerHTML=`<table>${U.map(u=>`<tr><td>per ${u[0]}</td><td><b>${fmtS(r*u[1])}</b></td></tr>`).join("")}</table>`};
 ["av","au","rv","ru"].forEach(i=>$(i).oninput=d);d()}
// ---------- PAGE: guide ----------
function pgGuide(v){v.innerHTML=`<div class="card"><h2>Getting coordinates from Google Maps</h2><ol><li>Open Google Maps (button below) and search for or zoom to your plot.</li><li><b>Computer:</b> right-click the exact spot. The first item in the menu is the coordinates, e.g. <code>28.8152, 79.0250</code>. Click it to copy.</li><li><b>Phone:</b> long-press the spot to drop a pin, swipe up the panel and tap the coordinates to copy.</li><li>Or copy the full URL from the address bar; it contains <code>@lat,lon</code>.</li><li>Come back to the Estimator and press <b>Paste &amp; estimate</b>.</li></ol><div class="row"><a class="btn" id="g1" target="_blank" rel="noopener">🗺️ Open Google Maps</a></div></div>
<div class="card"><h2>Getting coordinates from Google Earth</h2><ol><li>Open Google Earth (web), search for the place and click the spot. Coordinates appear at the bottom of the screen, or open <b>Drop pin → Info</b>.</li><li>Google Earth shows degrees-minutes-seconds like <code>28°48'54.7"N 79°01'30.0"E</code>. This site reads that format directly.</li><li>In Earth Pro on desktop, the same coordinates sit in the status bar at the bottom of the window.</li></ol><div class="row"><a class="btn" id="g2" target="_blank" rel="noopener">🌍 Open Google Earth</a></div><p class="note">If your browser or network blocks these links, copy the address from the Estimator page (under "Says blocked?") and paste it into a new tab.</p></div>
<div class="card"><h2>Formats this site understands</h2><ul><li>Decimal: <code>28.8152,79.0250</code></li><li>Degrees with hemisphere: <code>28.8152° N, 79.0250° E</code></li><li>Degrees-minutes-seconds: <code>28°48'54.7"N 79°01'30.0"E</code></li><li>Full Google Maps URLs (<code>@lat,lon</code>, <code>!3d..!4d..</code>, <code>?q=lat,lon</code>)</li><li>Full Google Earth web URLs (<code>earth.google.com/web/@lat,lon,...</code>)</li></ul><p class="note">Short links such as maps.app.goo.gl do not contain coordinates. Open them first and copy the full URL.</p>
<h3>Test a paste</h3><input id="gt" type="text" placeholder="Paste anything here"><div id="gr" class="note" style="margin-top:8px"></div></div>`;
 $("g1").href=linksFor("")[0];$("g2").href=linksFor("")[1];
 $("gt").oninput=()=>{const t=$("gt").value;if(!t){$("gr").textContent="";return}try{const[a,b]=parseCoords(t);$("gr").innerHTML=`✅ Read as <b>${a.toFixed(6)}, ${b.toFixed(6)}</b> · ${inIndia(a,b)?"inside India":"<span class='err'>outside India</span>"}`}catch(e){$("gr").innerHTML=`<span class="err">${e}</span>`}}}
// ---------- PAGE: method ----------
function pgMeth(v){const mx=Math.max(...A.map(a=>a[5]));
 v.innerHTML=`<div class="card"><h2>How the estimate works</h2><ol><li><b>Data cleaning:</b> ${RAW.length-A.length} duplicate or invalid rows removed; ${A.length} real, cited reference points kept, all verified to lie inside India.</li>
<li><b>EDA:</b> rates run from ${fmt(Math.min(...A.map(a=>a[5])))} to ${fmt(mx)} per sq ft and are heavily right-skewed, so the model works in log space.</li>
<li><b>Feature engineering:</b> haversine distance to every reference point, a decay length scaled by the reference point's rate, and a rural floor of ${fmt(FLOOR)}/sq ft.</li>
<li><b>Model building:</b> each reference point contributes <code>floor + (R − floor)·e^(−d/L)</code> where <code>L = L₀·(R/3000)^0.35</code>. The nearest k contributions are blended in log space with weights <code>1/(d+5)^p</code> — an inverse-distance-weighted k-nearest-neighbours model.</li>
<li><b>Hyperparameter tuning:</b> grid search over L₀, p and k (${TR.length} combinations), scored by leave-one-out cross-validation.</li>
<li><b>Evaluation:</b> best setting has median error ${(M.md*100).toFixed(0)}%, mean error ${(M.mape*100).toFixed(0)}%, MAE ${fmt(M.mae)}/sq ft.</li></ol></div>
<div class="card"><h2>Top tuning results</h2><div class="wrap"><table><tr><th>#</th><th>L₀ km</th><th>p</th><th>k</th><th>Median err</th><th>Mean err</th></tr>${TR.slice(0,6).map((t,i)=>`<tr><td>${i+1}</td><td>${t.P.L}</td><td>${t.P.p}</td><td>${t.P.k}</td><td>${(t.m.md*100).toFixed(0)}%</td><td>${(t.m.mape*100).toFixed(0)}%</td></tr>`).join("")}</table></div></div>
<div class="card"><h2>Highest reference rates</h2>${[...A].sort((x,y)=>y[5]-x[5]).slice(0,14).map(a=>`<div class="bar"><em>${a[2]}, ${a[0]}</em><i style="width:${Math.max(3,a[5]/mx*55)}%"></i>${fmt(a[5])}</div>`).join("")}</div>
<div class="card"><h2>Data provenance</h2><p>${A.filter(a=>a[6]!=="market_listing_median").length} points are real circle-rate / guidance-value / ready-reckoner / DLC-rate figures cited to named property-advisory articles (see the <a href="#/cities">Cities</a> page for each source link). ${A.filter(a=>a[6]==="market_listing_median").length} points are city-wide medians computed from real scraped plot listings. Exact coordinates for the cited localities were placed from general geographic knowledge of where each named locality sits, not run through a geocoding API.</p></div>
<div class="card"><h2>Limits and how to improve</h2><ul><li>Reference points are far apart within some states, so leave-one-out error is still meaningful. A denser locality-level dataset for every city would cut it further.</li><li>Road frontage, zoning, litigation and plot shape are invisible to this model.</li><li>See <code>pipeline.py</code> in the project files for the full runnable 6-stage pipeline on this exact dataset.</li></ul></div>`}
// ---------- PAGE: about ----------
function pgAbout(v){v.innerHTML=`<div class="card"><h2>About this project</h2><p>Bhoomi estimates the rate of a plot of land anywhere in mainland India from its map coordinates, and compares the rate of multiple plots at once. It is a college project demonstrating a full data pipeline: cleaning, exploratory analysis, feature engineering, model building, hyperparameter tuning and evaluation, built on real, cited circle-rate/guidance-value data.</p></div>
<div class="card"><h2>FAQ</h2>
<details><summary>Circle rate vs market rate?</summary><p>The circle rate (also called guideline, DLC, guidance or ready-reckoner rate, depending on the state) is the minimum value a state government notifies for registering property and charging stamp duty. Market rate is what land actually sells for, usually higher. This site's main figure is a market-style estimate; the circle option applies an assumed 55% factor.</p></details>
<details><summary>How accurate is it?</summary><p>It gives the right order of magnitude and the right trend by locality, built on ${A.length} real reference points across 7 states. Individual plots can still differ by several times from the nearest reference point due to frontage, zoning and plot-specific factors.</p></details>
<details><summary>Why was my location rejected?</summary><p>Only points inside mainland India are supported, checked against a coarse boundary outline. The Andaman &amp; Nicobar and Lakshadweep islands are not included, and points within a few km of the border may be misjudged.</p></details>
<details><summary>Where does the data come from?</summary><p>${A.filter(a=>a[6]!=="market_listing_median").length} points are real circle-rate/guidance-value/ready-reckoner/DLC-rate figures, each cited to a named source (see the Cities page). The remaining points are medians of real scraped plot listings. None of it is fabricated.</p></details>
<details><summary>Does this site store my location?</summary><p>Your coordinates are sent to this site's own server to calculate the estimate, and each search (coordinates, mode and result) is saved in its database. Your device location is only read when you press the location button.</p></details>
<details><summary>Can I compare more than two locations?</summary><p>Yes — the Compare page lets you add any number of locations and shows their estimated rates, nearest reference points and zone type side by side, with the cheapest highlighted.</p></details></div>
<div class="card"><h2>Disclaimer</h2><p class="note">This tool is for learning and rough comparison only. Do not use it for buying, selling, registering, taxing or financing land. Check your state's official circle-rate portal and get a local valuation.</p></div>`}
// ---------- router ----------
const PAGES={"":["Estimator",pgEst],compare:["Compare",pgCmp],cities:["Cities",pgCity],converter:["Converter",pgConv],guide:["Maps guide",pgGuide],method:["Method",pgMeth],about:["About",pgAbout]};
function route(){const h=location.hash.replace(/^#\/?/,""),k=PAGES[h]?h:"";
 $("nav").innerHTML=Object.entries(PAGES).map(([p,x])=>`<a href="#/${p}" class="${p===k?"on":""}">${x[0]}</a>`).join("");
 PAGES[k][1]($("view"));window.scrollTo(0,0)}
(async()=>{try{const[p,m]=await Promise.all([api("/api/points"),api("/api/method")]);A=p.points.map(toRow);RAW.length=p.raw_count;TR=m.grid;M=TR[0].m}
 catch(e){$("view").innerHTML=`<div class="card"><div class="err">${e}</div><p>Start the backend with <code>node server.js</code> inside the <code>backend</code> folder, then open <a href="http://localhost:3000">http://localhost:3000</a>.</p></div>`;return}
 addEventListener("hashchange",route);route()})();
