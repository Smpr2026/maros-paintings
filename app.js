(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  /* ---------- data ---------- */
  const WORKS = [
    { id: '06-slr5000', title: 'Torana SLR 5000 A9X', plate: 'A9X-SLR', cat: 'cars', note: 'Oil on canvas.', w: 1125, h: 953 },
    { id: '01-costa-rica', title: 'Costa Rica', plate: 'COSTA RICA', cat: 'surf', note: 'Large, 1500 x 1200 mm on a 1.5 inch box canvas.', w: 1200, h: 900 },
    { id: '02-xy-gtho', title: 'XY Falcon GT-HO Phase III', plate: 'GT-HO', cat: 'cars', note: 'On the easel in the studio.', w: 1440, h: 1920 },
    { id: '07-kombi-hubcap', title: 'Kombi hubcaps', plate: 'KOMBI', cat: 'vw', note: 'Split-window Kombi faces painted on VW hubcaps.', w: 1440, h: 1080 },
    { id: '04-xa-falcon', title: 'XA Falcon GT', plate: 'XA-GT', cat: 'cars', note: 'Black and white oil with a yellow plate.', w: 1440, h: 1080 },
    { id: '10-kenworth', title: 'Kenworth cab-overs', plate: 'KENWORTH', cat: 'trucks', note: 'Oil painting.', w: 1440, h: 1419 },
    { id: '03-hk-monaro', title: 'HK Monaro GTS 327', plate: 'GTS-327', cat: 'cars', note: 'On the easel in the studio.', w: 1440, h: 1920 },
    { id: '09-corvette', title: 'Impala lowrider', plate: 'IMPALA', cat: 'cars', note: 'Oil on canvas, three wheels up.', w: 1440, h: 1080 },
    { id: '05-rx3', title: 'Mazda RX-3', plate: 'RX3', cat: 'cars', note: 'Rotary royalty, on the easel.', w: 1440, h: 1920 },
    { id: '11-kombi-beetle', title: 'Split Kombi and Oval Beetle', plate: 'SPLIT', cat: 'vw', note: 'A framed pair.', w: 1440, h: 889 },
    { id: '08-xt-falcon', title: 'XT Falcon GT', plate: 'XT-GT', cat: 'cars', note: 'Oil on canvas.', w: 1440, h: 1185 },
  ];
  const SIZES = [
    { label: 'Small', w: 600, h: 450 },
    { label: 'Medium', w: 900, h: 600 },
    { label: 'Large', w: 1200, h: 900 },
    { label: 'Extra large', w: 1500, h: 1200 },
  ];
  const img = (id, sm) => `img/work/${id}${sm ? '-sm' : ''}.webp`;

  /* ---------- OIL-BRUSH LETTERING ----------
     A loaded flat brush scribbles left to right across each line. Paint only sticks where the
     letters are (a text mask), the bristles run dry along the stroke, and a few drips run off. */
  const PAINTS = {
    ink: () => cssColor('--ink'),
    white: () => '#f6f5f2',
    plate: () => cssColor('--plate'),
  };
  function cssColor(v) { const d = document.createElement('i'); d.style.color = `var(${v})`; document.body.appendChild(d); const c = getComputedStyle(d).color; d.remove(); return c; }
  // Any CSS colour (hex, rgb, oklch...) to [r,g,b], by letting a 1px canvas resolve it.
  const _px = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
  function rgbParts(c) {
    try { _px.clearRect(0, 0, 1, 1); _px.fillStyle = '#000'; _px.fillStyle = c; _px.fillRect(0, 0, 1, 1); const d = _px.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2]]; }
    catch (e) { return [30, 30, 30]; }
  }
  function shade([r, g, b], k) { const f = x => Math.max(0, Math.min(255, Math.round(x + k))); return `rgb(${f(r)},${f(g)},${f(b)})`; }

  function makeLayer(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }

  // The painter. `mask` draws the shape paint may stick to; `bands` are the rows the brush scribbles across.
  function Painter(canvas, { mask, bands, color, under = [], recolor = [], drips = true, speed = 1, onDone }) {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const W = canvas.clientWidth, H = canvas.clientHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    const out = canvas.getContext('2d'); out.setTransform(dpr, 0, 0, dpr, 0, 0);
    const mk = () => { const [c, x] = makeLayer(canvas.width, canvas.height); x.setTransform(dpr, 0, 0, dpr, 0, 0); return [c, x]; };
    const [mC, mX] = mk(), [pC, pX] = mk(), [uC, uX] = mk(), [dC, dX] = mk(), [cC, cX] = mk();
    mask(mX);
    const base = rgbParts(color);
    const tones = [shade(base, 0), shade(base, -22), shade(base, 18), shade(base, -8), shade(base, 34)];
    let mdata = null; try { mdata = mX.getImageData(0, 0, mC.width, mC.height).data; } catch (e) { }
    const inked = (x, y) => { if (!mdata) return false; const i = (Math.round(y * dpr) * mC.width + Math.round(x * dpr)) * 4 + 3; return mdata[i] > 100; };

    // Build the brush plan
    // underlay swipes go down right before the line they sit behind
    const plan = [];
    bands.forEach((b, i) => { under.filter(u => u.band === i).forEach(u => plan.push({ ...b, ...u, layer: 'under' })); plan.push({ ...b, layer: 'paint' }); });

    const drops = [];
    function bristles(n) { const a = []; for (let i = 0; i < n; i++) a.push({ o: Math.random() * 2 - 1, r: .5 + Math.random() * 1.6, t: tones[i % tones.length], a: .55 + Math.random() * .45 }); return a; }

    function stamp(ctx, x, y, ang, rad, br, load, tonesOverride) {
      const nx = -Math.sin(ang), ny = Math.cos(ang);
      for (const b of br) {
        if (Math.random() > load + .25) continue;     // dry bristles skip, leaving streaks
        ctx.globalAlpha = b.a * Math.min(1, load + .2);
        ctx.fillStyle = tonesOverride ? tonesOverride[(b.o * 10 | 0) & 3] : b.t;
        ctx.beginPath(); ctx.arc(x + nx * b.o * rad, y + ny * b.o * rad, b.r * rad * .16 + .6, 0, 6.283); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    // a job is a zig-zag scribble from x0 to x1 across a band [top, bottom]
    function runJob(j, tickCb) {
      const h = j.bottom - j.top, rad = h * (j.layer === 'under' ? .5 : .3);
      const br = bristles(j.layer === 'under' ? 46 : 38);
      const uTones = j.layer === 'under' ? (() => { const c = rgbParts(j.color); return [shade(c, 0), shade(c, -18), shade(c, 14), shade(c, -6)]; })() : null;
      const ctx = j.layer === 'under' ? uX : pX;
      const x0 = j.x0 - 6, x1 = j.x1 + 8, mid = (j.top + j.bottom) / 2;
      const amp = j.layer === 'under' ? h * .03 : h * .36;
      const freq = j.layer === 'under' ? .02 : 1 / Math.max(8, h * .22);
      let x = x0, ph = Math.random() * 6, last = null;
      const pxPerFrame = (j.layer === 'under' ? 34 : 15) * speed * Math.max(.8, h / 70);
      return () => {
        const end = Math.min(x1, x + pxPerFrame);
        while (x < end) {
          x += 1.6; ph += 1.6 * freq * 6.283;
          const prog = (x - x0) / (x1 - x0);
          const load = j.layer === 'under' ? 1 - prog * .35 : 1 - prog * .45 + (Math.sin(prog * 18) * .06);
          const y = mid + Math.sin(ph) * amp + (j.layer === 'under' ? Math.sin(prog * 3) * h * .06 : 0);
          const ang = j.layer === 'under' ? -0.03 : (last ? Math.atan2(y - last.y, x - last.x) : 0);
          stamp(ctx, x, y, ang, rad, br, load, uTones);
          last = { x, y };
        }
        if (x >= x1) {
          if (drips && j.layer === 'paint') spawnDrips(j);
          if (drips && j.layer === 'under') spawnDrips({ ...j, under: true });
          return true;
        }
        return false;
      };
    }

    function spawnDrips(j) {
      const n = j.under ? 1 : 1 + (Math.random() * 2 | 0);
      for (let k = 0; k < n; k++) {
        for (let tries = 0; tries < 30; tries++) {
          const x = j.x0 + Math.random() * (j.x1 - j.x0);
          let y = j.bottom + 4;
          if (!j.under) { while (y > j.top && !inked(x, y)) y--; if (y <= j.top + 4) continue; }
          else y = j.bottom - (j.bottom - j.top) * .2;
          drops.push({ x, y, len: 0, max: Math.min(14 + Math.random() * (j.under ? 26 : 46), (j.bottom - j.top) * (.3 + Math.random() * .5)), w: (j.bottom - j.top) * (j.under ? .05 : .045) + 1.2, v: .5 + Math.random() * .7,
            c: j.under ? j.color : color });
          break;
        }
      }
    }
    function tickDrops() {
      let live = false;
      for (const d of drops) {
        if (d.len >= d.max) continue; live = true;
        const e = 1 - d.len / d.max; d.len += d.v * (.25 + e);
        dX.fillStyle = d.c; dX.globalAlpha = 1;
        dX.beginPath(); dX.ellipse(d.x, d.y + d.len, d.w * (.75 + .25 * e), d.w, 0, 0, 6.283); dX.fill();
        if (d.len >= d.max) { dX.beginPath(); dX.ellipse(d.x, d.y + d.len + d.w * .4, d.w * 1.35, d.w * 1.6, 0, 0, 6.283); dX.fill(); }
      }
      return live;
    }

    function compose() {
      cX.clearRect(0, 0, W, H);
      cX.globalCompositeOperation = 'source-over'; cX.drawImage(pC, 0, 0, W, H);
      cX.globalCompositeOperation = 'destination-in'; cX.drawImage(mC, 0, 0, W, H);
      cX.globalCompositeOperation = 'source-atop';
      recolor.forEach(r => { cX.fillStyle = r.color; cX.fillRect(r.x, r.y, r.w, r.h); });
      cX.globalCompositeOperation = 'source-over';
      out.clearRect(0, 0, W, H);
      out.drawImage(uC, 0, 0, W, H);
      // thick paint: a soft cast shadow, the stroke, then a thin highlight on the top edge
      out.save(); out.shadowColor = 'rgba(0,0,0,.38)'; out.shadowBlur = 2.5; out.shadowOffsetY = 1.6; out.shadowOffsetX = .6;
      out.drawImage(cC, 0, 0, W, H); out.drawImage(dC, 0, 0, W, H); out.restore();
      out.save(); out.globalAlpha = .22; out.globalCompositeOperation = 'source-atop'; out.filter = 'brightness(2.2)';
      out.drawImage(cC, -.8, -.9, W, H); out.restore();
    }

    let i = 0, step = plan.length ? runJob(plan[0]) : null, raf = 0, stopped = false;
    function frame() {
      if (stopped) return;
      let more = false;
      if (step) { if (step()) { i++; step = i < plan.length ? runJob(plan[i]) : null; } more = true; }
      if (tickDrops()) more = true;
      compose();
      if (more) raf = requestAnimationFrame(frame); else onDone && onDone();
    }
    return {
      play() { raf = requestAnimationFrame(frame); },
      instant() { while (step) { if (step()) { i++; step = i < plan.length ? runJob(plan[i]) : null; } } let g = 0; while (tickDrops() && g++ < 2000); compose(); onDone && onDone(); },
      stop() { stopped = true; cancelAnimationFrame(raf); },
    };
  }

  // Measure the real heading's words so the paint lands exactly where the text sits.
  function paintHeading(el, { delay = 0, speed = 1, animate = true } = {}) {
    const old = el.querySelector('.paint-canvas'); if (old) { old._p && old._p.stop(); old.remove(); }
    const cv = document.createElement('canvas'); cv.className = 'paint-canvas'; cv.setAttribute('aria-hidden', 'true');
    el.appendChild(cv);
    const box = cv.getBoundingClientRect();
    const words = [];
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      const re = /\S+/g; let m;
      const cs = getComputedStyle(node.parentElement);
      const swipe = !!node.parentElement.closest('.swipe');
      while ((m = re.exec(node.textContent))) {
        const r = document.createRange(); r.setStart(node, m.index); r.setEnd(node, m.index + m[0].length);
        const rc = r.getClientRects()[0]; if (!rc) continue;
        const txt = cs.textTransform === 'uppercase' ? m[0].toUpperCase() : m[0];
        words.push({ t: txt, x: rc.left - box.left, y: rc.top - box.top, w: rc.width, h: rc.height, font: `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`, fs: parseFloat(cs.fontSize), swipe });
      }
    }
    const lines = [];
    words.forEach(w => { let L = lines.find(l => Math.abs(l.y - w.y) < w.h * .4); if (!L) lines.push(L = { y: w.y, h: w.h, x0: w.x, x1: w.x + w.w, swipe: false }); L.x0 = Math.min(L.x0, w.x); L.x1 = Math.max(L.x1, w.x + w.w); L.swipe = L.swipe || w.swipe; });
    lines.sort((a, b) => a.y - b.y);
    const bands = lines.map(l => ({ x0: l.x0, x1: l.x1, top: l.y + l.h * .1, bottom: l.y + l.h * .92 }));
    const under = [];
    lines.forEach((l, i) => { if (l.swipe) { const sw = words.filter(w => w.swipe); under.push({ band: i, x0: Math.min(...sw.map(w => w.x)) - l.h * .12, x1: Math.max(...sw.map(w => w.x + w.w)) + l.h * .2, top: l.y + l.h * .22, bottom: l.y + l.h * .9, color: cssColor('--plate') }); } });
    const inkName = el.dataset.ink || 'ink';
    const color = PAINTS[inkName] ? PAINTS[inkName]() : '#222';
    const p = Painter(cv, {
      speed,
      color,
      bands,
      under,
      // words on the yellow swipe are painted in plate-black, like the lettering on a number plate
      recolor: words.filter(w => w.swipe).map(w => ({ x: w.x - 4, y: w.y - 4, w: w.w + 8, h: w.h + 8, color: cssColor('--plate-ink') })),
      mask: ctx => {
        ctx.fillStyle = '#000'; ctx.strokeStyle = '#000'; ctx.lineJoin = 'round'; ctx.textBaseline = 'alphabetic';
        words.forEach(w => {
          ctx.font = w.font;
          const m = ctx.measureText(w.t);
          const asc = m.fontBoundingBoxAscent ?? w.fs * .8, desc = m.fontBoundingBoxDescent ?? w.fs * .2;
          const base = w.y + (w.h - (asc + desc)) / 2 + asc;
          const sx = w.w / Math.max(1, m.width);
          ctx.save(); ctx.translate(w.x, base); ctx.scale(sx, 1);
          ctx.lineWidth = w.fs * .05; ctx.strokeText(w.t, 0, 0); ctx.fillText(w.t, 0, 0); ctx.restore();
        });
      },
    });
    cv._p = p;
    if (!animate || reduce) p.instant(); else setTimeout(() => p.play(), delay);
    return p;
  }

  const fontsReady = (document.fonts && document.fonts.load) ? Promise.all([
    document.fonts.load('400 64px "Covered By Your Grace"'), document.fonts.ready]).catch(() => { }) : Promise.resolve();
  document.documentElement.classList.add('js-paint');

  /* ---------- INTRO: paint his signature ---------- */
  const intro = document.getElementById('intro');
  const introDone = new Promise(resolve => {
    let seen = false; try { seen = sessionStorage.getItem('maros-intro') === '1'; } catch (e) { }
    if (!intro || reduce || seen) { if (intro) intro.hidden = true; resolve(); return; }
    try { sessionStorage.setItem('maros-intro', '1'); } catch (e) { }
    document.documentElement.style.overflow = 'hidden';
    const cv = intro.querySelector('canvas');
    const sig = new Image(); sig.src = 'img/sig-white.png';
    let finished = false;
    const end = () => {
      if (finished) return; finished = true;
      intro.classList.add('out'); document.documentElement.style.overflow = '';
      setTimeout(resolve, 350);
      setTimeout(() => { intro.hidden = true; }, 1100);
    };
    intro.querySelector('.intro-skip').addEventListener('click', end);
    intro.addEventListener('click', end);
    setTimeout(end, 9000); // never hold the page hostage
    sig.onload = () => {
      const W = cv.clientWidth, H = cv.clientHeight;
      const s = Math.min(W / sig.width, H / sig.height) * .92;
      const dw = sig.width * s, dh = sig.height * s, ox = (W - dw) / 2, oy = (H - dh) / 2;
      // the signature is tall, so the brush works it in two rows
      const bands = [
        { x0: ox, x1: ox + dw, top: oy, bottom: oy + dh * .55 },
        { x0: ox, x1: ox + dw, top: oy + dh * .45, bottom: oy + dh },
      ];
      const p = Painter(cv, {
        color: '#f4f2ee', bands, speed: 0.95, drips: true,
        mask: ctx => ctx.drawImage(sig, ox, oy, dw, dh),
        onDone: () => setTimeout(end, 1800),
      });
      p.play();
    };
    sig.onerror = end;
  });

  /* ---------- in-view helper ---------- */
  const watch = (els, cls = 'in', threshold = 0.35, once = true) => {
    if (!('IntersectionObserver' in window)) { els.forEach(e => e.classList.add(cls)); return; }
    const io = new IntersectionObserver(ents => ents.forEach(en => {
      if (en.isIntersecting) { en.target.classList.add(cls); if (once) io.unobserve(en.target); }
      else if (!once) en.target.classList.remove(cls);
    }), { threshold });
    els.forEach(e => io.observe(e));
  };

  /* ---------- nav goes solid after the hero ---------- */
  const nav = $('.nav'), hero = $('.hero');
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([e]) => nav.classList.toggle('is-solid', !e.isIntersecting), { rootMargin: '-68px 0px 0px 0px' }).observe(hero);
  }

  /* ---------- HERO: paint the picture in ---------- */
  const cv = $('.hero-cover'), ctx = cv.getContext('2d');
  const heroImg = $('.hero-img');
  let W = 0, H = 0, DPR = 1, lastW = 0, signed = false;

  function drawCover() {
    const r = cv.getBoundingClientRect(); // on phones the canvas only covers the painting, not the whole hero
    DPR = Math.min(devicePixelRatio || 1, 2);
    W = r.width; H = r.height; lastW = W;
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#efefee';
    ctx.fillRect(0, 0, W, H);
    // canvas weave
    ctx.globalAlpha = 0.05; ctx.fillStyle = '#000';
    for (let y = 0; y < H; y += 3) ctx.fillRect(0, y, W, 1);
    ctx.globalAlpha = 0.03;
    for (let x = 0; x < W; x += 3) ctx.fillRect(x, 0, 1, H);
    // faint pencil underdrawing of the painting
    if (heroImg.complete && heroImg.naturalWidth) {
      const iw = heroImg.naturalWidth, ih = heroImg.naturalHeight;
      const s = Math.max(W / iw, H / ih) * 1.04;
      const dw = iw * s, dh = ih * s;
      ctx.save();
      ctx.globalAlpha = 0.13;
      ctx.filter = 'grayscale(1) contrast(1.8) brightness(1.5)';
      ctx.globalCompositeOperation = 'multiply';
      ctx.drawImage(heroImg, (W - dw) / 2, (H - dh) * 0.4, dw, dh);
      ctx.restore();
    }
    cv.style.transition = 'none'; cv.style.opacity = 1;
  }

  // Bristle brush. Each stroke keeps its bristle offsets so it leaves streaks, like a real flat brush.
  const R = () => Math.max(26, Math.min(W, H) * 0.06);
  function newBrush() {
    const n = 34, b = [];
    for (let i = 0; i < n; i++) b.push({ o: (Math.random() * 2 - 1), r: 0.6 + Math.random() * 2.4, a: 0.35 + Math.random() * 0.65, skip: Math.random() < 0.12 });
    return b;
  }
  function stamp(x, y, ang, brush, k) {
    const rad = R() * k, nx = -Math.sin(ang), ny = Math.cos(ang);
    ctx.globalCompositeOperation = 'destination-out';
    for (const b of brush) {
      if (b.skip && Math.random() < 0.7) continue;
      ctx.globalAlpha = b.a;
      ctx.beginPath();
      ctx.arc(x + nx * b.o * rad, y + ny * b.o * rad, b.r * (rad / 26) * 1.6, 0, 6.283);
      ctx.fill();
    }
  }
  function segment(a, b, brush, k) {
    const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), ang = Math.atan2(dy, dx);
    const steps = Math.max(1, Math.ceil(d / 2.5));
    for (let i = 1; i <= steps; i++) stamp(a.x + dx * i / steps, a.y + dy * i / steps, ang, brush, k);
  }

  // Paint runs: when you lift the brush, a little oil runs down the canvas.
  const runs = [];
  function addRun(x, y) {
    runs.push({ x: x + (Math.random() * 2 - 1) * R() * .7, y, len: 0, max: 40 + Math.random() * 120, w: 2 + Math.random() * 4, v: 0.6 + Math.random() * 0.9 });
    if (!runLoop) runLoop = requestAnimationFrame(tickRuns);
  }
  let runLoop = 0;
  function tickRuns() {
    ctx.globalCompositeOperation = 'destination-out'; ctx.globalAlpha = 1;
    for (const r of runs) {
      if (r.len >= r.max) continue;
      const ease = 1 - r.len / r.max;
      r.len += r.v * (0.35 + ease);
      const w = r.w * (0.7 + 0.3 * ease);
      ctx.beginPath(); ctx.ellipse(r.x, r.y + r.len, w, w * 1.3, 0, 0, 6.283); ctx.fill();
    }
    for (let i = runs.length - 1; i >= 0; i--) if (runs[i].len >= runs[i].max) {
      const r = runs[i]; ctx.beginPath(); ctx.ellipse(r.x, r.y + r.len, r.w * 1.5, r.w * 1.9, 0, 0, 6.283); ctx.fill(); runs.splice(i, 1);
    }
    runLoop = runs.length ? requestAnimationFrame(tickRuns) : 0;
  }

  // coverage check
  let covTimer = 0;
  function checkCoverage() {
    clearTimeout(covTimer);
    covTimer = setTimeout(() => {
      try {
        const step = 12 * DPR, data = ctx.getImageData(0, 0, cv.width, cv.height).data;
        let clear = 0, tot = 0;
        for (let y = 0; y < cv.height; y += step) for (let x = 0; x < cv.width; x += step) { tot++; if (data[(Math.floor(y) * cv.width + Math.floor(x)) * 4 + 3] < 120) clear++; }
        const f = clear / tot;
        if (f > 0.35) hero.classList.add('painted');
        if (f > 0.5 && !signed) { signed = true; hero.classList.add('signed'); }
      } catch (e) { /* ignore */ }
    }, 250);
  }

  // pointer painting
  let down = false, last = null, brush = null, moved = 0;
  const pt = e => { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  cv.addEventListener('pointerdown', e => { down = true; brush = newBrush(); last = pt(e); moved = 0; stamp(last.x, last.y, 0, brush, 0.6); cv.setPointerCapture(e.pointerId); stopAuto(); });
  cv.addEventListener('pointermove', e => {
    if (!down) return;
    const p = pt(e); moved += Math.hypot(p.x - last.x, p.y - last.y);
    segment(last, p, brush, Math.min(1, 0.55 + moved / 300));
    if (Math.random() < 0.025) addRun(p.x, p.y);
    last = p;
  });
  const up = () => { if (!down) return; down = false; if (last && moved > 40) { addRun(last.x, last.y); if (Math.random() < .6) addRun(last.x, last.y); } checkCoverage(); };
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);

  // auto-paint a few sweeping strokes on load, so the hero is never blank
  let autoRaf = 0;
  function autoPaint() {
    const strokes = [];
    const n = 7;
    for (let i = 0; i < n; i++) {
      // loose, overlapping gestures at varied angles, like blocking in a canvas
      const cy = H * (0.1 + (i / (n - 1)) * 0.8) + (Math.random() * 60 - 30);
      const ang = (Math.random() * 0.7 - 0.35) + (i % 3 === 2 ? 0.9 : 0);
      const len = W * (0.45 + Math.random() * 0.45);
      const cx = W * (0.45 + Math.random() * 0.35);
      const dx = Math.cos(ang) * len / 2, dy = Math.sin(ang) * len / 2;
      const flip = i % 2 ? -1 : 1;
      strokes.push({ x0: cx - dx * flip, y0: cy - dy * flip, x1: cx + dx * flip, y1: cy + dy * flip, wob: 20 + Math.random() * 50, k: 0.9 + Math.random() * 0.7 });
    }
    let si = 0, t = 0, prev = null, br = newBrush();
    const dur = 30; // frames per stroke
    const tick = () => {
      const s = strokes[si];
      t++;
      const u = t / dur, e = 1 - Math.pow(1 - u, 3);
      const p = { x: s.x0 + (s.x1 - s.x0) * e, y: s.y0 + (s.y1 - s.y0) * e + Math.sin(u * Math.PI) * s.wob };
      if (prev) segment(prev, p, br, s.k * (0.6 + 0.4 * Math.sin(Math.min(1, u * 1.4) * Math.PI / 2)));
      prev = p;
      if (u >= 1) { if (Math.random() < .8) addRun(p.x, p.y); addRun(W * (0.4 + Math.random() * .5), p.y); si++; t = 0; prev = null; br = newBrush(); }
      if (si < strokes.length) autoRaf = requestAnimationFrame(tick);
      else { autoRaf = 0; checkCoverage(); }
    };
    autoRaf = requestAnimationFrame(tick);
  }
  function stopAuto() { if (autoRaf) { cancelAnimationFrame(autoRaf); autoRaf = 0; } }

  function finish() {
    stopAuto();
    cv.style.transition = 'opacity 1.2s cubic-bezier(.16,1,.3,1)';
    cv.style.opacity = 0;
    hero.classList.add('painted', 'signed'); signed = true;
  }
  function reset() {
    stopAuto(); runs.length = 0;
    hero.classList.remove('painted', 'signed'); signed = false;
    drawCover();
  }
  $$('[data-hero]').forEach(b => b.addEventListener('click', () => (b.dataset.hero === 'finish' ? finish() : reset())));

  const heroH1 = $('.hero-card h1');
  function startHero() {
    drawCover();
    if (reduce) { finish(); fontsReady.then(() => paintHeading(heroH1, { animate: false })); return; }
    introDone.then(() => fontsReady).then(() => {
      paintHeading(heroH1, { delay: 250, speed: 1.1 });
      setTimeout(autoPaint, 900);
    });
  }
  if (heroImg.complete) startHero(); else heroImg.addEventListener('load', startHero, { once: true });
  let rT = 0;
  addEventListener('resize', () => { clearTimeout(rT); rT = setTimeout(() => { if (Math.abs(hero.getBoundingClientRect().width - lastW) > 40) { const done = cv.style.opacity === '0'; drawCover(); if (done) finish(); else checkCoverage(); } }, 200); });

  /* ---------- OIL DRIPS ---------- */
  $$('.drips').forEach(el => {
    const n = +el.dataset.drips || 12;
    const inner = document.createElement('div'); inner.className = 'drips-inner';
    inner.innerHTML = '<div class="drips-bar"></div>';
    for (let i = 0; i < n; i++) {
      const d = document.createElement('div'); d.className = 'drip';
      const w = 9 + Math.random() * 18, h = 40 + Math.random() * 120, dur = 5 + Math.random() * 6;
      d.style.cssText = `left:${(i + 0.15 + Math.random() * 0.7) / n * 100}%;--w:${w.toFixed(1)}px;--h:${h.toFixed(0)}px;--d:${dur.toFixed(2)}s;--delay:${(-Math.random() * dur).toFixed(2)}s`;
      d.innerHTML = '<span class="drip-stem"></span><span class="drip-drop"></span>';
      inner.appendChild(d);
    }
    el.appendChild(inner);
  });
  watch($$('.drips'), 'run', 0, false);

  /* ---------- CHAPTERS ---------- */
  watch($$('.chapter'), 'in', 0.45);
  // chapter titles get painted on in white oil as each photo arrives
  if ('IntersectionObserver' in window) {
    const pio = new IntersectionObserver(ents => ents.forEach(en => {
      if (!en.isIntersecting) return; pio.unobserve(en.target);
      const h = en.target.querySelector('h2.paint');
      fontsReady.then(() => { h.dataset.done = '1'; paintHeading(h, { delay: 380, speed: 1.15 }); });
    }), { threshold: 0.45 });
    $$('.chapter').forEach(c => pio.observe(c));
  } else fontsReady.then(() => $$('.chapter h2.paint').forEach(h => paintHeading(h, { animate: false })));
  // keep painted lettering lined up if the layout reflows (rotation, resize, theme)
  let pT = 0, pW = innerWidth;
  const repaintAll = () => { clearTimeout(pT); pT = setTimeout(() => {
    paintHeading(heroH1, { animate: false });
    $$('.chapter h2.paint[data-done]').forEach(h => paintHeading(h, { animate: false }));
  }, 250); };
  addEventListener('resize', () => { if (Math.abs(innerWidth - pW) > 30) { pW = innerWidth; repaintAll(); } });
  matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', repaintAll);
  watch($$('.studio-sig, .foot-sig'), 'in', 0.6);

  /* ---------- WORK GRID ---------- */
  const grid = $('#grid');
  grid.innerHTML = WORKS.map((w, i) => `
    <li class="tile reveal" data-cat="${w.cat}" style="transition-delay:${(i % 3) * 70}ms">
      <button type="button" data-i="${i}" aria-label="Open ${w.title}">
        <img src="${img(w.id, true)}" alt="${w.title}, oil painting by Greg Maroš" loading="lazy" width="${w.w}" height="${w.h}">
        <span class="tile-sig sig" aria-hidden="true"></span>
      </button>
      <div class="tile-cap"><strong>${w.title}</strong><span>${w.cat === 'cars' ? 'Muscle cars' : w.cat === 'vw' ? 'VW' : w.cat === 'surf' ? 'Surf' : 'Trucks'}</span></div>
    </li>`).join('');
  watch($$('.tile'), 'in', 0.15);

  $$('.chip').forEach(c => c.addEventListener('click', () => {
    $$('.chip').forEach(x => x.setAttribute('aria-pressed', x === c));
    const f = c.dataset.filter;
    $$('.tile').forEach(t => {
      const show = f === 'all' || t.dataset.cat === f;
      t.classList.toggle('is-hidden', !show);
      if (show && !reduce) { t.classList.remove('in'); requestAnimationFrame(() => requestAnimationFrame(() => t.classList.add('in'))); }
    });
  }));

  /* ---------- LIGHTBOX ---------- */
  const lb = $('#lightbox'), lbImg = $('#lbImg');
  let cur = 0;
  const visible = () => $$('.tile:not(.is-hidden) button').map(b => +b.dataset.i);
  function show(i) {
    cur = i; const w = WORKS[i];
    lbImg.style.animation = 'none'; void lbImg.offsetWidth; lbImg.style.animation = '';
    lbImg.src = img(w.id); lbImg.alt = `${w.title}, oil painting by Greg Maroš`;
    $('#lbPlate').textContent = w.plate; $('#lbTitle').textContent = w.title; $('#lbNote').textContent = w.note;
  }
  function step(d) { const v = visible(); const k = v.indexOf(cur); show(v[(k + d + v.length) % v.length]); }
  grid.addEventListener('click', e => { const b = e.target.closest('button[data-i]'); if (!b) return; show(+b.dataset.i); lb.showModal(); });
  lb.addEventListener('click', e => {
    const a = e.target.closest('[data-lb]');
    if (a) { a.dataset.lb === 'close' ? lb.close() : step(a.dataset.lb === 'next' ? 1 : -1); }
    else if (e.target === lb) lb.close();
  });
  lb.addEventListener('keydown', e => { if (e.key === 'ArrowRight') step(1); if (e.key === 'ArrowLeft') step(-1); });
  let sx = null;
  lb.addEventListener('touchstart', e => { sx = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener('touchend', e => { if (sx == null) return; const dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1); sx = null; });

  /* ---------- SIZER ---------- */
  const room = $('#room'), art = $('#roomArt'), roomImg = $('#roomImg'), dim = $('#roomDim');
  const sizeSel = $('#f-size');
  let sIdx = 1, pIdx = 4;
  const ROOM_MM = 3900; // wall width shown, the sofa is about 2.2 m
  $('#sizes').innerHTML = SIZES.map((s, i) => `<button type="button" role="radio" aria-checked="${i === sIdx}" data-s="${i}">${s.label}<small>${s.w} x ${s.h} mm</small></button>`).join('');
  sizeSel.innerHTML = SIZES.map((s, i) => `<option value="${i}">${s.label}, ${s.w} x ${s.h} mm</option>`).join('') + '<option value="other">Another size (I will say in my message)</option>';
  // flat, straightened scans of the canvases (no easel), so the preview hangs like the real thing
  const flat = id => `img/work/${id}-flat-sm.webp`;
  const pick = [4, 1, 6, 10, 0, 5];
  $('#swatches').innerHTML = pick.map(i => `<button type="button" role="radio" aria-checked="${i === pIdx}" data-p="${i}" aria-label="Preview ${WORKS[i].title}"><img src="${flat(WORKS[i].id)}" alt="" loading="lazy"></button>`).join('');

  function layout() {
    const s = SIZES[sIdx], w = WORKS[pIdx];
    const pxmm = room.clientWidth / ROOM_MM;
    // landscape paintings hang landscape, portrait ones turn the canvas
    const portrait = false; // every canvas here hangs landscape
    const cw = (portrait ? s.h : s.w) * pxmm, ch = (portrait ? s.w : s.h) * pxmm;
    art.style.width = cw + 'px'; art.style.height = ch + 'px';
    dim.textContent = portrait ? `${s.h} x ${s.w} mm` : `${s.w} x ${s.h} mm`;
  }
  $('#sizes').addEventListener('click', e => {
    const b = e.target.closest('[data-s]'); if (!b) return;
    sIdx = +b.dataset.s; $$('#sizes button').forEach(x => x.setAttribute('aria-checked', x === b)); sizeSel.value = sIdx; layout();
  });
  $('#swatches').addEventListener('click', e => {
    const b = e.target.closest('[data-p]'); if (!b) return;
    pIdx = +b.dataset.p; $$('#swatches button').forEach(x => x.setAttribute('aria-checked', x === b));
    roomImg.style.opacity = 0;
    setTimeout(() => { roomImg.src = flat(WORKS[pIdx].id); roomImg.alt = `${WORKS[pIdx].title} previewed on a wall`; roomImg.onload = () => (roomImg.style.opacity = 1); layout(); }, reduce ? 0 : 180);
  });
  sizeSel.value = sIdx;
  sizeSel.addEventListener('change', () => { if (sizeSel.value === 'other') return; sIdx = +sizeSel.value; $$('#sizes button').forEach((x, i) => x.setAttribute('aria-checked', i === sIdx)); layout(); });
  layout();
  if ('ResizeObserver' in window) new ResizeObserver(layout).observe(room);

  /* ---------- COMMISSION FORM ---------- */
  const form = $('#form'), sent = $('#sent'), msg = $('#msg');
  const copy = async t => { try { await navigator.clipboard.writeText(t); return true; } catch (e) { return false; } };
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const f = { name: $('#f-name'), contact: $('#f-contact'), what: $('#f-what') };
    const errs = {
      name: f.name.value.trim() ? '' : 'Add your name so Greg knows who to reply to.',
      contact: f.contact.value.trim().length >= 6 ? '' : 'Add a phone number or email.',
      what: f.what.value.trim().length >= 4 ? '' : 'Tell Greg what you would like painted.',
    };
    let first = null;
    for (const k in errs) { $('#e-' + k).textContent = errs[k]; f[k].setAttribute('aria-invalid', !!errs[k]); if (errs[k] && !first) first = f[k]; }
    if (first) { first.focus(); return; }
    const size = sizeSel.value === 'other' ? 'Another size' : `${SIZES[sizeSel.value].label}, ${SIZES[sizeSel.value].w} x ${SIZES[sizeSel.value].h} mm`;
    const text = `Hi Greg, I'd like to order a painting.\n\nName: ${f.name.value.trim()}\nContact: ${f.contact.value.trim()}\nPainting: ${f.what.value.trim()}\nSize: ${size}\n\nI'll attach my photo.`;
    msg.textContent = text;
    const ok = await copy(text);
    sent.querySelector('p').innerHTML = ok
      ? '<strong>Message ready and copied.</strong> Paste it into a message to Greg and attach your photo.'
      : '<strong>Message ready.</strong> Copy it below, then send it to Greg with your photo.';
    sent.hidden = false; sent.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'nearest' });
  });
  $('#copyAgain').addEventListener('click', async e => { const ok = await copy(msg.textContent); e.target.textContent = ok ? 'Copied' : 'Select and copy'; setTimeout(() => (e.target.textContent = 'Copy again'), 1600); });
})();
