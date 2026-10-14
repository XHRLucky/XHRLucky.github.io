/* Gemini-inspired flowing star field. Original code, no external runtime. */
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
  // Gemini gradient stops: blue → violet → rose
  const stops = [[71, 150, 227], [110, 130, 240], [145, 119, 199], [190, 110, 180], [202, 102, 115]];
  const pointer = { x: 0, y: 0, sx: 0, sy: 0, active: false, power: 0 };
  let width = 1, height = 1, dpr = 1, particles = [], time = 0;
  let frame = null, last = 0, inView = true, paused = motion.matches;
  let cx = 0, cy = 0, mx = 1, my = 1;
  let seed = 8417;
  const random = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const smooth = (a, b, x) => { const v = Math.max(0, Math.min(1, (x - a) / (b - a))); return v * v * (3 - 2 * v); };
  const colorAt = (t) => {
    const f = Math.max(0, Math.min(.999, t)) * (stops.length - 1), i = f | 0, k = f - i, a = stops[i], b = stops[i + 1];
    return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k].map(Math.round).join(',');
  };
  // Smooth pseudo-curl flow field from layered sines
  const flow = (x, y, t) => {
    const nx = x / width, ny = y / height;
    const a = Math.sin(nx * 3.1 + t * .11) + Math.cos(ny * 4.3 - t * .07) * .8 + Math.sin((nx + ny) * 2.2 + t * .05) * .6;
    return a * 1.15;
  };

  function spawn(p, anywhere) {
    p.x = anywhere ? random() * width : -20;
    p.y = random() * height;
    p.z = .25 + random() ** 1.8 * 1.0;          // depth: small = far
    p.vx = 0; p.vy = 0;
    p.life = 0;
    p.tw = random() * Math.PI * 2;
    p.c = colorAt(p.x / width * .7 + random() * .3);
    p.star = random() < .14;
  }

  function draw(dt = 0) {
    ctx.clearRect(0, 0, width, height);
    pointer.power += ((pointer.active && !paused ? 1 : 0) - pointer.power) * (1 - Math.exp(-dt * 4));
    pointer.sx += (pointer.x - pointer.sx) * (1 - Math.exp(-dt * 8));
    pointer.sy += (pointer.y - pointer.sy) * (1 - Math.exp(-dt * 8));
    ctx.globalCompositeOperation = 'lighter';
    const R = Math.min(220, width * .25);
    for (const p of particles) {
      if (dt) {
        const ang = flow(p.x, p.y, time);
        const sp = (22 + 38 * p.z);
        let ax = (Math.cos(ang) * .35 + .9) * sp, ay = Math.sin(ang) * sp * .55;
        if (pointer.power > .01) {
          const dx = p.x - pointer.sx, dy = p.y - pointer.sy, d = Math.hypot(dx, dy);
          if (d < R && d > .1) {
            const f = (1 - d / R) ** 2 * 260 * pointer.power * p.z;
            ax += (dx / d) * f - (dy / d) * f * .6;   // repel + swirl
            ay += (dy / d) * f + (dx / d) * f * .6;
          }
        }
        const e = 1 - Math.exp(-dt * 2.4);
        p.vx += (ax - p.vx) * e; p.vy += (ay - p.vy) * e;
        p.x += p.vx * dt; p.y += p.vy * dt; p.life += dt;
        if (p.x > width + 20 || p.y < -30 || p.y > height + 30) spawn(p, false);
      }
      const td = Math.max(Math.abs(p.x - cx) / mx, Math.abs(p.y - cy) / my);
      const clear = .12 + .88 * smooth(.75, 1.35, td);
      const edge = smooth(-20, 80, p.x) * smooth(0, 60, p.y) * (1 - smooth(height - 140, height, p.y));
      const twinkle = p.star ? .55 + .45 * Math.sin(time * 2.2 + p.tw) : 1;
      const alpha = Math.min(1, p.life * 1.5) * clear * edge * twinkle * (.25 + .7 * p.z);
      if (alpha < .015) continue;
      const size = p.star ? 1.1 + p.z * 1.4 : .6 + p.z * 1.2;
      const speed = Math.hypot(p.vx, p.vy) || 1;
      const len = Math.min(16, speed * .09 * p.z);
      ctx.strokeStyle = `rgba(${p.c},${alpha})`;
      ctx.lineWidth = size;
      ctx.beginPath();
      ctx.moveTo(p.x - p.vx / speed * len, p.y - p.vy / speed * len);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      if (p.star && alpha > .3) {
        ctx.fillStyle = `rgba(${p.c},${alpha * .07})`;
        ctx.beginPath(); ctx.arc(p.x, p.y, size * 2.4, 0, 6.283); ctx.fill();
      }
    }
    // Soft cursor glow
    if (pointer.power > .02) {
      const g = ctx.createRadialGradient(pointer.sx, pointer.sy, 0, pointer.sx, pointer.sy, R);
      g.addColorStop(0, `rgba(140,150,255,${.10 * pointer.power})`);
      g.addColorStop(1, 'rgba(140,150,255,0)');
      ctx.fillStyle = g; ctx.fillRect(pointer.sx - R, pointer.sy - R, R * 2, R * 2);
    }
    ctx.globalCompositeOperation = 'source-over';
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
    const count = width < 600 ? 520 : Math.min(1500, Math.round(width * height / 900));
    particles = Array.from({ length: count }, () => { const p = {}; spawn(p, true); p.life = 1; return p; });
    // Warm up so the static (reduced-motion) frame shows trails in the flow direction
    for (const p of particles) { const a = flow(p.x, p.y, 0), s = 22 + 38 * p.z; p.vx = (Math.cos(a) * .35 + .9) * s; p.vy = Math.sin(a) * s * .55; }
    sync();
  }
  hero.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch' || paused) return;
    const r = hero.getBoundingClientRect();
    pointer.x = e.clientX - r.left; pointer.y = e.clientY - r.top;
    if (!pointer.active) { pointer.sx = pointer.x; pointer.sy = pointer.y; }
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
