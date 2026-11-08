// Maakt stad-acacia.js: het stadscircuit rond het Acaciapark (Brugse Poort, Gent) uit OpenStreetMap.
// Gebruik: node tools/maak-stad.mjs [osm-cache.json]
// Zonder cachebestand worden de gegevens bij de Overpass-API gehaald (en in dat bestand bewaard als het pad gegeven is).
// Kaartgegevens © OpenStreetMap-bijdragers (ODbL).
import fs from 'node:fs';

const BBOX = [51.0575, 3.6935, 51.0645, 3.7050];
const ROUTE = ['Bevrijdingslaan', 'Acaciastraat', 'Kastanjestraat', 'Hulstboomstraat'];   // met de klok mee
const S = 14;                // spel-eenheden per meter: een auto in het spel (48) is dan ongeveer 3,5 m
const BREED = 120;           // breedte van de rijweg in de stad (race.html leest dit uit het bestand)
const PARKEER = 28;          // strook met geparkeerde auto's naast de rijweg
const GEVEL = BREED / 2 + PARKEER + 32; // gevels staan zo ver van het midden van de weg (parkeerstrook + voetpad)
const GRENS = BREED / 2 + 150; // verder kan je in het spel niet van de weg (zoals race.html)
const BOCHT = 95;            // straal van de afgeronde hoeken (midden van de weg)
const VERDIEP = 3 * S;       // hoogte van een verdieping
const STAP = 13;             // afstand tussen de punten van de weg
const START = 700;           // startlijn zoveel eenheden na de hoek Hulstboomstraat/Bevrijdingslaan
const RAND = 75 * S;
const FOTO_SCHUIF = [9, 12];  // luchtfoto t.o.v. OpenStreetMap, in spel-eenheden (gemeten, zie README)         // gebouwen tot zo ver rond het circuit

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
const routeStukken = [];
for (let i = 0; i < ROUTE.length; i++) {
  const stuk = kortste(hoeken[i], hoeken[(i + 1) % ROUTE.length], ROUTE[i]).map(k => pos.get(k));
  lijn.push(...stuk.slice(0, -1));
  routeStukken.push({ naam: ROUTE[i], pts: stuk });
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

/* ---------- 3. straten (voor de tekening, de namen en de richting van de daken) ---------- */
const hash = n => { let h = n % 2147483647; h = (h * 16807) % 2147483647; h = (h * 16807) % 2147483647; return h / 2147483647; };
const binnenVeelhoek = (x, y, v) => {
  let in_ = false;
  for (let i = 0, j = v.length - 1; i < v.length; j = i++)
    if ((v[i][1] > y) !== (v[j][1] > y) && x < (v[j][0] - v[i][0]) * (y - v[i][1]) / (v[j][1] - v[i][1]) + v[i][0]) in_ = !in_;
  return in_;
};
const ALLE = ['primary', 'secondary', 'tertiary', 'residential', 'living_street', 'unclassified', 'pedestrian', 'service'];
const straatLijnen = [];   // { naam, b, v }
for (const e of el) {
  const t = e.tags || {};
  if (!e.geometry || !ALLE.includes(t.highway)) continue;
  const v = e.geometry.map(M).map(T);
  if (!v.some(binnenVak)) continue;
  const b = t.highway === 'primary' ? 8 : t.highway === 'tertiary' ? 6.5 : t.highway === 'service' ? 3.5 : 5;
  straatLijnen.push({ naam: t.name || '', b: Math.round(b * S), v });
}
const straten = straatLijnen.map(s => [s.b, ...s.v.flat().map(Math.round)]);
function dichtsteStraat(x, y) {   // richting van het dichtste straatstuk
  let best = { d: Infinity, h: 0 };
  for (const s of straatLijnen) for (let i = 1; i < s.v.length; i++) {
    const a = s.v[i - 1], b = s.v[i], dx = b[0] - a[0], dy = b[1] - a[1];
    const f = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / (dx * dx + dy * dy || 1)));
    const d = Math.hypot(x - a[0] - dx * f, y - a[1] - dy * f);
    if (d < best.d) best = { d, h: Math.atan2(dy, dx), naam: s.naam };
  }
  return best;
}

/* ---------- 4. gebouwen: gevels die te dicht bij de weg staan schuiven naar achter; rijhuizen krijgen een zadeldak ---------- */
// echte hoogtes uit de 3D GRB van Digitaal Vlaanderen (open data): HN_P99 = top van het gebouw boven de grond (m).
// Eén GetFeatureInfo per gebouw (de 3D GRB heeft geen WFS); bewaard in <cache>.grb.json zodat het maar één keer moet.
const grbBestand = cache ? cache.replace(/\.json$/, '') + '.grb.json' : null;
const grb = grbBestand && fs.existsSync(grbBestand) ? JSON.parse(fs.readFileSync(grbBestand, 'utf8')) : {};
const teVragen = el.filter(e => e.tags?.building && e.geometry && !(e.id in grb) && e.geometry.some(g => binnenVak(T(M(g)))));
for (let k = 0; k < teVragen.length; k += 8) {
  await Promise.all(teVragen.slice(k, k + 8).map(async e => {
    const la = e.geometry.reduce((s, g) => s + g.lat, 0) / e.geometry.length, lo = e.geometry.reduce((s, g) => s + g.lon, 0) / e.geometry.length, d = 0.00002;
    const url = `https://geo.api.vlaanderen.be/3DGRB/wms?service=WMS&version=1.3.0&request=GetFeatureInfo&layers=GRBGEBL1D2&query_layers=GRBGEBL1D2&crs=EPSG:4326` +
      `&bbox=${la - d},${lo - d},${la + d},${lo + d}&width=11&height=11&i=5&j=5&info_format=application/geo%2Bjson&feature_count=1`;
    try {
      const j = await (await fetch(url)).json(), pr = j.features?.[0]?.properties;
      grb[e.id] = pr ? +String(pr.HN_P99).replace(',', '.') : null;
    } catch { /* volgende keer opnieuw */ }
  }));
  if (grbBestand && k % 80 === 0) fs.writeFileSync(grbBestand, JSON.stringify(grb));
}
if (grbBestand) fs.writeFileSync(grbBestand, JSON.stringify(grb));
let metGrb = 0;

const gebouwen = [];
let weg = 0;
for (const e of el) {
  const t = e.tags || {};
  if (!t.building || !e.geometry || t.building === 'roof') continue;
  let v = e.geometry.map(M).map(T);
  if (key(e.geometry[0]) === key(e.geometry[e.geometry.length - 1])) v.pop();
  if (!v.some(binnenVak)) continue;
  const orig = v;   // de echte vorm, vóór het verschuiven (voor de nok: die moet op de luchtfoto passen)
  v = v.map(([x, y]) => {
    const { i, d } = dichtste(x, y);
    if (d >= GEVEL) return [x, y];
    const p = pad[i], ux = d > 1 ? (x - p[0]) / d : 0, uy = d > 1 ? (y - p[1]) / d : 0;
    return [p[0] + ux * GEVEL, p[1] + uy * GEVEL];
  });
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
  opp = Math.abs(opp) / 2 / (S * S);   // m²
  if (opp < 6) continue;
  const r = hash(e.id), laag = ['shed', 'garages', 'garage'].includes(t.building);
  const verdiepingen = +t['building:levels'] || (laag ? 0 : t.building === 'apartments' ? 4 : r < 0.62 ? 2 : r < 0.95 ? 3 : 4);
  const geschat = laag ? 2.6 : t.building === 'church' ? 20 : verdiepingen * 3 + 0.5;
  const echt = grb[e.id] > 1.8 && grb[e.id] < 40 ? grb[e.id] : null;   // top van het gebouw volgens de 3D GRB
  if (echt) metGrb++;
  const kleur = laag ? 9 : (() => { const q = hash(e.id + 7); return q < 0.62 ? [0, 2, 4, 7][Math.floor(q / 0.62 * 4)] : [1, 3, 5, 6][Math.floor((q - 0.62) / 0.38 * 4)]; })();
  // zadeldak: nok evenwijdig met de straat (zoals bij rijhuizen), enkel voor gewone huizen
  let dak = [0, 0, 0, 0, 0];
  const huis = !laag && ['house', 'yes', 'terrace', 'semidetached_house', 'detached'].includes(t.building) && opp < 220;
  if (huis) {
    const cx = orig.reduce((s, p) => s + p[0], 0) / orig.length, cy = orig.reduce((s, p) => s + p[1], 0) / orig.length;
    const h = dichtsteStraat(cx, cy).h, ux = Math.cos(h), uy = Math.sin(h), nx = -uy, ny = ux;
    const ds = orig.map(p => p[0] * nx + p[1] * ny), ts = v.map(p => p[0] * ux + p[1] * uy);
    const c = (Math.min(...ds) + Math.max(...ds)) / 2, half = (Math.max(...ds) - Math.min(...ds)) / 2;
    const t0 = Math.min(...ts), t1 = Math.max(...ts);
    let nok = Math.min(half * 0.75, 4 * S);
    if (echt) nok = Math.min(nok, Math.max(0, echt * S - 2.5 * S));   // goot minstens 2,5 m hoog
    if (half > 1.5 * S && nok > 0.8 * S) dak = [Math.round(nok), Math.round(ux * t0 + nx * c), Math.round(uy * t0 + ny * c), Math.round(ux * t1 + nx * c), Math.round(uy * t1 + ny * c)];
  }
  // hoogte = goot: bij een zadeldak ligt de top (GRB) een nok hoger
  const goot = echt ? echt * S - dak[0] : geschat * S;
  gebouwen.push([Math.round(goot), kleur, ...dak, ...v.flat().map(Math.round)]);
}
const veelhoeken = gebouwen.map(g => { const v = []; for (let i = 7; i < g.length; i += 2) v.push([g[i], g[i + 1]]); return v; });
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

/* ---------- 5. parken en bomen ---------- */
const parken = [], parkNamen = [];
for (const e of el) {
  const t = e.tags || {};
  if (!e.geometry || !(t.leisure === 'park' || t.leisure === 'playground' || t.landuse === 'grass' || t.leisure === 'garden')) continue;
  const v = e.geometry.map(M).map(T);
  if (!v.some(binnenVak)) continue;
  parken.push(v.flat().map(Math.round));
  if (t.name && t.leisure === 'park') {
    const cx = v.reduce((s, p) => s + p[0], 0) / v.length, cy = v.reduce((s, p) => s + p[1], 0) / v.length;
    parkNamen.push([Math.round(cx), Math.round(cy), t.name]);
  }
}
const bomen = [];
const vrij = (x, y) => binnenVak([x, y]) && dichtste(x, y).d > GEVEL + 15 && muurAfstand(x, y) > 2 * S;
for (const e of el) {
  if (e.type !== 'node' || e.tags?.natural !== 'tree') continue;
  const [x, y] = T(M(e));
  if (vrij(x, y)) bomen.push(Math.round(x), Math.round(y));
}
// in de parken staan meer bomen dan op de kaart: vul ze aan (om de 9 m, een beetje verschoven), maar laat het midden open als speelweide
for (const p of parken) {
  const v = []; for (let i = 0; i < p.length; i += 2) v.push([p[i], p[i + 1]]);
  const xs = v.map(q => q[0]), ys = v.map(q => q[1]), cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2;
  const straal = Math.min(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) * 0.22;
  let n = 0;
  for (let x = Math.min(...xs); x < Math.max(...xs); x += 9 * S) for (let y = Math.min(...ys); y < Math.max(...ys); y += 9 * S) {
    const jx = x + (hash(++n * 31) - 0.5) * 5 * S, jy = y + (hash(n * 57) - 0.5) * 5 * S;
    if (binnenVeelhoek(jx, jy, v) && Math.hypot(jx - cx, jy - cy) > straal && vrij(jx, jy)) bomen.push(Math.round(jx), Math.round(jy));
  }
}

/* ---------- 6. hekken waar je de stad in zou kunnen rijden (zijstraten, open plekken) ---------- */
const normaal = i => { const q = pad[(i + 1) % pad.length], r = pad[(i - 1 + pad.length) % pad.length], h = Math.atan2(q[1] - r[1], q[0] - r[0]); return { h, nx: -Math.sin(h), ny: Math.cos(h) }; };
const hekken = [];
for (const kant of [-1, 1]) {
  let huidig = null;
  for (let n = 0; n <= pad.length; n++) {
    const i = n % pad.length, p = pad[i], { nx, ny } = normaal(i);
    const x = p[0] + nx * kant * (GRENS + 12), y = p[1] + ny * kant * (GRENS + 12);
    const open = dichtste(x, y).d > GRENS && muurAfstand(x, y) > 24;
    if (open) { if (!huidig) { huidig = []; hekken.push(huidig); } huidig.push(Math.round(x), Math.round(y)); }
    else huidig = null;
  }
}

/* ---------- 7. geparkeerde auto's langs de stoep (waar huizen staan, niet aan kruispunten en niet aan de start) ---------- */
const geparkeerd = [];
const bocht = i => { const a = normaal((i - 10 + pad.length) % pad.length).h, b = normaal((i + 10) % pad.length).h; return Math.abs(Math.atan2(Math.sin(b - a), Math.cos(b - a))); };
for (const kant of [-1, 1]) {
  let vrijTot = 0, n = 0;
  for (let i = 0; i < pad.length; i++) {
    if (i < vrijTot) continue;
    if (i < 10 || i > pad.length - 4 || bocht(i) > 0.12) continue;
    const p = pad[i], { h, nx, ny } = normaal(i);
    const gx = p[0] + nx * kant * (GEVEL + 14), gy = p[1] + ny * kant * (GEVEL + 14);
    // enkel waar er een huis staat (geen zijstraat) en waar de stoep vrij is tot 3 m voor en achter
    const ok = [-3, 0, 3].every(k => { const j = (i + k * 2 + pad.length) % pad.length, q = pad[j], m = normaal(j); return muurAfstand(q[0] + m.nx * kant * (GEVEL + 14), q[1] + m.ny * kant * (GEVEL + 14)) < 20; });
    if (!ok) continue;
    if (hash(++n * 97 + (kant > 0 ? 5 : 0)) < 0.78) {
      const x = p[0] + nx * kant * (BREED / 2 + PARKEER / 2 + 2), y = p[1] + ny * kant * (BREED / 2 + PARKEER / 2 + 2);
      geparkeerd.push([Math.round(x), Math.round(y), Math.round(h * 100), Math.floor(hash(n * 13) * 8)]);
    }
    vrijTot = i + 5 + Math.floor(hash(n * 7) * 2);   // 5-6 punten verder = 4,6-5,5 m
  }
}

/* ---------- 8. straatnamen: bordjes en namen op de kaart ---------- */
const straatVanPunt = pad.map(([x, y]) => {   // welke straat van de route bij elk punt hoort
  let best = Infinity, naam = '';
  for (const s of routeStukken) for (let i = 1; i < s.pts.length; i++) {
    const a = T(s.pts[i - 1]), b = T(s.pts[i]), dx = b[0] - a[0], dy = b[1] - a[1];
    const f = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / (dx * dx + dy * dy || 1)));
    const d = Math.hypot(x - a[0] - dx * f, y - a[1] - dy * f);
    if (d < best) { best = d; naam = s.naam; }
  }
  return naam;
});
const straatStukken = [];   // [beginpunt, naam]
straatVanPunt.forEach((n, i) => { if (!straatStukken.length || straatStukken[straatStukken.length - 1][1] !== n) straatStukken.push([i, n]); });
const namen = [], bordjes = [];
// route: naam in het midden van elk stuk, en een bordje rechts kort na de hoek
// (de start ligt midden in een straat: dan hoort het eerste stuk bij het laatste)
const stukken = straatStukken.slice();
if (stukken.length > 1 && stukken[0][1] === stukken[stukken.length - 1][1]) stukken.shift();
for (let k = 0; k < stukken.length; k++) {
  const [van, naam] = stukken[k], tot = k + 1 < stukken.length ? stukken[k + 1][0] : pad.length + stukken[0][0];
  if (tot - van < 30) continue;
  const mid = Math.floor((van + tot) / 2) % pad.length, p = pad[mid], { h } = normaal(mid);
  namen.push([Math.round(p[0]), Math.round(p[1]), Math.round(h * 100), naam, 1]);
  const b = (van + 22) % pad.length, q = pad[b], m = normaal(b);
  bordjes.push([Math.round(q[0] + m.nx * (GEVEL - 12)), Math.round(q[1] + m.ny * (GEVEL - 12)), Math.round(m.h * 100), naam]);
}
// zijstraten: waar een andere straat de route raakt
const gezien = new Set();
for (const s of straatLijnen) {
  if (!s.naam || ROUTE.includes(s.naam) || s.b < 4 * S) continue;
  for (let i = 0; i < s.v.length; i++) {
    const [x, y] = s.v[i], dd = dichtste(x, y);
    if (dd.d > 45) continue;
    const buur = s.v[i + 1] || s.v[i - 1]; if (!buur) continue;
    const sh = Math.atan2(buur[1] - y, buur[0] - x), ux = Math.cos(sh), uy = Math.sin(sh);
    const sleutel = s.naam + Math.round(x / 300) + ',' + Math.round(y / 300);
    if (gezien.has(sleutel)) continue; gezien.add(sleutel);
    // naam op de kaart een eind in de zijstraat
    const lx = x + ux * (GEVEL + 160), ly = y + uy * (GEVEL + 160);
    namen.push([Math.round(lx), Math.round(ly), Math.round(sh * 100), s.naam, 0]);
    // bordje op de hoek van de zijstraat, naar de rijrichting van de route gedraaid
    const m = normaal(dd.i), zij = Math.sign(ux * m.nx + uy * m.ny) || 1;
    const px = -uy, py = ux;   // dwars op de zijstraat
    const bx = x + ux * (GEVEL - 8) + px * (s.b / 2 + 30), by = y + uy * (GEVEL - 8) + py * (s.b / 2 + 30);
    if (muurAfstand(bx, by) > 6 && dichtste(bx, by).d > BREED / 2 + PARKEER) bordjes.push([Math.round(bx), Math.round(by), Math.round(m.h * 100), s.naam]);
    void zij;
  }
}

/* ---------- 9. luchtfoto van Digitaal Vlaanderen voor het hele vak ----------
   Orthofotomozaïek, middenschalig, winteropnamen, kleur, 2025 (15 cm), Vlaamse Open Data Licentie.
   WMS in EPSG:4326 (lengte/breedte lineair), net als onze projectie M: de foto ligt dus recht op het vak. */
const terug = (X, Y) => { const xm = (X - OX) / S, ym = (Y - OY) / S; return [lat0 - ym / ky, xm / kx + lon0]; };
const [latN, lonW] = terug(vak.x0, vak.y0), [latZ, lonO] = terug(vak.x1, vak.y1);
const fotoBestanden = [['stad-acacia-foto.jpg', 2048], ['stad-acacia-foto-klein.jpg', 1280]];
for (const [naam, grootste] of fotoBestanden) {
  const doel = new URL('../' + naam, import.meta.url);
  if (fs.existsSync(doel) && !process.env.NIEUWE_FOTO) continue;
  // de WMS geeft hoogstens 2048 px per kant: de langste kant wordt 'grootste', de verhouding blijft juist
  const verh = (vak.y1 - vak.y0) / (vak.x1 - vak.x0);
  const b = verh > 1 ? Math.round(grootste / verh) : grootste, h = verh > 1 ? grootste : Math.round(grootste * verh);
  const url = `https://geo.api.vlaanderen.be/OMW/wms?service=WMS&version=1.3.0&request=GetMap&layers=OMWRGB25VL&styles=&crs=EPSG:4326` +
    `&bbox=${latZ},${lonW},${latN},${lonO}&width=${b}&height=${h}&format=image/jpeg`;
  const r = await fetch(url);
  if (!r.ok || !(r.headers.get('content-type') || '').includes('image')) throw new Error('luchtfoto mislukt: ' + r.status + ' ' + (await r.text()).slice(0, 300));
  fs.writeFileSync(doel, Buffer.from(await r.arrayBuffer()));
  console.log('luchtfoto', naam, b + 'x' + h);
}

const uit = {
  bron: 'Kaart © OpenStreetMap-bijdragers (ODbL), Acaciapark, Brugse Poort, Gent',
  breed: BREED, gevel: GEVEL,
  proj: { lat0, lon0, kx, ky, S, OX: Math.round(OX * 100) / 100, OY: Math.round(OY * 100) / 100 },
  foto: { groot: 'stad-acacia-foto.jpg', klein: 'stad-acacia-foto-klein.jpg', bron: 'Orthofotomozaïek Vlaanderen 2025, Digitaal Vlaanderen',
          // waar de foto ligt; FOTO_SCHUIF komt uit het afstemmen van de OSM-huislijnen op de randen in de foto (< 1 m)
          x0: vak.x0 + FOTO_SCHUIF[0], y0: vak.y0 + FOTO_SCHUIF[1], x1: vak.x1 + FOTO_SCHUIF[0], y1: vak.y1 + FOTO_SCHUIF[1] },
  lijn: pad.map(p => p.map(Math.round)),
  vak: Object.fromEntries(Object.entries(vak).map(([k, v]) => [k, Math.round(v)])),
  straatStukken, namen, bordjes, parkNamen,
  gebouwen, straten, parken, bomen, geparkeerd, hekken: hekken.filter(h => h.length >= 4),
};
fs.writeFileSync(new URL('../stad-acacia.js', import.meta.url),
  '// Gemaakt met tools/maak-stad.mjs. ' + uit.bron + '\n// gebouw = [hoogte, kleur, nokhoogte, nok x1, y1, x2, y2, ...hoekpunten]; nokhoogte 0 = plat dak\nwindow.STAD_ACACIA = ' + JSON.stringify(uit) + ';\n');
console.log(`weg ${Math.round(totaal)} eenheden (${Math.round(totaal / S)} m), ${N} punten; gebouwen ${gebouwen.length} (weggelaten ${weg}, zadeldak ${gebouwen.filter(g => g[2]).length}); straten ${straten.length}; bomen ${bomen.length / 2}; geparkeerd ${geparkeerd.length}; bordjes ${bordjes.length}; namen ${namen.map(n => n[3]).join(', ')}; hekken ${uit.hekken.length}; echte GRB-hoogte ${metGrb}/${gebouwen.length}`);
