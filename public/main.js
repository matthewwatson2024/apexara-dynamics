/* ============================================================
   APEXARA DYNAMICS — MAIN SCRIPT v2
   Neural Network · Physics · Fleet 3D · Circuit Canvas
   ============================================================ */
(function () {
  'use strict';

  /* ── PAGE LOADER ──────────────────────────────────────────── */
  const loader = document.getElementById('loader');
  const LOADER_MIN = 2000;
  const loaderStart = Date.now();

  function hideLoader() {
    loader.classList.add('hidden');
    document.body.classList.remove('loading');
    requestAnimationFrame(onPostLoad);
  }
  function tryHide() {
    const remaining = Math.max(0, LOADER_MIN - (Date.now() - loaderStart));
    setTimeout(hideLoader, remaining);
  }
  if (document.readyState === 'complete') { tryHide(); }
  else { window.addEventListener('load', tryHide); }

  /* ── HERO CLOCK ───────────────────────────────────────────── */
  const heroTimeEl = document.getElementById('heroTime');
  function tickClock() {
    if (!heroTimeEl) return;
    const n = new Date();
    heroTimeEl.textContent =
      String(n.getUTCHours()).padStart(2,'0') + ':' +
      String(n.getUTCMinutes()).padStart(2,'0') + ':' +
      String(n.getUTCSeconds()).padStart(2,'0') + ' UTC';
  }
  tickClock();
  setInterval(tickClock, 1000);

  /* ── FLUID PARTICLE SYSTEM ───────────────────────────────── */
  const heroCanvas = document.getElementById('heroCanvas');
  if (heroCanvas && typeof THREE !== 'undefined') {
    initFluidParticles(heroCanvas);
  }

  function initFluidParticles(canvas) {
    let W = window.innerWidth, H = window.innerHeight;
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(W, H);

    const scene = new THREE.Scene();
    /* OrthographicCamera — world units equal CSS pixels */
    let camera = new THREE.OrthographicCamera(-W/2, W/2, H/2, -H/2, -500, 500);

    /* ── Three particle tiers ── */
    const T1 = 80;   // large atmospheric orbs
    const T2 = 220;  // medium electric glows
    const T3 = 300;  // small bright nodes
    const COUNT = T1 + T2 + T3;

    const pos    = new Float32Array(COUNT * 3);
    const vel    = new Float32Array(COUNT * 2);  // 2D velocity
    const sizes  = new Float32Array(COUNT);
    const alphas = new Float32Array(COUNT);
    const cols   = new Float32Array(COUNT * 3);

    const tiers = [
      { n: T1, off: 0,      szMin: 90,  szMax: 200, aMin: 0.012, aMax: 0.038, r: 0.85, g: 0.94, b: 1.00 },
      { n: T2, off: T1,     szMin: 12,  szMax: 32,  aMin: 0.10,  aMax: 0.26,  r: 0.22, g: 0.74, b: 0.97 },
      { n: T3, off: T1+T2,  szMin: 2,   szMax: 6,   aMin: 0.38,  aMax: 0.82,  r: 0.80, g: 0.94, b: 1.00 },
    ];

    for (const t of tiers) {
      for (let k = 0; k < t.n; k++) {
        const i = t.off + k;
        pos[i*3]   = (Math.random() - 0.5) * W;
        pos[i*3+1] = (Math.random() - 0.5) * H;
        pos[i*3+2] = 0;
        vel[i*2]   = (Math.random() - 0.5) * 0.5;
        vel[i*2+1] = (Math.random() - 0.5) * 0.5;
        sizes[i]   = t.szMin + Math.random() * (t.szMax - t.szMin);
        alphas[i]  = t.aMin + Math.random() * (t.aMax - t.aMin);
        cols[i*3]  = t.r; cols[i*3+1] = t.g; cols[i*3+2] = t.b;
      }
    }

    const geo      = new THREE.BufferGeometry();
    const posAttr  = new THREE.BufferAttribute(pos,    3);
    posAttr.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('position', posAttr);
    geo.setAttribute('aSize',    new THREE.BufferAttribute(sizes,  1));
    geo.setAttribute('aAlpha',   new THREE.BufferAttribute(alphas, 1));
    geo.setAttribute('aColor',   new THREE.BufferAttribute(cols,   3));

    const mat = new THREE.ShaderMaterial({
      uniforms: {},
      vertexShader: `
        attribute float aSize;
        attribute float aAlpha;
        attribute vec3  aColor;
        varying   float vAlpha;
        varying   vec3  vColor;
        void main() {
          vAlpha = aAlpha;
          vColor = aColor;
          gl_PointSize = aSize;
          gl_Position  = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying float vAlpha;
        varying vec3  vColor;
        void main() {
          vec2  uv = gl_PointCoord - 0.5;
          float d  = length(uv) * 2.0;
          float a  = exp(-d * d * 9.0) * vAlpha;
          if (a < 0.002) discard;
          gl_FragColor = vec4(vColor, a);
        }
      `,
      transparent: true,
      depthWrite:  false,
      blending:    THREE.AdditiveBlending,
    });

    scene.add(new THREE.Points(geo, mat));

    /* ── Flow field — multi-harmonic for organic curl ── */
    function sampleField(x, y, t) {
      const nx = x / W, ny = y / H;
      const a =
        Math.sin(nx * 2.8 + t * 0.16) * Math.cos(ny * 2.1 - t * 0.11) * Math.PI +
        Math.sin(nx * 5.1 - t * 0.08) * 0.55 +
        Math.cos(ny * 3.6 + t * 0.13) * 0.38;
      return { fx: Math.cos(a), fy: Math.sin(a) };
    }

    /* ── Physics ── */
    const DAMP = 0.943;
    const FW   = 0.058;   // flow field influence
    const VR   = 240;     // vortex radius px
    const VS   = 0.30;    // vortex strength

    let mx = 0, my = 0;
    window.addEventListener('mousemove', e => {
      mx =  e.clientX - W * 0.5;
      my = -(e.clientY - H * 0.5);
    });

    window.addEventListener('resize', () => {
      W = window.innerWidth; H = window.innerHeight;
      renderer.setSize(W, H);
      camera = new THREE.OrthographicCamera(-W/2, W/2, H/2, -H/2, -500, 500);
    });

    /* ── Animation loop ── */
    function animate(ts) {
      requestAnimationFrame(animate);
      const t   = ts * 0.001;
      const W2  = W * 0.5, H2 = H * 0.5;
      const pArr = posAttr.array;

      for (let i = 0; i < COUNT; i++) {
        const i3 = i * 3, i2 = i * 2;
        let px = pArr[i3], py = pArr[i3+1];

        /* Flow field */
        const { fx, fy } = sampleField(px, py, t);
        vel[i2]   += fx * FW;
        vel[i2+1] += fy * FW;

        /* Vortex mouse — perpendicular force creates organic swirl */
        const dx = px - mx, dy = py - my;
        const d2 = dx*dx + dy*dy;
        if (d2 < VR * VR && d2 > 1) {
          const d   = Math.sqrt(d2);
          const str = (1 - d / VR) * VS;
          vel[i2]   += (-dy / d) * str;
          vel[i2+1] += ( dx / d) * str;
        }

        /* Damping + integrate */
        vel[i2]   *= DAMP;
        vel[i2+1] *= DAMP;
        px += vel[i2];
        py += vel[i2+1];

        /* Toroidal wrap */
        if (px >  W2) px -= W;
        if (px < -W2) px += W;
        if (py >  H2) py -= H;
        if (py < -H2) py += H;

        pArr[i3]   = px;
        pArr[i3+1] = py;
      }

      posAttr.needsUpdate = true;
      renderer.render(scene, camera);
    }
    requestAnimationFrame(animate);
  }

  /* ── FLEET CARD 3D TILT ───────────────────────────────────── */
  function initFleet3D() {
    document.querySelectorAll('.fleet-card').forEach(card => {
      const light = card.querySelector('.fc-light');

      card.addEventListener('mousemove', e => {
        const rect = card.getBoundingClientRect();
        const xPct = (e.clientX - rect.left)  / rect.width;
        const yPct = (e.clientY - rect.top)   / rect.height;
        const tx   = (xPct - 0.5) * 16;
        const ty   = -(yPct - 0.5) * 12;

        card.style.transition = 'background 0.3s, box-shadow 0.4s';
        card.style.transform  = `perspective(1100px) rotateY(${tx}deg) rotateX(${ty}deg) scale3d(1.018,1.018,1.018)`;

        if (light) {
          light.style.background = `radial-gradient(circle at ${xPct * 100}% ${yPct * 100}%, rgba(56,189,248,0.14), transparent 58%)`;
        }
      });

      card.addEventListener('mouseleave', () => {
        card.classList.add('tilt-leave');
        card.style.transform = '';
        if (light) light.style.background = '';
        setTimeout(() => card.classList.remove('tilt-leave'), 600);
      });
    });
  }

  /* ── CIRCUIT CANVAS (Technology section) ─────────────────── */
  function initCircuitCanvas() {
    const canvas = document.getElementById('circuitCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const GRID     = 44;
    const segments = [];
    let   animT    = 0;
    let   visible  = false;

    function buildGrid() {
      segments.length = 0;
      const W = canvas.width, H = canvas.height;

      /* Horizontal runs */
      for (let y = GRID; y < H - GRID; y += GRID) {
        let x = 0;
        while (x < W) {
          const len = (Math.floor(Math.random() * 4) + 1) * GRID;
          if (x + len > W) break;
          segments.push({
            x1: x, y1: y, x2: x + len, y2: y,
            phase: Math.random(),
            speed: 0.004 + Math.random() * 0.006,
          });
          x += len + (Math.random() > 0.4 ? GRID : 0);
        }
      }
      /* Vertical runs (sparser) */
      for (let x = GRID * 2; x < W - GRID; x += GRID * 3) {
        let y = 0;
        while (y < H) {
          const len = (Math.floor(Math.random() * 3) + 1) * GRID;
          if (y + len > H) break;
          segments.push({
            x1: x, y1: y, x2: x, y2: y + len,
            phase: Math.random(),
            speed: 0.003 + Math.random() * 0.005,
          });
          y += len + GRID;
        }
      }
    }

    function resize() {
      canvas.width  = canvas.parentElement.offsetWidth;
      canvas.height = canvas.parentElement.offsetHeight;
      buildGrid();
    }

    function draw() {
      requestAnimationFrame(draw);
      if (!visible) return;
      animT += 1;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      segments.forEach(s => {
        const t   = (animT * s.speed + s.phase) % 1;
        const px  = s.x1 + (s.x2 - s.x1) * t;
        const py  = s.y1 + (s.y2 - s.y1) * t;

        /* Static base line */
        ctx.strokeStyle = 'rgba(56,189,248,0.05)';
        ctx.lineWidth   = 1;
        ctx.beginPath();
        ctx.moveTo(s.x1, s.y1);
        ctx.lineTo(s.x2, s.y2);
        ctx.stroke();

        /* Travelling pulse glow */
        const gradient = ctx.createRadialGradient(px, py, 0, px, py, 14);
        gradient.addColorStop(0,   'rgba(56,189,248,0.55)');
        gradient.addColorStop(0.4, 'rgba(56,189,248,0.15)');
        gradient.addColorStop(1,   'transparent');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(px, py, 14, 0, Math.PI * 2);
        ctx.fill();

        /* Bright core dot */
        ctx.fillStyle = 'rgba(125,211,252,0.9)';
        ctx.beginPath();
        ctx.arc(px, py, 1.5, 0, Math.PI * 2);
        ctx.fill();

        /* Junction nodes */
        ctx.fillStyle = 'rgba(56,189,248,0.12)';
        ctx.beginPath();
        ctx.arc(s.x1, s.y1, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(s.x2, s.y2, 2.5, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    /* Visibility check via IntersectionObserver */
    const section = document.getElementById('technology');
    const visObs  = new IntersectionObserver(entries => {
      visible = entries[0].isIntersecting;
    }, { threshold: 0.05 });
    if (section) visObs.observe(section);

    resize();
    window.addEventListener('resize', resize);
    requestAnimationFrame(draw);
  }

  /* ── NAVBAR ───────────────────────────────────────────────── */
  const navbar    = document.getElementById('navbar');
  const navToggle = document.getElementById('navToggle');
  const navLinks  = document.getElementById('navLinks');

  function updateNavbar() {
    navbar.classList.toggle('scrolled', window.scrollY > 60);
  }
  window.addEventListener('scroll', updateNavbar, { passive: true });
  updateNavbar();

  if (navToggle && navLinks) {
    navToggle.addEventListener('click', () => {
      const open = navLinks.classList.toggle('open');
      navToggle.setAttribute('aria-expanded', open);
      const [s0, s1] = navToggle.querySelectorAll('span');
      s0.style.transform = open ? 'rotate(45deg) translate(0,3.5px)' : '';
      s1.style.transform = open ? 'rotate(-45deg) translate(0,-3.5px)' : '';
    });
    navLinks.querySelectorAll('a').forEach(a =>
      a.addEventListener('click', () => {
        navLinks.classList.remove('open');
        navToggle.setAttribute('aria-expanded', 'false');
        navToggle.querySelectorAll('span').forEach(s => { s.style.transform = ''; });
      })
    );
  }

  /* ── SMOOTH ANCHOR SCROLL ─────────────────────────────────── */
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', function (e) {
      const href   = this.getAttribute('href');
      if (href === '#') return;
      const target = document.querySelector(href);
      if (!target) return;
      e.preventDefault();
      const navH = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-h')) || 72;
      window.scrollTo({ top: target.offsetTop - navH, behavior: 'smooth' });
    });
  });

  /* ── SCROLL-DRIVEN URL ────────────────────────────────────── */
  const PATHS = {
    hero: '/', identity: '/profile', fleet: '/fleet',
    capabilities: '/capabilities', technology: '/technology',
    gallery: '/gallery', contact: '/contact',
  };
  let currentPath = window.location.pathname;
  let urlTimer    = null;
  const allNavLinks = document.querySelectorAll('.nav-link:not(.nav-cta)');

  function setActiveNav(path) {
    allNavLinks.forEach(a => {
      const href = a.getAttribute('href') || '';
      const p    = href === '#hero' ? '/' : href.replace('#', '/');
      a.classList.toggle('active', p === path);
    });
  }

  const urlObs = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const np = PATHS[entry.target.id];
      if (!np || np === currentPath) return;
      clearTimeout(urlTimer);
      urlTimer = setTimeout(() => {
        currentPath = np;
        window.history.pushState({ section: entry.target.id }, '', np);
        setActiveNav(np);
      }, 120);
    });
  }, { threshold: 0.35 });

  Object.keys(PATHS).forEach(id => { const el = document.getElementById(id); if (el) urlObs.observe(el); });
  window.addEventListener('popstate', e => {
    const s = e.state?.section;
    if (s) { currentPath = PATHS[s] || '/'; setActiveNav(currentPath); }
  });

  /* Direct-navigation scroll */
  (function () {
    const pn = window.location.pathname.replace(/\/$/, '') || '/';
    const id = Object.entries(PATHS).find(([, p]) => p === pn)?.[0];
    if (!id || id === 'hero') return;
    const el = document.getElementById(id);
    if (!el) return;
    requestAnimationFrame(() => {
      const navH = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-h')) || 72;
      window.scrollTo({ top: el.offsetTop - navH, behavior: 'smooth' });
    });
  })();

  setActiveNav(window.location.pathname);

  /* ── PARALLAX ─────────────────────────────────────────────── */
  const heroImg = document.querySelector('.hero-media img');
  window.addEventListener('scroll', () => {
    if (heroImg) heroImg.style.transform = `scale(1.06) translateY(${window.scrollY * 0.2}px)`;
    document.querySelectorAll('.cinematic-break').forEach(cb => {
      const rect = cb.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight) return;
      const img  = cb.querySelector('.cb-media img');
      if (!img) return;
      const prog = (window.innerHeight - rect.top) / (window.innerHeight + rect.height);
      img.style.transform = `scale(1.12) translateY(${(prog - 0.5) * 75}px)`;
    });
  }, { passive: true });

  /* ── SCROLL REVEAL ────────────────────────────────────────── */
  const revObs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('in-view'); revObs.unobserve(e.target); }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -50px 0px' });
  document.querySelectorAll('.reveal').forEach(el => revObs.observe(el));

  /* ── TECH STACK BARS ──────────────────────────────────────── */
  let barsReady = false;
  const bars    = document.querySelectorAll('.ts-bar');
  const barObs  = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting || barsReady) return;
      barsReady = true;
      bars.forEach((bar, i) => setTimeout(() => { bar.style.width = (bar.dataset.w || 0) + '%'; }, i * 140));
      barObs.disconnect();
    });
  }, { threshold: 0.3 });
  const techEl = document.getElementById('technology');
  if (techEl) barObs.observe(techEl);

  /* ── COUNT-UP ─────────────────────────────────────────────── */
  const countObs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const el     = e.target;
      const raw    = el.dataset.count;
      if (!raw) return;
      const target = parseFloat(raw);
      const isDec  = el.dataset.dec === '1';
      const start  = performance.now();
      const dur    = 1900;
      (function tick(now) {
        const p   = Math.min((now - start) / dur, 1);
        const val = target * (1 - (1 - p) ** 3);
        el.textContent = isDec ? val.toFixed(1) : Math.round(val);
        if (p < 1) requestAnimationFrame(tick);
      })(start);
      countObs.unobserve(el);
    });
  }, { threshold: 0.5 });
  document.querySelectorAll('[data-count]').forEach(el => countObs.observe(el));

  /* ── CONTACT FORM ─────────────────────────────────────────── */
  const form      = document.getElementById('contactForm');
  const successEl = document.getElementById('formSuccess');
  if (form && successEl) {
    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      const btn     = form.querySelector('.btn-submit');
      const btnText = btn.querySelector('.btn-text');
      if (btnText) btnText.textContent = 'Sending…';
      btn.disabled = true;

      const payload = {
        firstName:    (form.firstName?.value    || '').trim(),
        lastName:     (form.lastName?.value     || '').trim(),
        email:        (form.email?.value        || '').trim(),
        organization: (form.organization?.value || '').trim(),
        inquiry:      (form.inquiry?.value      || ''),
        message:      (form.message?.value      || '').trim(),
      };

      try {
        const res  = await fetch('/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        const data = await res.json();
        if (res.ok && data.success) {
          form.reset();
          successEl.textContent = data.message || 'Inquiry received — we\'ll be in touch shortly.';
          successEl.classList.add('visible');
          setTimeout(() => successEl.classList.remove('visible'), 8000);
        } else {
          successEl.textContent = data.error || 'Submission failed — please try again.';
          successEl.classList.add('visible');
        }
      } catch {
        successEl.textContent = 'Network error — please check your connection and retry.';
        successEl.classList.add('visible');
      } finally {
        if (btnText) btnText.textContent = 'Send Inquiry';
        btn.disabled = false;
      }
    });
  }

  /* ── POST-LOAD INIT ───────────────────────────────────────── */
  function onPostLoad() {
    updateNavbar();
    initFleet3D();
    initCircuitCanvas();
    window.dispatchEvent(new Event('scroll'));
  }

})();
