// Maakt stad-acacia.js: het stadscircuit rond het Acaciapark (Brugse Poort, Gent) uit OpenStreetMap.
// Gebruik: node tools/maak-stad.mjs [osm-cache.json]
// Zonder cachebestand worden de gegevens bij de Overpass-API gehaald (en in dat bestand bewaard als het pad gegeven is).
// Kaartgegevens © OpenStreetMap-bijdragers (ODbL).
import fs from 'node:fs';

const BBOX = [51.0575, 3.6935, 51.0645, 3.7050];
const ROUTE = ['Bevrijdingslaan', 'Acaciastraat', 'Kastanjestraat', 'Hulstboomstraat'];   // met de klok mee
const S = 18;                // spel-eenheden per meter
const BREED = 160;           // breedte van de weg (zoals race.html)
const GEVEL = BREED / 2 + 45; // gevels staan minstens zo ver van het midden van de weg (de rest is voetpad)
const GRENS = BREED / 2 + 150; // verder kan je in het spel niet van de weg (zoals race.html)
const BOCHT = 110;           // straal van de afgeronde hoeken (midden van de weg)
const STAP = 13;             // afstand tussen de punten van de weg
const START = 700;           // startlijn zoveel eenheden na de hoek Hulstboomstraat/Bevrijdingslaan
const RAND = 75 * S;         // gebouwen tot zo ver rond het circuit

const cache = process.argv[2];
let osm;
if (cache && fs.existsSync(cache)) osm = JSON.parse(fs.readFileSync(cache, 'utf8'));
else {
  const q = `[out:json][timeout:90][bbox:${BBOX}];(way[highway];way[building];way[leisure];way[landuse];node[natural=tree];);out geom tags;`;
  const r = await fetch('https://overpass-api.de/api/interpreter', { method: 'POST', body: 'data=' + encodeURIComponent(q), headers: { 'User-Agent': 'marcel-race-game/1.0' } });
  osm = await r.json();
  if (cache) fs.writeFileSync(cache, JSON.stringify(osm));
}
const el = osm.elements;

// projectie naar meters rond het Acaciapark
const lat0 = 51.0610, lon0 = 3.6992, kx = Math.cos(lat0 * Math.PI / 180) * 111320, ky = 110540;
const M = g => [(g.lon - lon0) * kx, -(g.lat - lat0) * ky];
const key = g => g.lat.toFixed(7) + ',' + g.lon.toFixed(7);

/* ---------- 1. de route over echte straten ---------- */
const RIJ = ['primary', 'secondary', 'tertiary', 'residential', 'living_street', 'unclassified'];
const graaf = new Map(), pos = new Map(), straatVan = new Map();
for (const e of el) {
  const t = e.tags || {};
  if (!e.geometry || !RIJ.includes(t.highway) || !ROUTE.includes(t.name)) continue;
  e.geometry.forEach((g, i) => {
    const k = key(g); pos.set(k, M(g));
    if (!straatVan.has(k)) straatVan.set(k, new Set()); straatVan.get(k).add(t.name);
    if (!graaf.has(k)) graaf.set(k, []);
    if (i) { const a = key(e.geometry[i - 1]); graaf.get(a).push([k, t.name]); graaf.get(k).push([a, t.name]); }
  });
}
const hoekpunt = (s1, s2) => [...straatVan].filter(([, s]) => s.has(s1) && s.has(s2)).map(([k]) => k)[0];
const hoeken = ROUTE.map((s, i) => hoekpunt(ROUTE[(i - 1 + ROUTE.length) % ROUTE.length], s));
if (hoeken.some(h => !h)) throw new Error('hoekpunt niet gevonden');
const afst = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
function kortste(a, b, straat) {
  const dist = new Map([[a, 0]]), vorig = new Map(), open = new Set([a]);
  while (open.size) {
    let u, ud = Infinity; for (const k of open) if (dist.get(k) < ud) { ud = dist.get(k); u = k; }
    open.delete(u); if (u === b) break;
    for (const [v, s] of graaf.get(u)) if (s === straat) {
      const nd = ud + afst(pos.get(u), pos.get(v));
      if (nd < (dist.get(v) ?? Infinity)) { dist.set(v, nd); vorig.set(v, u); open.add(v); }
    }
  }
  const r = [b]; while (r[0] !== a) { r.unshift(vorig.get(r[0])); if (!r[0]) throw new Error('geen weg door ' + straat); }
  return r;
}
let lijn = [];
for (let i = 0; i < ROUTE.length; i++) {
  const stuk = kortste(hoeken[i], hoeken[(i + 1) % ROUTE.length], ROUTE[i]).map(k => pos.get(k));
  lijn.push(...stuk.slice(0, -1));
}
lijn = lijn.map(([x, y]) => [x * S, y * S]);
// bijna rechte tussenpunten weglaten (OSM-straten hebben veel kleine knikjes)
const vereenvoudig = pts => {
  let veranderd = true;
  while (veranderd) {
    veranderd = false;
    for (let i = 0; i < pts.length && pts.length > 4; i++) {
      const a = pts[(i - 1 + pts.length) % pts.length], b = pts[i], c = pts[(i + 1) % pts.length];
      const h = Math.abs(Math.atan2(Math.sin(Math.atan2(c[1] - b[1], c[0] - b[0]) - Math.atan2(b[1] - a[1], b[0] - a[0])), Math.cos(Math.atan2(c[1] - b[1], c[0] - b[0]) - Math.atan2(b[1] - a[1], b[0] - a[0]))));
      if (h < 0.06 || afst(a, b) < 60) { pts.splice(i, 1); veranderd = true; break; }
    }
  }
  return pts;
};
lijn = vereenvoudig(lijn);

// hoeken afronden met een boog en dan op gelijke afstanden zetten
const fijn = [];
for (let i = 0; i < lijn.length; i++) {
  const a = lijn[(i - 1 + lijn.length) % lijn.length], b = lijn[i], c = lijn[(i + 1) % lijn.length];
  const h1 = Math.atan2(b[1] - a[1], b[0] - a[0]), h2 = Math.atan2(c[1] - b[1], c[0] - b[0]);
  const draai = Math.atan2(Math.sin(h2 - h1), Math.cos(h2 - h1));
  const t = Math.min(BOCHT * Math.tan(Math.abs(draai) / 2), afst(a, b) * 0.45, afst(b, c) * 0.45);
  const r = t / Math.tan(Math.abs(draai) / 2);
  const p1 = [b[0] - Math.cos(h1) * t, b[1] - Math.sin(h1) * t];
  const stappen = Math.max(2, Math.ceil(Math.abs(draai) * r / 8));
  for (let s = 0; s <= stappen; s++) {   // boog als gladde kromme tussen p1 en p2
    const h = h1 + draai * s / stappen, z = Math.sign(draai);
    const cx = p1[0] - Math.sin(h1) * r * z, cy = p1[1] + Math.cos(h1) * r * z;
    fijn.push([cx + Math.sin(h) * r * z, cy - Math.cos(h) * r * z]);
  }
}
const lengte = [0];
for (let i = 1; i <= fijn.length; i++) lengte.push(lengte[i - 1] + afst(fijn[i - 1], fijn[i % fijn.length]));
const totaal = lengte[fijn.length], N = Math.round(totaal / STAP);
// startpunt: START eenheden na de eerste hoek (die ligt aan het begin van de lijn, na de boog)
let pad = [];
for (let n = 0; n < N; n++) {
  let d = (START + n * totaal / N) % totaal, j = 0;
  while (lengte[j + 1] < d) j++;
  const f = (d - lengte[j]) / (lengte[j + 1] - lengte[j]), a = fijn[j], b = fijn[(j + 1) % fijn.length];
  pad.push([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]);
}

/* ---------- 2. verschuiven naar positieve coördinaten ---------- */
const minX = Math.min(...pad.map(p => p[0])), minY = Math.min(...pad.map(p => p[1]));
const OX = RAND + 300 - minX, OY = RAND + 300 - minY;
const T = ([x, y]) => [x * S + OX, y * S + OY];
pad = pad.map(([x, y]) => [x + OX, y + OY]);
const xs = pad.map(p => p[0]), ys = pad.map(p => p[1]);
const vak = { x0: Math.min(...xs) - RAND, y0: Math.min(...ys) - RAND, x1: Math.max(...xs) + RAND, y1: Math.max(...ys) + RAND };
const binnenVak = ([x, y]) => x > vak.x0 && x < vak.x1 && y > vak.y0 && y < vak.y1;
const dichtste = (x, y) => { let b = 0, bd = Infinity; pad.forEach((p, i) => { const d = (p[0] - x) ** 2 + (p[1] - y) ** 2; if (d < bd) { bd = d; b = i; } }); return { i: b, d: Math.sqrt(bd) }; };

/* ---------- 3. gebouwen: gevels die te dicht bij de weg staan schuiven naar achter ---------- */
const hash = n => { let h = n % 2147483647; h = (h * 16807) % 2147483647; h = (h * 16807) % 2147483647; return h / 2147483647; };
const binnenVeelhoek = (x, y, v) => {
  let in_ = false;
  for (let i = 0, j = v.length - 1; i < v.length; j = i++)
    if ((v[i][1] > y) !== (v[j][1] > y) && x < (v[j][0] - v[i][0]) * (y - v[i][1]) / (v[j][1] - v[i][1]) + v[i][0]) in_ = !in_;
  return in_;
};
const gebouwen = [];
let weg = 0;
for (const e of el) {
  const t = e.tags || {};
  if (!t.building || !e.geometry || t.building === 'roof') continue;
  let v = e.geometry.map(M).map(T);
  if (key(e.geometry[0]) === key(e.geometry[e.geometry.length - 1])) v.pop();
  if (!v.some(binnenVak)) continue;
  v = v.map(([x, y]) => {
    const { i, d } = dichtste(x, y);
    if (d >= GEVEL) return [x, y];
    const p = pad[i], ux = d > 1 ? (x - p[0]) / d : 0, uy = d > 1 ? (y - p[1]) / d : 0;
    return [p[0] + ux * GEVEL, p[1] + uy * GEVEL];
  });
  // weg met punten die bijna samenvallen
  v = v.filter((p, i) => afst(p, v[(i + 1) % v.length]) > 2);
  if (v.length < 3) { weg++; continue; }
  // controle: geen enkele muur mag nog in de weg of op het voetpad staan
  let slecht = false;
  for (let i = 0; i < v.length && !slecht; i++) {
    const a = v[i], b = v[(i + 1) % v.length], n = Math.ceil(afst(a, b) / 8);
    for (let s = 0; s <= n; s++) { const q = [a[0] + (b[0] - a[0]) * s / n, a[1] + (b[1] - a[1]) * s / n]; if (dichtste(q[0], q[1]).d < GEVEL - 10) { slecht = true; break; } }
  }
  if (!slecht) for (const p of pad) if (binnenVeelhoek(p[0], p[1], v)) { slecht = true; break; }
  if (slecht) { weg++; continue; }
  let opp = 0; v.forEach((p, i) => { const q = v[(i + 1) % v.length]; opp += p[0] * q[1] - q[0] * p[1]; });
  if (Math.abs(opp) / 2 < 6 * S * S) continue;   // kleiner dan 6 m²
  const r = hash(e.id), laag = ['shed', 'garages', 'garage'].includes(t.building);
  const verdiepingen = +t['building:levels'] || (laag ? 0 : t.building === 'apartments' ? 4 : r < 0.6 ? 2 : r < 0.93 ? 3 : 4);
  const meter = laag ? 2.6 : t.building === 'church' ? 22 : verdiepingen * 3.1 + 1.2;
  const kleur = laag ? 9 : Math.floor(hash(e.id + 7) * 8);   // 0-7 gevelkleuren, 9 = schuurtje
  gebouwen.push([Math.round(meter * S), kleur, ...v.flat().map(Math.round)]);
}

/* ---------- 4. straten, parken en bomen ---------- */
const ALLE = ['primary', 'secondary', 'tertiary', 'residential', 'living_street', 'unclassified', 'pedestrian', 'service'];
const straten = [];
for (const e of el) {
  const t = e.tags || {};
  if (!e.geometry || !ALLE.includes(t.highway)) continue;
  const v = e.geometry.map(M).map(T);
  if (!v.some(binnenVak)) continue;
  const b = t.highway === 'primary' ? 9 : t.highway === 'tertiary' ? 7.5 : t.highway === 'service' ? 3.5 : 6;
  straten.push([Math.round(b * S), ...v.flat().map(Math.round)]);
}
const parken = [];
for (const e of el) {
  const t = e.tags || {};
  if (!e.geometry || !(t.leisure === 'park' || t.leisure === 'playground' || t.landuse === 'grass' || t.leisure === 'garden')) continue;
  const v = e.geometry.map(M).map(T);
  if (!v.some(binnenVak)) continue;
  parken.push(v.flat().map(Math.round));
}
const bomen = [];
for (const e of el) {
  if (e.type !== 'node' || e.tags?.natural !== 'tree') continue;
  const [x, y] = T(M(e));
  if (!binnenVak([x, y]) || dichtste(x, y).d < GEVEL + 15) continue;
  if (gebouwen.some(g => { const v = []; for (let i = 2; i < g.length; i += 2) v.push([g[i], g[i + 1]]); return binnenVeelhoek(x, y, v); })) continue;
  bomen.push(Math.round(x), Math.round(y));
}

/* ---------- 5. hekken waar je de stad in zou kunnen rijden (zijstraten, open plekken) ---------- */
const veelhoeken = gebouwen.map(g => { const v = []; for (let i = 2; i < g.length; i += 2) v.push([g[i], g[i + 1]]); return v; });
const muurAfstand = (x, y) => {
  let best = Infinity;
  for (const v of veelhoeken) {
    if (Math.abs(v[0][0] - x) > 900 || Math.abs(v[0][1] - y) > 900) continue;
    if (binnenVeelhoek(x, y, v)) return 0;
    for (let i = 0; i < v.length; i++) {
      const a = v[i], b = v[(i + 1) % v.length], dx = b[0] - a[0], dy = b[1] - a[1];
      const f = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / (dx * dx + dy * dy || 1)));
      best = Math.min(best, Math.hypot(x - a[0] - dx * f, y - a[1] - dy * f));
    }
  }
  return best;
};
const hekken = [];
for (const kant of [-1, 1]) {
  let huidig = null;
  for (let n = 0; n <= pad.length; n++) {
    const i = n % pad.length, p = pad[i], q = pad[(i + 1) % pad.length], r = pad[(i - 1 + pad.length) % pad.length];
    const h = Math.atan2(q[1] - r[1], q[0] - r[0]), nx = -Math.sin(h), ny = Math.cos(h);
    const x = p[0] + nx * kant * (GRENS + 12), y = p[1] + ny * kant * (GRENS + 12);
    const open = dichtste(x, y).d > GRENS && muurAfstand(x, y) > 24;
    if (open) { if (!huidig) { huidig = []; hekken.push(huidig); } huidig.push(Math.round(x), Math.round(y)); }
    else huidig = null;
  }
}

const uit = {
  bron: 'Kaart © OpenStreetMap-bijdragers (ODbL), Acaciapark, Brugse Poort, Gent',
  lijn: pad.map(p => p.map(Math.round)),
  vak: Object.fromEntries(Object.entries(vak).map(([k, v]) => [k, Math.round(v)])),
  gevel: GEVEL,
  gebouwen, straten, parken, bomen: bomen, hekken: hekken.filter(h => h.length >= 4),
};
fs.writeFileSync(new URL('../stad-acacia.js', import.meta.url),
  '// Gemaakt met tools/maak-stad.mjs. ' + uit.bron + '\nwindow.STAD_ACACIA = ' + JSON.stringify(uit) + ';\n');
console.log(`weg ${Math.round(totaal)} eenheden (${Math.round(totaal / S)} m), ${N} punten; gebouwen ${gebouwen.length} (weggelaten ${weg}); straten ${straten.length}; parken ${parken.length}; bomen ${bomen.length / 2}; hekken ${uit.hekken.length}`);
