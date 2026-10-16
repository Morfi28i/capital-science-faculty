// A rotating line of adhkar shown at the top of every page (site and dashboard).
export const adhkar = [
  'سبحان الله وبحمده، سبحان الله العظيم',
  'لا إله إلا الله وحده لا شريك له',
  'أستغفر الله العظيم وأتوب إليه',
  'لا حول ولا قوة إلا بالله',
  'الحمد لله على كل حال',
  'اللهم صلِّ وسلم وبارك على نبينا محمد',
  'سبحان الله، والحمد لله، ولا إله إلا الله، والله أكبر',
  'رب زدني علمًا',
  'اللهم انفعني بما علمتني وعلمني ما ينفعني',
  'حسبي الله لا إله إلا هو عليه توكلت',
  'لا إله إلا أنت سبحانك إني كنت من الظالمين',
  'رب اشرح لي صدري ويسر لي أمري',
];

let index = Math.floor(Math.random() * adhkar.length);
const next = () => adhkar[(index = (index + 1) % adhkar.length)];

// Each call (each page render) shows the next dhikr.
export function dhikrStrip() {
  return `<div class="dhikr" role="note" lang="ar" dir="rtl"><span class="dhikr-fixed">متنساش تصلي على النبي ﷺ</span><span class="dhikr-sep" aria-hidden="true">✦</span><span class="dhikr-text">${next()}</span></div>`;
}

// While a page stays open, swap the dhikr every 15 seconds.
let timer;
// The strip sticks just under the site's top bar, whose height changes with the screen size.
function syncTopbar() {
  const height = document.querySelector('.topbar')?.offsetHeight;
  if (height) document.documentElement.style.setProperty('--topbar-h', `${height}px`);
}
export function startDhikrRotation() {
  requestAnimationFrame(syncTopbar);
  if (timer) return;
  addEventListener('resize', syncTopbar);
  timer = setInterval(() => {
    const el = document.querySelector('.dhikr-text');
    if (!el || document.hidden) return;
    el.classList.add('is-changing');
    setTimeout(() => {
      el.textContent = next();
      el.classList.remove('is-changing');
    }, 350);
  }, 15_000);
}
