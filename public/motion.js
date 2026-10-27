// Shared by the site and the dashboard: the moving background, the reading progress bar and the
// pointer effects (card glow and tilt, leaning buttons, cursor light, click sparks).
// A decorative layer behind every page: drifting colour glows, floating science symbols and a reading
// progress bar. It is added once to <body>, so page changes do not restart it.
export function startMotion() {
  if (document.querySelector('.ambient')) return;
  const glyphs = ['π', 'Σ', 'Δ', 'λ', '∫', 'H₂O', 'e⁻', 'Ω', '√x', 'C₆H₆', 'ƒ(x)', '∞'];
  document.body.insertAdjacentHTML(
    'afterbegin',
    `<div class="scroll-progress" aria-hidden="true"></div><div class="ambient" aria-hidden="true"><span class="glow glow-a"></span><span class="glow glow-b"></span><span class="glow glow-c"></span>${glyphs
      .map(
        (g, i) =>
          `<span class="glyph" style="--x:${(i * 83) % 100}%;--d:${18 + ((i * 7) % 14)}s;--s:${0.8 + ((i * 5) % 7) / 10};--o:${-(i * 2.7)}s">${g}</span>`,
      )
      .join('')}</div>`,
  );
  // Cards light up under the pointer: the position is passed to CSS, which draws the glow.
  // Measured once per frame at most: reading the card's position on every pointer event forced extra layouts.
  let spotEvent = null;
  document.addEventListener(
    'pointermove',
    (e) => {
      if (!spotEvent)
        requestAnimationFrame(() => {
          const ev = spotEvent;
          spotEvent = null;
          const el = ev.target.closest?.(spotTargets);
          if (!el) return;
          const r = el.getBoundingClientRect();
          el.style.setProperty('--mx', `${ev.clientX - r.left}px`);
          el.style.setProperty('--my', `${ev.clientY - r.top}px`);
        });
      spotEvent = e;
    },
    { passive: true },
  );
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const finePointer = matchMedia('(pointer: fine)').matches;
  // With a mouse: cards tilt toward the pointer, buttons lean to it, and a soft light trails the cursor.
  if (finePointer) {
    document.body.insertAdjacentHTML('beforeend', '<div class="cursor-glow" aria-hidden="true"></div>');
    const glow = document.querySelector('.cursor-glow');
    let frame = 0,
      px = 0,
      py = 0;
    document.addEventListener(
      'pointermove',
      (e) => {
        px = e.clientX;
        py = e.clientY;
        if (!frame)
          frame = requestAnimationFrame(() => {
            frame = 0;
            glow.style.translate = `${px}px ${py}px`;
            glow.classList.add('on');
          });
        const card = e.target.closest?.(tiltTargets);
        if (card) {
          const r = card.getBoundingClientRect();
          card.style.setProperty('--ry', `${((e.clientX - r.left) / r.width - 0.5) * 10}deg`);
          card.style.setProperty('--rx', `${-((e.clientY - r.top) / r.height - 0.5) * 10}deg`);
        }
        const magnet = e.target.closest?.(magnetTargets);
        if (magnet) {
          const r = magnet.getBoundingClientRect();
          magnet.style.translate = `${(e.clientX - r.left - r.width / 2) * 0.18}px ${(e.clientY - r.top - r.height / 2) * 0.28}px`;
        }
      },
      { passive: true },
    );
    document.addEventListener('pointerout', (e) => {
      const card = e.target.closest?.(tiltTargets);
      if (card && !card.contains(e.relatedTarget)) {
        card.style.removeProperty('--rx');
        card.style.removeProperty('--ry');
      }
      const magnet = e.target.closest?.(magnetTargets);
      if (magnet && !magnet.contains(e.relatedTarget)) magnet.style.translate = '';
    });
    document.documentElement.addEventListener('pointerleave', () => glow.classList.remove('on'));
  }
  // Every press on a button, chip or tile throws a small burst of sparks.
  document.addEventListener('pointerdown', (e) => {
    if (
      !e.target.closest?.(
        '.button,.type-filter,.filter,.quick-card,.drive-entry,.icon-btn,.admin-nav button,.thread-row,.auth-choice,.suggest-chip',
      )
    )
      return;
    const burst = document.createElement('div');
    burst.className = 'spark-burst';
    burst.setAttribute('aria-hidden', 'true');
    burst.style.translate = `${e.clientX}px ${e.clientY}px`;
    burst.innerHTML = Array.from(
      { length: 12 },
      (_, i) => `<i style="--a:${i * 30 + Math.random() * 18}deg;--r:${34 + Math.random() * 30}px"></i>`,
    ).join('');
    document.body.append(burst);
    setTimeout(() => burst.remove(), 800);
  });
}
const spotTargets =
  '.group-card,.quick-card,.drive-entry,.stat,.dev-card,.profile-card,.contact-chip,.type-filter,.idea-band,' +
  '.admin-box,.admin-row,.thread-row,.login-box,.auth-choice';
const tiltTargets =
  '.quick-card,.group-card,.drive-entry,.stat,.dev-card,.contact-chip,.admin-row,.thread-row,.login-box,.auth-choice';
const magnetTargets = '.button,.icon-btn,.type-filter,.filter,.avatar-mini,.admin-nav button';
