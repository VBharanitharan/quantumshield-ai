// Quantum response optimizer: QAOA (depth 2) over 6 qubits, run as a statevector simulation.
// Each qubit is one response action. The cost function trades residual attack risk against business disruption.
const ACTIONS = [
  { id: 'block',   cost: 1, eff: { ddos: .8, scan: .9, exfil: .7, brute: .9,  ransom: .5 } },
  { id: 'rate',    cost: 1, eff: { ddos: .7, scan: .4, exfil: .3, brute: .5,  ransom: .2 } },
  { id: 'isolate', cost: 5, eff: { ddos: .2, scan: .3, exfil: .9, brute: .5,  ransom: .95 } },
  { id: 'mfa',     cost: 3, eff: { ddos: 0,  scan: .1, exfil: .5, brute: .95, ransom: .6 } },
  { id: 'snap',    cost: 2, eff: { ddos: 0,  scan: 0,  exfil: .1, brute: .1,  ransom: .8 } },
  { id: 'honey',   cost: 2, eff: { ddos: .3, scan: .7, exfil: .4, brute: .4,  ransom: .4 } },
];
const NQ = 6, NS = 1 << NQ;
const TYPES = ['ddos', 'scan', 'exfil', 'brute', 'ransom'];
const rnd = (a, b) => a + Math.random() * (b - a);

function objective(z, ctx) {
  let resid = 1, cost = 0;
  for (let i = 0; i < NQ; i++) if (z >> i & 1) { resid *= 1 - ACTIONS[i].eff[ctx.type]; cost += ACTIONS[i].cost; }
  let c = ctx.risk * resid + 2.2 * cost * (ctx.crit / 3);
  if (cost > ctx.budget) c += 14 * (cost - ctx.budget);
  if ((z >> 2 & 1) && (z >> 5 & 1)) c += 15;                    // isolating a host and redirecting it conflict
  for (let i = 0; i < NQ; i++) if ((z >> i & 1) && (ctx.off || []).includes(ACTIONS[i].id)) c += 1000; // connector offline
  return c;
}
function qaoa(ctx, warm) {
  const C = new Float64Array(NS); let mn = 1e9, mx = -1e9, bz = 0;
  for (let z = 0; z < NS; z++) { C[z] = objective(z, ctx); if (C[z] < mn) { mn = C[z]; bz = z; } if (C[z] > mx) mx = C[z]; }
  const Cn = C.map((c) => (c - mn) / (mx - mn || 1));
  const run = (g, b) => {
    const re = new Float64Array(NS).fill(1 / Math.sqrt(NS)), im = new Float64Array(NS);
    for (let l = 0; l < g.length; l++) {
      for (let z = 0; z < NS; z++) { const p = -g[l] * Cn[z], c = Math.cos(p), s = Math.sin(p), r = re[z]; re[z] = r * c - im[z] * s; im[z] = r * s + im[z] * c; }
      const c = Math.cos(b[l]), s = Math.sin(b[l]);
      for (let q = 0; q < NQ; q++) {
        const m = 1 << q;
        for (let z = 0; z < NS; z++) {
          if (z & m) continue;
          const w = z | m, ar = re[z], ai = im[z], br = re[w], bi = im[w];
          re[z] = c * ar + s * bi; im[z] = c * ai - s * br; re[w] = c * br + s * ai; im[w] = c * bi - s * ar;
        }
      }
    }
    let e = 0; const pr = new Float64Array(NS);
    for (let z = 0; z < NS; z++) { pr[z] = re[z] * re[z] + im[z] * im[z]; e += pr[z] * C[z]; }
    return { e, pr };
  };
  let g = [rnd(0, 4), rnd(0, 4)], b = [rnd(0, 1.5), rnd(0, 1.5)], best = run(g, b).e, evals = 1; const hist = [best];
  if (warm && Array.isArray(warm.g) && Array.isArray(warm.b)) { g = warm.g.slice(0, 2); b = warm.b.slice(0, 2); best = run(g, b).e; }
  const iters = warm ? 220 : 520;
  for (let i = 0; i < iters; i++) {
    const sc = 2.2 * (1 - i / iters) + .12, g2 = g.map((x) => x + rnd(-sc, sc)), b2 = b.map((x) => x + rnd(-sc / 2, sc / 2)), e = run(g2, b2).e; evals++;
    if (e < best) { best = e; g = g2; b = b2; hist.push(e); }
  }
  const { pr } = run(g, b);
  const shots = 1024, counts = {}, cum = []; let acc = 0; pr.forEach((p) => { acc += p; cum.push(acc); });
  for (let i = 0; i < shots; i++) { const r = Math.random() * acc; let k = cum.findIndex((x) => x >= r); if (k < 0) k = NS - 1; counts[k] = (counts[k] || 0) + 1; }
  const top = Object.entries(counts).map(([z, n]) => ({ z: +z, n, c: C[+z] })).sort((a, b) => b.n - a.n);
  const pick = top.reduce((a, b) => (a.c < b.c ? a : b));       // score every measured bitstring classically, keep the best
  let gz = 0, gc = C[0], imp = true;                             // greedy baseline
  while (imp) { imp = false; let bb = gz, bc = gc; for (let i = 0; i < NQ; i++) { if (gz >> i & 1) continue; const zz = gz | 1 << i; if (C[zz] < bc) { bc = C[zz]; bb = zz; } } if (bb !== gz) { gz = bb; gc = bc; imp = true; } }
  return { g, b, evals, hist, top: top.slice(0, 8), choice: pick.z, cost: pick.c, opt: bz, optCost: mn, greedy: gz, greedyCost: gc, none: C[0], worst: mx, shots, prOpt: pr[bz], ratio: (mx - pick.c) / (mx - mn || 1) };
}
module.exports = { qaoa, ACTIONS, TYPES };
