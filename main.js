(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover:hover) and (pointer:fine)').matches;

  /* ---------- hero headline: split into measured lines, masked rise ---------- */
  function splitLines(el) {
    const text = el.dataset.text || (el.dataset.text = el.textContent.trim());
    el.textContent = '';
    const words = text.split(' ').map(w => {
      const s = document.createElement('span');
      s.textContent = w + ' ';
      s.style.display = 'inline-block';
      el.appendChild(s);
      return s;
    });
    const lines = [];
    let top = null;
    words.forEach(w => {
      const t = w.offsetTop;
      if (top === null || Math.abs(t - top) > 4) { lines.push([]); top = t; }
      lines[lines.length - 1].push(w.textContent);
    });
    el.textContent = '';
    el.setAttribute('aria-label', text);
    lines.forEach((l, i) => {
      const o = document.createElement('span');
      o.className = 'line';
      o.setAttribute('aria-hidden', 'true');
      const inner = document.createElement('span');
      inner.style.setProperty('--i', i);
      inner.textContent = l.join('').trim();
      o.appendChild(inner);
      el.appendChild(o);
    });
  }
  const h1 = $('[data-split]');
  const runSplit = () => h1 && splitLines(h1);
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(runSplit);

  /* ---------- scroll-scrubbed word reveal ---------- */
  const scrubs = $$('[data-scrub]').map(el => {
    const words = el.textContent.trim().split(/\s+/);
    el.textContent = '';
    const spans = words.map(w => {
      const s = document.createElement('span');
      s.className = 'w';
      s.textContent = w;
      el.append(s, ' ');
      return s;
    });
    return { el, spans };
  });

  /* ---------- fade-in observer ---------- */
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }), { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
  $$('[data-fade]').forEach(el => {
    const sib = el.parentElement.querySelectorAll(':scope > [data-fade]');
    if (sib.length > 1) el.style.setProperty('--d', (([...sib].indexOf(el)) % 4) * 0.08 + 's');
    io.observe(el);
  });

  /* ---------- parallax + scroll state (single rAF loop) ---------- */
  const nav = $('#nav');
  const bar = $('.progress');
  const par = $$('[data-parallax]');
  let lastY = scrollY, ticking = false, vel = 0;

  function frame() {
    ticking = false;
    const y = scrollY, vh = innerHeight;
    vel = y - lastY;

    nav.classList.toggle('solid', y > vh * 0.6);
    nav.classList.toggle('hide', y > vh * 0.6 && vel > 4 && y > lastY);
    if (vel < -4) nav.classList.remove('hide');
    lastY = y;

    const max = document.documentElement.scrollHeight - vh;
    bar.style.transform = `scaleX(${max > 0 ? y / max : 0})`;

    if (!reduce) par.forEach(img => {
      const r = img.parentElement.getBoundingClientRect();
      if (r.bottom < -100 || r.top > vh + 100) return;
      const k = parseFloat(img.dataset.parallax);
      const off = (r.top + r.height / 2 - vh / 2) * -k;
      const lim = (img.offsetHeight - r.height) / 2;
      img.style.translate = `0 ${Math.max(-lim, Math.min(lim, off))}px`;
    });

    scrubs.forEach(({ el, spans }) => {
      const r = el.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, (vh * 0.85 - r.top) / (vh * 0.55 + r.height * 0.5)));
      const n = Math.round(p * spans.length);
      spans.forEach((s, i) => s.classList.toggle('on', i < n));
    });
  }
  const req = () => { if (!ticking) { ticking = true; requestAnimationFrame(frame); } };
  addEventListener('scroll', req, { passive: true });
  let lastW = innerWidth;
  addEventListener('resize', () => { if (innerWidth !== lastW) { lastW = innerWidth; runSplit(); } req(); });
  frame();

  /* ---------- marquees: constant drift that surges with scroll velocity ---------- */
  $$('[data-marquee]').forEach(m => {
    const track = $('.marquee__track', m);
    const base = parseFloat(m.dataset.speed || 50) * parseFloat(m.dataset.marquee || -1);
    [...track.children].forEach(c => track.appendChild(c.cloneNode(true)));
    [...track.children].forEach(c => track.appendChild(c.cloneNode(true)));
    let x = 0, boost = 0, w = 0, paused = false, t0 = performance.now();
    const measure = () => { w = track.scrollWidth / 4; };
    measure(); addEventListener('load', measure); addEventListener('resize', measure);
    m.addEventListener('pointerenter', () => paused = true);
    m.addEventListener('pointerleave', () => paused = false);
    (function tick(t) {
      const dt = Math.min(0.05, (t - t0) / 1000); t0 = t;
      boost += (Math.abs(vel) * 0.25 - boost) * 0.08;
      const target = paused ? 0 : base * (1 + boost * 0.4);
      m._v = (m._v ?? target) + (target - (m._v ?? target)) * 0.08;
      if (!reduce) x += m._v * dt;
      if (w) { if (x < -w) x += w; if (x > 0) x -= w; }
      track.style.transform = `translate3d(${x}px,0,0)`;
      requestAnimationFrame(tick);
    })(t0);
  });

  /* ---------- hero card: magnetic tilt ---------- */
  if (fine) $$('[data-tilt]').forEach(c => {
    c.addEventListener('pointermove', e => {
      const r = c.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
      c.style.transition = 'box-shadow .5s';
      c.style.transform = `perspective(700px) rotateX(${-y * 5}deg) rotateY(${x * 7}deg) translateY(-3px)`;
    });
    c.addEventListener('pointerleave', () => {
      c.style.transition = 'transform .8s cubic-bezier(.22,1,.36,1), box-shadow .5s';
      c.style.transform = '';
    });
  });

  /* ---------- custom cursor on imagery ---------- */
  const cur = $('.cursor'), curT = $('span', cur);
  if (fine) {
    let cx = 0, cy = 0, tx = 0, ty = 0, s = 0, ts = 0;
    addEventListener('pointermove', e => { tx = e.clientX; ty = e.clientY; cur.classList.add('on'); });
    document.addEventListener('pointerleave', () => cur.classList.remove('on'));
    (function loop() {
      cx += (tx - cx) * .18; cy += (ty - cy) * .18; s += (ts - s) * .18;
      cur.style.transform = `translate3d(${cx}px,${cy}px,0) scale(${s})`;
      requestAnimationFrame(loop);
    })();
    const hook = (sel, label) => $$(sel).forEach(el => {
      el.addEventListener('pointerenter', () => { curT.textContent = label; ts = 1; });
      el.addEventListener('pointerleave', () => { ts = 0; });
    });
    hook('.banner--full, .banner--half', 'View');
    hook('.social__track a', 'Follow');
    hook('.card__img', 'Shop');
    $$('.add, .card__img .add').forEach(b => {
      b.addEventListener('pointerenter', () => ts = 0);
      b.addEventListener('pointerleave', () => { if (b.closest('.card__img').matches(':hover')) ts = 1; });
    });
  }

  /* ---------- quick add: cart count + toast ---------- */
  const cartN = $('#cartN'), toast = $('#toast'), cartLink = $('.nav__cart');
  let n = 0, tt;
  $$('.add').forEach(b => b.addEventListener('click', e => {
    e.preventDefault(); e.stopPropagation();
    n++; cartN.textContent = n;
    cartLink.classList.remove('bump'); void cartLink.offsetWidth; cartLink.classList.add('bump');
    b.classList.add('done'); const old = b.textContent; b.textContent = 'Added ✓';
    setTimeout(() => { b.classList.remove('done'); b.textContent = old; }, 1400);
    toast.textContent = `${b.dataset.name} added to cart`;
    toast.classList.add('on'); clearTimeout(tt); tt = setTimeout(() => toast.classList.remove('on'), 2200);
    nav.classList.remove('hide');
  }));

  /* ---------- join form ---------- */
  const form = $('#joinForm'), email = $('#email');
  form.addEventListener('submit', e => {
    e.preventDefault();
    const ok = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.value.trim());
    form.classList.remove('err', 'ok'); void form.offsetWidth;
    if (!ok) { form.classList.add('err'); email.focus(); return; }
    form.classList.add('ok'); email.value = ''; email.placeholder = 'You’re in.'; email.disabled = true;
  });
  email.addEventListener('input', () => form.classList.remove('err'));

  /* ---------- smooth anchor offset ---------- */
  $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const id = a.getAttribute('href');
    if (id.length < 2) return e.preventDefault();
    const t = $(id); if (!t) return;
    e.preventDefault();
    t.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  }));
})();
