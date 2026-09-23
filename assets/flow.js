/* Original canvas particle field. No external runtime or copied demo code. */
(() => {
  const canvas = document.querySelector('#flow');
  const hero = document.querySelector('.hero');
  const button = document.querySelector('.motion-toggle');
  const ctx = canvas?.getContext('2d');
  if (!ctx) return;

  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const palette = ['69,91,228', '77,111,233', '119,78,208', '155,81,185', '206,113,119', '48,151,157'];
  const pointer = { x: -9999, y: -9999, active: false };
  let width = 1, height = 1, particles = [], time = 0;
  let frame = null, last = 0, inView = true, paused = motion.matches;
  let centerX = 0, centerY = 0, maskX = 1, maskY = 1;
  let seed = 8417;
  const random = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const smoothstep = (a, b, x) => { const v = Math.max(0, Math.min(1, (x - a) / (b - a))); return v * v * (3 - 2 * v); };

  function position(p, t) {
    // Travel through a gently twisting volume; perspective creates depth and liftoff.
    const depth = .52 + ((p.z - t * p.speed) % 3.2 + 3.2) % 3.2;
    const angle = p.angle + depth * .56 + t * .035;
    const ripple = Math.sin(depth * 2.1 + t * .24 + p.band) * .06;
    const radius = p.radius + ripple;
    return {
      x: width * (.5 + Math.cos(angle) * radius * .73 / depth),
      y: height * (.49 + Math.sin(angle) * radius * .93 / depth),
      depth
    };
  }

  function draw(dt = 0) {
    ctx.clearRect(0, 0, width, height);
    ctx.lineCap = 'round';
    for (const p of particles) {
      const here = position(p, time);
      const next = position(p, time + .025);
      let targetX = 0, targetY = 0;
      const dx = here.x - pointer.x, dy = here.y - pointer.y;
      const distance = Math.hypot(dx, dy);
      if (pointer.active && !paused && distance < 170 && distance > .01) {
        const force = (1 - distance / 170) ** 2 * 58;
        targetX = (dx - dy * .45) / distance * force;
        targetY = (dy + dx * .45) / distance * force;
      }
      const ease = 1 - Math.exp(-dt * 6);
      p.ox += (targetX - p.ox) * ease;
      p.oy += (targetY - p.oy) * ease;
      const x = here.x + p.ox, y = here.y + p.oy;
      if (x < -12 || x > width + 12 || y < -12 || y > height + 12) continue;

      // A soft rectangular clearing protects the profile without a visible white box.
      const textDistance = Math.max(Math.abs(x - centerX) / maskX, Math.abs(y - centerY) / maskY);
      const clearing = .035 + .965 * smoothstep(.88, 1.45, textDistance);
      const edge = smoothstep(0, 65, y) * (1 - smoothstep(height - 110, height, y));
      const fade = smoothstep(.52, .8, here.depth) * (1 - smoothstep(3.25, 3.72, here.depth));
      const alpha = p.alpha * clearing * edge * fade;
      if (alpha < .012) continue;
      const vx = next.x - here.x, vy = next.y - here.y;
      const norm = Math.hypot(vx, vy) || 1;
      const length = Math.min(11, (1.7 + 4.5 / here.depth) * p.size);
      ctx.strokeStyle = `rgba(${p.color},${alpha})`;
      ctx.lineWidth = Math.max(.7, Math.min(2.25, p.size * 1.75 / here.depth));
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + vx / norm * length, y + vy / norm * length);
      ctx.stroke();
    }
  }

  function tick(now) {
    const dt = Math.min((now - (last || now)) / 1000, .045);
    last = now;
    time += dt;
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
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const text = document.querySelector('.hero-content').getBoundingClientRect();
    centerX = text.left - rect.left + text.width / 2;
    centerY = text.top - rect.top + text.height / 2;
    maskX = Math.min(text.width / 2, width * .28);
    maskY = text.height / 2 + 8;
    seed = 8417;
    const count = width < 600 ? 1250 : Math.min(3300, Math.round(width * height / 335));
    particles = Array.from({ length: count }, (_, i) => {
      const band = i % 3;
      // Two broad winding ribbons, with a sparse third layer of free particles.
      const angle = band === 2 ? random() * Math.PI * 2 : band * Math.PI + (random() - .5) * 1.7;
      return { angle, band, z: random() * 3.2, radius: .85 + random() * .42,
        speed: .17 + random() * .07, size: .7 + random() * .8,
        alpha: .52 + random() * .42, color: palette[Math.floor(random() ** 1.6 * palette.length)], ox: 0, oy: 0 };
    });
    sync();
  }
  hero.addEventListener('pointermove', (event) => {
    if (event.pointerType === 'touch' || paused) return;
    const rect = hero.getBoundingClientRect();
    pointer.x = event.clientX - rect.left; pointer.y = event.clientY - rect.top; pointer.active = true;
  }, { passive: true });
  hero.addEventListener('pointerleave', () => { pointer.active = false; });
  button.addEventListener('click', () => { paused = !paused; pointer.active = false; sync(); });
  motion.addEventListener('change', () => { paused = motion.matches; sync(); });
  document.addEventListener('visibilitychange', sync);
  new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; sync(); }).observe(hero);
  new ResizeObserver(resize).observe(hero);
  document.fonts.ready.then(resize);
  resize();
})();
