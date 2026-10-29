import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger);

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;

/* ───────────── spray paint canvases ───────────── */
function rng(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const gauss = (r) => (r() + r() + r() + r() - 2) * 1.2;

function catmull(pts, steps = 28) {
  const out = [];
  const p = [pts[0], ...pts, pts[pts.length - 1]];
  for (let i = 1; i < p.length - 2; i++) {
    for (let s = 0; s < steps; s++) {
      const t = s / steps, t2 = t * t, t3 = t2 * t;
      const f = (k) => 0.5 * ((2 * p[i][k]) + (-p[i - 1][k] + p[i + 1][k]) * t + (2 * p[i - 1][k] - 5 * p[i][k] + 4 * p[i + 1][k] - p[i + 2][k]) * t2 + (-p[i - 1][k] + 3 * p[i][k] - 3 * p[i + 1][k] + p[i + 2][k]) * t3);
      out.push([f(0), f(1)]);
    }
  }
  return out;
}

function drawSpray(canvas, strokes, seed = 7) {
  const box = canvas.getBoundingClientRect();
  if (!box.width) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  const W = (canvas.width = Math.round(box.width * dpr));
  const H = (canvas.height = Math.round(box.height * dpr));
  const ctx = canvas.getContext('2d');
  const r = rng(seed);
  const unit = Math.max(W, H * 0.62);
  ctx.clearRect(0, 0, W, H);

  for (const st of strokes) {
    const path = catmull(st.pts.map(([x, y]) => [x * W, y * H]));
    const wid = st.w * unit;
    // soft body
    ctx.globalCompositeOperation = 'source-over';
    for (let i = 0; i < path.length; i += 4) {
      const [x, y] = path[i];
      const g = ctx.createRadialGradient(x, y, 0, x, y, wid * 0.62);
      g.addColorStop(0, st.color + 'f2');
      g.addColorStop(0.55, st.color + 'cc');
      g.addColorStop(0.85, st.color + '40');
      g.addColorStop(1, st.color + '00');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x, y, wid * 0.62, 0, 6.283); ctx.fill();
    }
    // stippled fringe
    const n = Math.floor(path.length * wid * st.density * 0.045);
    for (let i = 0; i < n; i++) {
      const [x, y] = path[(r() * path.length) | 0];
      const a = r() * 6.283;
      const d = Math.abs(gauss(r)) * wid * 0.62;
      const px = x + Math.cos(a) * d, py = y + Math.sin(a) * d;
      const rad = (0.5 + r() * r() * 4.2) * dpr;
      ctx.globalAlpha = 0.35 + r() * 0.65;
      ctx.fillStyle = r() < (st.accentP || 0) ? st.accent : st.color;
      ctx.beginPath(); ctx.arc(px, py, rad, 0, 6.283); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}

const HERO_A = [
  { pts: [[-0.06, 0.02], [0.08, 0.1], [0.01, 0.26], [0.16, 0.36], [0.05, 0.5]], w: 0.09, color: '#6fedaa', density: 1.5 },
  { pts: [[0.1, -0.03], [0.24, 0.05], [0.36, 0.0]], w: 0.05, color: '#a9f5cd', density: 1.2 },
  { pts: [[0.84, -0.02], [0.95, 0.08], [1.06, 0.12]], w: 0.055, color: '#8cf1bb', density: 1.2 },
];
const HERO_B = [
  { pts: [[0.38, 0.98], [0.54, 0.78], [0.66, 0.9], [0.8, 0.7], [0.93, 0.82], [1.08, 0.66]], w: 0.062, color: '#1a9a5e', density: 1.8, accent: '#ff5e13', accentP: 0.05 },
  { pts: [[0.7, 0.96], [0.88, 0.86], [1.03, 0.94]], w: 0.045, color: '#22e883', density: 1.5 },
];
const CTA = [
  { pts: [[-0.06, 0.92], [0.12, 0.74], [0.28, 0.96], [0.48, 0.84]], w: 0.05, color: '#ffffff', density: 1.2 },
  { pts: [[0.62, 1.04], [0.8, 0.88], [1.05, 0.98]], w: 0.04, color: '#1f9d62', density: 1.3, accent: '#06201a', accentP: 0.06 },
  { pts: [[-0.05, 0.06], [0.1, 0.2], [0.3, 0.04]], w: 0.035, color: '#22e883', density: 1.1 },
];

const sprayA = $('#sprayA'), sprayB = $('#sprayB'), sprayC = $('#sprayC');
function paintAll() {
  drawSpray(sprayA, HERO_A, 11);
  drawSpray(sprayB, HERO_B, 23);
  drawSpray(sprayC, CTA, 41);
}
paintAll();
let lastW = innerWidth;
addEventListener('resize', () => {
  if (innerWidth === lastW) return;
  lastW = innerWidth;
  clearTimeout(window.__rt);
  window.__rt = setTimeout(paintAll, 200);
});

/* ───────────── form (mailto, no backend) ───────────── */
$('#form')?.addEventListener('submit', (e) => {
  e.preventDefault();
  const f = new FormData(e.target);
  const body = `Hi Pentrone,\n\n${f.get('msg') || ''}\n\nService: ${f.get('service')}\nName: ${f.get('name')}\nEmail: ${f.get('email')}`;
  location.href = `mailto:info@pentrone.org?subject=${encodeURIComponent('Project enquiry from ' + f.get('name'))}&body=${encodeURIComponent(body)}`;
});

if (reduce) {
  document.documentElement.classList.add('no-anim');
  $$('[data-count]').forEach((el) => (el.textContent = el.dataset.count));
  $$('.mrow').forEach((r) => (r.style.transform = 'none'));
} else {
  init();
}

function init() {
  /* smooth scroll */
  const lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 1, smoothWheel: true });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);

  $$('a[href^="#"]').forEach((a) =>
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      if (id.length < 2) return;
      const t = $(id);
      if (!t) return;
      e.preventDefault();
      lenis.scrollTo(t, { offset: id === '#work' ? -60 : 0, duration: 1.6 });
    })
  );

  /* progress + nav hide */
  const prog = $('#progress'), nav = $('#nav');
  lenis.on('scroll', ({ scroll, direction, limit }) => {
    prog.style.transform = `scaleX(${limit ? scroll / limit : 0})`;
    nav.classList.toggle('hide', direction === 1 && scroll > 240);
  });

  /* cursor + magnetic */
  if (fine) {
    const cur = $('#cursor');
    const cx = gsap.quickTo(cur, 'x', { duration: 0.35, ease: 'power3' });
    const cy = gsap.quickTo(cur, 'y', { duration: 0.35, ease: 'power3' });
    addEventListener('mousemove', (e) => { cur.classList.add('on'); cx(e.clientX); cy(e.clientY); });
    document.addEventListener('mouseover', (e) => cur.classList.toggle('big', !!e.target.closest('a, button, .wcard, input, select, textarea')));
    $$('[data-magnetic]').forEach((el) => {
      const mx = gsap.quickTo(el, 'x', { duration: 0.5, ease: 'elastic.out(1,.5)' });
      const my = gsap.quickTo(el, 'y', { duration: 0.5, ease: 'elastic.out(1,.5)' });
      el.addEventListener('mousemove', (e) => {
        const b = el.getBoundingClientRect();
        mx((e.clientX - b.left - b.width / 2) * 0.3);
        my((e.clientY - b.top - b.height / 2) * 0.4);
      });
      el.addEventListener('mouseleave', () => { mx(0); my(0); });
    });
  }

  /* ───── hero intro ───── */
  const chips = $$('[data-chip]');
  const rot = [-6, 7, -4];
  gsap.set(chips, { rotate: (i) => rot[i] });
  const tl = gsap.timeline({ defaults: { ease: 'expo.out' }, delay: 0.1 });
  tl.from('.hero .spray-a', { opacity: 0, duration: 2 }, 0)
    .from('.hero .spray-b', { opacity: 0, duration: 2 }, 0.1)
    .from('#heroTitle .line > span', { yPercent: 120, rotate: 4, duration: 1.4, stagger: 0.14 }, 0.2)
    .from(chips, { scale: 0, rotate: (i) => rot[i] + 40, duration: 1.3, stagger: 0.14, ease: 'elastic.out(1,.55)' }, 0.9)
    .from('[data-hero-in]', { y: 40, opacity: 0, duration: 1.1, stagger: 0.12, clearProps: 'opacity,transform' }, 1.0)
    .from('#nav > *', { opacity: 0, duration: 1, stagger: 0.1, clearProps: 'opacity' }, 0.5)
    .add(() => $$('#heroTitle .line').forEach((l) => (l.style.overflow = 'visible')), 2.2);

  chips.forEach((c, i) => gsap.to(c, { y: i % 2 ? 8 : -8, duration: 2.2 + i * 0.4, yoyo: true, repeat: -1, ease: 'sine.inOut' }));

  /* hero scroll parallax */
  const hs = { trigger: '#hero', start: 'top top', end: 'bottom top', scrub: true };
  gsap.fromTo('#sprayA', { yPercent: 0, scale: 1 }, { yPercent: 14, scale: 1.12, ease: 'none', scrollTrigger: hs });
  gsap.fromTo('#sprayB', { yPercent: 0, xPercent: 0 }, { yPercent: -22, xPercent: -4, ease: 'none', scrollTrigger: hs });
  gsap.fromTo('#heroTitle', { yPercent: 0 }, { yPercent: -14, ease: 'none', scrollTrigger: hs });
  chips.forEach((c, i) => gsap.fromTo(c, { xPercent: 0 }, { xPercent: [60, -80, 40][i], ease: 'none', scrollTrigger: hs }));
  gsap.fromTo('[data-hero-in]', { autoAlpha: 1, yPercent: 0 }, { autoAlpha: 0, yPercent: -40, ease: 'none', immediateRender: false, scrollTrigger: { trigger: '#hero', start: '45% top', end: '85% top', scrub: true } });

  if (fine) {
    const hero = $('#hero');
    const layers = [
      ['#sprayA', 14], ['#sprayB', -24], ['#heroTitle', 6],
    ].map(([s, d]) => ({ x: gsap.quickTo(s, 'x', { duration: 1.2, ease: 'power3' }), y: gsap.quickTo(s, 'y', { duration: 1.2, ease: 'power3' }), d }));
    hero.addEventListener('mousemove', (e) => {
      const nx = e.clientX / innerWidth - 0.5, ny = e.clientY / innerHeight - 0.5;
      layers.forEach((l) => { l.x(nx * l.d); l.y(ny * l.d); });
    });
  }

  /* ───── generic parallax ───── */
  $$('[data-speed]').forEach((el) => {
    if (innerWidth < 900 && el.classList.contains('float')) return;
    const s = parseFloat(el.dataset.speed);
    gsap.fromTo(el, { y: -s * 160 }, { y: s * 160, ease: 'none', scrollTrigger: { trigger: el.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } });
  });

  /* ───── word reveals ───── */
  $$('[data-words]').forEach((el) => {
    const words = [];
    (function walk(node) {
      [...node.childNodes].forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach((tok) => {
            if (!tok) return;
            if (/^\s+$/.test(tok)) return frag.append(tok);
            const s = document.createElement('span');
            s.className = 'w'; s.textContent = tok; words.push(s); frag.append(s);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1 && n.tagName !== 'BR' && !n.classList.contains('ic')) walk(n);
      });
    })(el);
    const tw = gsap.fromTo(words, { yPercent: 70, rotate: 5, opacity: 0 }, { yPercent: 0, rotate: 0, opacity: 1, duration: 1.2, stagger: 0.06, ease: 'expo.out', paused: true, onComplete: () => gsap.set(words, { clearProps: 'transform' }) });
    let played = false;
    const go = () => { if (!played) { played = true; tw.play(); } };
    ScrollTrigger.create({ trigger: el, start: 'top 88%', onEnter: go, onLeave: go, onToggle: (s) => s.isActive && go() });
  });

  $$('[data-rv]').forEach((el) => {
    const sib = [...el.parentElement.children].filter((n) => n.hasAttribute('data-rv'));
    const delay = Math.max(0, sib.indexOf(el)) * 0.1;
    let done = false;
    const play = () => {
      if (done) return;
      done = true;
      gsap.fromTo(el, { y: 50, opacity: 0 }, { y: 0, opacity: 1, duration: 1.1, delay, ease: 'expo.out', clearProps: 'transform' });
    };
    ScrollTrigger.create({ trigger: el, start: 'top 92%', onEnter: play, onLeave: play, onToggle: (s) => s.isActive && play() });
  });

  /* ───── horizontal work scroll ───── */
  const track = $('#track');
  const mm = gsap.matchMedia();
  mm.add('(min-width: 1px)', () => {
    const dist = () => Math.max(0, track.scrollWidth - innerWidth);
    const tween = gsap.to(track, {
      x: () => -dist(), ease: 'none',
      scrollTrigger: { trigger: '#hscroll', pin: true, scrub: 0.6, start: 'center center', end: () => '+=' + dist(), invalidateOnRefresh: true },
    });
    $$('.wcard:not(.end) .im').forEach((im) =>
      gsap.fromTo(im, { xPercent: -3 }, { xPercent: 3, ease: 'none', scrollTrigger: { trigger: im.parentElement, containerAnimation: tween, start: 'left right', end: 'right left', scrub: true } })
    );
  });

  /* ───── marquee ───── */
  const tweens = $$('[data-marquee]').map((row) => {
    const dir = parseFloat(row.dataset.marquee);
    row.innerHTML += row.innerHTML;
    return dir < 0
      ? gsap.fromTo(row, { xPercent: 0 }, { xPercent: -50, duration: 38, ease: 'none', repeat: -1 })
      : gsap.fromTo(row, { xPercent: -50 }, { xPercent: 0, duration: 46, ease: 'none', repeat: -1 });
  });
  const rows = $$('.mrow');
  const skew = rows.map((r) => gsap.quickTo(r, 'skewX', { duration: 0.5, ease: 'power3' }));
  ScrollTrigger.create({
    onUpdate: (self) => {
      const v = gsap.utils.clamp(-60, 60, self.getVelocity() / 120);
      tweens.forEach((t) => gsap.to(t, { timeScale: 1 + Math.abs(v) * 0.5, duration: 0.3, overwrite: true }).then?.(() => {}));
      skew.forEach((s) => s(-v * 0.35));
    },
  });
  ScrollTrigger.addEventListener('scrollEnd', () => tweens.forEach((t) => gsap.to(t, { timeScale: 1, duration: 1.2, overwrite: true })));

  /* ───── services stack ───── */
  const cards = $$('.scard');
  cards.forEach((c, i) => {
    gsap.set(c, { rotate: parseFloat(getComputedStyle(c).getPropertyValue('--r')) || 0 });
    gsap.from(c, { y: 120, opacity: 0, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: c, start: 'top 95%', once: true } });
    const next = cards[i + 1];
    if (!next) return;
    gsap.to(c, { scale: 0.93 - (cards.length - i) * 0.004, rotate: 0, yPercent: -2, ease: 'none', scrollTrigger: { trigger: next, start: 'top 90%', end: 'top 25%', scrub: true } });
  });

  /* ───── counters ───── */
  $$('[data-count]').forEach((el) => {
    const end = parseInt(el.dataset.count, 10);
    const o = { v: 0 };
    ScrollTrigger.create({
      trigger: el, start: 'top 92%', once: true,
      onEnter: () => gsap.to(o, { v: end, duration: 2.4, ease: 'power3.out', onUpdate: () => (el.textContent = Math.round(o.v)) }),
    });
  });

  /* ───── process ───── */
  gsap.to('#procFill', { scaleY: 1, ease: 'none', scrollTrigger: { trigger: '#procLine', start: 'top 60%', end: 'bottom 70%', scrub: true } });
  $$('.step').forEach((s) => ScrollTrigger.create({ trigger: s, start: 'top 62%', toggleClass: { targets: s, className: 'on' } }));

  /* ───── big sections ───── */
  gsap.to('#stats', { scale: 1, ease: 'none', scrollTrigger: { trigger: '#stats', start: 'top bottom', end: 'top 30%', scrub: true } });
  gsap.fromTo('#stats .stat .n', { yPercent: 30 }, { yPercent: -10, ease: 'none', scrollTrigger: { trigger: '#stats', start: 'top bottom', end: 'bottom top', scrub: true } });
  gsap.fromTo('#giantLogo', { yPercent: 40, scale: 0.9, opacity: 0.4 }, { yPercent: 0, scale: 1, opacity: 1, ease: 'none', scrollTrigger: { trigger: '.footer', start: 'top bottom', end: 'bottom bottom', scrub: true } });
  gsap.fromTo('#sprayC', { yPercent: 8 }, { yPercent: -8, ease: 'none', scrollTrigger: { trigger: '#contact', start: 'top bottom', end: 'bottom top', scrub: true } });

  addEventListener('load', () => ScrollTrigger.refresh());
}
