// "لخصها تجيب عرقها": the page, the one-time consent question, the viewer and the PDF export.
// app.js passes in what it owns (language, icons, escaping, the sign-up flow) so this file loads only when needed.
import { drawCover, drawSlide, footer } from '/slides-draw.js?v=6';

const auth = () => import('/firebase-auth.js');
// The Vercel proxy cannot carry a large file, so on the live site the PDF goes straight to the API host.
const uploadBase = () =>
  location.hostname.endsWith('vercel.app') ? 'https://capital-science-faculty.onrender.com' : '';
const POLL_MS = 4000;
const MAX_READ_BYTES = 1024 * 1024 * 1024; // pdf.js reads a local file in ranges, so even a big one stays light
const MIN_TEXT_CHARS = 300;
let ctx, root, status, jobs, pollTimer, currentView, busyUpload, wasRunning;
const L = (ar, en) => (ctx.lang() === 'ar' ? ar : en);
const icon = (...a) => ctx.icon(...a);
const esc = (v) => ctx.esc(v);

const consentCopy = () => ({
  title: L('لخصها تجيب عرقها: عايز تحوّل محاضراتك لسلايدز؟', 'Squeeze It Dry: want to turn your lectures into slides?'),
  body: L(
    'عشان نعملها، محتوى الملف اللي هتبعته بيتبعت لخدمات ذكاء اصطناعي مجانية (زي Gemini من جوجل وغيرها). مش بناخد أي أكسس لأكونتك، ومش بنشوف إيميلك ولا Drive بتاعك.',
    'To do this, the content of your file goes to free AI services (such as Google’s Gemini and others). We take no access to your account, and we never see your email or Drive.',
  ),
  small: L(
    'ابعت محاضرات بس: الخدمات دي ممكن تستخدم الملفات لتحسين خدماتها، وموظفين عندها ممكن يقروها، فمتبعتش أي حاجة شخصية. لازم تكون عندك 18 سنة أو أكتر.',
    'Send lectures only: these services may use files to improve their products and their staff may read them, so send nothing personal. You must be 18 or older.',
  ),
  yes: L('موافق', 'I agree'),
  no: L('مش دلوقتي', 'Not now'),
});
const consentInner = () => {
  const c = consentCopy();
  return `<h2>${c.title}</h2><p>${c.body}</p><p class="slides-small">${c.small}</p><div class="slides-actions"><button class="button primary" data-consent="yes">${c.yes} ${icon('check')}</button><button class="button ghost" data-consent="no">${c.no}</button></div>`;
};
async function api(path, options = {}) {
  const { slidesRequest } = await auth();
  return slidesRequest(path, options);
}
async function saveConsent(choice) {
  const result = await api('/consent', { method: 'POST', body: { choice } });
  if (status) status.consent = result.slidesConsent;
  return result.slidesConsent;
}

// ---------- The one-time question after signing in or signing up ----------
let askedThisVisit = false;
export async function askConsentOnce(context) {
  ctx = context;
  if (askedThisVisit || document.querySelector('.slides-dialog') || location.pathname === '/slides') return;
  askedThisVisit = true;
  let s;
  try {
    s = await api('/status');
  } catch {
    askedThisVisit = false; // the free host was asleep or the session is not ready yet: the next page tries again
    return;
  }
  status = s;
  if (s.consent && s.consent.version >= s.consentVersion) return;
  if (!s.available && !s.message) return;
  const dialog = document.createElement('dialog');
  dialog.className = 'slides-dialog';
  dialog.innerHTML = `<div class="slides-dialog-art">${ctx.pressArt}</div>${consentInner()}`;
  document.body.append(dialog);
  dialog.addEventListener('cancel', (e) => e.preventDefault());
  dialog.querySelectorAll('[data-consent]').forEach((b) => {
    b.onclick = async () => {
      dialog.querySelectorAll('button').forEach((x) => (x.disabled = true));
      try {
        await saveConsent(b.dataset.consent);
      } catch {}
      dialog.close();
      dialog.remove();
      if (b.dataset.consent === 'yes') ctx.navigate('/slides');
    };
  });
  dialog.showModal();
}

// ---------- The gallery on the home page: real drawings, in several looks ----------
function showcaseSlides() {
  const c = (a, e, x, y) => ({ title: L(a, e), text: L(x, y) });
  return [
    ['study', { title: L('تصنيف الأنسجة الأربعة (Tissues)', 'The four foundational tissues'), bullets: [], visual: { type: 'tree', root: L('النسيج (Tissue)', 'Tissue'), items: [c('طلائي', 'Epithelial', 'يغطي الأسطح', 'Covers surfaces'), c('ضام', 'Connective', 'يربط ويدعم', 'Binds and supports'), c('عضلي', 'Muscular', 'للحركة', 'For movement'), c('عصبي', 'Nervous', 'للإشارات', 'For signals')] } }],
    ['board', { title: L('خطوات حل المعادلة', 'Solving an equation'), bullets: [], formula: 'ax² + bx + c = 0', visual: { type: 'flow', items: [c('جمّع الحدود', 'Collect terms', 'في طرف واحد', 'On one side'), c('احسب المميز', 'Find the discriminant', 'b² − 4ac', 'b² − 4ac'), c('طبّق القانون', 'Apply the formula', 'الجذور', 'The roots')] } }],
    ['blueprint', { title: L('مقارنة الروابط الكيميائية', 'Comparing chemical bonds'), bullets: [], visual: { type: 'table', headers: L('الرابطة,التكوين,مثال', 'Bond,Forms by,Example').split(','), rows: [{ cells: L('أيونية,نقل إلكترونات,NaCl', 'Ionic,Electron transfer,NaCl').split(',') }, { cells: L('تساهمية,مشاركة إلكترونات,H₂O', 'Covalent,Electron sharing,H₂O').split(',') }, { cells: L('فلزية,بحر إلكترونات,Cu', 'Metallic,Electron sea,Cu').split(',') }] } }],
    ['lab', { title: L('قوانين نيوتن (Newton)', 'Newton’s laws'), bullets: [], note: L('بييجي كتير في الامتحان', 'Often on the exam'), visual: { type: 'cards', items: [c('الأول', 'First', 'القصور الذاتي', 'Inertia'), c('التاني', 'Second', 'F = m a', 'F = m a'), c('التالت', 'Third', 'الفعل ورد الفعل', 'Action and reaction')] } }],
    ['sunset', { title: L('أهم النقاط', 'Key points'), bullets: [L('السرعة (Velocity) ليها اتجاه.', 'Velocity has a direction.'), L('العجلة بتغيّر السرعة.', 'Acceleration changes velocity.'), L('القوة بتسبب العجلة.', 'Force causes acceleration.')], formula: 'v = u + a t' }],
    ['ink', { title: L('الخلية النباتية والحيوانية', 'Plant and animal cells'), bullets: [], visual: { type: 'compare', items: [c('النباتية', 'Plant cell', 'جدار خلوي وبلاستيدات', 'Cell wall and chloroplasts'), c('الحيوانية', 'Animal cell', 'من غير جدار خلوي', 'No cell wall')] } }],
  ];
}
export async function mountShowcase(context) {
  ctx = context;
  const box = document.querySelector('#sq-gallery');
  if (!box) return;
  await document.fonts?.ready;
  if (!box.isConnected) return;
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 450;
  const look = { ...lookDefaults, size: 100, brand: true, numbers: false },
    cards = [];
  for (const [theme, slide] of showcaseSlides()) {
    drawSlide(canvas, slide, '', look, themeOf({ theme }), FONTS.display);
    cards.push(`<img src="${canvas.toDataURL('image/jpeg', 0.8)}" alt="${esc(slide.title)}" width="800" height="450" loading="lazy">`);
    await new Promise((resolve) => setTimeout(resolve));
    if (!box.isConnected) return;
  }
  const row = cards.join('');
  box.querySelector('.sq-gallery-track').innerHTML = `<div>${row}</div><div aria-hidden="true">${row.replace(/alt="[^"]*"/g, 'alt=""')}</div>`;
  box.hidden = false;
}

// ---------- The page ----------
export async function mountSlides(context) {
  ctx = context;
  root = document.querySelector('#slides-page');
  if (!root) return;
  clearTimeout(pollTimer);
  currentView = null;
  if (!ctx.getProfile()) return drawGuest();
  drawLoading();
  try {
    status = await api('/status');
  } catch (error) {
    if (error.status === 401) return drawGuest(true);
    return drawProblem(L('السيرفر بيصحى… جرّب تاني بعد نص دقيقة.', 'The server is waking up. Try again in half a minute.'));
  }
  draw();
}
const panel = () => root?.querySelector('#slides-panel');
const setPress = (state) => {
  const press = root?.querySelector('#slides-press .press');
  if (press) press.dataset.state = state;
};
const stepNames = () => [L('قراءة الملف', 'Reading the file'), L('الإرسال', 'Sending'), L('كتابة السلايدز', 'Writing the slides'), L('جاهزة', 'Ready')];
function setStep(n) {
  const box = panel()?.querySelector('#slides-steps');
  if (!box) return;
  box.hidden = n < 0;
  box.querySelectorAll('li').forEach((li, i) => {
    li.classList.toggle('done', i < n);
    li.classList.toggle('now', i === n);
    if (i === n) li.setAttribute('aria-current', 'step');
    else li.removeAttribute('aria-current');
  });
  setPress(n < 0 ? 'idle' : n >= 3 ? 'done' : 'working');
}
function drawLoading() {
  panel().innerHTML = `<div class="slides-card slides-loading" role="status"><span class="spinner"></span>${L('بنجهّز…', 'Getting ready…')}</div>`;
}
function drawProblem(text) {
  panel().innerHTML = `<div class="slides-card"><p role="alert">${esc(text)}</p><button class="button ghost" id="slides-retry">${L('حاول تاني', 'Try again')}</button></div>`;
  panel().querySelector('#slides-retry').onclick = () => mountSlides(ctx);
}
function drawGuest(expired) {
  panel().innerHTML = `<div class="slides-card slides-locked"><span class="lock-mark">${lockIcon()}</span><h2>${expired ? L('سجّل دخولك تاني', 'Please sign in again') : L('سجّل الأول وجرّبها', 'Sign up to try it')}</h2><p>${L('الخدمة مجانية لطلبة الكلية، ومحتاجة ملف طلابي بس.', 'It is free for students of the faculty. You only need a student profile.')}</p><button class="button primary" id="slides-signup">${L('سجّل دلوقتي', 'Sign up now')} ${icon('arrow')}</button></div>`;
  panel().querySelector('#slides-signup').onclick = () => ctx.openSignup();
}
const lockIcon = () =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>`;
function draw() {
  if (!root?.isConnected) return;
  if (!status.available)
    return (panel().innerHTML = `<div class="slides-card slides-locked"><span class="lock-mark">${lockIcon()}</span><h2>${L('الخدمة متوقفة شوية', 'The service is paused for now')}</h2><p>${esc(status.message || L('هترجع قريب. باقي الموقع شغال عادي.', 'It will be back soon. The rest of the site works as usual.'))}</p></div>`);
  if (status.consent?.choice !== 'yes' || status.consent.version < status.consentVersion) return drawLocked();
  drawWorkspace();
}
function drawLocked() {
  panel().innerHTML = `<div class="slides-card slides-locked reveal-in"><span class="lock-mark">${lockIcon()}</span>${consentInner()}<p class="slides-small slides-refused" hidden>${L('تمام، مفيش مشكلة. باقي الموقع شغال عادي، والتاب ده هيفضل مقفول لحد ما توافق.', 'That is fine. The rest of the site works as usual, and this tab stays locked until you agree.')}</p></div>`;
  panel().querySelectorAll('[data-consent]').forEach((b) => {
    b.onclick = async () => {
      b.disabled = true;
      try {
        await saveConsent(b.dataset.consent);
        if (b.dataset.consent === 'yes') return draw();
        panel().querySelector('.slides-refused').hidden = false;
      } catch {
        ctx.toast?.(L('حصلت مشكلة، جرّب تاني.', 'Something went wrong, try again.'));
      }
      b.disabled = false;
    };
  });
}
// The student can leave it on Auto, which moves to the next free model when one is busy, or pick a model.
const langNames = () => [
  ['source', L('لغة الملف', 'File language')],
  ['ar', L('عربي', 'Arabic')],
  ['en', L('إنجليزي', 'English')],
  ['both', L('لغة الملف + عربي', 'File language + Arabic')],
  ['fr', 'Français'], ['de', 'Deutsch'], ['es', 'Español'], ['it', 'Italiano'], ['pt', 'Português'], ['tr', 'Türkçe'], ['ru', 'Русский'], ['zh', '中文'], ['ja', '日本語'], ['ko', '한국어'], ['hi', 'हिन्दी'], ['ur', 'اردو'], ['fa', 'فارسی'], ['id', 'Indonesia'],
];
// ---------- Customizing what the slides say ----------
const CHOICES_KEY = 'cs-slides-choices';
const LOOK_KEY = 'cs-slides-look';
const store = {
  get(key) {
    try {
      return JSON.parse(localStorage.getItem(key) || '{}') || {};
    } catch {
      return {};
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  },
};
// Simple means the settings agreed for the lectures: a detailed deck in the file's language plus Arabic, nothing to choose.
const MODE_KEY = 'cs-slides-mode';
const getMode = () => {
  try {
    return localStorage.getItem(MODE_KEY) === 'advanced' ? 'advanced' : 'simple';
  } catch {
    return 'simple';
  }
};
const contentDefaults = { drawing: 'drawn', format: 'detailed', depth: 'exhaustive', tone: 'simple', focus: 'understand', slides: 4, images: 'few', extras: [], custom: '' };
const countLabel = (n) => (Number(n) < 5 ? L('تلقائي: حوالي 10 وبحد أقصى 15، والملف الكبير أكتر', 'Auto: about 10, 15 at most, more for a big file') : String(n));
const recipes = () => [
  { id: 'exam', label: L('ليلة الامتحان', 'Night before the exam'), set: { depth: 'normal', tone: 'simple', focus: 'exam', slides: 20, extras: ['questions', 'mistakes', 'formulas'] } },
  { id: 'quick', label: L('مراجعة في 5 دقايق', '5-minute revision'), set: { depth: 'brief', tone: 'simple', focus: 'revision', slides: 8, extras: ['formulas'] } },
  { id: 'baladi', label: L('اشرحها بالعامية', 'Explain in Egyptian'), set: { depth: 'detailed', tone: 'egyptian', focus: 'understand', slides: 25, extras: ['examples', 'mnemonics'] } },
  { id: 'all', label: L('كل حاجة بالتفصيل', 'Everything in detail'), set: { depth: 'exhaustive', tone: 'formal', focus: 'understand', slides: 40, extras: ['examples', 'terms', 'formulas', 'steps'] } },
];
const segmented = (name, legend, rows, value) =>
  `<fieldset class="slides-langs"><legend>${legend}</legend>${rows.map(([v, t]) => `<label class="slides-lang"><input type="radio" name="${name}" value="${v}" ${v === value ? 'checked' : ''}><span>${t}</span></label>`).join('')}</fieldset>`;
function contentPanel() {
  const c = { ...contentDefaults, ...store.get(CHOICES_KEY) };
  const extras = [
    ['examples', L('أمثلة محلولة', 'Worked examples')],
    ['questions', L('أسئلة امتحان بإجاباتها', 'Exam questions with answers')],
    ['terms', L('قاموس المصطلحات', 'Glossary of terms')],
    ['formulas', L('كل القوانين في مكان واحد', 'All formulas in one place')],
    ['mnemonics', L('حيل للحفظ', 'Memory tricks')],
    ['compare', L('مقارنات', 'Comparisons')],
    ['steps', L('خطوات مترقمة', 'Numbered steps')],
    ['mistakes', L('أخطاء شائعة', 'Common mistakes')],
  ];
  return `<div class="custom-body"><div class="recipes">${recipes().map((r) => `<button type="button" class="recipe" data-recipe="${r.id}">${r.label}</button>`).join('')}</div>${segmented(
    'drawing',
    L('الرسم', 'Drawing'),
    [['drawn', L('مرسومة (حوالي 5 دقايق)', 'Drawn (about 5 minutes)')], ['best', L('أقرب شكل لـ NotebookLM (حوالي 15 دقيقة)', 'Closest to NotebookLM (about 15 minutes)')], ['fast', L('مخططات سريعة (ثواني)', 'Quick diagrams (seconds)')]],
    c.drawing || 'drawn',
  )}${segmented(
    'format',
    L('النوع', 'Format'),
    [['detailed', L('عرض مفصّل', 'Detailed deck')], ['presenter', L('شرائح للمقدّم', 'Presenter slides')]],
    c.format,
  )}${segmented(
    'images',
    L('الرسومات', 'Illustrations'),
    [['none', L('من غير', 'None')], ['few', L('شوية', 'Some')], ['many', L('كتير', 'Many')]],
    c.images,
  )}${segmented(
    'depth',
    L('التفصيل', 'Detail'),
    [['brief', L('مختصر', 'Brief')], ['normal', L('متوسط', 'Medium')], ['detailed', L('مفصّل', 'Detailed')], ['exhaustive', L('كل كلمة', 'Every word')]],
    c.depth,
  )}${segmented(
    'tone',
    L('الأسلوب', 'Tone'),
    [['formal', L('أكاديمي', 'Academic')], ['simple', L('بسيط', 'Simple')], ['egyptian', L('بالعامية', 'Egyptian Arabic')]],
    c.tone,
  )}${segmented(
    'focus',
    L('الهدف', 'Goal'),
    [['understand', L('أفهم', 'Understand')], ['exam', L('أنجح في الامتحان', 'Pass the exam')], ['revision', L('أراجع بسرعة', 'Revise fast')]],
    c.focus,
  )}<label class="custom-range">${L('الطول', 'Length')}: <b id="slides-count-now">${countLabel(c.slides)}</b><input type="range" name="slides" min="4" max="40" value="${c.slides}"></label><fieldset class="slides-langs"><legend>${L('ضيف كمان', 'Also add')}</legend>${extras.map(([v, t]) => `<label class="slides-lang"><input type="checkbox" name="extras" value="${v}" ${c.extras.includes(v) ? 'checked' : ''}><span>${t}</span></label>`).join('')}</fieldset><label class="custom-text">${L('اوصف السلايدز اللي عايزها', 'Describe the deck you want')}<textarea name="custom" maxlength="1000" rows="3" placeholder="${L('مثلًا: ركّز على الباب التالت، واشرح كل قانون بمثال', 'For example: focus on chapter three, and explain each law with an example')}">${esc(c.custom)}</textarea></label></div>`;
}
function readContentOptions(form) {
  if (getMode() === 'simple') return { ...contentDefaults, format: form.elements.simpleFormat?.value || 'detailed', extras: [], custom: '', slides: 0 };
  const e = form.elements;
  return {
    drawing: e.drawing.value,
    format: e.format.value,
    images: e.images.value,
    depth: e.depth.value,
    tone: e.tone.value,
    focus: e.focus.value,
    slides: Number(e.slides.value),
    extras: [...form.querySelectorAll('input[name=extras]:checked')].map((x) => x.value),
    custom: e.custom.value.trim(),
  };
}
function saveChoices(form) {
  store.set(CHOICES_KEY, readContentOptions(form));
}
function applyRecipe(form, id) {
  const r = recipes().find((x) => x.id === id);
  if (!r) return;
  const e = form.elements;
  e.depth.value = r.set.depth;
  e.tone.value = r.set.tone;
  e.focus.value = r.set.focus;
  e.slides.value = r.set.slides;
  form.querySelector('#slides-count-now').textContent = countLabel(r.set.slides);
  form.querySelectorAll('input[name=extras]').forEach((x) => (x.checked = r.set.extras.includes(x.value)));
  form.querySelectorAll('.recipe').forEach((b) => b.classList.toggle('on', b.dataset.recipe === id));
}

// ---------- Customizing how the slides look: instant, with no new request ----------
const THEMES = {
  study: { name: () => L('زي NotebookLM', 'NotebookLM style'), bg: '#f5f7fc', ink: '#15233f', accent: '#15233f', second: '#e0a526', soft: '#e7ecf8', card: '#ffffff', grid: '#e3e8f3' },
  night: { name: () => L('ليلي', 'Night'), bg: '#0f1612', ink: '#e8eee5', accent: '#9fd6b0', second: '#e6b964', soft: '#1c2f24' },
  paper: { name: () => L('ورق', 'Paper'), bg: '#fffdf8', ink: '#17241c', accent: '#1d4632', second: '#c98f36', soft: '#e3ecdf' },
  board: { name: () => L('سبورة', 'Chalkboard'), bg: '#16302a', ink: '#f2f2e6', accent: '#f6e05e', second: '#9ae6b4', soft: '#1f3f37' },
  blueprint: { name: () => L('مخطط هندسي', 'Blueprint'), bg: '#0b2a4a', ink: '#e6f1ff', accent: '#7cc4ff', second: '#ffd166', soft: '#123c66' },
  lab: { name: () => L('معمل', 'Lab'), bg: '#f4f8fb', ink: '#12263a', accent: '#1f6fb2', second: '#18a999', soft: '#dcebf6' },
  sunset: { name: () => L('غروب', 'Sunset'), bg: '#fff7ef', ink: '#3a1d14', accent: '#d9480f', second: '#f59f00', soft: '#ffe8d6' },
  ink: { name: () => L('بنفسجي', 'Violet'), bg: '#12131a', ink: '#eceaf6', accent: '#a78bfa', second: '#f0abfc', soft: '#231f38' },
  mono: { name: () => L('أبيض وأسود', 'Black and white'), bg: '#ffffff', ink: '#111111', accent: '#111111', second: '#777777', soft: '#eeeeee' },
};
const FONTS = {
  display: "'Alexandria', 'IBM Plex Sans Arabic', system-ui, sans-serif",
  body: "'IBM Plex Sans Arabic', system-ui, sans-serif",
  serif: "'Noto Naskh Arabic', 'Times New Roman', Georgia, serif",
};
const RATIOS = { wide: [1280, 720], classic: [1280, 960], a4: [960, 1358] };
const lookDefaults = { theme: 'study', font: 'display', layout: 'classic', ratio: 'wide', size: 100, numbers: false, brand: true, cover: false, author: '', footer: '' };
const getLook = () => {
  const l = { ...lookDefaults, ...store.get(LOOK_KEY) };
  if (!THEMES[l.theme]) l.theme = lookDefaults.theme;
  if (!FONTS[l.font]) l.font = lookDefaults.font;
  if (!RATIOS[l.ratio]) l.ratio = lookDefaults.ratio;
  if (!['classic', 'center', 'band', 'bigtitle'].includes(l.layout)) l.layout = lookDefaults.layout;
  l.size = Math.min(140, Math.max(70, Number(l.size) || 100));
  return l;
};
const themeOf = (l) => {
  const t = THEMES[l.theme];
  return { ...t, card: t.card || t.soft };
};
function lookStyle(l) {
  const t = THEMES[l.theme],
    [w, h] = RATIOS[l.ratio];
  return `--d-bg:${t.bg};--d-ink:${t.ink};--d-accent:${t.accent};--d-second:${t.second};--d-soft:${t.soft};--d-font:${FONTS[l.font]};--d-size:${l.size / 100};--d-ratio:${w}/${h}`;
}
function lookPanel(l) {
  return `<details class="slides-models custom-panel look-panel"><summary>${L('خصّص الشكل', 'Customize the look')}</summary>${lookBody(l)}</details>`;
}
function lookBody(l) {
  return `<div class="custom-body look-body"><div class="theme-row" role="group" aria-label="${L('الثيم', 'Theme')}">${Object.entries(THEMES)
    .map(([k, t]) => `<button type="button" class="theme-chip ${k === l.theme ? 'on' : ''}" data-theme-pick="${k}" aria-pressed="${k === l.theme}" style="--c1:${t.bg};--c2:${t.accent};--c3:${t.second}"><i></i>${t.name()}</button>`)
    .join('')}</div>${segmented('layout', L('الترتيب', 'Layout'), [['classic', L('كلاسيك', 'Classic')], ['center', L('في النص', 'Centered')], ['band', L('شريط جانبي', 'Side band')], ['bigtitle', L('عنوان ضخم', 'Huge title')]], l.layout)}${segmented('font', L('الخط', 'Font'), [['body', L('عادي', 'Regular')], ['display', L('عريض', 'Bold')], ['serif', L('كلاسيكي', 'Classic')]], l.font)}${segmented('ratio', L('المقاس', 'Format'), [['wide', '16:9'], ['classic', '4:3'], ['a4', 'A4']], l.ratio)}<label class="custom-range">${L('حجم الكلام', 'Text size')}: <b class="look-size-now">${l.size}%</b><input type="range" name="size" min="70" max="140" step="5" value="${l.size}"></label><fieldset class="slides-langs"><legend class="sr-only">${L('إضافات', 'Extras')}</legend>${[
    ['numbers', L('أرقام الصفحات', 'Page numbers')],
    ['brand', L('اسم الموقع', 'Site name')],
    ['cover', L('صفحة غلاف', 'Cover page')],
  ]
    .map(([k, t]) => `<label class="slides-lang"><input type="checkbox" name="${k}" ${l[k] ? 'checked' : ''}><span>${t}</span></label>`)
    .join('')}</fieldset><div class="look-fields"><label class="custom-text">${L('اسمك على الغلاف', 'Your name on the cover')}<input name="author" maxlength="60" value="${esc(l.author)}"></label><label class="custom-text">${L('كلام تحت كل صفحة', 'Text under every page')}<input name="footer" maxlength="60" value="${esc(l.footer)}"></label></div><div class="slides-actions"><button type="button" class="button ghost" data-look-surprise>${L('فاجئني', 'Surprise me')}</button><button type="button" class="button ghost" data-look-reset>${L('رجّع الأصلي', 'Back to default')}</button></div></div>`;
}
// Every look control repaints at once: the studio's preview before generating, the real slides after.
function paintLook(next) {
  store.set(LOOK_KEY, next);
  panel()?.querySelectorAll('.look-body').forEach((body) => syncLook(body, next));
  drawSummary();
  resetFrames();
}
function syncLook(body, l) {
  body.querySelectorAll('[data-theme-pick]').forEach((b) => {
    const on = b.dataset.themePick === l.theme;
    b.classList.toggle('on', on);
    b.setAttribute('aria-pressed', on);
  });
  body.querySelectorAll('input[type=radio]').forEach((r) => (r.checked = l[r.name] === r.value));
  body.querySelectorAll('input[type=checkbox]').forEach((c) => (c.checked = Boolean(l[c.name])));
  const size = body.querySelector('input[name=size]');
  size.value = l.size;
  body.querySelector('.look-size-now').textContent = `${l.size}%`;
  body.querySelectorAll('input[name=author],input[name=footer]').forEach((i) => {
    if (document.activeElement !== i) i.value = l[i.name];
  });
}
function wireLook(body) {
  body.querySelectorAll('[data-theme-pick]').forEach((b) => (b.onclick = () => paintLook({ ...getLook(), theme: b.dataset.themePick })));
  body.querySelectorAll('input[type=radio]').forEach((r) => (r.onchange = () => paintLook({ ...getLook(), [r.name]: r.value })));
  body.querySelectorAll('input[type=checkbox]').forEach((c) => (c.onchange = () => paintLook({ ...getLook(), [c.name]: c.checked })));
  body.querySelector('input[name=size]').oninput = (e) => paintLook({ ...getLook(), size: Number(e.target.value) });
  body.querySelectorAll('input[name=author],input[name=footer]').forEach((i) => (i.oninput = () => paintLook({ ...getLook(), [i.name]: i.value })));
  body.querySelector('[data-look-reset]').onclick = () => paintLook({ ...lookDefaults });
  body.querySelector('[data-look-surprise]').onclick = () => {
    const any = (list) => list[Math.floor(Math.random() * list.length)];
    paintLook({ ...getLook(), theme: any(Object.keys(THEMES)), font: any(Object.keys(FONTS)), layout: any(['classic', 'center', 'band', 'bigtitle']) });
  };
}
// ---------- The live preview: a sample slide that answers every choice at once ----------
function sampleSlide(form) {
  const o = readContentOptions(form),
    lang = form.elements.lang.value,
    ar = lang === 'ar' || lang === 'both' || (lang === 'source' && ctx.lang() === 'ar');
  const it = (a, e, x, y) => ({ title: ar ? a : e, text: o.depth === 'brief' ? '' : ar ? x : y });
  const simple = o.tone === 'egyptian' ? ['بيغطي الأسطح', 'بيربط ويدعم', 'بيحرّك الجسم', 'بينقل الإشارات'] : ['يغطي الأسطح والتجاويف', 'يربط الأعضاء ويدعمها', 'مسؤول عن الحركة', 'ينقل الإشارات'];
  return {
    title: ar ? 'تصنيف الأنسجة الأربعة (Tissues)' : 'The four foundational tissues',
    bullets: [],
    formula: '',
    note: o.focus === 'exam' ? (ar ? 'بييجي كتير في الامتحان: احفظ الأربع أنواع.' : 'Often on the exam: know all four types.') : o.format === 'presenter' ? (ar ? 'نقطة الكلام: ابدأ بالمثال.' : 'Talking point: start with the example.') : '',
    visual: {
      type: 'tree',
      root: ar ? 'النسيج (Tissue)' : 'Tissue',
      items: [
        it('طلائي', 'Epithelial', simple[0], 'Covers surfaces and cavities'),
        it('ضام', 'Connective', simple[1], 'Binds and supports organs'),
        it('عضلي', 'Muscular', simple[2], 'Responsible for movement'),
        it('عصبي', 'Nervous', simple[3], 'Carries signals'),
      ],
    },
  };
}
function drawSummary() {
  const form = panel()?.querySelector('#slides-form');
  if (!form) return;
  const o = readContentOptions(form),
    l = getLook(),
    labelOf = (input) => form.querySelector(`input[name=${input}]:checked`)?.closest('label')?.textContent || '';
  const preview = form.querySelector('.studio-canvas'),
    [W, H] = RATIOS[l.ratio];
  preview.width = W;
  preview.height = H;
  drawSlide(preview, sampleSlide(form), '1 / 12', l, themeOf(l), FONTS[l.font]);
  form.querySelector('.studio-summary').innerHTML = [
    form.elements.lang.selectedOptions[0]?.textContent,
    labelOf('format'),
    labelOf('depth'),
    labelOf('tone'),
    labelOf('focus'),
    o.slides >= 5 ? `${o.slides} ${L('سلايد', 'slides')}` : L('طول تلقائي', 'Auto length'),
    labelOf('images'),
    ...o.extras.map((e) => form.querySelector(`input[name=extras][value=${e}]`).closest('label').textContent),
    THEMES[l.theme].name(),
    labelOf('family'),
  ]
    .filter(Boolean)
    .map((t) => `<li>${esc(t)}</li>`)
    .join('');
}
function modelPicker() {
  const models = status.models || [];
  if (!models.length) return '';
  return `<div class="custom-body"><fieldset class="slides-langs"><legend class="sr-only">${L('الموديل', 'Model')}</legend><label class="slides-lang"><input type="radio" name="family" value="auto" checked><span>${L('تلقائي', 'Auto')}</span></label>${models
    .map(
      (m) =>
        `<label class="slides-lang"><input type="radio" name="family" value="${esc(m.id)}"><span>${esc(m.label)}</span></label>`,
    )
    .join('')}</fieldset><p class="slides-small">${L('كل الموديلات مجانية. "تلقائي" بيجرّبهم بالترتيب ده: أول موديل متاح يستحمل طول الملف بيشتغل، ولو زحمة أو وقف بننقل للي بعده. مش بيقارن جودتهم. الصور والصوت والفيديو والملفات المصورة بيقراها Gemini بس.', 'All models are free. Auto tries them in this order: the first one available that can take the file’s length runs, and if it is busy or fails we move to the next. It does not compare their quality. Only Gemini reads images, audio, video and scanned files.')}</p></div>`;
}
// Nothing is on until the student turns it on, and each one can be turned off again here.
function notifyPanel() {
  const n = status.notify || {};
  const pushOk = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  const row = (name, label, on, off) =>
    off ? '' : `<label class="slides-lang"><input type="checkbox" name="${name}" ${on ? 'checked' : ''}><span>${label}</span></label>`;
  return `<fieldset class="slides-langs notify-row"><legend>${L('بلّغني لما تخلص', 'Tell me when it is done')}</legend>${row('bell', L('في الجرس', 'In the bell'), n.bell)}${row('email', L('على الإيميل', 'By email'), n.email, !status.hasEmail)}${row('push', L('إشعار على الجهاز', 'Device notification'), n.push, !pushOk)}</fieldset>`;
}
const b64ToBytes = (text) => Uint8Array.from(atob(text.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(text.length / 4) * 4, '=')), (c) => c.charCodeAt(0));
async function deviceEndpoint(subscribe) {
  const registration = await navigator.serviceWorker.register('/sw.js');
  await navigator.serviceWorker.ready;
  let sub = await registration.pushManager.getSubscription();
  if (subscribe && !sub) {
    if ((await Notification.requestPermission()) !== 'granted') throw fail('nopush');
    sub = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(status.pushKey) });
  }
  const endpoint = sub?.endpoint;
  if (!subscribe && sub) await sub.unsubscribe();
  return endpoint;
}
function wireNotify(form) {
  const row = form.querySelector('.notify-row');
  row.querySelectorAll('input').forEach((input) => {
    input.onchange = async () => {
      const pick = (name) => Boolean(row.querySelector(`input[name=${name}]`)?.checked);
      const choices = { bell: pick('bell'), email: pick('email'), push: pick('push') };
      try {
        const endpoint = input.name === 'push' ? await deviceEndpoint(input.checked) : undefined;
        status.notify = (await api('/notify', { method: 'POST', body: { ...choices, ...(endpoint ? { endpoint } : {}) } })).slidesNotify;
      } catch (error) {
        input.checked = !input.checked;
        say(error.code === 'nopush' ? L('المتصفح مقفول عليه الإشعارات. افتحها من إعدادات المتصفح.', 'Notifications are blocked in this browser. Allow them in its settings.') : L('مقدرناش نحفظ الاختيار. جرّب تاني.', 'The choice could not be saved. Try again.'), true);
      }
    };
  });
}
function drawWorkspace() {
  const tabs = [
    ['file', L('الملف', 'File')],
    ['content', L('المحتوى', 'Content')],
    ['look', L('الشكل', 'Look')],
    ['model', L('الموديل', 'Model')],
  ];
  const look = getLook();
  const mode = getMode();
  panel().innerHTML = `<div class="mode-switch" role="radiogroup" aria-label="${L('طريقة العمل', 'How to work')}"><label><input type="radio" name="slides-mode" value="simple" ${mode === 'simple' ? 'checked' : ''}><span><b>${L('بسيط', 'Simple')}</b><small>${L('ارفع الملف ودوس، والباقي علينا', 'Upload and go, we handle the rest')}</small></span></label><label><input type="radio" name="slides-mode" value="advanced" ${mode === 'advanced' ? 'checked' : ''}><span><b>${L('متقدم', 'Advanced')}</b><small>${L('خصّص كل حاجة بنفسك', 'Customize everything yourself')}</small></span></label></div><form class="studio" id="slides-form" data-mode="${mode}"><div class="studio-main"><p class="simple-note">${L('الأساسيات بس. عايز تخصّص أكتر؟ افتح «متقدم».', 'Just the basics. Want more control? Open Advanced.')}</p><div class="studio-tabs" role="tablist" aria-label="${L('خطوات التجهيز', 'Setup')}">${tabs
    .map(([id, t], i) => `<button type="button" role="tab" id="tab-${id}" aria-controls="pane-${id}" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}">${t}</button>`)
    .join('')}</div><section class="studio-pane" role="tabpanel" id="pane-file" aria-labelledby="tab-file"><label class="slides-drop" id="slides-drop"><input type="file" id="slides-file" required><span class="drop-icon">${icon('file')}</span><b id="slides-file-name">${L('اختار ملف المحاضرة', 'Choose your lecture file')}</b><small>${L('PDF وWord وPowerPoint وExcel وEPUB ونص: لحد 1 جيجا. صور وصوت وفيديو: لحد 500 ميجا. PDF مصوّر: لحد 50 ميجا.', 'PDF, Word, PowerPoint, Excel, EPUB and text: up to 1 GB. Images, audio and video: up to 500 MB. Scanned PDF: up to 50 MB.')}</small></label><div class="simple-only">${segmented('simpleLang', L('اللغة', 'Language'), [['both', L('لغة الملف + عربي', 'File language + Arabic')], ['source', L('لغة الملف بس', 'File language only')], ['ar', L('عربي بس', 'Arabic only')]], 'both')}${segmented('simpleFormat', L('النوع', 'Type'), [['detailed', L('سلايدز مفصّلة', 'Detailed slides')], ['presenter', L('شرائح للمقدّم', 'Presenter slides')]], 'detailed')}</div><label class="custom-text">${L('لغة السلايدز', 'Slides language')}<select name="lang">${langNames()
    .map(([v, t]) => `<option value="${v}">${t}</option>`)
    .join('')}</select></label></section><section class="studio-pane" role="tabpanel" id="pane-content" aria-labelledby="tab-content" hidden>${contentPanel()}</section><section class="studio-pane" role="tabpanel" id="pane-look" aria-labelledby="tab-look" hidden>${lookBody(look)}</section><section class="studio-pane" role="tabpanel" id="pane-model" aria-labelledby="tab-model" hidden>${modelPicker()}</section><div class="studio-go"><button class="button primary" id="slides-go" type="submit">${L('اعصرها سلايدز', 'Squeeze it into slides')} ${icon('arrow')}</button>${notifyPanel()}<ol class="slides-steps" id="slides-steps" hidden>${stepNames()
    .map((n) => `<li>${n}</li>`)
    .join('')}</ol><div class="slides-progress" id="slides-progress" hidden><span></span></div><p class="slides-small" id="slides-msg" role="status" aria-live="polite">${L(`عندك ${status.perStudentDaily} محاضرات جديدة في اليوم، والمحاضرة اللي اتعملت بنفس الإعدادات قبل كده بتطلع فورًا ومش بتتحسب.`, `You get ${status.perStudentDaily} new lectures a day. A lecture already made with the same settings comes back instantly and does not count.`)}</p></div></div><aside class="studio-side" aria-label="${L('معاينة', 'Preview')}"><p class="studio-side-title">${L('معاينة الشكل', 'Look preview')}<small>${L('مثال، مش من ملفك', 'A sample, not from your file')}</small></p><canvas class="studio-canvas" role="img" aria-label="${L('معاينة شكل السلايد', 'Preview of the slide look')}"></canvas><ul class="studio-summary"></ul></aside></form><section class="slides-history" id="slides-history" aria-label="${L('سلايداتي', 'My slides')}"></section><div id="slides-viewer"></div><p class="slides-revoke"><button class="link-btn" id="slides-revoke">${L('إلغاء الموافقة', 'Withdraw my agreement')}</button></p>`;
  panel().querySelectorAll('input[name=slides-mode]').forEach((r) => {
    r.onchange = () => {
      try {
        localStorage.setItem(MODE_KEY, r.value);
      } catch {}
      drawWorkspace();
      resetFrames();
    };
  });
  const form = panel().querySelector('#slides-form'),
    file = form.querySelector('#slides-file'),
    name = form.querySelector('#slides-file-name'),
    drop = form.querySelector('#slides-drop');
  file.onchange = () => {
    name.textContent = file.files[0]?.name || L('اختار ملف المحاضرة', 'Choose your lecture file');
    drop.classList.toggle('has-file', Boolean(file.files[0]));
    checkFile(file.files[0]);
  };
  ['dragenter', 'dragover'].forEach((ev) =>
    drop.addEventListener(ev, (e) => {
      e.preventDefault();
      drop.classList.add('drag');
    }),
  );
  ['dragleave', 'drop'].forEach((ev) => drop.addEventListener(ev, () => drop.classList.remove('drag')));
  drop.addEventListener('drop', (e) => {
    e.preventDefault();
    if (e.dataTransfer.files.length) {
      file.files = e.dataTransfer.files;
      file.onchange();
    }
  });
  const tabButtons = [...form.querySelectorAll('[role=tab]')];
  const openTab = (button, focus) => {
    tabButtons.forEach((b) => {
      const on = b === button;
      b.setAttribute('aria-selected', on);
      b.tabIndex = on ? 0 : -1;
      form.querySelector(`#${b.getAttribute('aria-controls')}`).hidden = !on;
    });
    if (focus) button.focus();
  };
  tabButtons.forEach((b, i) => {
    b.onclick = () => openTab(b);
    b.onkeydown = (e) => {
      const rtl = document.documentElement.dir === 'rtl';
      const step = e.key === 'ArrowLeft' ? (rtl ? 1 : -1) : e.key === 'ArrowRight' ? (rtl ? -1 : 1) : 0;
      if (step) openTab(tabButtons[(i + step + tabButtons.length) % tabButtons.length], true);
    };
  });
  form.onsubmit = submit;
  wireNotify(form);
  form.elements.lang.addEventListener('change', drawSummary);
  form.querySelectorAll('[data-recipe]').forEach((b) => (b.onclick = () => {
    applyRecipe(form, b.dataset.recipe);
    drawSummary();
  }));
  form.querySelector('input[name=slides]').oninput = (e) => {
    form.querySelector('#slides-count-now').textContent = countLabel(e.target.value);
    drawSummary();
  };
  ['drawing', 'format', 'images', 'depth', 'tone', 'focus', 'family', 'extras'].forEach((n) =>
    form.querySelectorAll(`input[name=${n}]`).forEach((i) => i.addEventListener('change', drawSummary)),
  );
  wireLook(form.querySelector('.look-body'));
  drawSummary();
  panel().querySelector('#slides-revoke').onclick = async () => {
    await saveConsent('no');
    draw();
  };
  refreshJobs();
}
const say = (text, bad) => {
  const m = panel()?.querySelector('#slides-msg');
  if (!m) return;
  m.textContent = text;
  m.classList.toggle('is-bad', Boolean(bad));
};
function checkFile(f) {
  if (!f) return false;
  if (f.size > MAX_READ_BYTES) {
    say(L(`الملف ${Math.ceil(f.size / 1048576)} ميجا، وده أكبر من الحد. قسّمه وجرّب تاني.`, `This file is ${Math.ceil(f.size / 1048576)} MB, which is over the limit. Split it and try again.`), true);
    return false;
  }
  say('');
  return true;
}
const uploadErrors = () => ({
  consent: L('لازم توافق الأول.', 'Please agree first.'),
  paused: L('الخدمة متوقفة شوية.', 'The service is paused for now.'),
  inprogress: L('عندك محاضرة لسه بتتعمل. استنى تخلص الأول.', 'One of your lectures is still in progress. Wait for it first.'),
  toolarge: L('الملف أكبر من الحد المسموح.', 'The file is over the limit.'),
  notpdf: L('الملف ده مش PDF حقيقي.', 'This is not a real PDF file.'),
  needtext: L('الملف ده صور أو صوت أو فيديو، والموديل ده بيقرا نص بس. اختار Gemini أو تلقائي.', 'This file is images, audio or video and this model only reads text. Choose Gemini or Auto.'),
  scanbig: L('الملف أكبر من الحد: PDF المصوّر لحد 50 ميجا، والصور والصوت والفيديو لحد 500 ميجا. صغّره وجرّب تاني.', 'The file is over the limit: 50 MB for a scanned PDF, 500 MB for images, audio and video. Compress it and try again.'),
  noseeing: L('الملفات دي بيقراها Gemini بس، وهو مش متاح دلوقتي. جرّب ملف فيه نص.', 'Only Gemini reads these files and it is not available now. Try a file with text.'),
  oldoffice: L('الصيغة القديمة دي مش بتتقرا. افتحه واحفظه docx أو pptx أو xlsx.', 'This old format cannot be read. Open it and save it as docx, pptx or xlsx.'),
  unknown: L('الصيغة دي مش معروفة. جرّب PDF أو Word أو PowerPoint.', 'This format is not recognised. Try PDF, Word or PowerPoint.'),
  toolong: L('الملف أطول من اللي الموديل ده يستحمله. اختار "تلقائي" أو قسّم الملف.', 'This file is too long for this model. Choose Auto or split the file.'),
  notext: L('مفيش نص كفاية في الملف.', 'There is not enough text in this file.'),
  nomodel: L('الموديل ده مش متاح دلوقتي. اختار غيره.', 'This model is not available now. Choose another.'),
  badpdf: L('مقدرناش نفتح الملف. اتأكد إنه سليم ومن غير باسورد.', 'We could not open this file. Make sure it is valid and has no password.'),
  studentlimit: L('خلصت محاضرات النهارده. جرّب بكرة.', 'You have used today’s lectures. Try again tomorrow.'),
  busy: L('الخدمة زحمة دلوقتي، جرّب بعد شوية.', 'The service is busy. Try again in a while.'),
  blocked: L('الخدمة متوقفة شوية.', 'The service is paused for now.'),
});
async function uploadFile(f, mime, lang, bar, options) {
  const { slidesToken } = await auth();
  const token = await slidesToken();
  const query = new URLSearchParams({ lang, name: f.name, family: 'gemini', options: JSON.stringify(options) });
  return new Promise((resolve, reject) => {
    const x = new XMLHttpRequest();
    x.open('POST', `${uploadBase()}/api/firebase/slides/upload?${query}`);
    x.setRequestHeader('Authorization', `Bearer ${token}`);
    x.setRequestHeader('Content-Type', mime);
    x.upload.onprogress = (ev) => {
      if (ev.lengthComputable) bar.firstElementChild.style.width = `${(ev.loaded / ev.total) * 100}%`;
    };
    x.onload = () => {
      let r = {};
      try {
        r = JSON.parse(x.responseText);
      } catch {}
      if (x.status === 200) resolve(r.id);
      else reject(Object.assign(new Error(r.code || 'upload'), { code: r.code }));
    };
    x.onerror = () => reject(new Error('network'));
    x.send(f);
  });
}
const loadScript = (src, ready) =>
  (ready() && Promise.resolve()) ||
  new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = reject;
    document.head.append(s);
  });
// ---------- Any file: the browser pulls out the text where it can, and only the rest is uploaded ----------
const extOf = (name) => String(name).toLowerCase().split('.').pop();
const TEXT_EXT = new Set('txt md markdown csv tsv json xml yaml yml log tex rst srt vtt ini py js ts java c cpp cs m r sql ipynb'.split(' '));
const UPLOAD_MIME = {
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', heic: 'image/heic', heif: 'image/heif',
  mp3: 'audio/mpeg', wav: 'audio/wav', aac: 'audio/aac', ogg: 'audio/ogg', oga: 'audio/ogg', flac: 'audio/flac', m4a: 'audio/mp4',
  mp4: 'video/mp4', m4v: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime', mpeg: 'video/mpeg', mpg: 'video/mpeg', avi: 'video/x-msvideo',
  pdf: 'application/pdf',
};
const fail = (code) => Object.assign(new Error(code), { code });
const xmlText = (xml, paragraphTag) =>
  xml
    .replace(new RegExp(`</(${paragraphTag})>`, 'g'), '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
const byNumber = (a, b) => (Number(a.match(/(\d+)\.[a-z]+$/i)?.[1]) || 0) - (Number(b.match(/(\d+)\.[a-z]+$/i)?.[1]) || 0);
async function readZipText(file, ext) {
  await loadScript('/vendor/jszip.min.js', () => window.JSZip);
  let zip;
  try {
    zip = await window.JSZip.loadAsync(file);
  } catch {
    throw fail('badpdf');
  }
  const names = Object.keys(zip.files);
  const read = (n) => zip.file(n).async('string');
  const many = async (list, tag) => (await Promise.all(list.map(read))).map((x) => xmlText(x, tag)).join('\n\n');
  if (ext === 'docx') return many(names.filter((n) => /^word\/(document|footnotes)\.xml$/.test(n)), 'w:p');
  if (ext === 'pptx') return many(names.filter((n) => /^ppt\/(slides|notesSlides)\/[^/]+\.xml$/.test(n)).sort(byNumber), 'a:p');
  if (ext === 'xlsx') {
    const shared = names.includes('xl/sharedStrings.xml') ? await many(['xl/sharedStrings.xml'], 'si') : '';
    return shared + '\n' + (await many(names.filter((n) => /^xl\/worksheets\/[^/]+\.xml$/.test(n)).sort(byNumber), 'row'));
  }
  if (['odt', 'odp', 'ods'].includes(ext)) return many(['content.xml'], 'text:p|text:h');
  if (ext === 'epub') return many(names.filter((n) => /\.x?html?$/i.test(n)).sort(), 'p|h1|h2|h3|li|div');
  throw fail('unknown');
}
const htmlText = (html) => {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  doc.querySelectorAll('script,style,noscript,template').forEach((e) => e.remove());
  doc.querySelectorAll('p,div,li,tr,br,h1,h2,h3,h4,h5,h6').forEach((e) => e.append('\n'));
  return doc.body?.textContent || '';
};
const rtfText = (rtf) =>
  rtf
    .replace(/\\'([0-9a-f]{2})/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/\\u(-?\d+)\??/g, (_, n) => String.fromCharCode(Number(n) < 0 ? Number(n) + 65536 : Number(n)))
    .replace(/\\[a-z]+-?\d* ?/gi, '')
    .replace(/[{}]/g, '');
const tidy = (text) => String(text).normalize('NFKC').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
// A page of a real lecture has far more text than this; less means most of the PDF is pictures of pages.
const MIN_CHARS_PER_PAGE = 150;
let lastPdfPages = 1;
// Returns { text } when the browser could read it, or { upload: mime } when only a model that sees files can.
// A mostly-image PDF returns both, and `sparse`: reading it as images is better when that is possible.
export async function readAnyFile(file, onPage) {
  const ext = extOf(file.name);
  if (ext === 'pdf' || (file.type === 'application/pdf' && !ext)) {
    const text = await readPdfText(file, onPage);
    if (text.length < MIN_TEXT_CHARS) return { upload: 'application/pdf' };
    return text.length / lastPdfPages < MIN_CHARS_PER_PAGE ? { text, upload: 'application/pdf', sparse: true } : { text };
  }
  if (UPLOAD_MIME[ext]) return { upload: UPLOAD_MIME[ext] };
  if (/^(image|audio|video)\//.test(file.type)) return { upload: file.type };
  if (['docx', 'pptx', 'xlsx', 'odt', 'odp', 'ods', 'epub'].includes(ext)) return { text: tidy(await readZipText(file, ext)) };
  if (['doc', 'ppt', 'xls'].includes(ext)) throw fail('oldoffice');
  if (['html', 'htm', 'xhtml'].includes(ext)) return { text: tidy(htmlText(await file.text())) };
  if (ext === 'rtf') return { text: tidy(rtfText(await file.text())) };
  if (TEXT_EXT.has(ext) || file.type.startsWith('text/')) return { text: tidy(await file.text()) };
  // An unknown extension may still be plain text: a null byte near the start says it is not.
  const head = new Uint8Array(await file.slice(0, 4096).arrayBuffer());
  if (head.includes(0)) throw fail('unknown');
  return { text: tidy(await file.text()) };
}
// Reads the text in the student's browser, so a big lecture never has to be uploaded.
export async function readPdfText(file, onPage) {
  await loadScript('/vendor/pdf.min.js', () => window.pdfjsLib);
  window.pdfjsLib.GlobalWorkerOptions.workerSrc = '/vendor/pdf.worker.min.js';
  let doc, url;
  try {
    url = URL.createObjectURL(file);
    doc = await window.pdfjsLib.getDocument({ url, disableAutoFetch: true, disableStream: true }).promise;
  } catch {
    if (url) URL.revokeObjectURL(url);
    throw Object.assign(new Error('badpdf'), { code: 'badpdf' });
  }
  const pages = [];
  lastPdfPages = doc.numPages;
  for (let n = 1; n <= doc.numPages; n += 1) {
    const page = await doc.getPage(n);
    const content = await page.getTextContent();
    pages.push(content.items.map((i) => i.str + (i.hasEOL ? '\n' : ' ')).join(''));
    page.cleanup();
    onPage?.(n, doc.numPages);
  }
  doc.destroy();
  URL.revokeObjectURL(url);
  // NFKC turns the presentation-form Arabic letters many PDFs store back into normal letters.
  return pages.join('\n\n').normalize('NFKC').replace(/[ \t]+/g, ' ').trim();
}
async function submit(e) {
  e.preventDefault();
  if (busyUpload) return;
  const form = e.target,
    f = form.querySelector('#slides-file').files[0];
  if (!checkFile(f)) return;
  const go = form.querySelector('#slides-go'),
    bar = form.querySelector('#slides-progress');
  busyUpload = true;
  go.disabled = true;
  bar.hidden = false;
  try {
    const simple = getMode() === 'simple',
      lang = simple ? form.elements.simpleLang.value : form.elements.lang.value,
      family = simple ? 'auto' : form.elements.family?.value || 'auto';
    let id,
      notice = '';
    setStep(0);
    const options = readContentOptions(form);
    if (!simple) saveChoices(form);
    // Gemini reads a PDF itself, which keeps equations and figures. Every other model gets the text only.
    const wholePdf = family === 'gemini' && extOf(f.name) === 'pdf' && f.size <= status.maxBytes;
    let got = wholePdf ? { upload: 'application/pdf' } : null;
    if (!got) {
      say(L('بنقرا الملف…', 'Reading the file…'));
      got = await readAnyFile(f, (done, total) => {
        bar.firstElementChild.style.width = `${(done / total) * 100}%`;
      });
    }
    const canSeeFiles = (status.models || []).some((m) => m.pdf) && (family === 'auto' || family === 'gemini');
    const useUpload = got.text === undefined || (got.sparse && canSeeFiles && f.size <= status.maxBytes);
    if (useUpload) {
      if (!canSeeFiles) throw fail((status.models || []).some((m) => m.pdf) ? 'needtext' : 'noseeing');
      if (f.size > (got.upload === 'application/pdf' ? status.maxBytes : status.maxMediaBytes)) throw fail('scanbig');
      setStep(1);
      say(L('بنرفع الملف…', 'Uploading…'));
      id = await uploadFile(f, got.upload, lang, bar, options);
    } else {
      if (got.text.length < MIN_TEXT_CHARS) throw fail('notext');
      setStep(1);
      // Slides from a mostly-image PDF would miss what is in the pictures, so the student is told.
      const partial = got.sparse;
      say(L('بنبعت المحتوى…', 'Sending the content…'));
      id = (await api('/text', { method: 'POST', body: { text: got.text, name: f.name, lang, family, options } })).id;
      if (partial) notice = L('الملف ده أغلبه صور، فالسلايدز هتغطي النص اللي فيه بس. للأفضل صغّره لأقل من 50 ميجا واختار تلقائي أو Gemini.', 'This file is mostly images, so the slides cover only its text. For better slides, compress it under 50 MB and choose Auto or Gemini.');
    }
    setStep(2);
    say(L('وصل! بنعمل السلايدز…', 'Received! Making your slides…'));
    form.querySelector('#slides-file').value = '';
    form.querySelector('#slides-file-name').textContent = L('اختار ملف المحاضرة', 'Choose your lecture file');
    form.querySelector('#slides-drop').classList.remove('has-file');
    await refreshJobs(id);
    if (notice) say(notice, true);
  } catch (error) {
    setStep(-1);
    say(uploadErrors()[error.code] || L('النت قطع أو حصلت مشكلة. جرّب تاني، ومش هتتحسب عليك.', 'The upload failed. Try again; it will not count.'), true);
  } finally {
    busyUpload = false;
    go.disabled = false;
    bar.hidden = true;
    bar.firstElementChild.style.width = '0';
  }
}

// ---------- History and progress ----------
const statusLabel = (j) =>
  j.status === 'done'
    ? L('جاهزة', 'Ready')
    : j.status === 'failed'
      ? L('معملتش', 'Failed')
      : j.waiting === 'daily'
        ? L('في الطابور: الحد اليومي خلص، هتتعمل أول ما يرجع', 'In the queue: today’s quota is used, it runs when it returns')
        : j.waiting === 'busy'
          ? L('في الطابور: الخدمة زحمة', 'In the queue: the service is busy')
          : j.status === 'working'
            ? j.progress
              ? L(`بنرسم السلايد ${j.progress.done} من ${j.progress.total}…`, `Drawing slide ${j.progress.done} of ${j.progress.total}…`)
              : L('بنعملها دلوقتي…', 'Making it now…')
            : L('في الطابور', 'In the queue');
const failReason = (code) =>
  ({
    notlecture: L('الملف ده مش شكله محاضرة.', 'This does not look like study material.'),
    toolong: L('الملف أطول من اللي الموديلات المتاحة تستحمله.', 'This file is too long for the available models.'),
    unreadable: L('مقدرناش نقرا الملف.', 'We could not read this file.'),
    blocked: L('الخدمة متوقفة شوية.', 'The service is paused for now.'),
  })[code] || L('حصلت مشكلة. جرّب تاني، ومش هتتحسب عليك.', 'Something went wrong. Try again; it will not count.');
async function refreshJobs(openId) {
  clearTimeout(pollTimer);
  if (!root?.isConnected) return;
  try {
    // Tells the server the student is watching, so it sends no notice for a result they can already see.
    jobs = (await api(document.visibilityState === 'visible' ? '/jobs?here=1' : '/jobs')).jobs;
  } catch {
    pollTimer = setTimeout(refreshJobs, POLL_MS * 2);
    return;
  }
  drawHistory();
  const running = jobs.some((j) => ['queued', 'working'].includes(j.status));
  if (!running && (wasRunning || openId)) {
    say('');
    const last = jobs[0];
    setStep(last?.status === 'done' ? 3 : -1);
    if (last?.status === 'done') setTimeout(() => setStep(-1), 2500);
  } else if (running) setStep(2);
  wasRunning = running;
  if (openId && jobs.find((j) => j.id === openId)?.status === 'done') openJob(openId);
  if (running) {
    const waiting = jobs.find((j) => j.id === (openId || currentView?.wanted));
    if (waiting && ['queued', 'working'].includes(waiting.status)) currentView = { ...currentView, wanted: waiting.id };
    pollTimer = setTimeout(() => refreshJobs(), POLL_MS);
  } else if (currentView?.wanted && !currentView.job) {
    const wanted = jobs.find((j) => j.id === currentView.wanted);
    if (wanted?.status === 'done') openJob(wanted.id);
    currentView = { ...currentView, wanted: null };
  }
}
function drawHistory() {
  const box = panel()?.querySelector('#slides-history');
  if (!box) return;
  box.innerHTML = jobs.length
    ? `<h2>${L('سلايداتي', 'My slides')}</h2><p class="slides-small">${L('متسجلة على حسابك، وتقدر تفتحها من أي جهاز. الملف الأصلي مش بيتحفظ.', 'Saved to your account, ready on any device. The original file is not kept.')}</p><ul>${jobs
        .map(
          (j) =>
            `<li class="slides-job is-${esc(j.status)}"><span class="job-mark">${['queued', 'working'].includes(j.status) ? '<span class="spinner"></span>' : icon(j.status === 'done' ? 'check' : 'file')}</span><span class="job-text"><b>${esc(j.title || j.name)}</b><small>${esc(statusLabel(j))}${j.status === 'failed' ? ` · ${esc(failReason(j.error))}` : ''}${j.createdAt ? ` · ${esc(new Date(j.createdAt).toLocaleDateString(ctx.lang() === 'ar' ? 'ar-EG' : 'en-GB'))}` : ''}</small></span>${j.status === 'done' ? `<button class="button ghost" data-open="${esc(j.id)}">${L('افتح', 'Open')}</button>` : ''}${['done', 'failed'].includes(j.status) ? `<button class="link-btn" data-remove="${esc(j.id)}" aria-label="${L('امسح', 'Remove')}: ${esc(j.title || j.name)}">${L('امسح', 'Remove')}</button>` : ''}</li>`,
        )
        .join('')}</ul>`
    : '';
  box.querySelectorAll('[data-open]').forEach((b) => (b.onclick = () => openJob(b.dataset.open)));
  box.querySelectorAll('[data-remove]').forEach(
    (b) =>
      (b.onclick = async () => {
        if (!confirm(L('تمسحها من حسابك؟', 'Remove this from your account?'))) return;
        b.disabled = true;
        try {
          await api(`/jobs/${encodeURIComponent(b.dataset.remove)}/remove`, { method: 'POST', body: {} });
          if (currentView?.job?.id === b.dataset.remove) {
            currentView = null;
            panel().querySelector('#slides-viewer').innerHTML = '';
          }
          await refreshJobs();
        } catch {
          say(L('مقدرناش نمسحها. جرّب تاني.', 'It could not be removed. Try again.'), true);
          b.disabled = false;
        }
      }),
  );
}

// ---------- The viewer ----------
const isArabic = (deck) => deck.language === 'ar' || (deck.language !== 'en' && /[؀-ۿ]/.test(deck.title));
async function openJob(id) {
  const { job } = await api(`/jobs/${encodeURIComponent(id)}`);
  currentView = { job, lang: Object.keys(job.decks)[0] };
  drawViewer();
  panel().querySelector('#slides-viewer').scrollIntoView({ behavior: 'smooth', block: 'start' });
}
// The pages of a deck as the student set them up: an optional cover, then the slides.
const pagesOf = (deck, look) => (look.cover ? [{ cover: true }, ...deck.slides] : deck.slides);
const pageText = (slide) =>
  [slide.title, ...slide.bullets, slide.visual?.root, ...(slide.visual?.items || []).flatMap((i) => [i.title, i.text]), ...(slide.visual?.headers || []), ...(slide.visual?.rows || []).flatMap((r) => r.cells || []), slide.formula, slide.note].filter(Boolean).join('. ');
const pictures = new Map();
function loadPicture(id) {
  if (!id) return Promise.resolve(null);
  if (!pictures.has(id))
    pictures.set(
      id,
      api(`/image/${encodeURIComponent(id)}`)
        .then(
          ({ src }) =>
            new Promise((resolve) => {
              const img = new Image();
              img.onload = () => resolve(img);
              img.onerror = () => resolve(null);
              img.src = src;
            }),
        )
        .catch(() => null),
    );
  return pictures.get(id);
}
// A drawing with words outside the page or spilling out of their box is worse than a plain diagram, so it is measured
// here and refused. The slide then falls back to its diagram. The server already stripped anything that can run.
export function artLooksRight(svg) {
  const parsed = new DOMParser().parseFromString(svg, 'image/svg+xml').documentElement;
  if (parsed.nodeName !== 'svg') return false;
  const holder = document.createElement('div');
  holder.dir = 'ltr'; // this page is often right-to-left, and an SVG would inherit that while being measured
  holder.style.cssText = 'position:fixed;left:-20000px;top:0;width:1280px;height:720px;visibility:hidden;contain:strict;direction:ltr';
  parsed.setAttribute('width', '1280');
  parsed.setAttribute('height', '720');
  holder.append(document.importNode(parsed, true));
  document.body.append(holder);
  try {
    const root = holder.firstElementChild,
      page = root.getBoundingClientRect(),
      boxes = [...root.querySelectorAll('rect')]
        .filter((r) => !r.closest('defs,clipPath,pattern,mask,symbol,svg svg')) // a painted scene holds no words
        .map((r) => r.getBoundingClientRect())
        .filter((b) => b.width > 50 && b.height > 24 && b.width < page.width * 0.95);
    let spilling = 0;
    for (const text of root.querySelectorAll('text')) {
      if (text.closest('defs,clipPath,pattern,mask,symbol') || !text.textContent.trim()) continue;
      const t = text.getBoundingClientRect();
      if (t.left < page.left - 2 || t.right > page.right + 2 || t.top < page.top - 2 || t.bottom > page.bottom + 2) return false;
      const cx = (t.left + t.right) / 2,
        cy = (t.top + t.bottom) / 2;
      const home = boxes.filter((b) => cx > b.left && cx < b.right && cy > b.top && cy < b.bottom).sort((p, q) => p.width * p.height - q.width * q.height)[0];
      if (home && (t.left < home.left - 6 || t.right > home.right + 6)) spilling += 1;
    }
    return spilling === 0;
  } catch {
    return false;
  } finally {
    holder.remove();
  }
}
// The student's look, applied to a drawn slide. The painted scenes stay as they are, except in black and white; everything
// around them follows the theme, font, layout and text size.
const ART_FONTS = { display: 'Arial, Tahoma, sans-serif', body: 'Tahoma, Verdana, sans-serif', serif: "Georgia, 'Times New Roman', 'Geeza Pro', serif" };
function dressArt(svg, look, textScale) {
  const scenes = [];
  let out = svg.replace(/<svg x=[\s\S]*?<\/svg>/g, (scene) => {
    scenes.push(scene);
    return `<!--scene${scenes.length - 1}-->`;
  });
  const t = themeOf(look);
  if (look.theme !== 'study') {
    out = out.replace(/(<text\b[^>]*fill=")#(?:fff|ffffff)"/gi, `$1${t.bg}"`);
    const colours = {
      '#0f1e3c': t.ink, '#33415c': t.ink, '#12907e': t.accent, '#2b5cff': t.second, '#fbfdff': t.bg, '#eef4fa': t.bg, '#dbe5f0': t.soft,
      '#ffffff': t.card, '#fff': t.card, '#14305c': t.accent, '#eaf3f7': t.soft, '#c9d6e4': t.soft, '#fff9e6': t.card, '#c99a1c': t.second,
    };
    out = out.replace(/#(?:[0-9a-f]{6}|fff)\b/gi, (c) => colours[c.toLowerCase()] || c);
  }
  if (look.theme === 'mono') out = out.replace(/(<feDisplacementMap\b[^>]*\/>)/, '$1<feColorMatrix type="saturate" values="0"/>');
  out = out.replaceAll('Arial, Tahoma, sans-serif', ART_FONTS[look.font]);
  if (textScale !== 1) out = out.replace(/(<text\b[^>]*font-size=")(\d+(?:\.\d+)?)"/g, (_, head, size) => `${head}${(Number(size) * textScale).toFixed(1)}"`);
  // Slides saved before titles were marked start with the same two possible lines.
  if (!out.includes('data-part="title"')) out = out.replace(/(?:<text x="640" y="(?:62|108)"[^>]*>[^<]*<\/text>)+/, (t) => `<g data-part="title">${t}</g>`);
  out = out.replace(/<g data-part="title">([\s\S]*?)<\/g>/, (whole, title) => {
    const rtl = /direction="rtl"/.test(title),
      lastY = Math.max(...[...title.matchAll(/\by="(\d+)"/g)].map((m) => Number(m[1]))),
      firstLine = /font-size="([\d.]+)"[^>]*>([^<]*)</.exec(title),
      width = firstLine ? [...firstLine[2]].length * Number(firstLine[1]) * 0.56 : 1200;
    if (look.layout === 'center') return `${whole}<rect x="580" y="${lastY + 10}" width="120" height="5" rx="2.5" fill="${t.accent}"/>`;
    if (look.layout === 'band') {
      const side = title.replace(/\bx="640"/g, `x="${rtl ? 1234 : 46}"`).replace(/text-anchor="middle"/g, 'text-anchor="start"');
      return `<rect x="${rtl ? 1262 : 0}" y="0" width="18" height="720" fill="${t.accent}"/>${side}`;
    }
    if (look.layout === 'bigtitle') {
      const grow = Math.min(1.25, 1210 / width);
      return title.replace(/font-size="([\d.]+)"/g, (_, size) => `font-size="${(Number(size) * grow).toFixed(1)}"`).replace(/fill="[^"]*"/g, `fill="${t.accent}"`);
    }
    return whole;
  });
  return out.replace(/<!--scene(\d+)-->/g, (_, i) => scenes[Number(i)]);
}
// Bigger text can run out of its place, so the size steps back until the slide measures clean.
export function fittedArt(svg, look) {
  const wanted = Math.min(1.2, Math.max(0.8, look.size / 100));
  for (let scale = wanted; scale > 1; scale = Math.round((scale - 0.05) * 100) / 100) {
    const dressed = dressArt(svg, look, scale);
    if (artLooksRight(dressed)) return dressed;
  }
  return dressArt(svg, look, Math.min(wanted, 1));
}
const rawArts = new Map();
const artImages = new Map();
function loadRawArt(id) {
  if (!rawArts.has(id))
    rawArts.set(
      id,
      api(`/art/${encodeURIComponent(id)}`)
        .then(({ svg }) => (artLooksRight(svg) ? svg : null))
        .catch(() => null),
    );
  return rawArts.get(id);
}
async function loadArt(id, look) {
  const raw = await loadRawArt(id);
  if (!raw) return null;
  const key = `${id}|${look.theme}|${look.font}|${look.layout}|${look.size}`;
  if (!artImages.has(key)) {
    if (artImages.size > 60) artImages.clear();
    artImages.set(
      key,
      new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(fittedArt(raw, look))}`;
      }),
    );
  }
  return artImages.get(key);
}
const renderCanvas = document.createElement('canvas');
async function renderPage(canvas, deck, page, index, total, look) {
  const [W, H] = RATIOS[look.ratio];
  canvas.width = W;
  canvas.height = H;
  const art = page.artId ? await loadArt(page.artId, look) : null;
  if (art) {
    // Drawn slides are 16:9; on other page shapes they sit centred on the same paper.
    const c = canvas.getContext('2d'),
      r = Math.min(W / art.width, H / art.height),
      theme = themeOf(look);
    c.fillStyle = look.theme === 'study' ? '#f5f7fc' : theme.bg;
    c.fillRect(0, 0, W, H);
    c.drawImage(art, (W - art.width * r) / 2, (H - art.height * r) / 2, art.width * r, art.height * r);
    footer(c, W, H, theme, look, FONTS[look.font], `${index + 1} / ${total}`);
    return;
  }
  if (page.cover) drawCover(canvas, deck, look, themeOf(look), FONTS[look.font]);
  else drawSlide(canvas, page, `${index + 1} / ${total}`, look, themeOf(look), FONTS[look.font], await loadPicture(page.imageId));
}
// Pages become small images as they scroll near, so a long deck stays light on a weak phone.
let frameWatcher, frameRun = 0;
async function paintFrame(img) {
  const run = frameRun,
    view = currentView;
  if (!view?.job || img.dataset.painted === String(run)) return;
  img.dataset.painted = run;
  const look = getLook(),
    deck = view.job.decks[view.lang],
    pages = pagesOf(deck, look),
    index = Number(img.dataset.index);
  await document.fonts?.ready;
  await renderPage(renderCanvas, deck, pages[index], index, pages.length, look);
  if (run === frameRun) img.src = renderCanvas.toDataURL('image/jpeg', 0.82);
}
// Frames are painted one at a time, since they share one canvas.
let paintChain = Promise.resolve();
const queuePaint = (img) => {
  paintChain = paintChain.then(() => paintFrame(img)).catch(() => {});
};
function resetFrames() {
  if (currentView?.job) drawViewer();
}
function drawViewer() {
  const box = panel()?.querySelector('#slides-viewer');
  if (!box || !currentView?.job) return;
  const wasOpen = box.querySelector('.look-panel')?.open;
  const { job, lang: which } = currentView,
    deck = job.decks[which],
    keys = Object.keys(job.decks),
    look = getLook(),
    pages = pagesOf(deck, look),
    [W, H] = RATIOS[look.ratio];
  frameRun += 1;
  frameWatcher?.disconnect();
  const name = (k) => (k === 'source' ? L('لغة الملف', 'File language') : langNames().find(([v]) => v === k)?.[1] || k);
  box.innerHTML = `<article class="slides-viewer"><header><div><span class="section-index">${pages.length} ${L('سلايد', 'slides')}</span><h2 dir="auto">${esc(deck.title || job.name)}</h2></div><div class="slides-actions">${
    keys.length > 1
      ? keys.map((k) => `<button class="button ${k === which ? 'primary' : 'ghost'}" data-deck="${esc(k)}">${esc(name(k))}</button>`).join('')
      : ''
  }<button class="button ghost" id="slides-play">${L('اعرضها', 'Present')}</button><button class="button primary" id="slides-pdf">${L('حمّل PDF', 'Download PDF')} ${icon('file')}</button></div></header><p class="slides-small">${L('السلايدز معمولة بالذكاء الاصطناعي، والرسومات كمان، فراجعها مع المحاضرة قبل ما تعتمد عليها.', 'These slides and their pictures are AI-made, so check them against the lecture before relying on them.')}${deck.madeWith ? ` · ${esc(deck.madeWith)} (${esc(deck.via || '')})` : ''}</p>${deck.partial ? `<p class="slides-small is-bad" role="status">${L('الموديل ده وقف قبل ما يخلص، فالسلايدز دي مش مغطية المحاضرة كلها. جرّب موديل تاني من «متقدم».', 'This model stopped early, so these slides do not cover the whole lecture. Try another model in Advanced.')}</p>` : ''}${lookPanel(look)}<ol class="slide-frames">${pages
    .map(
      (page, i) =>
        `<li><img data-index="${i}" alt="${esc(page.cover ? deck.title : pageText(page)).slice(0, 900)}" width="${W}" height="${H}" src="data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw=="></li>`,
    )
    .join('')}</ol></article>`;
  frameWatcher = new IntersectionObserver(
    (entries) =>
      entries.forEach((e) => {
        if (e.isIntersecting) queuePaint(e.target);
      }),
    { rootMargin: '400px 0px' },
  );
  box.querySelectorAll('.slide-frames img').forEach((img) => frameWatcher.observe(img));
  box.querySelectorAll('[data-deck]').forEach(
    (b) =>
      (b.onclick = () => {
        currentView.lang = b.dataset.deck;
        drawViewer();
      }),
  );
  box.querySelector('#slides-pdf').onclick = (e) => downloadPdf(deck, job.name, e.currentTarget);
  box.querySelector('#slides-play').onclick = () => openPlayer(deck);
  wireLook(box.querySelector('.look-body'));
  if (wasOpen) box.querySelector('.look-panel').open = true;
}
// One slide at a time, full screen. Swiping works through scroll snapping; the buttons and arrow keys move the same strip.
function openPlayer(deck) {
  const look = getLook(),
    pages = pagesOf(deck, look),
    [W, H] = RATIOS[look.ratio],
    rtl = document.documentElement.dir === 'rtl';
  const dialog = document.createElement('dialog');
  dialog.className = 'slide-player';
  dialog.dir = rtl ? 'rtl' : 'ltr';
  dialog.setAttribute('aria-label', deck.title || L('السلايدز', 'Slides'));
  dialog.innerHTML = `<div class="player-strip" tabindex="0">${pages
    .map(
      (page, i) =>
        `<section class="player-slide"><canvas role="img" data-index="${i}" width="${W}" height="${H}" aria-label="${esc(page.cover ? deck.title : pageText(page)).slice(0, 900)}"></canvas></section>`,
    )
    .join('')}</div><div class="player-bar"><button class="button ghost" data-move="-1">${L('السابقة', 'Previous')}</button><span class="player-count" aria-live="polite"></span><button class="button ghost" data-move="1">${L('التالية', 'Next')}</button><button class="button primary" data-close>${L('قفل', 'Close')}</button></div>`;
  document.body.append(dialog);
  const slides = [...dialog.querySelectorAll('.player-slide')],
    strip = dialog.querySelector('.player-strip'),
    count = dialog.querySelector('.player-count');
  let current = 0;
  const show = (i) => {
    current = i;
    count.textContent = `${i + 1} / ${slides.length}`;
  };
  const go = (i) => {
    const next = Math.max(0, Math.min(slides.length - 1, i));
    // Measured on screen, because scroll positions run the other way in right-to-left pages.
    strip.scrollBy({
      left: slides[next].getBoundingClientRect().left - strip.getBoundingClientRect().left,
      behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    });
    show(next);
  };
  // This watcher reaches past the screen so the next slides are ready; the counter follows the scroll instead.
  const seen = new IntersectionObserver(
    (entries) =>
      entries.forEach((e) => {
        const canvas = e.target.querySelector('canvas');
        if (!e.isIntersecting || canvas.dataset.done) return;
        canvas.dataset.done = '1';
        const index = Number(canvas.dataset.index);
        renderPage(canvas, deck, pages[index], index, pages.length, look);
      }),
    { root: strip, rootMargin: '0px 100%' },
  );
  let settling;
  strip.addEventListener('scroll', () => {
    clearTimeout(settling);
    settling = setTimeout(() => {
      const middle = strip.getBoundingClientRect().left + strip.clientWidth / 2;
      let best = 0,
        gap = Infinity;
      slides.forEach((slide, i) => {
        const box = slide.getBoundingClientRect(),
          d = Math.abs(box.left + box.width / 2 - middle);
        if (d < gap) {
          gap = d;
          best = i;
        }
      });
      show(best);
    }, 120);
  });
  slides.forEach((slide) => seen.observe(slide));
  dialog.querySelectorAll('[data-move]').forEach((b) => (b.onclick = () => go(current + Number(b.dataset.move))));
  dialog.querySelector('[data-close]').onclick = () => dialog.close();
  dialog.addEventListener('keydown', (e) => {
    const forward = rtl ? 'ArrowLeft' : 'ArrowRight',
      back = rtl ? 'ArrowRight' : 'ArrowLeft';
    if (e.key === forward) go(current + 1);
    if (e.key === back) go(current - 1);
  });
  dialog.addEventListener('close', () => {
    seen.disconnect();
    dialog.remove();
  });
  show(0);
  dialog.showModal();
}

const loadJsPdf = () => loadScript('/vendor/jspdf.umd.min.js', () => window.jspdf);
async function downloadPdf(deck, name, button) {
  const label = button.innerHTML;
  button.disabled = true;
  try {
    await loadJsPdf();
    await document.fonts?.ready;
    const look = getLook(),
      pages = pagesOf(deck, look),
      [W, H] = RATIOS[look.ratio],
      orientation = W > H ? 'landscape' : 'portrait';
    const canvas = document.createElement('canvas');
    const pdf = new window.jspdf.jsPDF({ orientation, unit: 'px', format: [W, H], compress: true });
    for (let i = 0; i < pages.length; i += 1) {
      button.textContent = `${i + 1} / ${pages.length}`;
      await renderPage(canvas, deck, pages[i], i, pages.length, look);
      if (i) pdf.addPage([W, H], orientation);
      pdf.addImage(canvas.toDataURL('image/jpeg', 0.88), 'JPEG', 0, 0, W, H);
      // A breath between slides keeps weak phones responsive.
      await new Promise((resolve) => setTimeout(resolve));
    }
    pdf.save(`${String(name).replace(/\.[a-z0-9]+$/i, '')} - ${L('سلايدز', 'slides')}.pdf`);
  } catch {
    say(L('مقدرناش نعمل الـ PDF. جرّب تاني.', 'The PDF could not be made. Try again.'), true);
  }
  button.disabled = false;
  button.innerHTML = label;
}
