/* ============================================
   APEXARA DYNAMICS — MAIN SCRIPT
   Three.js Particle Field + Scroll URL Routing
   ============================================ */

(function () {
  'use strict';

  // ── Section → URL path mapping ──────────────────────────────────────────────
  const SECTION_PATHS = {
    hero:         '/',
    overview:     '/overview',
    capabilities: '/capabilities',
    technology:   '/technology',
    gallery:      '/gallery',
    contact:      '/contact',
  };

  // ── THREE.JS HERO CANVAS ────────────────────────────────────────────────────
  const canvas = document.getElementById('heroCanvas');
  if (canvas && typeof THREE !== 'undefined') {
    initParticleField(canvas);
  }

  function initParticleField(canvas) {
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);

    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2000);
    camera.position.z = 600;

    const COUNT     = 2200;
    const geometry  = new THREE.BufferGeometry();
    const positions = new Float32Array(COUNT * 3);
    const colors    = new Float32Array(COUNT * 3);
    const sizes     = new Float32Array(COUNT);

    const colorGold  = new THREE.Color(0xc9a84c);
    const colorWhite = new THREE.Color(0xffffff);
    const colorBlue  = new THREE.Color(0x3a7bd5);

    for (let i = 0; i < COUNT; i++) {
      const i3 = i * 3;
      positions[i3]     = (Math.random() - 0.5) * 1800;
      positions[i3 + 1] = (Math.random() - 0.5) * 1000;
      positions[i3 + 2] = (Math.random() - 0.5) * 600;

      const roll = Math.random();
      const c = roll < 0.06 ? colorGold : roll < 0.1 ? colorBlue : colorWhite;
      const brightness = 0.1 + Math.random() * 0.5;
      colors[i3]     = c.r * brightness;
      colors[i3 + 1] = c.g * brightness;
      colors[i3 + 2] = c.b * brightness;

      sizes[i] = 0.8 + Math.random() * 2.4;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color',    new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size',     new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime:  { value: 0 },
        uMouse: { value: new THREE.Vector2(0, 0) },
      },
      vertexShader: `
        attribute float size;
        attribute vec3 color;
        varying vec3 vColor;
        uniform float uTime;
        uniform vec2 uMouse;
        void main() {
          vColor = color;
          vec3 pos = position;
          pos.x += sin(uTime * 0.12 + position.z * 0.003) * 6.0;
          pos.y += cos(uTime * 0.08 + position.x * 0.003) * 4.0;
          pos.z += sin(uTime * 0.06 + position.y * 0.004) * 3.0;
          pos.x += uMouse.x * 0.08;
          pos.y += uMouse.y * 0.05;
          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_PointSize = size * (400.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        void main() {
          vec2 uv = gl_PointCoord - 0.5;
          float d = length(uv);
          if (d > 0.5) discard;
          float alpha = 1.0 - smoothstep(0.2, 0.5, d);
          gl_FragColor = vec4(vColor, alpha);
        }
      `,
      transparent: true,
      depthWrite:  false,
      blending:    THREE.AdditiveBlending,
      vertexColors: true,
    });

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);

    let mouseX = 0, mouseY = 0, targetMouseX = 0, targetMouseY = 0;
    window.addEventListener('mousemove', e => {
      targetMouseX = e.clientX - window.innerWidth / 2;
      targetMouseY = -(e.clientY - window.innerHeight / 2);
    });

    window.addEventListener('resize', () => {
      renderer.setSize(window.innerWidth, window.innerHeight);
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
    });

    function animate(t) {
      requestAnimationFrame(animate);
      const elapsed = t * 0.001;
      mouseX += (targetMouseX - mouseX) * 0.04;
      mouseY += (targetMouseY - mouseY) * 0.04;
      material.uniforms.uTime.value  = elapsed;
      material.uniforms.uMouse.value.set(mouseX, mouseY);
      particles.rotation.y  = elapsed * 0.012;
      particles.rotation.x  = Math.sin(elapsed * 0.007) * 0.06;
      renderer.render(scene, camera);
    }
    requestAnimationFrame(animate);
  }

  // ── Scroll-driven URL updates (History API) ─────────────────────────────────
  // The observer fires when a section crosses 40% viewport visibility.
  // We debounce pushState to avoid flooding the history stack mid-scroll.
  let urlDebounce = null;
  let currentPath = window.location.pathname;

  const urlObserver = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const sectionId = entry.target.id;
        const newPath   = SECTION_PATHS[sectionId];
        if (!newPath || newPath === currentPath) return;

        clearTimeout(urlDebounce);
        urlDebounce = setTimeout(() => {
          currentPath = newPath;
          window.history.pushState({ section: sectionId }, '', newPath);
          updateActiveNavLink(newPath);
        }, 120);
      });
    },
    { threshold: 0.4 }
  );

  Object.keys(SECTION_PATHS).forEach(id => {
    const el = document.getElementById(id);
    if (el) urlObserver.observe(el);
  });

  // Restore correct path on browser back/forward
  window.addEventListener('popstate', e => {
    const section = e.state?.section;
    if (section) {
      currentPath = SECTION_PATHS[section] || '/';
      updateActiveNavLink(currentPath);
    }
  });

  // ── Direct-navigation scroll-to-section ─────────────────────────────────────
  // When a user arrives at /capabilities directly, scroll to #capabilities.
  (function scrollToInitialSection() {
    const pathname = window.location.pathname.replace(/\/$/, '') || '/';
    const targetId = Object.entries(SECTION_PATHS).find(([, p]) => p === pathname)?.[0];
    if (!targetId || targetId === 'hero') return;

    const el = document.getElementById(targetId);
    if (!el) return;

    // Wait one frame so layout is complete before scrolling
    requestAnimationFrame(() => {
      const navH = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-height')) || 80;
      window.scrollTo({ top: el.offsetTop - navH, behavior: 'smooth' });
    });
  })();

  // ── Navbar scroll effect ─────────────────────────────────────────────────────
  const navbar = document.getElementById('navbar');

  function onScroll() {
    navbar.classList.toggle('scrolled', window.scrollY > 60);
    handleParallax();
    handleSpecBars();
  }
  window.addEventListener('scroll', onScroll, { passive: true });

  // ── Active nav link ──────────────────────────────────────────────────────────
  const navLinksAll = document.querySelectorAll('.nav-link:not(.nav-cta)');

  function updateActiveNavLink(path) {
    navLinksAll.forEach(a => {
      const href = a.getAttribute('href');
      // Map href anchors (#overview) to paths (/overview) for comparison
      const hrefPath = href === '#hero' ? '/' : href?.replace('#', '/') ?? '';
      a.classList.toggle('active', hrefPath === path);
    });
  }
  updateActiveNavLink(window.location.pathname);

  // ── Mobile nav toggle ────────────────────────────────────────────────────────
  const navToggle = document.getElementById('navToggle');
  const navLinksEl = document.getElementById('navLinks');

  if (navToggle && navLinksEl) {
    navToggle.addEventListener('click', () => {
      const open = navLinksEl.classList.toggle('open');
      const [s0, s1, s2] = navToggle.querySelectorAll('span');
      s0.style.transform = open ? 'rotate(45deg) translate(4px, 4px)' : '';
      s1.style.opacity   = open ? '0' : '';
      s2.style.transform = open ? 'rotate(-45deg) translate(4px, -4px)' : '';
    });
    navLinksEl.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => {
        navLinksEl.classList.remove('open');
        navToggle.querySelectorAll('span').forEach(s => { s.style.transform = ''; s.style.opacity = ''; });
      });
    });
  }

  // ── Parallax for fullscreen image sections ───────────────────────────────────
  const parallaxSections = document.querySelectorAll('.parallax-section');

  function handleParallax() {
    parallaxSections.forEach(section => {
      const rect = section.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight) return;
      const img      = section.querySelector('.parallax-img');
      if (!img) return;
      const progress = (window.innerHeight - rect.top) / (window.innerHeight + rect.height);
      img.style.transform = `translateY(${(progress - 0.5) * 120}px)`;
    });
  }

  // Hero background parallax
  const heroBg = document.querySelector('.hero-bg');
  window.addEventListener('scroll', () => {
    if (heroBg) heroBg.style.transform = `scale(1.08) translateY(${window.scrollY * 0.25}px)`;
  }, { passive: true });

  // ── Scroll-reveal via IntersectionObserver ───────────────────────────────────
  const revealEls = document.querySelectorAll(
    '.overview-grid > *, .cap-card, .tech-content-col, .tech-image-col, .contact-grid > *, .gallery-item, .footer-top > *'
  );
  revealEls.forEach((el, i) => {
    el.classList.add('reveal');
    if (i % 3 === 1) el.classList.add('reveal-delay-1');
    if (i % 3 === 2) el.classList.add('reveal-delay-2');
  });

  const revealObserver = new IntersectionObserver(
    entries => entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
        revealObserver.unobserve(entry.target);
      }
    }),
    { threshold: 0.1, rootMargin: '0px 0px -60px 0px' }
  );
  revealEls.forEach(el => revealObserver.observe(el));

  // ── Spec bars animation ──────────────────────────────────────────────────────
  let specBarsAnimated = false;
  const specBars = document.querySelectorAll('.spec-bar');

  function handleSpecBars() {
    if (specBarsAnimated) return;
    const tech = document.getElementById('technology');
    if (!tech) return;
    if (tech.getBoundingClientRect().top < window.innerHeight * 0.75) {
      specBarsAnimated = true;
      specBars.forEach((bar, i) => {
        setTimeout(() => { bar.style.width = bar.dataset.width || '0%'; }, i * 120);
      });
    }
  }

  // ── Contact form — POST to /api/contact ──────────────────────────────────────
  const form      = document.getElementById('contactForm');
  const successEl = document.getElementById('formSuccess');

  if (form) {
    form.addEventListener('submit', async function (e) {
      e.preventDefault();

      const btn     = form.querySelector('.btn-submit');
      const btnText = btn.querySelector('.btn-text');
      btnText.textContent = 'Sending…';
      btn.disabled = true;

      const payload = {
        firstName:    form.firstName.value.trim(),
        lastName:     form.lastName.value.trim(),
        email:        form.email.value.trim(),
        organization: form.organization.value.trim(),
        inquiry:      form.inquiry.value,
        message:      form.message.value.trim(),
      };

      try {
        const res  = await fetch('/api/contact', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify(payload),
        });
        const data = await res.json();

        if (res.ok && data.success) {
          form.reset();
          successEl.textContent = data.message;
          successEl.classList.add('visible');
          setTimeout(() => successEl.classList.remove('visible'), 7000);
        } else {
          successEl.textContent = data.error || 'Submission failed — please try again.';
          successEl.classList.add('visible');
        }
      } catch {
        successEl.textContent = 'Network error — please check your connection and try again.';
        successEl.classList.add('visible');
      } finally {
        btnText.textContent = 'Send Inquiry';
        btn.disabled = false;
      }
    });
  }

  // ── Smooth anchor scroll ─────────────────────────────────────────────────────
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', function (e) {
      const href   = this.getAttribute('href');
      if (href === '#') return;
      const target = document.querySelector(href);
      if (!target) return;
      e.preventDefault();
      const navH = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-height')) || 80;
      window.scrollTo({ top: target.offsetTop - navH, behavior: 'smooth' });
    });
  });

  // ── Cursor glow (desktop only) ───────────────────────────────────────────────
  if (window.matchMedia('(pointer: fine)').matches) {
    const cursor = document.createElement('div');
    cursor.style.cssText = [
      'position:fixed', 'width:300px', 'height:300px', 'border-radius:50%',
      'background:radial-gradient(circle,rgba(201,168,76,0.04) 0%,transparent 70%)',
      'pointer-events:none', 'z-index:9999', 'transform:translate(-50%,-50%)',
      'will-change:left,top',
    ].join(';');
    document.body.appendChild(cursor);

    let cx = 0, cy = 0, tcx = 0, tcy = 0;
    window.addEventListener('mousemove', e => { tcx = e.clientX; tcy = e.clientY; });
    (function moveCursor() {
      cx += (tcx - cx) * 0.12;
      cy += (tcy - cy) * 0.12;
      cursor.style.left = cx + 'px';
      cursor.style.top  = cy + 'px';
      requestAnimationFrame(moveCursor);
    })();
  }

  // ── Number count-up animation ────────────────────────────────────────────────
  const countObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el       = entry.target;
      const raw      = el.textContent.trim();
      const numMatch = raw.match(/[\d.]+/);
      if (!numMatch) return;
      const target    = parseFloat(numMatch[0]);
      const suffix    = raw.replace(numMatch[0], '');
      const isDecimal = numMatch[0].includes('.');
      const start     = performance.now();

      (function tick(now) {
        const p   = Math.min((now - start) / 1800, 1);
        const val = target * (1 - Math.pow(1 - p, 3));
        el.textContent = (isDecimal ? val.toFixed(1) : Math.round(val)) + suffix;
        if (p < 1) requestAnimationFrame(tick);
      })(start);

      countObserver.unobserve(el);
    });
  }, { threshold: 0.5 });

  document.querySelectorAll('.stat-number').forEach(el => countObserver.observe(el));

  // Initial calls
  onScroll();

})();
