/* Scroll-linked motion: word reveal, hero parallax, marquee drift, progress, contact scale-in. */
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  // Split [data-words] text nodes into word spans (keeps inline markup like <em>).
  const groups = [...document.querySelectorAll('[data-words]')].map((el) => {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const nodes = []; while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const n of nodes) {
      const frag = document.createDocumentFragment();
      n.textContent.split(/(\s+)/).forEach((part) => {
        if (!part) return;
        if (/^\s+$/.test(part)) { frag.append(part); return; }
        const s = document.createElement('span'); s.className = 'w'; s.textContent = part; frag.append(s);
      });
      n.replaceWith(frag);
    }
    return { el, words: [...el.querySelectorAll('.w')] };
  });
  const hero = document.querySelector('.hero-content');
  const heroBox = document.querySelector('.hero');
  const track = document.querySelector('[data-shift]');
  const bar = document.querySelector('[data-progress]');
  const edu = document.querySelector('.education-list');
  const contact = document.querySelector('.contact');
  const clamp = (v) => Math.max(0, Math.min(1, v));
  const ease = (t) => 1 - Math.pow(1 - t, 3);
  let ticking = false;

  function update() {
    ticking = false;
    const vh = innerHeight;
    if (reduce.matches) {
      groups.forEach((g) => g.words.forEach((w) => w.style.setProperty('--o', 1)));
      [hero, track, contact].forEach((el) => el && (el.style.transform = '', el.style.opacity = ''));
      if (bar) bar.style.setProperty('--p', 1);
      return;
    }
    // Word-by-word reveal: complete once the block's top reaches ~42% of the viewport (or page end).
    for (const g of groups) {
      const r = g.el.getBoundingClientRect();
      const atEnd = scrollY + vh >= document.documentElement.scrollHeight - 4;
      const p = atEnd ? 1 : clamp((vh * .92 - r.top) / (vh * .5));
      const n = g.words.length;
      g.words.forEach((w, i) => w.style.setProperty('--o', (.16 + .84 * clamp(p * n - i)).toFixed(3)));
    }
    // Hero: content lifts, shrinks and fades as you scroll away.
    if (hero && heroBox) {
      const p = clamp(-heroBox.getBoundingClientRect().top / (heroBox.offsetHeight * .8));
      hero.style.transform = `translate3d(0, ${-p * 90}px, 0) scale(${1 - p * .08})`;
      hero.style.opacity = String(1 - ease(p) * .85);
    }
    // Marquee drifts horizontally with scroll.
    if (track) {
      const r = track.getBoundingClientRect();
      const p = (vh - r.top) / (vh + r.height);
      track.style.transform = `translate3d(${(-p * 35).toFixed(2)}%, 0, 0)`;
    }
    // Education progress line.
    if (bar && edu) {
      const r = edu.getBoundingClientRect();
      bar.style.setProperty('--p', clamp((vh * .6 - r.top) / r.height).toFixed(3));
    }
    // Contact card scales up into place.
    if (contact) {
      const r = contact.getBoundingClientRect();
      const p = ease(clamp((vh - r.top) / (vh * .7)));
      contact.style.transform = `scale(${(.9 + .1 * p).toFixed(4)})`;
    }
  }
  const request = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
  addEventListener('scroll', request, { passive: true });
  addEventListener('resize', request);
  reduce.addEventListener('change', request);
  update();
})();
