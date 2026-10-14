/* Antigravity-inspired gravity-well particle field. Original code, no external runtime. */
document.documentElement.classList.add('js');
(() => {
  // Scroll reveal
  const reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    }), { threshold: .12, rootMargin: '0px 0px -8% 0px' });
    reveals.forEach((el) => io.observe(el));
  } else reveals.forEach((el) => el.classList.add('in'));

  const canvas = document.querySelector('#flow');
  const hero = document.querySelector('.hero');
  const button = document.querySelector('.motion-toggle');
  const ctx = canvas?.getContext('2d');
  if (!ctx) return;

  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  // Antigravity-style: colourful dashes on white that orient toward, and ring around, a soft "gravity well".
  const palette = ['66,133,244', '234,67,53', '251,188,4', '52,168,83', '123,97,255', '50,121,249'];
  const pointer = { x: 0, y: 0, active: false };
  const well = { x: 0, y: 0, power: 0 };
  let width = 1, height = 1, particles = [], time = 0;
  let frame = null, last = 0, inView = true, paused = motion.matches;
  let cx = 0, cy = 0, mx = 1, my = 1;
  let seed = 8417;
  const random = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const smooth = (a, b, x) => { const v = Math.max(0, Math.min(1, (x - a) / (b - a))); return v * v * (3 - 2 * v); };

  function draw(dt = 0) {
    ctx.clearRect(0, 0, width, height);
    // Idle: the well wanders slowly; with a cursor, it eases to the cursor.
    const tx = pointer.active ? pointer.x : width * (.5 + Math.sin(time * .13) * .3);
    const ty = pointer.active ? pointer.y : height * (.5 + Math.sin(time * .19 + 1) * .28);
    const k = dt ? 1 - Math.exp(-dt * (pointer.active ? 5 : 1.2)) : 1;
    well.x += (tx - well.x) * k; well.y += (ty - well.y) * k;
    well.power += ((pointer.active ? 1 : .55) - well.power) * (dt ? 1 - Math.exp(-dt * 3) : 1);
    const R = Math.min(260, Math.max(150, width * .17)) * (.8 + .2 * well.power);
    ctx.lineCap = 'round';
    for (const p of particles) {
      // Gentle floating drift around the home position
      const hx = p.hx + Math.sin(time * p.f + p.ph) * 7, hy = p.hy + Math.cos(time * p.f * .9 + p.ph) * 7;
      let gx = hx, gy = hy;
      const dx = hx - well.x, dy = hy - well.y, d = Math.hypot(dx, dy) || .01;
      let lift = 0;
      if (d < R * 1.6) {
        // Pull into a breathing ring around the well
        const ring = R * (.62 + .08 * Math.sin(time * 1.4 + p.ph));
        const w = (1 - smooth(R * .9, R * 1.6, d)) * well.power;
        const target = d + (ring - d) * .55 * w;
        const swirl = .35 * w;
        const ca = Math.cos(swirl), sa = Math.sin(swirl);
        const ux = dx / d, uy = dy / d;
        gx = well.x + (ux * ca - uy * sa) * target; gy = well.y + (ux * sa + uy * ca) * target;
        lift = w;
      }
      const e = dt ? 1 - Math.exp(-dt * 4.5) : 1;
      p.x += (gx - p.x) * e; p.y += (gy - p.y) * e; p.l += (lift - p.l) * e;
      const td = Math.max(Math.abs(p.x - cx) / mx, Math.abs(p.y - cy) / my);
      const clear = .1 + .9 * smooth(.8, 1.3, td);
      const alpha = (.3 + .65 * p.l) * p.a * clear;
      if (alpha < .02) continue;
      // Dashes point toward the well; length grows when energised
      const ox = well.x - p.x, oy = well.y - p.y, on = Math.hypot(ox, oy) || 1;
      const len = p.s * (1.2 + 3.4 * p.l);
      ctx.strokeStyle = `rgba(${p.c},${alpha})`;
      ctx.lineWidth = 1.4 + p.l * 1.1;
      ctx.beginPath();
      ctx.moveTo(p.x - ox / on * len * .5, p.y - oy / on * len * .5);
      ctx.lineTo(p.x + ox / on * len * .5, p.y + oy / on * len * .5);
      ctx.stroke();
    }
  }

  function tick(now) {
    const dt = Math.min((now - (last || now)) / 1000, .05);
    last = now; time += dt;
    draw(dt);
    frame = requestAnimationFrame(tick);
  }
  function sync() {
    if (frame !== null) cancelAnimationFrame(frame);
    frame = null; last = 0;
    button.hidden = false;
    button.textContent = paused ? 'Play motion' : 'Pause motion';
    button.setAttribute('aria-pressed', String(paused));
    canvas.dataset.motion = paused ? 'paused' : (!document.hidden && inView ? 'running' : 'suspended');
    draw();
    if (!paused && !document.hidden && inView) frame = requestAnimationFrame(tick);
  }
  function resize() {
    const rect = hero.getBoundingClientRect();
    width = rect.width; height = rect.height;
    dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const text = document.querySelector('.hero-content').getBoundingClientRect();
    cx = text.left - rect.left + text.width / 2; cy = text.top - rect.top + text.height / 2;
    mx = Math.min(text.width / 2, width * .3); my = text.height / 2 + 10;
    seed = 8417;
    const gap = width < 600 ? 30 : 34;
    particles = [];
    for (let y = gap / 2; y < height; y += gap) for (let x = gap / 2; x < width; x += gap) {
      const hx = x + (random() - .5) * gap * .9, hy = y + (random() - .5) * gap * .9;
      particles.push({ hx, hy, x: hx, y: hy, l: 0, s: 2.2 + random() * 2.2, a: .55 + random() * .45,
        f: .3 + random() * .5, ph: random() * 6.283, c: palette[Math.floor(random() * palette.length)] });
    }
    if (!well.x) { well.x = width * .5; well.y = height * .5; }
    sync();
  }
  hero.addEventListener('pointermove', (e) => {
    if (paused) return;
    const r = hero.getBoundingClientRect();
    pointer.x = e.clientX - r.left; pointer.y = e.clientY - r.top;
    pointer.active = true;
  }, { passive: true });
  hero.addEventListener('pointerleave', () => { pointer.active = false; });
  button.addEventListener('click', () => { paused = !paused; pointer.active = false; sync(); });
  motion.addEventListener('change', () => { paused = motion.matches; sync(); });
  document.addEventListener('visibilitychange', sync);
  new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; sync(); }).observe(hero);
  let rz; new ResizeObserver(() => { cancelAnimationFrame(rz); rz = requestAnimationFrame(resize); }).observe(hero);
  document.fonts?.ready.then(resize);
})();
