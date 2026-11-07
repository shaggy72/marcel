/* Knoop-animaties voor Marcels Kampbouwer.
   Een touw is een lijst punten (in een tekenvlak van 400 x 240, y naar beneden).
   - u: hoe ver het touw al getekend is (0 = niets, aantal punten - 1 = helemaal). Het touweind beweegt zo mee.
   - m: 0 = losse vorm (punten), 1 = strakke vorm (strak). Zo kan je de knoop zien aantrekken.
   - laag(i, x, y): bepaalt wat boven ligt (hoger getal = bovenop). Zo gaat een touw over of onder een ander touw. */

const TOUW = {
  rood:  { kleur:'#d64534', rand:'#7a1f16', glans:'#f7a397' },
  blauw: { kleur:'#2f7fc4', rand:'#163d63', glans:'#9ccdf5' },
  sisal: { kleur:'#d9a94a', rand:'#7a5a1a', glans:'#f6dc96' },
};

/* ---------- Platte knoop ----------
   Twee U's die in elkaar haken. Bovenaan ligt rood bovenop, onderaan blauw.
   Beide einden liggen bovenaan: zo is het een platte knoop (anders een dievenknoop). */
(() => {
  const s = 1.3, T = ([x, y]) => [200 + x * s, 120 - y * s];
  const roodLos   = [[-215,-30],[-120,-30],[-50,-30],[0,-30],[30,-30],[52,-23],[61,0],[52,23],[30,30],[0,30],[-50,30],[-100,30],[-140,30]];
  const roodStrak = [[-215,-18],[-95,-12],[-34,-6],[0,-14],[24,-22],[40,-16],[46,0],[40,16],[24,22],[0,14],[-34,6],[-95,12],[-140,18]];
  const blauwLos   = [[215,-12],[120,-12],[60,-12],[0,-12],[-20,-12],[-33,-9],[-39,0],[-33,9],[-20,12],[0,12],[60,12],[100,12],[140,12]];
  const blauwStrak = roodStrak.map(([x, y]) => [-x, y]);
  window.KNOOP_ANIM = window.KNOOP_ANIM || {};
  KNOOP_ANIM.plat = {
    tip: 'Liggen de twee einden niet allebei bovenaan? Dan heb je een dievenknoop, en die schuift los. Met "rechts over links, links over rechts" maak je precies dezelfde platte knoop.',
    touwen: [
      { ...TOUW.rood,  punten: roodLos.map(T),  strak: roodStrak.map(T),  laag: (i, x, y) => y < 120 ? 3 : 0 },
      { ...TOUW.blauw, punten: blauwLos.map(T), strak: blauwStrak.map(T), laag: (i, x, y) => y < 120 ? 1 : 2 },
    ],
    stappen: [
      { t: 'Maak met het <b style="color:#d64534">rode</b> touw een U. Het eind komt bovenaan terug naar links.', doel: [{ u:12 }, { u:1 }] },
      { t: 'Het <b style="color:#2f7fc4">blauwe</b> eind komt van rechts en gaat <b>óver</b> de rode bocht, de U in.', doel: [null, { u:4 }] },
      { t: 'Maak een bocht en ga terug <b>onder</b> de rode bocht door. Nu ligt het blauwe eind ook bovenaan.', doel: [null, { u:12 }] },
      { t: 'Trek aan alle vier de einden. Twee U\'s die in elkaar haken: dat is de platte knoop!', doel: [{ m:1 }, { m:1 }],
        pijlen: [[120,66,55,66],[120,174,55,174],[280,66,345,66],[280,174,345,174]] },
    ],
  };
})();

/* ---------- Kruisbindsel ----------
   Twee stokken: de staande stok ligt achter, de dwarsstok ervoor.
   Wikkels: links en boven vóór de stokken, rechts en onder erachter. */
(() => {
  const P = [[150,226]], L = [];
  const zet = (p, laag) => { P.push(p); L.push(laag); };
  // mastworp onderaan (vereenvoudigd: twee keer rond de staande stok)
  zet([186,214],5); zet([214,204],5); zet([186,198],0.5); zet([214,188],5); zet([224,170],5); zet([224,144],5);
  const uMastworp = P.length - 1;
  for (let k = 0; k < 3; k++) {   // wikkels liggen strak naast elkaar
    const Lx = 176 - 10*k, R = 224 + 10*k, Tp = 96 - 10*k;
    const volgende = k < 2 ? [R + 10, 154 + 10*k] : [272,176];
    zet([R,Tp],2); zet([Lx,Tp],5); zet([Lx,144 + 10*k],5); zet(volgende,0.5);
  }
  const uWikkels = P.length - 1;
  // mastworp om de dwarsstok (vereenvoudigd)
  zet([288,146],5); zet([296,98],5); zet([304,146],2); zet([312,98],5); zet([330,86],5);

  const stok = (x, y, w, h, staand) => ctx => {
    const g = staand ? ctx.createLinearGradient(x, 0, x + w, 0) : ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, '#c8955a'); g.addColorStop(.45, '#a8743c'); g.addColorStop(1, '#6f4720');
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,.25)'; ctx.shadowBlur = 6; ctx.shadowOffsetY = 3;
    ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(x, y, w, h, 10); ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = 'rgba(70,40,15,.35)'; ctx.lineWidth = 1;
    for (let k = 1; k < 4; k++) {   // houtnerf
      ctx.beginPath();
      if (staand) { ctx.moveTo(x + w*k/4, y + 6); ctx.lineTo(x + w*k/4 + (k%2 ? 1.5 : -1.5), y + h - 6); }
      else        { ctx.moveTo(x + 6, y + h*k/4); ctx.lineTo(x + w - 6, y + h*k/4 + (k%2 ? 1.5 : -1.5)); }
      ctx.stroke();
    }
    ctx.strokeStyle = '#5a3a18'; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(x, y, w, h, 10); ctx.stroke();
    ctx.restore();
  };

  KNOOP_ANIM.kruis = {
    tip: 'De mastworp is hier vereenvoudigd getekend; hij heeft zijn eigen les. In het echt trek je de wikkels daarna nog strakker met twee wikkels tussen de stokken (frapping). Vraag je leiding om dat te tonen.',
    decor: [ { laag:1, teken: stok(188,10,24,220,true) }, { laag:3, teken: stok(16,109,368,22,false) } ],
    touwen: [ { ...TOUW.sisal, w:9, lineair:true, beginZichtbaar:true, punten:P, laag: i => L[i] ?? 5 } ],
    stappen: [
      { t: 'Leg twee stokken haaks op elkaar.', doel: [{ u:0 }] },
      { t: 'Begin met een mastworp om de staande stok, net onder de kruising.', doel: [{ u:uMastworp }] },
      { t: 'Wikkel het touw 3 keer rond de kruising. Links en boven gaat het touw vóór de stokken, rechts en onder erachter.', doel: [{ u:uWikkels }] },
      { t: 'Eindig met een mastworp om de dwarsstok. Klaar!', doel: [{ u:P.length - 1 }] },
    ],
  };
})();

/* ---------- Motor ---------- */
function _curve(touw, m) {
  const P = touw.punten.map((p, k) => touw.strak ? [p[0] + (touw.strak[k][0] - p[0]) * m, p[1] + (touw.strak[k][1] - p[1]) * m] : p);
  const uit = [];
  for (let i = 0; i < P.length - 1; i++) {
    const p0 = P[Math.max(0, i-1)], p1 = P[i], p2 = P[i+1], p3 = P[Math.min(P.length-1, i+2)];
    const n = Math.max(2, Math.ceil(Math.hypot(p2[0]-p1[0], p2[1]-p1[1]) / 2.5));
    for (let s = 0; s < n; s++) {
      const t = s / n; let x, y;
      if (touw.lineair) { x = p1[0] + (p2[0]-p1[0]) * t; y = p1[1] + (p2[1]-p1[1]) * t; }
      else {
        const t2 = t*t, t3 = t2*t;
        const f = (a, b, c, d) => 0.5 * (2*b + (-a + c)*t + (2*a - 5*b + 4*c - d)*t2 + (-a + 3*b - 3*c + d)*t3);
        x = f(p0[0], p1[0], p2[0], p3[0]); y = f(p0[1], p1[1], p2[1], p3[1]);
      }
      uit.push({ x, y, u: i + t, i });
    }
  }
  const z = P[P.length-1]; uit.push({ x: z[0], y: z[1], u: P.length - 1, i: P.length - 2 });
  return uit;
}

function _knip(s, U) {
  const uit = [];
  for (let k = 0; k < s.length; k++) {
    if (s[k].u <= U) { uit.push(s[k]); continue; }
    if (k > 0) { const a = s[k-1], b = s[k], t = (U - a.u) / (b.u - a.u); uit.push({ x: a.x + (b.x-a.x)*t, y: a.y + (b.y-a.y)*t, u: U, i: a.i }); }
    break;
  }
  return uit;
}

function _puntTerug(pts, afstand) {   // punt op 'afstand' vanaf het einde van de lijn
  let d = 0;
  for (let k = pts.length - 1; k > 0; k--) {
    const a = pts[k], b = pts[k-1], l = Math.hypot(a.x-b.x, a.y-b.y);
    if (d + l >= afstand) { const t = (afstand - d) / l; return { x: a.x + (b.x-a.x)*t, y: a.y + (b.y-a.y)*t }; }
    d += l;
  }
  return pts[0];
}

function _tekenStuk(ctx, touw, pts, eind, begin) {
  const w = touw.w || 11;
  const lijn = (dx = 0, dy = 0) => { ctx.beginPath(); pts.forEach((p, k) => k ? ctx.lineTo(p.x+dx, p.y+dy) : ctx.moveTo(p.x+dx, p.y+dy)); };
  const kopje = (kleur, breed) => {   // ronde touweinden
    ctx.lineCap = 'round'; ctx.strokeStyle = kleur; ctx.lineWidth = breed;
    for (const [p, q] of [eind && [pts[pts.length-1], pts[pts.length-2]], begin && [pts[0], pts[1]]].filter(Boolean)) {
      ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(p.x, p.y); ctx.stroke();
    }
    ctx.lineCap = 'butt';
  };
  ctx.lineJoin = 'round'; ctx.lineCap = 'butt';
  ctx.strokeStyle = 'rgba(0,0,0,.16)'; ctx.lineWidth = w + 3; lijn(1.5, 3); ctx.stroke();   // schaduw
  ctx.strokeStyle = touw.rand; ctx.lineWidth = w + 3; lijn(); ctx.stroke(); kopje(touw.rand, w + 3);
  ctx.strokeStyle = touw.kleur; ctx.lineWidth = w; lijn(); ctx.stroke(); kopje(touw.kleur, w);
  ctx.setLineDash([2.2, 3.8]); ctx.strokeStyle = 'rgba(0,0,0,.22)'; ctx.lineWidth = w - 2; lijn(); ctx.stroke(); ctx.setLineDash([]);   // draadjes
  ctx.strokeStyle = touw.glans; ctx.globalAlpha = .75; ctx.lineWidth = w * .28; lijn(-w*.14, -w*.2); ctx.stroke(); ctx.globalAlpha = 1;   // glans
  const tape = (a, b) => { ctx.strokeStyle = '#f4ecd6'; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); };
  if (eind && pts.length > 2) tape(_puntTerug(pts, 4), _puntTerug(pts, 9));            // tape om het touweind
  if (begin && pts.length > 2) { const r = [...pts].reverse(); tape(_puntTerug(r, 4), _puntTerug(r, 9)); }
}

function _pijl(ctx, [x1, y1, x2, y2], alfa) {
  const h = Math.atan2(y2 - y1, x2 - x1);
  ctx.save(); ctx.globalAlpha = alfa; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const [kleur, breed] of [['#fff', 8], ['#2b2b2b', 4]]) {
    ctx.strokeStyle = kleur; ctx.lineWidth = breed; ctx.beginPath();
    ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
    ctx.moveTo(x2 - 12*Math.cos(h - .5), y2 - 12*Math.sin(h - .5)); ctx.lineTo(x2, y2); ctx.lineTo(x2 - 12*Math.cos(h + .5), y2 - 12*Math.sin(h + .5));
    ctx.stroke();
  }
  ctx.restore();
}

function tekenKnoop(canvas, K, toestand, opties = {}) {
  const dpr = window.devicePixelRatio || 1, breed = canvas.clientWidth || 400;
  if (canvas.width !== Math.round(breed * dpr)) { canvas.width = Math.round(breed * dpr); canvas.height = Math.round(breed * .6 * dpr); }
  const ctx = canvas.getContext('2d'), sc = canvas.width / 400;
  ctx.setTransform(sc, 0, 0, sc, 0, 0);
  const g = ctx.createRadialGradient(200, 110, 40, 200, 120, 260);
  g.addColorStop(0, '#fffdf6'); g.addColorStop(1, '#efe6d2');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 400, 240);

  const dingen = (K.decor || []).map(d => ({ laag: d.laag, teken: () => d.teken(ctx) }));
  const toppen = [];
  K.touwen.forEach((touw, ri) => {
    const { u, m } = toestand[ri];
    if (u <= 0) return;
    const pts = _knip(_curve(touw, m), u);
    if (pts.length < 2) return;
    let stuk = [pts[0]], laag = null;
    const stukken = [];
    for (let k = 1; k < pts.length; k++) {
      const a = pts[k-1], b = pts[k], l = touw.laag(a.i, (a.x + b.x) / 2, (a.y + b.y) / 2);
      if (laag === null) laag = l;
      if (l !== laag) { stukken.push({ pts: stuk, laag }); stuk = [a]; laag = l; }
      stuk.push(b);
    }
    stukken.push({ pts: stuk, laag });
    stukken.forEach((s, k) => dingen.push({ laag: s.laag, teken: () => _tekenStuk(ctx, touw, s.pts, k === stukken.length - 1, k === 0 && touw.beginZichtbaar) }));
    toppen.push({ p: pts[pts.length - 1], beweegt: opties.beweegt && opties.beweegt[ri] });
  });
  dingen.sort((a, b) => a.laag - b.laag).forEach(d => d.teken());

  for (const t of toppen) if (t.beweegt) {   // gloed rond het bewegende touweind
    const r = ctx.createRadialGradient(t.p.x, t.p.y, 2, t.p.x, t.p.y, 18);
    r.addColorStop(0, 'rgba(255,205,40,.55)'); r.addColorStop(1, 'rgba(255,205,40,0)');
    ctx.fillStyle = r; ctx.beginPath(); ctx.arc(t.p.x, t.p.y, 18, 0, 7); ctx.fill();
  }
  if (opties.pijlen) opties.pijlen.forEach(p => _pijl(ctx, p, opties.pijlAlfa ?? 1));
}

function knoopToestanden(K) {   // toestand na elke stap (index -1 = begin)
  let nu = K.touwen.map(() => ({ u: 0, m: 0 }));
  const lijst = [nu];
  K.stappen.forEach(s => { nu = nu.map((t, i) => ({ ...t, ...(s.doel[i] || {}) })); lijst.push(nu); });
  return lijst;   // lijst[n + 1] = na stap n
}
