/* ============================================================
   金榜题名 · 交互脚本
   1. 滚动渐显
   2. 烟花：首屏常开；结尾祝福区进入视野时燃放
      （点击对应区域可自己放烟花，尊重"减少动态效果"偏好）
   ============================================================ */
(function () {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 1. 滚动渐显 ---------- */
  const revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add('visible'));
  }

  /* ---------- 2. 烟花（可复用的工厂） ---------- */
  const COLORS = ['#f7d77f', '#ffd27a', '#ff8b6b', '#ff5d5d', '#fff1cf', '#e8444a'];

  function createFireworks(canvas, host) {
    const ctx = canvas.getContext('2d');
    let W = 0, H = 0;
    let running = false, rafId = null, autoTimer = null;
    const rockets = [];
    const particles = [];

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = canvas.clientWidth;
      H = canvas.clientHeight;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    /* 发射一枚烟花，y 为目标爆炸高度（缺省随机上半区） */
    function launch(x, y) {
      const targetY = y === undefined ? H * (0.3 + Math.random() * 0.35) : y;
      rockets.push({ x, y: H, tx: x, ty: targetY, speed: 9 + Math.random() * 4 });
    }

    function explode(x, y) {
      const n = 46 + Math.floor(Math.random() * 30);
      for (let i = 0; i < n; i++) {
        const ang = (Math.PI * 2 * i) / n + Math.random() * 0.25;
        const sp = 1.6 + Math.random() * 4.6;
        particles.push({
          x, y,
          vx: Math.cos(ang) * sp,
          vy: Math.sin(ang) * sp,
          life: 1,
          decay: 0.008 + Math.random() * 0.014,
          color: COLORS[(Math.random() * COLORS.length) | 0],
          size: 1.6 + Math.random() * 2.2,
        });
      }
    }

    function tick() {
      if (!running) return;
      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'lighter';

      /* 上升的烟花弹 */
      for (let i = rockets.length - 1; i >= 0; i--) {
        const r = rockets[i];
        const dx = r.tx - r.x;
        const dy = r.ty - r.y;
        const dist = Math.hypot(dx, dy);
        const step = Math.min(r.speed, dist);
        r.x += (dx / dist) * step;
        r.y += (dy / dist) * step;

        ctx.fillStyle = 'rgba(255, 220, 150, 0.8)';
        ctx.beginPath();
        ctx.arc(r.x, r.y, 2, 0, Math.PI * 2);
        ctx.fill();

        if (dist <= step) {
          explode(r.tx, r.ty);
          rockets.splice(i, 1);
        }
      }

      /* 绽放的粒子 */
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.045;          /* 重力 */
        p.vx *= 0.988;
        p.vy *= 0.988;
        p.life -= p.decay;
        if (p.life <= 0) {
          particles.splice(i, 1);
          continue;
        }
        ctx.globalAlpha = Math.max(p.life, 0);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (0.5 + p.life * 0.6), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';

      /* 粒子过多时裁剪，保证手机端流畅 */
      if (particles.length > 700) particles.splice(0, particles.length - 700);

      rafId = requestAnimationFrame(tick);
    }

    function start() {
      if (running || reduceMotion) return;
      running = true;
      resize();
      tick();
      autoTimer = setInterval(() => {
        if (!document.hidden) launch(W * (0.15 + Math.random() * 0.7));
      }, 1100);
    }

    function stop() {
      if (!running) return;
      running = false;
      cancelAnimationFrame(rafId);
      clearInterval(autoTimer);
      rockets.length = 0;
      particles.length = 0;
      ctx.clearRect(0, 0, W, H);
    }

    /* 开场连发 n 枚礼花 */
    function salvo(n, delay) {
      for (let i = 0; i < n; i++) {
        setTimeout(() => launch(W * (0.2 + Math.random() * 0.6)), i * delay);
      }
    }

    host.addEventListener('click', (e) => {
      if (!running) return;
      const rect = host.getBoundingClientRect();
      launch(e.clientX - rect.left, e.clientY - rect.top);
    });

    window.addEventListener('resize', () => {
      if (running) resize();
    });

    return { start, stop, salvo };
  }

  /* 首屏：常开 + 开场礼花 */
  const hero = document.getElementById('hero');
  const heroFx = createFireworks(document.getElementById('fireworks'), hero);
  heroFx.start();
  if (!reduceMotion) heroFx.salvo(3, 350);

  /* 结尾祝福区：进入视野才燃放，离开即停（省电省性能） */
  const closing = document.getElementById('closing');
  const closingFx = createFireworks(document.getElementById('fireworks-closing'), closing);
  if (!reduceMotion && 'IntersectionObserver' in window) {
    const cio = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) closingFx.start();
          else closingFx.stop();
        });
      },
      { threshold: 0.25 }
    );
    cio.observe(closing);
  }
})();
