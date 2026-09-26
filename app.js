const root = document.documentElement;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
const hasGsap = !!(window.gsap && window.ScrollTrigger);
const animate = hasGsap && !reducedMotion;
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
let lenis;

window.__ready = true;
if (!animate) root.classList.remove('motion');

/* ---------- Text splitting ---------- */
function splitChars(el) {
  const walk = node => {
    [...node.childNodes].forEach(child => {
      if (child.nodeType === 3) {
        const frag = document.createDocumentFragment();
        child.textContent.split(/(\s+)/).forEach(part => {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.append(part); return; }
          const word = document.createElement('span');
          word.style.cssText = 'display:inline-block;white-space:nowrap';
          [...part].forEach(c => {
            const s = document.createElement('span');
            s.className = 'ch';
            s.textContent = c;
            word.append(s);
          });
          frag.append(word);
        });
        child.replaceWith(frag);
      } else if (child.nodeType === 1) walk(child);
    });
  };
  walk(el);
  return $$('.ch', el);
}

function splitWords(el) {
  el.innerHTML = el.textContent.trim().split(/\s+/).map(w => `<span class="w">${w}</span>`).join(' ');
  return $$('.w', el);
}

/* ---------- Clock, year ---------- */
const clockFmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', second: '2-digit' });
const tick = () => $$('[data-clock]').forEach(el => { el.textContent = clockFmt.format(new Date()); });
tick();
setInterval(tick, 1000);
$$('[data-year]').forEach(el => { el.textContent = new Date().getFullYear(); });

/* ---------- Mobile menu ---------- */
const burger = $('.nav__burger');
const menu = $('#menu');
function setMenu(open) {
  burger.setAttribute('aria-expanded', open);
  burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  menu.hidden = !open;
  document.body.style.overflow = open ? 'hidden' : '';
  open ? lenis?.stop() : lenis?.start();
  if (open && animate) gsap.from($$('a', menu), { yPercent: 60, opacity: 0, stagger: .06, duration: .7, ease: 'expo.out' });
}
burger.addEventListener('click', () => setMenu(burger.getAttribute('aria-expanded') !== 'true'));
$$('a', menu).forEach(a => a.addEventListener('click', () => setMenu(false)));
addEventListener('keydown', e => { if (e.key === 'Escape' && !menu.hidden) { setMenu(false); burger.focus(); } });

/* ---------- Code editor (typed, highlighted) ---------- */
const SNIPPETS = {
  cpp: `#include <bits/stdc++.h>
using namespace std;

// indices of the two numbers that add up to target
vector<int> twoSum(vector<int>& nums, int target) {
    unordered_map<int, int> seen;
    for (int i = 0; i < nums.size(); i++) {
        int need = target - nums[i];
        if (seen.count(need)) return {seen[need], i};
        seen[nums[i]] = i;
    }
    return {};
}`,
  java: `import java.util.*;

class Solution {
    // indices of the two numbers that add up to target
    public int[] twoSum(int[] nums, int target) {
        Map<Integer, Integer> seen = new HashMap<>();
        for (int i = 0; i < nums.length; i++) {
            int need = target - nums[i];
            if (seen.containsKey(need))
                return new int[]{seen.get(need), i};
            seen.put(nums[i], i);
        }
        return new int[0];
    }
}`
};
const KEYWORDS = new Set('include using namespace return for if else new class public private static import while break continue'.split(' '));
const TYPES = new Set('int void vector unordered_map std Map Integer HashMap Solution String bool long char'.split(' '));

function tokenize(src) {
  const re = /(\/\/.*)|("[^"]*"|<bits\/stdc\+\+\.h>)|(#\w+)|(\b\d+\b)|([A-Za-z_]\w*)(?=\s*\()|([A-Za-z_]\w*)|(\s+|.)/g;
  const out = [];
  let m;
  while ((m = re.exec(src))) {
    const [t, com, str, pre, num, fn, id] = m;
    let cls = '';
    if (com) cls = 'tk-c';
    else if (str) cls = 'tk-s';
    else if (pre) cls = 'tk-k';
    else if (num) cls = 'tk-n';
    else if (fn) cls = KEYWORDS.has(fn) ? 'tk-k' : 'tk-f';
    else if (id) cls = KEYWORDS.has(id) ? 'tk-k' : TYPES.has(id) ? 'tk-t' : '';
    out.push([cls, t]);
  }
  return out;
}

const codeEl = $('[data-code]');
let typeRun = 0;
function renderCode(lang, instant) {
  const run = ++typeRun;
  const tokens = tokenize(SNIPPETS[lang]);
  codeEl.textContent = '';
  if (instant) {
    tokens.forEach(([cls, t]) => {
      const s = document.createElement('span');
      if (cls) s.className = cls;
      s.textContent = t;
      codeEl.append(s);
    });
    return;
  }
  // time-based typing: ~110 chars per second, catches up if the tab was throttled
  const spans = tokens.map(([cls]) => {
    const s = document.createElement('span');
    if (cls) s.className = cls;
    codeEl.append(s);
    return s;
  });
  const total = tokens.reduce((n, [, t]) => n + t.length, 0);
  const start = performance.now();
  let typed = 0;
  const step = now => {
    if (run !== typeRun) return;
    const target = Math.min(total, Math.floor((now - start) / 1000 * 110));
    if (target > typed) {
      let left = target;
      tokens.forEach(([, t], i) => {
        const n = Math.max(0, Math.min(t.length, left));
        if (spans[i].textContent.length !== n) spans[i].textContent = t.slice(0, n);
        left -= t.length;
      });
      typed = target;
    }
    if (typed < total) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
$$('.editor__tabs button').forEach(btn => btn.addEventListener('click', () => {
  $$('.editor__tabs button').forEach(b => b.setAttribute('aria-selected', b === btn));
  renderCode(btn.dataset.lang, !animate);
}));

/* ---------- Spotlight cards ---------- */
if (finePointer) {
  $$('[data-spot]').forEach(el => el.addEventListener('pointermove', e => {
    const r = el.getBoundingClientRect();
    el.style.setProperty('--mx', `${e.clientX - r.left}px`);
    el.style.setProperty('--my', `${e.clientY - r.top}px`);
  }));
}

/* ---------- Sorting visualizer ---------- */
const viz = (() => {
  const barsEl = $('[data-bars]');
  const playBtn = $('[data-play]');
  const statusEl = $('[data-status]');
  const cmpEl = $('[data-cmp]'), swpEl = $('[data-swp]'), bigEl = $('[data-big]');
  const speedEl = $('[data-speed]');
  const BIG = { bubble: 'O(n²)', insertion: 'O(n²)', merge: 'O(n log n)', quick: 'O(n log n) avg' };
  const NAMES = { bubble: 'Bubble sort', insertion: 'Insertion sort', merge: 'Merge sort', quick: 'Quick sort' };
  let algo = 'bubble', arr = [], bars = [], gen = null, playing = false, done = false, cmp = 0, swp = 0, marked = [], acc = 0, last = 0;

  const size = () => (innerWidth < 700 ? 26 : 48);

  function* bubble(a) {
    for (let i = 0; i < a.length - 1; i++) {
      let swapped = false;
      for (let j = 0; j < a.length - i - 1; j++) {
        yield ['cmp', j, j + 1];
        if (a[j] > a[j + 1]) { [a[j], a[j + 1]] = [a[j + 1], a[j]]; swapped = true; yield ['swap', j, j + 1]; }
      }
      yield ['done', a.length - i - 1];
      if (!swapped) break;
    }
  }
  function* insertion(a) {
    for (let i = 1; i < a.length; i++) {
      for (let j = i; j > 0; j--) {
        yield ['cmp', j - 1, j];
        if (a[j - 1] <= a[j]) break;
        [a[j - 1], a[j]] = [a[j], a[j - 1]];
        yield ['swap', j - 1, j];
      }
    }
  }
  function* merge(a, lo = 0, hi = a.length - 1) {
    if (lo >= hi) return;
    const mid = (lo + hi) >> 1;
    yield* merge(a, lo, mid);
    yield* merge(a, mid + 1, hi);
    const left = a.slice(lo, mid + 1), right = a.slice(mid + 1, hi + 1);
    let i = 0, k = lo, r = 0;
    while (i < left.length && r < right.length) {
      yield ['cmp', lo + i, mid + 1 + r];
      a[k] = left[i] <= right[r] ? left[i++] : right[r++];
      yield ['set', k++];
    }
    while (i < left.length) { a[k] = left[i++]; yield ['set', k++]; }
    while (r < right.length) { a[k] = right[r++]; yield ['set', k++]; }
  }
  function* quick(a, lo = 0, hi = a.length - 1) {
    if (lo >= hi) { if (lo === hi) yield ['done', lo]; return; }
    const pivot = a[hi];
    let i = lo;
    for (let j = lo; j < hi; j++) {
      yield ['cmp', j, hi, hi];
      if (a[j] < pivot) { [a[i], a[j]] = [a[j], a[i]]; if (i !== j) yield ['swap', i, j, hi]; i++; }
    }
    [a[i], a[hi]] = [a[hi], a[i]];
    yield ['swap', i, hi];
    yield ['done', i];
    yield* quick(a, lo, i - 1);
    yield* quick(a, i + 1, hi);
  }
  const ALGOS = { bubble, insertion, merge, quick };

  function draw(i) { bars[i].style.height = `${arr[i]}%`; }
  function clearMarks() { marked.forEach(i => bars[i]?.classList.remove('is-cmp', 'is-swap', 'is-pivot')); marked = []; }
  function mark(i, cls) { bars[i].classList.add(cls); marked.push(i); }

  function reset() {
    pause();
    const n = size();
    arr = Array.from({ length: n }, (_, i) => Math.round(8 + (i / (n - 1)) * 92));
    for (let i = n - 1; i > 0; i--) { const r = Math.floor(Math.random() * (i + 1)); [arr[i], arr[r]] = [arr[r], arr[i]]; }
    barsEl.innerHTML = arr.map(v => `<i style="height:${v}%"></i>`).join('');
    bars = $$('i', barsEl);
    gen = ALGOS[algo](arr);
    done = false; cmp = 0; swp = 0; marked = [];
    cmpEl.textContent = swpEl.textContent = '0';
    bigEl.textContent = BIG[algo];
    statusEl.textContent = 'Ready';
    playBtn.textContent = 'Play';
  }

  function step() {
    clearMarks();
    const { value, done: end } = gen.next();
    if (end) { finish(); return false; }
    const [type, a, b, p] = value;
    if (type === 'cmp') { cmp++; mark(a, 'is-cmp'); mark(b, 'is-cmp'); }
    if (type === 'swap') { swp++; draw(a); draw(b); mark(a, 'is-swap'); mark(b, 'is-swap'); }
    if (type === 'set') { swp++; draw(a); mark(a, 'is-swap'); }
    if (type === 'done') bars[a].classList.add('is-done');
    if (p !== undefined) mark(p, 'is-pivot');
    return true;
  }

  function finish() {
    playing = false; done = true;
    clearMarks();
    playBtn.textContent = 'Replay';
    statusEl.textContent = `Sorted in ${cmp} comparisons`;
    cmpEl.textContent = cmp; swpEl.textContent = swp;
    // green sweep across the finished array
    bars.forEach((bar, i) => setTimeout(() => bar.classList.add('is-done'), reducedMotion ? 0 : i * 12));
  }

  function loop(now) {
    if (!playing) return;
    const perSec = 2 ** (+speedEl.value + 2); // 8 to 4096 steps a second
    acc += Math.min(now - last, 100) / 1000 * perSec;
    last = now;
    while (acc >= 1 && playing) { acc--; if (!step()) break; }
    cmpEl.textContent = cmp; swpEl.textContent = swp;
    requestAnimationFrame(loop);
  }

  function play() {
    if (done) reset();
    playing = true; acc = 0; last = performance.now();
    playBtn.textContent = 'Pause';
    statusEl.textContent = `Running ${NAMES[algo]}`;
    requestAnimationFrame(loop);
  }
  function pause() {
    if (!playing) return;
    playing = false;
    playBtn.textContent = 'Play';
    statusEl.textContent = 'Paused';
  }

  playBtn.addEventListener('click', () => (playing ? pause() : play()));
  $('[data-shuffle]').addEventListener('click', reset);
  $$('[data-algo]').forEach(btn => btn.addEventListener('click', () => {
    $$('[data-algo]').forEach(b => b.setAttribute('aria-checked', b === btn));
    algo = btn.dataset.algo;
    reset();
    play();
  }));
  let lastSize = size();
  addEventListener('resize', () => { if (size() !== lastSize) { lastSize = size(); reset(); } });
  reset();

  // play once on its own the first time it scrolls into view
  if (!reducedMotion && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { io.disconnect(); setTimeout(play, 500); } }, { threshold: .5 });
    io.observe(barsEl);
  }
  return { play, pause };
})();

/* ---------- Scroll helper ---------- */
function goTo(target) {
  const el = target === 0 ? 0 : typeof target === 'string' ? $(target) : target;
  if (el === null) return;
  if (lenis) lenis.scrollTo(el, { duration: 1.6 });
  else if (el === 0) scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' });
  else el.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' });
}

/* ---------- Toast ---------- */
const toastEl = $('.toast');
let toastTimer;
function toast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add('is-on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('is-on'), 2200);
}

/* ---------- Command palette (Cmd/Ctrl + K) ---------- */
(() => {
  const dlg = $('.palette');
  const input = $('.palette__input');
  const list = $('.palette__list');
  const isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
  $$('[data-mod]').forEach(k => { k.textContent = isMac ? '⌘' : 'Ctrl'; });
  const commands = [
    { label: 'About', hint: 'Section', run: () => goTo('#about') },
    { label: 'Toolkit', hint: 'Section', run: () => goTo('#skills') },
    { label: 'DSA', hint: 'Section', run: () => goTo('#dsa') },
    { label: 'Sorting visualizer', hint: 'Section', run: () => goTo('#viz') },
    { label: 'Right now', hint: 'Section', run: () => goTo('#now') },
    { label: 'Contact', hint: 'Section', run: () => goTo('#contact') },
    { label: 'Open LinkedIn', hint: 'Link', run: () => open('https://www.linkedin.com/in/anisha-saha-955892325/', '_blank', 'noopener') },
    { label: 'Open GitHub', hint: 'Link', run: () => open('https://github.com/anishasaha054260-web', '_blank', 'noopener') },
    { label: 'Copy link to this site', hint: 'Action', run: () => navigator.clipboard?.writeText(location.origin + location.pathname).then(() => toast('Link copied'), () => toast('Could not copy')) },
    { label: 'Run quick sort', hint: 'Action', run: () => { goTo('#viz'); setTimeout(() => $('[data-algo="quick"]').click(), 900); } },
    { label: 'Back to top', hint: 'Action', run: () => goTo(0) }
  ];
  let shown = [], sel = 0;

  function render() {
    const q = input.value.trim().toLowerCase();
    shown = commands.filter(c => c.label.toLowerCase().includes(q) || c.hint.toLowerCase().includes(q));
    sel = Math.min(sel, Math.max(0, shown.length - 1));
    list.innerHTML = shown.length
      ? shown.map((c, i) => `<li role="option" id="pc-${i}" aria-selected="${i === sel}" data-i="${i}"><span>${c.label}</span><small>${c.hint}</small></li>`).join('')
      : '<li class="palette__empty">Nothing matches that</li>';
    input.setAttribute('aria-activedescendant', shown.length ? `pc-${sel}` : '');
    list.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
  }
  function openPalette() {
    if (dlg.open) return;
    input.value = ''; sel = 0; render();
    dlg.showModal();
    lenis?.stop();
    input.focus();
  }
  function close() { if (dlg.open) dlg.close(); }
  function runSel() { const c = shown[sel]; if (!c) return; close(); c.run(); }

  dlg.addEventListener('close', () => lenis?.start());
  dlg.addEventListener('click', e => { if (e.target === dlg) close(); });
  input.addEventListener('input', () => { sel = 0; render(); });
  input.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown') { e.preventDefault(); sel = (sel + 1) % Math.max(1, shown.length); render(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); sel = (sel - 1 + shown.length) % Math.max(1, shown.length); render(); }
    else if (e.key === 'Enter') { e.preventDefault(); runSel(); }
  });
  list.addEventListener('click', e => { const li = e.target.closest('[data-i]'); if (li) { sel = +li.dataset.i; runSel(); } });
  list.addEventListener('pointermove', e => { const li = e.target.closest('[data-i]'); if (li && +li.dataset.i !== sel) { sel = +li.dataset.i; render(); } });
  $$('[data-palette]').forEach(b => b.addEventListener('click', openPalette));
  addEventListener('keydown', e => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); dlg.open ? close() : openPalette(); }
  });
})();

/* ---------- Scramble nav links on hover ---------- */
if (finePointer && !reducedMotion) {
  const glyphs = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ<>/{}#*';
  $$('.nav__links a').forEach(a => {
    const text = a.textContent;
    let raf;
    a.addEventListener('pointerenter', () => {
      cancelAnimationFrame(raf);
      const start = performance.now();
      const frame = now => {
        const p = Math.min(1, (now - start) / 380);
        const solid = Math.floor(p * text.length);
        a.textContent = [...text].map((ch, i) => (i < solid || ch === ' ' ? ch : glyphs[Math.floor(Math.random() * glyphs.length)])).join('');
        if (p < 1) raf = requestAnimationFrame(frame);
      };
      raf = requestAnimationFrame(frame);
    });
  });
}

/* ---------- Tab title when the visitor looks away ---------- */
const baseTitle = document.title;
document.addEventListener('visibilitychange', () => {
  document.title = document.hidden ? 'Come back soon | Anisha' : baseTitle;
});

/* ---------- Static fallback ---------- */
if (!animate) {
  renderCode('cpp', true);
  $('.hero__name').setAttribute('aria-label', 'Anisha Saha');
  const nav = $('.nav');
  addEventListener('scroll', () => nav.classList.toggle('is-scrolled', scrollY > 40), { passive: true });
} else {
  initMotion();
}

function initMotion() {
  gsap.registerPlugin(ScrollTrigger);

  /* Smooth scroll */
  if (window.Lenis) {
    lenis = new Lenis({ lerp: .085 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    lenis.stop();
  }
  $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const id = a.getAttribute('href');
    if (id !== '#top' && !$(id)) return;
    e.preventDefault();
    goTo(id === '#top' ? 0 : id);
  }));

  /* Split text up front */
  const nameChars = $$('.hero__line').map(splitChars);
  const lightWords = splitWords($('[data-light]'));
  const splitTitles = $$('[data-split]').map(el => ({ el, chars: splitChars(el) }));

  /* Cursor */
  if (finePointer) {
    const cursor = $('.cursor'), dot = $('.cursor__dot'), ring = $('.cursor__ring'), label = $('.cursor__label');
    const dx = gsap.quickTo(dot, 'x', { duration: .1 }), dy = gsap.quickTo(dot, 'y', { duration: .1 });
    const rx = gsap.quickTo(ring, 'x', { duration: .45, ease: 'power3' }), ry = gsap.quickTo(ring, 'y', { duration: .45, ease: 'power3' });
    let shown = false;
    addEventListener('pointermove', e => {
      if (!shown) { shown = true; gsap.set([dot, ring], { x: e.clientX, y: e.clientY }); gsap.to([dot, ring], { opacity: 1, duration: .3 }); }
      dx(e.clientX); dy(e.clientY); rx(e.clientX); ry(e.clientY);
    });
    document.addEventListener('pointerover', e => {
      const t = e.target.closest('a, button, [data-cursor]');
      cursor.classList.toggle('is-hover', !!t && !t.dataset.cursor);
      cursor.classList.toggle('is-label', !!t?.dataset.cursor);
      if (t?.dataset.cursor) label.textContent = t.dataset.cursor;
    });
    document.addEventListener('pointerleave', () => gsap.to([dot, ring], { opacity: 0 }));
    document.addEventListener('pointerenter', () => gsap.to([dot, ring], { opacity: 1 }));
  }

  /* Magnetic */
  if (finePointer) {
    $$('[data-magnetic]').forEach(el => {
      const xTo = gsap.quickTo(el, 'x', { duration: .6, ease: 'elastic.out(1, .4)' });
      const yTo = gsap.quickTo(el, 'y', { duration: .6, ease: 'elastic.out(1, .4)' });
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect();
        xTo((e.clientX - r.left - r.width / 2) * .35);
        yTo((e.clientY - r.top - r.height / 2) * .35);
      });
      el.addEventListener('pointerleave', () => { xTo(0); yTo(0); });
    });
  }

  /* Loader, then hero intro */
  const img = $('.hero__photo img');
  const cut = $('.hero__cut');
  let heroReady = false;
  // everything the intro needs, capped at 5s so a stalled decode can never trap the loader
  const ready = Promise.race([
    Promise.all([
      img.decode ? img.decode().catch(() => {}) : Promise.resolve(),
      document.fonts ? document.fonts.ready : Promise.resolve()
    ]),
    new Promise(r => setTimeout(r, 5000))
  ]);
  const count = { v: 0 };
  const num = $('.loader__num');
  const loaderTl = gsap.timeline();
  loaderTl
    .to('.loader__name span', { y: 0, stagger: .05, duration: .9, ease: 'expo.out' })
    .to(count, { v: 88, duration: 1.1, ease: 'power2.inOut', onUpdate: () => { num.textContent = Math.round(count.v); } }, 0)
    .to('.loader__bar i', { scaleX: .88, duration: 1.1, ease: 'power2.inOut' }, 0);

  ready.then(() => loaderTl.then(() => {
    gsap.timeline()
      .to(count, { v: 100, duration: .35, onUpdate: () => { num.textContent = Math.round(count.v); } })
      .to('.loader__bar i', { scaleX: 1, duration: .35 }, '<')
      .to('.loader__name span', { yPercent: -110, stagger: .04, duration: .6, ease: 'expo.in' })
      .to('.loader', { clipPath: 'inset(0 0 100% 0)', duration: 1, ease: 'expo.inOut' }, '-=.2')
      .set('.loader', { display: 'none' })
      .add(heroIntro(), '-=.55');
  }));

  function heroIntro() {
    const tl = gsap.timeline({ onComplete: () => lenis?.start() });
    tl.to(nameChars[0], { y: 0, duration: 1.3, stagger: .05, ease: 'expo.out' })
      .to(nameChars[1], { y: 0, duration: 1.3, stagger: .05, ease: 'expo.out' }, '<.12')
      // she swings in from the right in 3D, out of focus, and lands sharp
      .fromTo(cut, { xPercent: 62, rotationY: -40, rotationZ: 6, opacity: 0, filter: 'blur(18px)', transformPerspective: 1100, transformOrigin: '50% 100%' },
        { xPercent: 0, rotationY: 0, rotationZ: 0, opacity: 1, filter: 'blur(0px)', duration: 1.9, ease: 'expo.out', clearProps: 'filter' }, '<.1')
      .fromTo('.hero__sheen', { backgroundPosition: '160% 0' }, { backgroundPosition: '-60% 0', duration: 1.4, ease: 'power2.inOut' }, '-=.9')
      .add(() => {
        gsap.to(cut, { y: -7, duration: 3.2, repeat: -1, yoyo: true, ease: 'sine.inOut' });
        gsap.fromTo('.hero__sheen', { backgroundPosition: '160% 0' }, { backgroundPosition: '-60% 0', duration: 1.6, ease: 'power2.inOut', repeat: -1, repeatDelay: 6, delay: 6 });
      }, '+=.4');
    tl.fromTo('.hero__ring', { scale: .6, opacity: 0 }, { scale: 1, opacity: 1, duration: 1.6, ease: 'expo.out' }, '<.2')
      .fromTo('.chip', { opacity: 0, scale: .6, y: 30 }, { opacity: 1, scale: 1, y: 0, duration: 1, stagger: .1, ease: 'back.out(1.8)' }, '-=1')
      .to(['.hero__meta', '.nav'], { opacity: 1, duration: .8, stagger: .1 }, '<.2')
      .add(() => {
        heroReady = true;
        $$('.chip').forEach((c, i) => gsap.to(c, { yPercent: i % 2 ? -32 : 32, duration: 2.4 + i * .4, repeat: -1, yoyo: true, ease: 'sine.inOut' }));
      });
    return tl;
  }

  /* Hero mouse parallax */
  if (finePointer) {
    const layers = [
      ...$$('.chip').map(el => ({ el, d: +el.dataset.depth * 26 })),
      { el: $('.hero__photo'), d: 10 },
      { el: $('.hero__name'), d: -18 },
      { el: $('.hero__glow'), d: 40 }
    ].map(l => ({ ...l, x: gsap.quickTo(l.el, 'x', { duration: 1, ease: 'power3' }), y: gsap.quickTo(l.el, 'y', { duration: 1, ease: 'power3' }) }));
    // subtle 3D tilt: she turns slightly toward the cursor
    gsap.set(cut, { transformPerspective: 1100, transformOrigin: '50% 100%' });
    const tiltY = gsap.quickTo(cut, 'rotationY', { duration: 1.2, ease: 'power3' });
    const tiltX = gsap.quickTo(cut, 'rotationX', { duration: 1.2, ease: 'power3' });
    $('.hero').addEventListener('pointermove', e => {
      const nx = e.clientX / innerWidth - .5, ny = e.clientY / innerHeight - .5;
      layers.forEach(l => { l.x(nx * l.d); l.y(ny * l.d); });
      if (heroReady) { tiltY(nx * 16); tiltX(ny * -7); }
    });
    $('.hero').addEventListener('pointerleave', () => { if (heroReady) { tiltY(0); tiltX(0); } });
  }

  /* Hero scroll-out */
  gsap.timeline({ scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } })
    .to('.hero__line--first', { xPercent: -18, opacity: .2, ease: 'none' }, 0)
    .to('.hero__line--last', { xPercent: 18, opacity: .2, ease: 'none' }, 0)
    .to(cut, { yPercent: 12, scale: .94, ease: 'none' }, 0)
    .to('.hero__chips', { yPercent: -30, opacity: 0, ease: 'none' }, 0)
    .to('.hero__meta', { opacity: 0, y: -40, ease: 'none' }, 0);

  /* Rotating word */
  const words = ['C++', 'Java', 'React', 'Node.js', 'JavaScript'];
  const roller = $('.roller__word');
  let wi = 0;
  setInterval(() => {
    wi = (wi + 1) % words.length;
    gsap.timeline()
      .to(roller, { yPercent: -110, duration: .45, ease: 'power3.in' })
      .add(() => { roller.textContent = words[wi]; })
      .fromTo(roller, { yPercent: 110 }, { yPercent: 0, duration: .6, ease: 'expo.out' });
  }, 2200);

  /* Marquee reacting to scroll speed */
  const track = $('.marquee__track');
  const loop = gsap.to(track, { xPercent: -50, duration: 26, ease: 'none', repeat: -1 });
  let skewTo = gsap.quickTo(track, 'skewX', { duration: .5, ease: 'power3' });
  ScrollTrigger.create({
    onUpdate: self => {
      const v = self.getVelocity();
      const speed = gsap.utils.clamp(1, 6, 1 + Math.abs(v) / 400);
      gsap.to(loop, { timeScale: speed * (self.direction < 0 ? -1 : 1), duration: .3, overwrite: true });
      skewTo(gsap.utils.clamp(-8, 8, v / -300));
      gsap.delayedCall(.25, () => { skewTo(0); gsap.to(loop, { timeScale: self.direction < 0 ? -1 : 1, duration: 1 }); });
    }
  });

  /* About: words light up */
  gsap.to(lightWords, {
    opacity: 1, stagger: .05, ease: 'none',
    scrollTrigger: { trigger: '.about__statement', start: 'top 80%', end: 'bottom 45%', scrub: true }
  });

  /* Titles: characters rise */
  splitTitles.forEach(({ el, chars }) => {
    gsap.from(chars, {
      yPercent: 110, rotate: 6, opacity: 0, duration: 1.1, stagger: .025, ease: 'expo.out',
      clearProps: 'transform', // a leftover transform makes Chrome trim descenders (g, y, p)
      scrollTrigger: { trigger: el, start: 'top 85%' }
    });
  });

  /* Cards and grids */
  ScrollTrigger.batch('.card, .bento__cell, .stack li, .topics li, .viz__box', {
    start: 'top 90%',
    onEnter: els => gsap.fromTo(els, { y: 50, opacity: 0 }, { y: 0, opacity: 1, duration: 1, stagger: .06, ease: 'expo.out', overwrite: true })
  });
  gsap.set('.card, .bento__cell, .stack li, .topics li, .viz__box', { opacity: 0 });

  /* Editor types itself when visible */
  gsap.from('.editor', {
    y: 80, rotateX: 12, opacity: 0, duration: 1.4, ease: 'expo.out', transformPerspective: 1200,
    scrollTrigger: { trigger: '.editor', start: 'top 85%', onEnter: () => renderCode('cpp'), once: true }
  });

  /* Now: horizontal pinned scroll on desktop */
  const mm = gsap.matchMedia();
  mm.add('(min-width: 701px)', () => {
    const nowTrack = $('.now__track');
    const dist = () => nowTrack.scrollWidth - innerWidth;
    gsap.to(nowTrack, {
      x: () => -dist(), ease: 'none',
      scrollTrigger: { trigger: '.now__pin', start: 'top top', end: () => `+=${dist()}`, pin: true, scrub: 1, invalidateOnRefresh: true, anticipatePin: 1 }
    });
    gsap.from('.panel', { opacity: 0, y: 60, rotate: 3, stagger: .12, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: '.now', start: 'top 70%' } });
  });
  mm.add('(max-width: 700px)', () => {
    $$('.panel').forEach(p => gsap.from(p, { opacity: 0, y: 60, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: p, start: 'top 88%' } }));
  });

  /* Contact */
  gsap.from('.orb', { scale: 0, rotate: -90, duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: '.contact__row', start: 'top 90%' } });
  gsap.from('.contact__links li', { x: -40, opacity: 0, stagger: .1, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: '.contact__row', start: 'top 90%' } });
  gsap.from('.footer__big', { yPercent: 60, ease: 'none', scrollTrigger: { trigger: '.footer', start: 'top bottom', end: 'bottom bottom', scrub: true } });

  /* Nav: hide on scroll down, active section, progress */
  const nav = $('.nav');
  const progress = $('.progress');
  ScrollTrigger.create({
    start: 0, end: 'max',
    onUpdate: self => {
      nav.classList.toggle('is-scrolled', self.scroll() > 40);
      nav.classList.toggle('is-hidden', self.direction > 0 && self.scroll() > innerHeight * .8 && menu.hidden);
      gsap.set(progress, { scaleX: self.progress });
    }
  });
  $$('main section[id]').forEach(sec => {
    const link = $(`.nav__links a[href="#${sec.id}"]`);
    if (!link) return;
    ScrollTrigger.create({ trigger: sec, start: 'top 50%', end: 'bottom 50%', onToggle: s => link.classList.toggle('is-active', s.isActive) });
  });

  addEventListener('load', () => ScrollTrigger.refresh());
}
