/* ============================================
   APEXARA DYNAMICS — MAIN SCRIPT
   Three.js Particle Field + Interactions
   ============================================ */

(function () {
  'use strict';

  // ---- THREE.JS HERO CANVAS ----
  const canvas = document.getElementById('heroCanvas');
  if (canvas && typeof THREE !== 'undefined') {
    initParticleField(canvas);
  }

  function initParticleField(canvas) {
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2000);
    camera.position.z = 600;

    // Particle geometry
    const COUNT = 2200;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(COUNT * 3);
    const colors = new Float32Array(COUNT * 3);
    const sizes = new Float32Array(COUNT);

    const colorGold = new THREE.Color(0xc9a84c);
    const colorWhite = new THREE.Color(0xffffff);
    const colorBlue = new THREE.Color(0x3a7bd5);

    for (let i = 0; i < COUNT; i++) {
      const i3 = i * 3;
      // Spread particles across wide field
      positions[i3]     = (Math.random() - 0.5) * 1800;
      positions[i3 + 1] = (Math.random() - 0.5) * 1000;
      positions[i3 + 2] = (Math.random() - 0.5) * 600;

      // Vary color: mostly white/dim, some gold, rare blue
      const roll = Math.random();
      let c;
      if (roll < 0.06) c = colorGold;
      else if (roll < 0.1) c = colorBlue;
      else c = colorWhite;

      const brightness = 0.1 + Math.random() * 0.5;
      colors[i3]     = c.r * brightness;
      colors[i3 + 1] = c.g * brightness;
      colors[i3 + 2] = c.b * brightness;

      sizes[i] = 0.8 + Math.random() * 2.4;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uMouse: { value: new THREE.Vector2(0, 0) }
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

          // Gentle drift
          pos.x += sin(uTime * 0.12 + position.z * 0.003) * 6.0;
          pos.y += cos(uTime * 0.08 + position.x * 0.003) * 4.0;
          pos.z += sin(uTime * 0.06 + position.y * 0.004) * 3.0;

          // Mouse parallax
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
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexColors: true
    });

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);

    // Subtle connection lines between nearby particles (sparse)
    const lineCount = 80;
    const linePositions = new Float32Array(lineCount * 6);
    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
    const lineMat = new THREE.LineBasicMaterial({
      color: 0xc9a84c,
      transparent: true,
      opacity: 0.04,
      blending: THREE.AdditiveBlending
    });
    const lines = new THREE.LineSegments(lineGeo, lineMat);
    scene.add(lines);

    // Mouse tracking
    let mouseX = 0, mouseY = 0;
    let targetMouseX = 0, targetMouseY = 0;
    window.addEventListener('mousemove', e => {
      targetMouseX = (e.clientX - window.innerWidth / 2);
      targetMouseY = -(e.clientY - window.innerHeight / 2);
    });

    // Resize
    window.addEventListener('resize', () => {
      renderer.setSize(window.innerWidth, window.innerHeight);
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
    });

    let lastTime = 0;
    function animate(t) {
      if (!document.getElementById('hero')) return;
      requestAnimationFrame(animate);

      const elapsed = t * 0.001;
      const delta = elapsed - lastTime;
      lastTime = elapsed;

      // Smooth mouse
      mouseX += (targetMouseX - mouseX) * 0.04;
      mouseY += (targetMouseY - mouseY) * 0.04;

      material.uniforms.uTime.value = elapsed;
      material.uniforms.uMouse.value.set(mouseX, mouseY);

      // Slow rotation
      particles.rotation.y = elapsed * 0.012;
      particles.rotation.x = Math.sin(elapsed * 0.007) * 0.06;

      renderer.render(scene, camera);
    }
    requestAnimationFrame(animate);
  }

  // ---- NAVBAR SCROLL EFFECT ----
  const navbar = document.getElementById('navbar');
  function onScroll() {
    if (window.scrollY > 60) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
    handleParallax();
    handleSpecBars();
  }
  window.addEventListener('scroll', onScroll, { passive: true });

  // ---- MOBILE NAV TOGGLE ----
  const navToggle = document.getElementById('navToggle');
  const navLinks = document.getElementById('navLinks');
  if (navToggle && navLinks) {
    navToggle.addEventListener('click', () => {
      navLinks.classList.toggle('open');
      const spans = navToggle.querySelectorAll('span');
      if (navLinks.classList.contains('open')) {
        spans[0].style.transform = 'rotate(45deg) translate(4px, 4px)';
        spans[1].style.opacity = '0';
        spans[2].style.transform = 'rotate(-45deg) translate(4px, -4px)';
      } else {
        spans.forEach(s => { s.style.transform = ''; s.style.opacity = ''; });
      }
    });
    navLinks.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => {
        navLinks.classList.remove('open');
        navToggle.querySelectorAll('span').forEach(s => {
          s.style.transform = '';
          s.style.opacity = '';
        });
      });
    });
  }

  // ---- PARALLAX FOR FULLSCREEN IMAGES ----
  const parallaxSections = document.querySelectorAll('.parallax-section');
  function handleParallax() {
    parallaxSections.forEach(section => {
      const rect = section.getBoundingClientRect();
      const img = section.querySelector('.parallax-img');
      if (!img) return;
      if (rect.bottom < 0 || rect.top > window.innerHeight) return;
      const progress = (window.innerHeight - rect.top) / (window.innerHeight + rect.height);
      const offset = (progress - 0.5) * 120;
      img.style.transform = `translateY(${offset}px)`;
    });
  }

  // ---- HERO BG SUBTLE PARALLAX ----
  const heroBg = document.querySelector('.hero-bg');
  window.addEventListener('scroll', () => {
    if (!heroBg) return;
    const scrolled = window.scrollY;
    heroBg.style.transform = `scale(1.08) translateY(${scrolled * 0.25}px)`;
  }, { passive: true });

  // ---- INTERSECTION OBSERVER FOR REVEAL ----
  const revealEls = document.querySelectorAll(
    '.overview-grid > *, .cap-card, .tech-content-col, .tech-image-col, .contact-grid > *, .gallery-item, .footer-top > *'
  );
  revealEls.forEach((el, i) => {
    el.classList.add('reveal');
    if (i % 3 === 1) el.classList.add('reveal-delay-1');
    if (i % 3 === 2) el.classList.add('reveal-delay-2');
  });

  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -60px 0px' });

  revealEls.forEach(el => revealObserver.observe(el));

  // ---- SPEC BARS ANIMATION ----
  let specBarsAnimated = false;
  const specBars = document.querySelectorAll('.spec-bar');

  function handleSpecBars() {
    if (specBarsAnimated) return;
    const techSection = document.getElementById('technology');
    if (!techSection) return;
    const rect = techSection.getBoundingClientRect();
    if (rect.top < window.innerHeight * 0.75) {
      specBarsAnimated = true;
      specBars.forEach((bar, i) => {
        setTimeout(() => {
          bar.style.width = bar.dataset.width || '0%';
        }, i * 120);
      });
    }
  }

  // ---- ACTIVE NAV LINK ----
  const sections = document.querySelectorAll('section[id], div[id^="parallax"]');
  const navLinksAll = document.querySelectorAll('.nav-link:not(.nav-cta)');

  const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.id;
        navLinksAll.forEach(a => {
          a.classList.toggle('active', a.getAttribute('href') === `#${id}`);
        });
      }
    });
  }, { threshold: 0.3 });

  sections.forEach(s => sectionObserver.observe(s));

  // ---- CONTACT FORM ----
  const form = document.getElementById('contactForm');
  const successEl = document.getElementById('formSuccess');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();

      const btn = form.querySelector('.btn-submit');
      const btnText = btn.querySelector('.btn-text');
      btnText.textContent = 'Sending…';
      btn.disabled = true;

      // Simulate submission
      setTimeout(() => {
        btnText.textContent = 'Send Inquiry';
        btn.disabled = false;
        form.reset();
        successEl.textContent = 'Your inquiry has been received. A member of our team will be in contact within one business day.';
        successEl.classList.add('visible');
        setTimeout(() => successEl.classList.remove('visible'), 7000);
      }, 1800);
    });
  }

  // ---- SMOOTH ANCHOR SCROLL ----
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', function (e) {
      const href = this.getAttribute('href');
      if (href === '#') return;
      const target = document.querySelector(href);
      if (!target) return;
      e.preventDefault();
      const offset = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-height')) || 80;
      const top = target.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: 'smooth' });
    });
  });

  // ---- CURSOR GLOW EFFECT (desktop only) ----
  if (window.matchMedia('(pointer: fine)').matches) {
    const cursor = document.createElement('div');
    cursor.id = 'cursor-glow';
    cursor.style.cssText = `
      position: fixed;
      width: 300px;
      height: 300px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(201,168,76,0.04) 0%, transparent 70%);
      pointer-events: none;
      z-index: 9999;
      transform: translate(-50%, -50%);
      transition: opacity 0.3s;
      will-change: left, top;
    `;
    document.body.appendChild(cursor);

    let cx = 0, cy = 0;
    let tcx = 0, tcy = 0;

    window.addEventListener('mousemove', e => {
      tcx = e.clientX;
      tcy = e.clientY;
    });

    function moveCursor() {
      cx += (tcx - cx) * 0.12;
      cy += (tcy - cy) * 0.12;
      cursor.style.left = cx + 'px';
      cursor.style.top = cy + 'px';
      requestAnimationFrame(moveCursor);
    }
    moveCursor();
  }

  // ---- NUMBER COUNT-UP ANIMATION ----
  const statNumbers = document.querySelectorAll('.stat-number');
  const countObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const raw = el.textContent.trim();
      const numMatch = raw.match(/[\d.]+/);
      if (!numMatch) return;
      const target = parseFloat(numMatch[0]);
      const suffix = raw.replace(numMatch[0], '');
      const isDecimal = numMatch[0].includes('.');
      const duration = 1800;
      const start = performance.now();

      function tick(now) {
        const progress = Math.min((now - start) / duration, 1);
        const ease = 1 - Math.pow(1 - progress, 3);
        const current = target * ease;
        el.textContent = (isDecimal ? current.toFixed(1) : Math.round(current)) + suffix;
        if (progress < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
      countObserver.unobserve(el);
    });
  }, { threshold: 0.5 });

  statNumbers.forEach(el => countObserver.observe(el));

  // Initial calls
  onScroll();

})();
