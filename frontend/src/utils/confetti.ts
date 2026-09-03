// Lightweight canvas confetti burst
export function triggerConfetti() {
  if (typeof window === 'undefined') return;

  const canvas = document.createElement('canvas');
  canvas.style.position = 'fixed';
  canvas.style.top = '0';
  canvas.style.left = '0';
  canvas.style.width = '100vw';
  canvas.style.height = '100vh';
  canvas.style.pointerEvents = 'none';
  canvas.style.zIndex = '99999';
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    document.body.removeChild(canvas);
    return;
  }

  const width = (canvas.width = window.innerWidth);
  const height = (canvas.height = window.innerHeight);

  const colors = ['#6366f1', '#a855f7', '#ec4899', '#10b981', '#f59e0b', '#3b82f6'];
  const particles: Array<{
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    color: string;
    rotation: number;
    vr: number;
    opacity: number;
  }> = [];

  for (let i = 0; i < 70; i++) {
    particles.push({
      x: width / 2,
      y: height * 0.45,
      vx: (Math.random() - 0.5) * 16,
      vy: (Math.random() - 0.8) * 16,
      size: Math.random() * 8 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * 360,
      vr: (Math.random() - 0.5) * 12,
      opacity: 1,
    });
  }

  let animationFrame: number;
  const startTime = Date.now();

  function animate() {
    const elapsed = Date.now() - startTime;
    if (elapsed > 2500) {
      if (document.body.contains(canvas)) {
        document.body.removeChild(canvas);
      }
      return;
    }

    ctx?.clearRect(0, 0, width, height);

    particles.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.45; // gravity
      p.rotation += p.vr;
      p.opacity = Math.max(0, 1 - elapsed / 2200);

      if (ctx) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.globalAlpha = p.opacity;
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        ctx.restore();
      }
    });

    animationFrame = requestAnimationFrame(animate);
  }

  animationFrame = requestAnimationFrame(animate);
}
