export function spawnParticles(x, y, color = "#f5b637", count = 10) {
  for (let i = 0; i < count; i++) {
    const el = document.createElement("div");
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
    const speed = 60 + Math.random() * 80;
    const size  = 5 + Math.random() * 6;
    el.style.cssText = `
      position:fixed;
      left:${x}px; top:${y}px;
      width:${size}px; height:${size}px;
      border-radius:50%;
      background:${color};
      pointer-events:none;
      z-index:9999;
      transform:translate(-50%,-50%);
    `;
    document.body.appendChild(el);
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed - 40;
    let px = 0, py = 0, vy_ = vy, opacity = 1;
    const start = performance.now();

    function frame(now) {
      const t = (now - start) / 1000;
      px = vx * t;
      py = vy * t + 0.5 * 300 * t * t;
      opacity = Math.max(0, 1 - t * 1.5);
      el.style.transform = `translate(calc(-50% + ${px}px), calc(-50% + ${py}px))`;
      el.style.opacity = opacity;
      if (opacity > 0) requestAnimationFrame(frame);
      else el.remove();
    }
    requestAnimationFrame(frame);
  }
}

export function spawnGoldParticles(x, y) {
  spawnParticles(x, y, "#f5b637", 8);
}

export function spawnXpParticles(x, y) {
  spawnParticles(x, y, "#8d8cf8", 8);
}
