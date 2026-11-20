/* Изометрические SVG-фигуры: верх светлее на ~15 %, фронт — базовый, бок темнее на ~12 % */
(function () {
  const P = { coral: '#F2A194', mustard: '#E8BE5C', mint: '#A8D5C2', blue: '#A7C4E5', lav: '#CDB8E6', peach: '#F8CBA6' };
  const PAL = [P.coral, P.mustard, P.mint, P.blue, P.lav, P.peach];
  function mix(hex, t, to) {
    const n = parseInt(hex.slice(1), 16);
    const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => Math.round(v + (to - v) * t));
    return '#' + c.map(v => v.toString(16).padStart(2, '0')).join('');
  }
  const L = c => mix(c, 0.15, 255), D = c => mix(c, 0.12, 0), DD = c => mix(c, 0.3, 0);
  const C30 = Math.cos(Math.PI / 6), S30 = 0.5;
  let uid = 0;
  const N = 40;

  function hull(pts) {
    const p = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const lo = [], up = [];
    for (const q of p) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
    for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
    up.pop(); lo.pop(); return lo.concat(up);
  }

  class Scene {
    constructor() { this.id = 'g' + (uid++); this.parts = []; this.defs = []; this.b = [1e9, 1e9, -1e9, -1e9]; this.g = 0; }
    pr(x, y, z) {
      const X = (x - y) * C30, Y = (x + y) * S30 - z;
      const b = this.b; if (X < b[0]) b[0] = X; if (Y < b[1]) b[1] = Y; if (X > b[2]) b[2] = X; if (Y > b[3]) b[3] = Y;
      return [X, Y];
    }
    s(p) { return p.map(q => q[0].toFixed(2) + ',' + q[1].toFixed(2)).join(' '); }
    polyS(sp, fill) { this.parts.push(`<polygon points="${this.s(sp)}" fill="${fill}" stroke="${fill}" stroke-width="0.8" stroke-linejoin="round"/>`); }
    poly(pts, fill) { this.polyS(pts.map(p => this.pr(...p)), fill); }
    grad(c, x1, x2, vertical) {
      const id = this.id + 'l' + (this.g++);
      const a = vertical ? `x1="0" y1="${x1}" x2="0" y2="${x2}"` : `x1="${x1}" y1="0" x2="${x2}" y2="0"`;
      this.defs.push(`<linearGradient id="${id}" gradientUnits="userSpaceOnUse" ${a}><stop offset="0" stop-color="${L(c)}"/><stop offset=".45" stop-color="${c}"/><stop offset="1" stop-color="${D(c)}"/></linearGradient>`);
      return `url(#${id})`;
    }
    circle(f) { const r = []; for (let i = 0; i < N; i++) r.push(f(i / N * Math.PI * 2)); return r; }
    box(x, y, z, w, d, h, c) {
      this.poly([[x, y, z + h], [x + w, y, z + h], [x + w, y + d, z + h], [x, y + d, z + h]], L(c));
      this.poly([[x, y + d, z], [x + w, y + d, z], [x + w, y + d, z + h], [x, y + d, z + h]], c);
      this.poly([[x + w, y, z], [x + w, y + d, z], [x + w, y + d, z + h], [x + w, y, z + h]], D(c));
    }
    cube(x, y, z, s, c) { this.box(x, y, z, s, s, s, c); }
    cyl(x, y, z, r, h, c) {
      const bot = this.circle(t => this.pr(x + r * Math.cos(t), y + r * Math.sin(t), z));
      const top = this.circle(t => this.pr(x + r * Math.cos(t), y + r * Math.sin(t), z + h));
      const hl = hull(bot.concat(top)); const xs = hl.map(p => p[0]);
      this.polyS(hl, this.grad(c, Math.min(...xs), Math.max(...xs)));
      this.polyS(top, L(c));
    }
    ring(x, y, z, r, h, c) { this.cyl(x, y, z, r, h, c); }
    cylY(x, y0, y1, z, r, c, hub) { // ось вдоль Y (колёса, иллюминаторы)
      const a = this.circle(t => this.pr(x + r * Math.cos(t), y0, z + r * Math.sin(t)));
      const b = this.circle(t => this.pr(x + r * Math.cos(t), y1, z + r * Math.sin(t)));
      this.polyS(hull(a.concat(b)), D(c));
      this.polyS(b, c);
      if (hub) this.polyS(this.circle(t => this.pr(x + r * 0.35 * Math.cos(t), y1 + 0.01, z + r * 0.35 * Math.sin(t))), D(c));
    }
    cylX(x0, x1, y, z, r, c) { // ось вдоль X (котёл)
      const a = this.circle(t => this.pr(x0, y + r * Math.cos(t), z + r * Math.sin(t)));
      const b = this.circle(t => this.pr(x1, y + r * Math.cos(t), z + r * Math.sin(t)));
      const hl = hull(a.concat(b)); const ys = hl.map(p => p[1]);
      this.polyS(hl, this.grad(c, Math.min(...ys), Math.max(...ys), true));
      this.polyS(b, D(c));
    }
    cone(x, y, z, r, h, c) {
      const base = this.circle(t => this.pr(x + r * Math.cos(t), y + r * Math.sin(t), z));
      const ap = this.pr(x, y, z + h);
      const hl = hull(base.concat([ap])); const xs = hl.map(p => p[0]);
      this.polyS(hl, this.grad(c, Math.min(...xs), Math.max(...xs)));
      if (h < 0) this.polyS(base, L(c));
    }
    sphere(x, y, z, r, c) {
      const [X, Y] = this.pr(x, y, z); const b = this.b;
      b[0] = Math.min(b[0], X - r); b[1] = Math.min(b[1], Y - r); b[2] = Math.max(b[2], X + r); b[3] = Math.max(b[3], Y + r);
      const id = this.id + 'r' + (this.g++);
      this.defs.push(`<radialGradient id="${id}" cx=".36" cy=".32" r=".75"><stop offset="0" stop-color="${mix(c, .35, 255)}"/><stop offset=".55" stop-color="${c}"/><stop offset="1" stop-color="${D(c)}"/></radialGradient>`);
      this.parts.push(`<circle cx="${X.toFixed(2)}" cy="${Y.toFixed(2)}" r="${r}" fill="url(#${id})"/>`);
    }
    pyramid(x, y, z, w, h, c) {
      const A = [x, y + w, z], B = [x + w, y + w, z], C = [x + w, y, z], T = [x + w / 2, y + w / 2, z + h];
      this.poly([A, B, T], c); this.poly([B, C, T], D(c));
    }
    roof(x, y, z, w, d, h, c) { // призма, конёк вдоль X
      this.poly([[x, y + d, z], [x + w, y + d, z], [x + w, y + d / 2, z + h], [x, y + d / 2, z + h]], L(c));
      this.poly([[x + w, y, z], [x + w, y + d, z], [x + w, y + d / 2, z + h]], D(c));
    }
    archBeam(x, y, z, w, d, h, R, c) { // балка с полукруглым вырезом снизу
      const cx = x + w / 2;
      const semi = (yy) => { const r = []; for (let i = 0; i <= 24; i++) { const t = Math.PI * i / 24; r.push(this.pr(cx + R * Math.cos(t), yy, z + R * Math.sin(t))); } return r; };
      this.poly([[x, y, z + h], [x + w, y, z + h], [x + w, y + d, z + h], [x, y + d, z + h]], L(c));
      this.poly([[x + w, y, z], [x + w, y + d, z], [x + w, y + d, z + h], [x + w, y, z + h]], D(c));
      this.polyS(semi(y + d), DD(c));
      this.polyS(semi(y), '#FFFFFF');
      const o = [[x, y + d, z], [x + w, y + d, z], [x + w, y + d, z + h], [x, y + d, z + h]].map(p => this.pr(...p));
      const inn = semi(y + d);
      this.parts.push(`<path fill-rule="evenodd" fill="${c}" stroke="${c}" stroke-width=".8" stroke-linejoin="round" d="M${this.s(o).replace(/ /g, ' L')} Z M${this.s(inn).replace(/ /g, ' L')} Z"/>`);
    }
    brick(x, y, z, c) {
      this.box(x, y, z, 16, 12, 9, c);
      this.cyl(x + 4.5, y + 6, z + 9, 2.6, 2.6, c); this.cyl(x + 11.5, y + 6, z + 9, 2.6, 2.6, c);
    }
    render(shadow = true) {
      const b = this.b, pad = 4;
      const w = b[2] - b[0], cx = (b[0] + b[2]) / 2;
      const rx = w * 0.42, ry = Math.max(3, rx * 0.22), cy = b[3] - ry * 0.4;
      const vb = [b[0] - pad, b[1] - pad, w + pad * 2, (Math.max(b[3], cy + ry) - b[1]) + pad * 2];
      const sh = shadow ? `<ellipse cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" rx="${rx.toFixed(1)}" ry="${ry.toFixed(1)}" fill="#4A403A" opacity=".13" filter="url(#${this.id}b)"/>` : '';
      const fdef = `<filter id="${this.id}b" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${(ry * 0.45).toFixed(1)}"/></filter>`;
      return `<svg viewBox="${vb.map(v => v.toFixed(1)).join(' ')}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false"><defs>${fdef}${this.defs.join('')}</defs>${sh}<g>${this.parts.join('')}</g></svg>`;
    }
  }

  const F = {};
  // 1 месяц — кубик
  F[1] = s => s.cube(0, 0, 0, 30, P.mustard);
  // 2 — пирамида
  F[2] = s => s.pyramid(0, 0, 0, 32, 34, P.mint);
  // 3 — кубик + шар
  F[3] = s => { s.cube(0, 0, 0, 28, P.blue); s.sphere(14, 14, 28 + 11, 11, P.coral); };
  // 4 — башенка: цилиндр + конус
  F[4] = s => { s.cyl(0, 0, 0, 12, 26, P.lav); s.cone(0, 0, 26, 14, 22, P.mustard); };
  // 5 — пирамидка: стержень + 3 кольца
  F[5] = s => {
    s.cyl(0, 0, 0, 3, 4, P.peach);
    s.ring(0, 0, 2, 18, 8, P.coral); s.cyl(0, 0, 10, 3, 1.5, P.peach);
    s.ring(0, 0, 11.5, 14, 8, P.mint); s.cyl(0, 0, 19.5, 3, 1.5, P.peach);
    s.ring(0, 0, 21, 10, 8, P.blue); s.cyl(0, 0, 29, 3, 8, P.peach); s.sphere(0, 0, 39, 4, P.peach);
  };
  // 6 — домик
  F[6] = s => { s.box(0, 0, 0, 30, 28, 22, P.mustard); s.roof(-2, -2, 22, 34, 32, 16, P.coral); s.box(10, 28, 0, 9, 1.2, 14, P.mint); };
  // 7 — башня из 4 кубиков со смещением
  F[7] = s => { s.cube(0, 0, 0, 22, P.coral); s.cube(4, -3, 22, 20, P.mustard); s.cube(1, 1, 42, 18, P.mint); s.cube(5, -1, 60, 16, P.blue); };
  // 8 — мостик
  F[8] = s => { s.box(0, 0, 0, 12, 12, 20, P.blue); s.box(34, 0, 0, 12, 12, 20, P.mint); s.archBeam(0, 0, 20, 46, 12, 15, 11, P.lav); s.sphere(23, 6, 35 + 9, 9, P.coral); };
  // 9 — паровозик
  F[9] = s => {
    s.box(0, 0, 0, 16, 18, 26, P.coral); s.box(-1, -1, 26, 18, 20, 3, P.coral);
    s.cylX(16, 44, 9, 10, 9, P.mustard); s.cyl(37, 9, 16, 4, 14, P.blue);
    s.cylY(8, 16, 20, 6, 6.5, P.mint, true); s.cylY(34, 16, 20, 6, 6.5, P.lav, true);
  };
  // 10 — замок
  F[10] = s => {
    s.box(6, 6, 0, 40, 8, 22, P.mustard);
    [10, 22, 34].forEach(x => s.box(x, 6, 22, 6, 8, 5, P.mustard));
    s.cyl(6, 10, 0, 8, 34, P.lav); s.cone(6, 10, 34, 10, 16, P.coral);
    s.cyl(46, 10, 0, 8, 34, P.blue); s.cone(46, 10, 34, 10, 16, P.mint);
  };
  // 11 — пирамида из кирпичиков
  F[11] = s => {
    s.brick(0, 0, 0, P.coral); s.brick(16, 0, 0, P.mustard); s.brick(32, 0, 0, P.mint);
    s.brick(8, 0, 9, P.blue); s.brick(24, 0, 9, P.lav); s.brick(16, 0, 18, P.peach);
  };
  // 12 — цифра «1» из кубиков + шары и конусы
  F[12] = s => {
    const k = 12;
    s.cone(-26, 10, 0, 6, 16, P.lav);
    s.cube(0, 0, 0, k, P.coral); s.cube(12, 0, 0, k, P.mustard); s.cube(24, 0, 0, k, P.mint);
    s.cube(12, 0, 12, k, P.blue); s.cube(12, 0, 24, k, P.lav);
    s.cube(0, 0, 36, k, P.peach); s.cube(12, 0, 36, k, P.coral); s.cube(12, 0, 48, k, P.mustard);
    s.sphere(52, 10, 7, 7, P.mint); s.cone(44, 30, 0, 5, 13, P.coral); s.sphere(-10, 26, 5, 5, P.blue);
  };
  // 13 — кораблик
  F[13] = s => {
    s.box(0, 0, 0, 46, 16, 10, P.blue);
    s.poly([[29, 8, 15], [29, 8, 34], [21, 8, 15]], P.lav);
    s.box(6, 3, 10, 13, 10, 10, P.peach);
    s.cyl(30, 8, 10, 1.6, 34, P.mustard);
    s.poly([[31.5, 8, 14], [31.5, 8, 40], [46, 8, 14]], P.coral);
    s.poly([[30, 8, 44], [30, 8, 50], [38, 8, 47]], P.mint);
    [[12, P.peach], [24, P.lav], [36, P.mint]].forEach(([x, c]) => s.cylY(x, 16, 16.6, 5, 2.4, c));
  };
  // 14 — грузовичок
  F[14] = s => {
    s.cylY(10, -1, 2, 6, 6, P.peach); s.cylY(36, -1, 2, 6, 6, P.peach);
    s.box(0, 0, 6, 46, 18, 8, P.coral);
    s.cube(2, 3, 14, 12, P.mint); s.cube(16, 3, 14, 11, P.lav);
    s.box(30, 0, 14, 16, 18, 16, P.mustard);
    s.box(33, 18, 20, 10, 0.6, 7, P.blue); s.box(46, 2, 20, 0.6, 14, 7, P.blue);
    s.sphere(46.5, 14, 10, 2.4, P.mustard);
    s.cylY(10, 17, 21, 6, 6, P.peach, true); s.cylY(36, 17, 21, 6, 6, P.peach, true);
  };
  // 15 — ракета
  F[15] = s => {
    s.sphere(22, -8, 58, 3, P.mint);
    s.cyl(0, 0, 0, 20, 4, P.lav);
    s.poly([[-7, 0, 30], [-18, 0, 12], [-7, 0, 16]], D(P.blue));
    s.cone(0, 0, 14, 6, -9, P.mustard);
    s.cyl(0, 0, 14, 9, 34, P.peach); s.cone(0, 0, 48, 9, 16, P.coral);
    s.poly([[7, 0, 30], [18, 0, 12], [7, 0, 16]], P.blue);
    s.poly([[0, 7, 30], [0, 18, 12], [0, 7, 16]], P.mint);
    s.sphere(6.4, 6.4, 38, 3.6, P.blue); s.sphere(6.4, 6.4, 28, 2.8, P.lav);
    s.sphere(-8, 24, 40, 3, P.mustard);
  };
  // 16 — карусель
  F[16] = s => {
    const r = 15, a = r * 0.7071, cs = [P.mint, P.lav, P.peach, P.mustard];
    s.cyl(0, 0, 0, 22, 6, P.blue);
    const rod = (x, y, c) => { s.cyl(x, y, 6, 1.2, 34, P.mustard); s.sphere(x, y, 18, 5, c); };
    rod(-a, -a, cs[0]); rod(a, -a, cs[1]); rod(-a, a, cs[2]);
    s.cyl(0, 0, 6, 2.4, 34, P.coral);
    rod(a, a, cs[3]);
    s.cone(0, 0, 40, 24, 20, P.coral); s.sphere(0, 0, 63, 4, P.mustard);
  };
  // 17 — домик, ёлочка и забор
  F[17] = s => {
    s.sphere(-12, -12, 46, 5, P.mustard);
    s.box(0, 0, 0, 26, 22, 20, P.peach);
    s.box(18, 3, 24, 5, 5, 14, P.lav);
    s.roof(-2, -2, 20, 30, 26, 14, P.coral);
    s.box(5, 22, 0, 7, 0.8, 12, P.mint); s.box(26, 7, 8, 0.8, 8, 7, P.blue);
    s.cyl(38, 6, 0, 2.5, 12, D(P.mustard)); s.sphere(38, 6, 19, 9, P.mint); s.sphere(38, 6, 31, 6, mix(P.mint, .2, 255));
    [0, 14, 28].forEach(x => s.box(x, 30, 0, 3, 3, 10, P.lav)); s.box(0, 31, 6, 31, 1.4, 2.4, P.lav);
  };
  // 18 — тортик с ярусами и свечкой
  F[18] = s => {
    s.cyl(0, 0, 0, 30, 3, P.mint);
    s.cyl(0, 0, 3, 24, 12, P.coral);
    const balls = [0, 60, 120, 180, 240, 300].map((d, i) => { const t = d * Math.PI / 180; return { x: 21 * Math.cos(t), y: 21 * Math.sin(t), c: PAL[(i + 1) % 6] }; });
    balls.filter(b => b.x + b.y < 0).forEach(b => s.sphere(b.x, b.y, 18, 3, b.c));
    s.cyl(0, 0, 15, 17, 11, P.peach);
    balls.filter(b => b.x + b.y >= 0).forEach(b => s.sphere(b.x, b.y, 18, 3, b.c));
    s.cyl(0, 0, 26, 11, 10, P.lav);
    s.sphere(10.6, 10.6, 29, 2.6, P.mint); s.sphere(-1, 15, 29, 2.6, P.blue);
    s.cyl(0, 0, 36, 2, 12, P.blue);
    s.sphere(0, 0, 52, 3, P.mustard); s.cone(0, 0, 52, 2.9, 7, P.mustard); s.sphere(0, 0, 52.5, 1.4, P.coral);
  };
  // 19 — Благодарность: подарок с бантом
  F[19] = s => {
    const r = P.mustard;
    s.box(0, 0, 0, 30, 30, 24, P.coral);
    s.box(13, 30, 0, 4, 0.6, 24, r); s.box(30, 13, 0, 0.6, 4, 24, r);
    s.box(-2, -2, 24, 34, 34, 7, P.peach);
    s.box(13, 32, 24, 4, 0.6, 7, r); s.box(32, 13, 24, 0.6, 4, 7, r);
    s.box(13, -2, 31, 4, 34, 0.5, r); s.box(-2, 13, 31, 34, 4, 0.5, r);
    s.sphere(9, 15, 36, 6, P.lav); s.sphere(21, 15, 36, 6, P.lav); s.sphere(15, 15, 35, 3.5, P.mint);
  };

  // Декоративные фигурки для шапки и финала
  const DECO = {
    sphere: (c) => s => s.sphere(0, 0, 10, 10, c),
    cube: (c) => s => s.cube(0, 0, 0, 16, c),
    cone: (c) => s => s.cone(0, 0, 0, 10, 20, c),
    ring: (c) => s => { s.cyl(0, 0, 0, 12, 6, c); s.polyS(s.circle(t => s.pr(4.5 * Math.cos(t), 4.5 * Math.sin(t), 6.01)), DD(c)); },
    pyramid: (c) => s => s.pyramid(0, 0, 0, 18, 18, c),
    cyl: (c) => s => s.cyl(0, 0, 0, 8, 16, c),
  };

  window.Figures = {
    P, PAL,
    section(n) { const s = new Scene(); (F[n] || F[((n - 1) % 18) + 1])(s); return s.render(); },
    deco(kind, color) { const s = new Scene(); DECO[kind](color)(s); return s.render(false); },
    dot(i) { return ['circle', 'square', 'triangle'][i % 3]; },
  };
})();
