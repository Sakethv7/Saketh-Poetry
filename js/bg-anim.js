(function () {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const type = document.body.dataset.anim;
  if (!type) return;

  const canvas = document.createElement('canvas');
  Object.assign(canvas.style, {
    position: 'fixed', top: '0', left: '0',
    width: '100%', height: '100%',
    zIndex: '-1', pointerEvents: 'none',
  });
  document.body.prepend(canvas);

  const ctx = canvas.getContext('2d');
  let W, H;

  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  function rand(min, max) { return Math.random() * (max - min) + min; }
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  const presets = {
    rain: {
      count: 70,
      make: () => ({
        x: rand(0, W), y: rand(-H, 0),
        len: rand(12, 30), speed: rand(10, 18),
        opacity: rand(0.06, 0.18), width: rand(0.4, 1.2),
      }),
      draw(p) {
        ctx.save();
        ctx.strokeStyle = `rgba(190,205,230,${p.opacity})`;
        ctx.lineWidth = p.width;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - 1.5, p.y + p.len);
        ctx.stroke();
        ctx.restore();
      },
      update(p) {
        p.y += p.speed; p.x -= 0.8;
        if (p.y > H + p.len) { p.y = rand(-60, 0); p.x = rand(0, W); }
      },
    },

    leaves: {
      count: 22,
      make: () => ({
        x: rand(0, W), y: rand(-80, H),
        size: rand(7, 16), speedY: rand(0.5, 1.5), speedX: rand(-0.4, 0.4),
        rot: rand(0, Math.PI * 2), rotSpeed: rand(-0.025, 0.025),
        opacity: rand(0.12, 0.3),
        color: pick(['#8B5E3C','#C17F3B','#7A4A2E','#A06830','#5C3D1E','#B87333']),
        wobble: rand(0, Math.PI * 2), wobbleSpeed: rand(0.01, 0.03),
      }),
      draw(p) {
        ctx.save();
        ctx.globalAlpha = p.opacity;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.ellipse(0, 0, p.size * 0.38, p.size, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      },
      update(p) {
        p.wobble += p.wobbleSpeed;
        p.x += p.speedX + Math.sin(p.wobble) * 0.45;
        p.y += p.speedY; p.rot += p.rotSpeed;
        if (p.y > H + p.size) { p.y = -p.size; p.x = rand(0, W); }
      },
    },

    petals: {
      count: 18,
      make: () => ({
        x: rand(0, W), y: rand(-80, H),
        size: rand(5, 11), speedY: rand(0.25, 0.85), speedX: rand(-0.35, 0.35),
        rot: rand(0, Math.PI * 2), rotSpeed: rand(-0.012, 0.012),
        opacity: rand(0.12, 0.28),
        color: pick(['#F2C4CE','#E8A0B0','#F5D0D8','#D4849A','#FADADD']),
        wobble: rand(0, Math.PI * 2), wobbleSpeed: rand(0.008, 0.018),
      }),
      draw(p) {
        ctx.save();
        ctx.globalAlpha = p.opacity;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.ellipse(0, 0, p.size * 0.32, p.size, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      },
      update(p) {
        p.wobble += p.wobbleSpeed;
        p.x += p.speedX + Math.sin(p.wobble) * 0.5;
        p.y += p.speedY; p.rot += p.rotSpeed;
        if (p.y > H + p.size) { p.y = -p.size; p.x = rand(0, W); }
      },
    },

    fireflies: {
      count: 28,
      make: () => ({
        x: rand(0, W), y: rand(0, H),
        size: rand(1.5, 4),
        phase: rand(0, Math.PI * 2), phaseSpeed: rand(0.012, 0.03),
        speedX: rand(-0.25, 0.25), speedY: rand(-0.18, 0.18),
        color: pick(['#FFD700','#FFC200','#FFEC8B','#F4C430','#FFF0A0']),
      }),
      draw(p) {
        const a = (Math.sin(p.phase) + 1) / 2 * 0.45 + 0.04;
        ctx.save();
        ctx.globalAlpha = a;
        ctx.shadowBlur = 10;
        ctx.shadowColor = p.color;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      },
      update(p) {
        p.phase += p.phaseSpeed;
        p.x += p.speedX; p.y += p.speedY;
        if (p.x < 0 || p.x > W) p.speedX *= -1;
        if (p.y < 0 || p.y > H) p.speedY *= -1;
      },
    },

    dust: {
      count: 55,
      make: () => ({
        x: rand(0, W), y: rand(0, H),
        size: rand(0.8, 2.5),
        speedX: rand(-0.18, 0.18), speedY: rand(-0.12, 0.08),
        opacity: rand(0.04, 0.16),
      }),
      draw(p) {
        ctx.save();
        ctx.globalAlpha = p.opacity;
        ctx.fillStyle = 'rgba(210,200,185,1)';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      },
      update(p) {
        p.x += p.speedX; p.y += p.speedY;
        if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
        if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;
      },
    },

    stars: {
      count: 55,
      make: () => ({
        x: rand(0, W), y: rand(0, H),
        size: rand(0.5, 2.2),
        phase: rand(0, Math.PI * 2), phaseSpeed: rand(0.004, 0.018),
        base: rand(0.08, 0.28),
      }),
      draw(p) {
        const a = p.base * ((Math.sin(p.phase) + 1) / 2 * 0.55 + 0.45);
        ctx.save();
        ctx.globalAlpha = a;
        ctx.fillStyle = '#FFF8E7';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      },
      update(p) { p.phase += p.phaseSpeed; },
    },

    ripples: {
      count: 7,
      make: () => ({
        x: rand(0, W), y: rand(0, H),
        r: rand(0, 180), maxR: rand(100, 220),
        speed: rand(0.25, 0.65), opacity: rand(0.04, 0.12),
      }),
      draw(p) {
        const fade = 1 - p.r / p.maxR;
        ctx.save();
        ctx.strokeStyle = `rgba(100,200,195,${p.opacity * fade})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      },
      update(p) {
        p.r += p.speed;
        if (p.r > p.maxR) { p.r = 0; p.x = rand(0, W); p.y = rand(0, H); }
      },
    },

    mist: {
      count: 12,
      make: () => ({
        x: rand(-80, W + 80), y: rand(H * 0.25, H + 60),
        w: rand(160, 380), h: rand(55, 110),
        speedY: rand(-0.18, -0.04), speedX: rand(-0.12, 0.12),
        opacity: rand(0.025, 0.07),
        phase: rand(0, Math.PI * 2), phaseSpeed: rand(0.003, 0.007),
      }),
      draw(p) {
        const a = p.opacity * (0.8 + 0.2 * Math.sin(p.phase));
        ctx.save();
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.w / 2);
        g.addColorStop(0, `rgba(215,210,230,${a})`);
        g.addColorStop(1, 'rgba(215,210,230,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, p.w / 2, p.h / 2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      },
      update(p) {
        p.x += p.speedX; p.y += p.speedY; p.phase += p.phaseSpeed;
        if (p.y < -p.h) { p.y = H + p.h; p.x = rand(-80, W + 80); }
      },
    },
  };

  const preset = presets[type];
  if (!preset) return;

  const particles = Array.from({ length: preset.count }, () => preset.make());

  function loop() {
    ctx.clearRect(0, 0, W, H);
    for (const p of particles) {
      preset.draw(p);
      preset.update(p);
    }
    requestAnimationFrame(loop);
  }

  loop();
})();
