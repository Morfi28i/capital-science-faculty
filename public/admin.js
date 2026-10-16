import { dhikrStrip, startDhikrRotation } from '/adhkar.js';
const app = document.querySelector('#app');
startDhikrRotation();
let kind = 'subjects',
  items = [],
  editingId = null;
const labels = {
  subjects: 'جروبات المواد',
  lectures: 'ملفات المحاضرات',
  advising: 'الإرشاد الأكاديمي',
  official: 'الجروبات الرسمية',
  messages: 'الرسائل',
  sync: 'مزامنة Drive',
};
const brand = `<a class="brand" href="/"><svg class="brand-logo" viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" rx="16" class="brand-logo-bg"/><ellipse cx="32" cy="32" rx="22" ry="9" fill="none" class="brand-logo-orbit" stroke-width="2.5" transform="rotate(-32 32 32)"/><path d="M41.5 22.5A13.5 13.5 0 1 0 41.5 41.5" fill="none" class="brand-logo-c" stroke-width="5.5" stroke-linecap="round"/><circle cx="47" cy="17" r="4.5" class="brand-logo-dot"/></svg><span class="brand-text"><span>CAPITAL <b>SCIENCE</b></span><small>ADMIN CONSOLE</small></span></a>`;
try {
  const theme = localStorage.getItem('cs-theme');
  if (theme === 'light' || theme === 'dark') document.documentElement.dataset.theme = theme;
} catch {}
function esc(value = '') {
  return String(value).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
}
async function req(url, opt = {}) {
  const r = await fetch(url, {
    ...opt,
    headers: { 'Content-Type': 'application/json', ...(opt.headers || {}) },
  });
  const d = await r.json().catch(() => ({}));
  if (r.status === 401 && !url.endsWith('/login')) {
    login('انتهت الجلسة. سجّل الدخول مرة أخرى.');
    throw Error('Sign in required');
  }
  if (!r.ok)
    throw Object.assign(Error(d.error || 'Request failed'), {
      code: d.code,
      status: r.status,
    });
  return d;
}
function publishSiteUpdate() {
  const event = { type: 'content-updated', at: Date.now() };
  try {
    const channel = new BroadcastChannel('capital-science-updates');
    channel.postMessage(event);
    channel.close();
  } catch {}
  try {
    localStorage.setItem('cs-site-updated', String(event.at));
  } catch {}
}
function toast(s) {
  document.querySelector('.toast')?.remove();
  const e = document.createElement('div');
  e.className = 'toast';
  e.setAttribute('role', 'status');
  e.textContent = s;
  document.body.append(e);
  setTimeout(() => e.remove(), 3200);
}
async function check() {
  try {
    const s = await req('/api/admin/session');
    if (s.authenticated) dashboard();
    else login();
  } catch {
    login();
  }
}
function login(error = '') {
  app.innerHTML = `<div class="login-box">${brand}<div><span class="section-index">DEVELOPER ACCESS</span><h1>تسجيل دخول المطور</h1><p class="admin-muted">منطقة إدارة محتوى الموقع</p></div><form id="login"><label>كلمة المرور<input type="password" name="password" required autofocus autocomplete="current-password"></label><p class="login-error" role="alert">${esc(error)}</p><button class="button primary">دخول</button></form></div>`;
  document.querySelector('#login').onsubmit = async (e) => {
    e.preventDefault();
    const button = e.currentTarget.querySelector('button');
    button.disabled = true;
    try {
      await req('/api/admin/login', {
        method: 'POST',
        body: JSON.stringify({
          password: new FormData(e.currentTarget).get('password'),
        }),
      });
      dashboard();
    } catch (err) {
      login(err.message === 'Incorrect password' ? 'كلمة المرور غير صحيحة.' : err.message);
    }
  };
}
function itemFormFields() {
  return `<label>الاسم بالعربية<input name="title" required maxlength="180" placeholder="اسم المجموعة أو الملف"></label><label class="advanced">الاسم بالإنجليزية<input name="titleEn" maxlength="180" placeholder="English title"></label><label class="wide">الرابط<input name="url" type="url" required placeholder="https://…" dir="ltr"></label><label>التصنيف<input name="category" maxlength="180" placeholder="مثال: مواد عامة" list="category-options"></label><label class="advanced">التصنيف بالإنجليزية<input name="categoryEn" maxlength="180" placeholder="e.g. Core courses"></label><label class="wide advanced">ملاحظة تظهر على البطاقة<textarea name="note" maxlength="600" rows="2"></textarea></label>`;
}
function sidebar() {
  return `<aside class="admin-side">${brand}<nav class="admin-nav" aria-label="الأقسام">${Object.entries(
    labels,
  )
    .map(
      ([k, v]) =>
        `<button data-kind="${k}" class="${kind === k ? 'active' : ''}" ${kind === k ? 'aria-current="page"' : ''}>${v}</button>`,
    )
    .join('')}</nav></aside>`;
}
function wireShell() {
  document.querySelectorAll('[data-kind]').forEach(
    (b) =>
      (b.onclick = () => {
        kind = b.dataset.kind;
        dashboard();
      }),
  );
  document.querySelector('#logout').onclick = async () => {
    try {
      await req('/api/admin/logout', { method: 'POST' });
    } catch {}
    login();
  };
}
function dashboard() {
  editingId = null;
  if (kind === 'sync') return syncDashboard();
  if (kind === 'messages') return messagesDashboard();
  app.innerHTML = `<div class="admin-layout">${sidebar()}<main class="admin-main">${dhikrStrip()}<div class="admin-head"><div><span class="section-index">CONTENT MANAGEMENT</span><h1>${labels[kind]}</h1></div><button class="button ghost" id="mode-toggle">الوضع البسيط</button><a class="button ghost" href="/" target="_blank" rel="noopener">عرض الموقع</a><button class="button" id="logout">تسجيل الخروج</button></div><div id="storage-status" class="storage-status" role="status"></div><section class="admin-box"><h2 id="item-form-title">إضافة عنصر</h2><form class="admin-form" id="item-form">${itemFormFields()}<datalist id="category-options"></datalist><div class="admin-form-actions"><button class="button primary" id="item-submit">إضافة العنصر</button><button class="button ghost" type="button" id="cancel-edit" hidden>إلغاء التعديل</button></div></form></section><section class="admin-box"><div class="admin-toolbar"><h2>العناصر الحالية</h2><input id="item-search" type="search" placeholder="ابحث في العناصر…"></div><div class="admin-list" id="list"><p class="admin-muted">جارٍ التحميل…</p></div></section></main></div>`;
  wireShell();
  const layout = document.querySelector('.admin-layout'),
    modeButton = document.querySelector('#mode-toggle');
  const setMode = (mode) => {
    layout.classList.toggle('simple-mode', mode === 'simple');
    modeButton.textContent = mode === 'simple' ? 'الوضع المتقدم' : 'الوضع البسيط';
  };
  setMode(localStorage.getItem('cs-admin-mode') === 'simple' ? 'simple' : 'advanced');
  modeButton.onclick = () => {
    const mode = layout.classList.contains('simple-mode') ? 'advanced' : 'simple';
    localStorage.setItem('cs-admin-mode', mode);
    setMode(mode);
  };
  const itemForm = document.querySelector('#item-form');
  itemForm.onsubmit = async (e) => {
    e.preventDefault();
    const o = Object.fromEntries(new FormData(itemForm));
    // Save every item in one shape (Arabic in title, English in titleEn); clear the older titleAr field.
    o.titleAr = '';
    const url = o.url.toLowerCase();
    o.kind =
      url.includes('facebook.com') || url.includes('fb.com')
        ? 'facebook'
        : url.includes('drive.google.com')
          ? 'drive'
          : url.includes('t.me/')
            ? 'telegram'
            : url.includes('whatsapp.com') || url.includes('wa.me')
              ? 'whatsapp'
              : 'link';
    const button = document.querySelector('#item-submit');
    button.disabled = true;
    try {
      if (editingId) {
        await req(`/api/admin/${kind}/${encodeURIComponent(editingId)}`, {
          method: 'PUT',
          body: JSON.stringify(o),
        });
        toast('تم حفظ التعديل');
      } else {
        await req(`/api/admin/${kind}`, {
          method: 'POST',
          body: JSON.stringify(o),
        });
        toast('تمت إضافة العنصر');
      }
      publishSiteUpdate();
      stopEditing();
      loadItems();
    } catch (er) {
      toast(er.message);
    } finally {
      button.disabled = false;
    }
  };
  document.querySelector('#cancel-edit').onclick = stopEditing;
  document.querySelector('#item-search').oninput = renderItems;
  loadItems();
  loadStorageStatus();
}
function startEditing(item) {
  const form = document.querySelector('#item-form');
  editingId = item.id;
  for (const field of ['title', 'titleEn', 'url', 'category', 'categoryEn', 'note']) {
    // Subject groups keep the Arabic name in titleAr and the English one in title.
    let value = item[field] || '';
    if (field === 'title' && item.titleAr) value = item.titleAr;
    if (field === 'titleEn' && item.titleAr && !item.titleEn) value = item.title || '';
    form.elements[field].value = value;
  }
  document.querySelector('#item-form-title').textContent = `تعديل: ${item.titleAr || item.title}`;
  document.querySelector('#item-submit').textContent = 'حفظ التعديل';
  document.querySelector('#cancel-edit').hidden = false;
  renderItems();
  form.scrollIntoView({ behavior: 'smooth', block: 'center' });
  form.elements.title.focus({ preventScroll: true });
}
function stopEditing() {
  editingId = null;
  const form = document.querySelector('#item-form');
  form.reset();
  document.querySelector('#item-form-title').textContent = 'إضافة عنصر';
  document.querySelector('#item-submit').textContent = 'إضافة العنصر';
  document.querySelector('#cancel-edit').hidden = true;
  renderItems();
}
async function loadStorageStatus() {
  const status = document.querySelector('#storage-status');
  try {
    const site = await req('/api/site');
    status.textContent = site.contentStoragePersistent
      ? 'الحفظ الدائم مفعّل عبر Firebase Firestore.'
      : 'تنبيه: قاعدة Firebase غير متصلة؛ لن تُحفظ التعديلات بعد إعادة تشغيل الخادم.';
    status.dataset.persistent = String(Boolean(site.contentStoragePersistent));
  } catch {
    status.textContent = 'تعذر التحقق من حالة الحفظ.';
  }
}
function renderItems() {
  const list = document.querySelector('#list');
  if (!list) return;
  const q = (document.querySelector('#item-search')?.value || '').trim().toLocaleLowerCase();
  const shown = items.filter((x) =>
    `${x.title || ''} ${x.titleAr || ''} ${x.titleEn || ''} ${x.url || ''} ${x.category || ''}`
      .toLocaleLowerCase()
      .includes(q),
  );
  list.innerHTML =
    shown
      .map(
        (x) =>
          `<div class="admin-row ${x.id === editingId ? 'editing' : ''}"><span>${esc(x.titleAr || x.title)}<small>${esc(x.category ? `${x.category} · ` : '')}${esc(x.url)}</small></span><button class="edit" data-id="${esc(x.id)}">تعديل</button><button class="delete" data-id="${esc(x.id)}">حذف</button></div>`,
      )
      .join('') || `<p class="admin-muted">${q ? 'لا توجد نتائج.' : 'لا توجد عناصر بعد.'}</p>`;
  list.querySelectorAll('.delete').forEach(
    (b) =>
      (b.onclick = async () => {
        const item = items.find((x) => x.id === b.dataset.id);
        if (!confirm(`حذف «${item?.titleAr || item?.title}»؟ لا يمكن التراجع.`)) return;
        try {
          await req(`/api/admin/${kind}/${encodeURIComponent(b.dataset.id)}`, {
            method: 'DELETE',
          });
          publishSiteUpdate();
          if (editingId === b.dataset.id) stopEditing();
          toast('تم الحذف');
          loadItems();
        } catch (error) {
          toast(error.message);
        }
      }),
  );
  list
    .querySelectorAll('.edit')
    .forEach((b) => (b.onclick = () => startEditing(items.find((x) => x.id === b.dataset.id))));
}
async function loadItems() {
  try {
    items = await req(`/api/admin/${kind}`);
    const categories = [...new Set(items.map((x) => x.category).filter(Boolean))];
    document.querySelector('#category-options').innerHTML = categories
      .map((c) => `<option value="${esc(c)}"></option>`)
      .join('');
    renderItems();
  } catch (e) {
    toast(e.message);
  }
}
// ---------- Drive sync tab ----------
const gateMessages = {
  invalid_json: 'ملف الكتالوج الناتج مش JSON سليم.',
  invalid_row: 'فيه عناصر ناقصة بيانات أو لينكها مش من Drive.',
  duplicate_id: 'فيه عنصر متكرر بنفس الـ ID.',
  missing_root: 'مجلد سنة من التلاتة مش موجود في الكتالوج.',
  root_mismatch: 'بيانات مجلد سنة اتغيرت (الاسم أو اللينك أو التصنيف).',
  root_order: 'ترتيب السنين اتغير عن المعتمد.',
  unknown_root: 'ظهر مجلد سنة مش من التلاتة المعتمدين.',
  missing_parent: 'فيه عناصر بتشاور على مجلد مش موجود.',
  wrong_category: 'فيه عناصر متحطة تحت سنة تانية أو تحت ملف.',
  unreachable: 'فيه عناصر مش متوصلة بأي مجلد سنة.',
  removed_source: 'رجعت عناصر من مصدر 2025 القديم اللي اتشال.',
  too_many_removals:
    'نص ملفات سنة أو أكتر اختفى مرة واحدة، وده غالبًا عطل في Drive مش حذف حقيقي، فالمزامنة وقفت للأمان.',
  too_many_additions: 'أكتر من 3000 ملف جديد مرة واحدة، فالمزامنة وقفت للأمان.',
  empty_year: 'سنة رجعت فاضية من Drive، غالبًا Drive مردّش وقتها.',
};
const statusLabels = {
  success: 'نجح',
  failure: 'فشل',
  paused: 'اتخطى (موقوف مؤقتًا)',
  skipped: 'اتخطى',
};
const when = (iso) =>
  iso
    ? new Date(iso).toLocaleString('ar-EG', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : '—';
const clock = (iso) =>
  iso
    ? new Date(iso).toLocaleTimeString('ar-EG', {
        hour: 'numeric',
        minute: '2-digit',
      })
    : '—';
const triggerLabels = {
  schedule: 'تلقائي',
  workflow_dispatch: 'يدوي من GitHub',
  dashboard: 'من اللوحة',
};
const kindLabel = (type) => (type === 'folder' ? 'مجلد' : 'ملف');
function syncItems(run, bucket) {
  return Object.entries(run?.years || {}).flatMap(([category, year]) =>
    (year[bucket] || []).map((item) => ({ ...item, category })),
  );
}
function itemRows(items, extra = () => '') {
  return (
    items
      .map(
        (x) =>
          `<div class="admin-row"><span>${esc(x.title || x.note || x.id)}<small>${esc(x.category ? `${x.category} · ` : '')}${esc(x.note || '')}${extra(x)}</small></span>${x.type ? `<small class="admin-muted">${kindLabel(x.type)}</small>` : ''}</div>`,
      )
      .join('') || '<p class="admin-muted">لا يوجد.</p>'
  );
}
const githubErrors = {
  not_connected: 'زرار التشغيل لسه مش متربط بـ GitHub. اربطه من خانة "ربط GitHub".',
  bad_format: 'ده مش شكل توكن GitHub. التوكن بيبدأ بـ github_pat_',
  github_401: 'GitHub رفض التوكن: غالبًا اتنسخ غلط أو انتهت صلاحيته. اعمل واحد جديد.',
  github_403: 'التوكن مش معاه صلاحية Actions: Read and write. عدّل صلاحياته من GitHub.',
  github_404: 'التوكن مش شايف المستودع capital-science-faculty. اختاره في Repository access.',
  github_422: 'GitHub رفض الطلب. جرّب تاني بعد دقيقة.',
};
const tokenUrl =
  'https://github.com/settings/personal-access-tokens/new?name=capital-science-sync&description=Run+the+Drive+sync+from+the+dashboard&target_name=Morfi28i&expires_in=366&actions=write';
function githubConnectBox(status) {
  if (status.dispatchSource === 'env')
    return `<section class="admin-box"><h2>ربط GitHub</h2><p>زرار التشغيل متربط عن طريق إعدادات Render.</p></section>`;
  if (status.dispatchConfigured)
    return `<section class="admin-box"><h2>ربط GitHub</h2><div class="admin-row"><span>متربط ✓<small>توكن ينتهي بـ ••••${esc(status.dispatchLast4 || '')}</small></span><button class="delete" id="github-disconnect">فك الربط</button></div></section>`;
  return `<section class="admin-box" id="github-connect"><h2>ربط GitHub (اختياري)</h2><p>زرار "تشغيل الآن" شغال من غير ربط، بس التشغيل بيبدأ خلال ربع ساعة تقريبًا. لو عايزه يبدأ فورًا اربط GitHub مرة واحدة:</p><ol class="admin-steps"><li>افتح <a href="${tokenUrl}" target="_blank" rel="noopener">صفحة إنشاء توكن على GitHub</a>.</li><li>في <b>Repository access</b> اختار <b>Only select repositories</b> وبعدين <b>capital-science-faculty</b>.</li><li>في <b>Permissions</b> اتأكد إن <b>Actions</b> = <b>Read and write</b>.</li><li>دوس <b>Generate token</b> وانسخ التوكن (بيبدأ بـ github_pat_).</li><li>الزقه هنا ودوس ربط.</li></ol><form class="admin-form" id="github-token-form"><label class="wide">توكن GitHub<input name="token" type="password" autocomplete="off" spellcheck="false" placeholder="github_pat_…" dir="ltr" required></label><div class="admin-form-actions"><button class="button primary">ربط</button></div></form><p class="admin-muted">التوكن بيتحفظ على السيرفر بس ومبيرجعش للمتصفح، والسيرفر بيتأكد إنه شغال قبل ما يحفظه.</p></section>`;
}
function wireGithubConnect(status) {
  const form = document.querySelector('#github-token-form');
  if (form)
    form.onsubmit = async (e) => {
      e.preventDefault();
      const button = form.querySelector('button'),
        token = form.elements.token.value.trim();
      button.disabled = true;
      try {
        await req('/api/admin/sync/github-token', {
          method: 'POST',
          body: JSON.stringify({ token }),
        });
        form.reset();
        toast('اتربط ✓ زرار التشغيل بقى شغال من هنا.');
        syncDashboard();
      } catch (error) {
        toast(githubErrors[error.code] || error.message);
        button.disabled = false;
      }
    };
  const disconnect = document.querySelector('#github-disconnect');
  if (disconnect)
    disconnect.onclick = async () => {
      if (!confirm('فك ربط GitHub؟ زرار التشغيل هيرجع يفتح صفحة GitHub بدل ما يشغّل من هنا.')) return;
      try {
        await req('/api/admin/sync/github-token', { method: 'DELETE' });
        toast('اتفك الربط.');
        syncDashboard();
      } catch (error) {
        toast(error.message);
      }
    };
}
function chatTime(m) {
  const s = m?.seconds || m?._seconds;
  return s
    ? new Date(s * 1000).toLocaleString('ar-EG', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : '';
}
let openThread = null;
async function messagesDashboard() {
  app.innerHTML = `<div class="admin-layout">${sidebar()}<main class="admin-main">${dhikrStrip()}<div class="admin-head"><div><span class="section-index">MESSAGES</span><h1>${labels.messages}</h1></div><a class="button ghost" href="/" target="_blank" rel="noopener">عرض الموقع</a><button class="button" id="logout">تسجيل الخروج</button></div><section class="admin-box admin-chat"><div class="admin-threads"><div class="admin-toolbar"><h2>المحادثات</h2><button class="button ghost" id="refresh-threads" type="button">تحديث</button></div><div id="thread-list" class="thread-list"><p class="admin-muted">جارٍ التحميل…</p></div></div><div class="admin-conversation" id="conversation"><p class="admin-muted conversation-empty">اختار محادثة من القايمة عشان تقراها وترد.</p></div></section><section class="admin-box"><h2>رسالة جديدة</h2><p>الرسالة بتوصل جوه الموقع في صفحة الطالب، والطالب يقدر يرد عليها. لو الإيميل متوصل بتتبعت كمان على إيميله.</p><form class="admin-form" id="email-form"><label>نوع الإرسال<select name="mode"><option value="private">شخص محدد</option><option value="all">كل المستخدمين</option></select></label><label>المستلم: ID أو بريد أو هاتف<input name="target" placeholder="معرّف الحساب أو البريد أو +20…" dir="ltr"></label><label class="wide">عنوان الرسالة<input name="subject" maxlength="180" required></label><label class="wide">نص الرسالة<textarea name="message" maxlength="10000" rows="5" required></textarea></label><div class="admin-form-actions"><button class="button primary">إرسال الرسالة</button></div></form><div class="admin-toolbar"><input id="user-search" type="search" placeholder="ابحث عن حساب بالاسم أو ID أو البريد أو الهاتف"><button class="button ghost" id="load-users">بحث</button></div><div class="admin-list" id="user-results"></div></section></main></div>`;
  wireShell();
  const threadList = document.querySelector('#thread-list'),
    conversation = document.querySelector('#conversation');
  async function loadThreads() {
    try {
      const { threads } = await req('/api/admin/threads');
      threadList.innerHTML =
        threads
          .map(
            (t) =>
              `<button type="button" class="thread-row ${t.thread.adminUnread ? 'unread' : ''} ${openThread === t.id ? 'active' : ''}" data-id="${esc(t.id)}"><span class="thread-name">${esc(t.name || 'بدون اسم')}${t.thread.adminUnread ? `<b class="thread-badge">${t.thread.adminUnread}</b>` : ''}</span><small>${t.thread.lastSender === 'user' ? '' : 'أنت: '}${esc(t.thread.preview || '')}</small><time>${esc(chatTime(t.thread.lastAt))}</time></button>`,
          )
          .join('') || '<p class="admin-muted">مفيش محادثات لسه.</p>';
      threadList
        .querySelectorAll('.thread-row')
        .forEach((b) => (b.onclick = () => openConversation(b.dataset.id)));
    } catch (error) {
      threadList.innerHTML = `<p class="admin-muted">${esc(error.message)}</p>`;
    }
  }
  async function openConversation(id, quiet = false) {
    openThread = id;
    threadList
      .querySelectorAll('.thread-row')
      .forEach((b) => b.classList.toggle('active', b.dataset.id === id));
    if (!quiet) conversation.innerHTML = '<p class="admin-muted conversation-empty">جارٍ التحميل…</p>';
    try {
      const { user, messages } = await req(`/api/admin/threads/${encodeURIComponent(id)}`);
      if (openThread !== id) return;
      conversation.innerHTML = `<div class="conversation-head"><b>${esc(user.name || 'بدون اسم')}</b><small dir="ltr">${esc(user.contact || user.id)}</small></div><div class="conversation-thread" id="conversation-thread">${
        messages
          .map(
            (m) =>
              `<div class="admin-bubble ${m.sender === 'user' ? 'theirs' : 'mine'}">${m.subject ? `<strong>${esc(m.subject)}</strong>` : ''}<p>${esc(m.message || '')}</p><time>${esc(chatTime(m.createdAt))}${m.sender === 'admin' ? (m.readAt ? ' · اتقرت' : ' · لسه متقرتش') : ''}</time></div>`,
          )
          .join('') || '<p class="admin-muted conversation-empty">مفيش رسايل.</p>'
      }</div><form class="conversation-reply" id="reply-form"><textarea name="message" rows="2" maxlength="10000" required placeholder="اكتب ردك…"></textarea><button class="button primary">رد</button></form>`;
      const thread = document.querySelector('#conversation-thread');
      thread.scrollTop = thread.scrollHeight;
      const form = document.querySelector('#reply-form');
      form.elements.message.onkeydown = (e) => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) form.requestSubmit();
      };
      form.onsubmit = async (e) => {
        e.preventDefault();
        const button = form.querySelector('button'),
          message = form.elements.message.value.trim();
        if (!message) return;
        button.disabled = true;
        try {
          await req(`/api/admin/threads/${encodeURIComponent(id)}`, {
            method: 'POST',
            body: JSON.stringify({ message }),
          });
          await openConversation(id, true);
          loadThreads();
          document.querySelector('#reply-form textarea')?.focus();
        } catch (error) {
          toast(error.message);
          button.disabled = false;
        }
      };
      loadThreads();
    } catch (error) {
      conversation.innerHTML = `<p class="admin-muted conversation-empty">${esc(error.message)}</p>`;
    }
  }
  document.querySelector('#refresh-threads').onclick = () => {
    loadThreads();
    if (openThread) openConversation(openThread, true);
  };
  loadThreads();
  if (openThread) openConversation(openThread);
  const poll = setInterval(() => {
    if (!document.body.contains(threadList)) return clearInterval(poll);
    if (!document.hidden) loadThreads();
  }, 30_000);
  const emailForm = document.querySelector('#email-form'),
    target = emailForm.elements.target;
  emailForm.elements.mode.onchange = (e) => {
    target.disabled = e.target.value === 'all';
  };
  emailForm.onsubmit = async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(emailForm));
    let question = `إرسال الرسالة إلى ${data.target || 'المستلم المحدد'}؟`;
    if (data.mode === 'all') {
      try {
        const audience = await req('/api/admin/audience');
        question = `سيتم الإرسال إلى ${Math.min(audience.profiles, audience.broadcastLimit)} حساب (الحد الأقصى ${audience.broadcastLimit}). متابعة؟`;
      } catch {
        question = 'إرسال الرسالة إلى كل المستخدمين؟';
      }
    }
    if (!confirm(question)) return;
    const button = emailForm.querySelector('button');
    button.disabled = true;
    try {
      const result = await req('/api/admin/email', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      toast(
        result.emailEnabled
          ? `وصلت جوه الموقع لـ ${result.inAppDelivered} حساب، والإيميل وصل لـ ${result.emailSent}${result.emailFailed ? `، وفشل لـ ${result.emailFailed}` : ''}.`
          : `وصلت جوه الموقع لـ ${result.inAppDelivered} حساب.`,
      );
      emailForm.reset();
      target.disabled = false;
      loadThreads();
    } catch (error) {
      toast(error.message);
    } finally {
      button.disabled = false;
    }
  };
  const searchUsers = async () => {
    const results = document.querySelector('#user-results');
    results.innerHTML = '<p class="admin-muted">جارٍ البحث…</p>';
    try {
      const result = await req(
        `/api/admin/users?q=${encodeURIComponent(document.querySelector('#user-search').value)}`,
      );
      results.innerHTML =
        `<p class="admin-muted">${result.matched} نتيجة من ${result.total} حساب${result.matched > result.users.length ? ` · يظهر أول ${result.users.length}` : ''}</p>` +
        (result.users
          .map(
            (u) =>
              `<div class="admin-row"><span>${esc(u.name || '—')}<small>${esc(u.id)} · ${esc(u.email || u.phone || 'بدون وسيلة تواصل')}</small></span><span class="row-actions"><button type="button" class="open-chat" data-id="${esc(u.id)}">محادثة</button><button type="button" class="target-user" data-id="${esc(u.id)}">رسالة بعنوان</button></span></div>`,
          )
          .join('') || '<p class="admin-muted">لا توجد حسابات مطابقة.</p>');
      results.querySelectorAll('.open-chat').forEach(
        (b) =>
          (b.onclick = () => {
            openConversation(b.dataset.id);
            document.querySelector('.admin-chat').scrollIntoView({ behavior: 'smooth', block: 'start' });
          }),
      );
      results.querySelectorAll('.target-user').forEach(
        (b) =>
          (b.onclick = () => {
            emailForm.elements.mode.value = 'private';
            target.disabled = false;
            target.value = b.dataset.id;
            emailForm.elements.subject.focus();
          }),
      );
    } catch (error) {
      results.innerHTML = `<p class="admin-muted">${esc(error.message)}</p>`;
    }
  };
  document.querySelector('#load-users').onclick = searchUsers;
  document.querySelector('#user-search').onkeydown = (e) => {
    if (e.key === 'Enter') searchUsers();
  };
}
async function syncDashboard() {
  app.innerHTML = `<div class="admin-layout">${sidebar()}<main class="admin-main">${dhikrStrip()}<div class="admin-head"><div><span class="section-index">DRIVE SYNC</span><h1>${labels.sync}</h1></div><a class="button ghost" href="/lectures" target="_blank" rel="noopener">صفحة المحاضرات</a><button class="button" id="logout">تسجيل الخروج</button></div><div id="sync-body"><p class="admin-muted">جارٍ التحميل…</p></div></main></div>`;
  wireShell();
  let status;
  try {
    status = await req('/api/admin/sync/status');
  } catch (error) {
    document.querySelector('#sync-body').innerHTML = `<p class="storage-status">${esc(error.message)}</p>`;
    return;
  }
  const run = status.latest,
    totals = run?.totals || {};
  const warnings = [
    !status.firebaseConfigured && 'Firebase مش متوصل، فمفيش سجل للتشغيلات ولا إيقاف مؤقت.',
  ].filter(Boolean);
  const gates = (run?.gates || [])
    .map(
      (g) =>
        `<li><b>${esc(gateMessages[g.code] || g.message)}</b>${g.details?.length ? `<small class="admin-muted"> · ${esc(g.details.slice(0, 3).join('، '))}</small>` : ''}</li>`,
    )
    .join('');
  const stale = syncItems(run, 'stale');
  document.querySelector('#sync-body').innerHTML =
    `${warnings.map((w) => `<p class="storage-status">${esc(w)}</p>`).join('')}
  <section class="admin-box"><div class="admin-toolbar"><h2>آخر تشغيل</h2>${status.paused ? '<span class="storage-status">المزامنة موقوفة مؤقتًا</span>' : ''}</div>
  ${
    run
      ? `<div class="admin-row"><span>${esc(statusLabels[run.status] || run.status)} · ${run.mode === 'dry-run' ? 'تجربة (من غير حفظ)' : 'حقيقي'}<small>${esc(when(run.finishedAt || run.receivedAt))} · ${esc(triggerLabels[run.trigger] || run.trigger)} · ${run.durationSec ? `${Math.round(run.durationSec / 60)} دقيقة` : ''}${run.commit ? ` · commit ${esc(run.commit.slice(0, 7))}` : run.changed ? ' · فيه تغييرات' : ' · مفيش تغييرات'}</small></span>${run.runUrl ? `<a class="button ghost" href="${esc(run.runUrl)}" target="_blank" rel="noopener">تفاصيل على GitHub</a>` : ''}</div>`
      : '<p class="admin-muted">لسه مفيش أي تشغيل وصل تقريره.</p>'
  }
  <p class="admin-muted">آخر تحديث ناجح: ${esc(when(status.lastSyncAt))} · التحديث التلقائي الجاي: حوالي ${esc(when(status.nextRun))} (كل 8 ساعات تقريبًا، وGitHub ساعات بيتأخر شوية)</p>
  <section class="stats" aria-label="أرقام آخر تشغيل">${[
    [totals.added, 'اتضاف'],
    [totals.removed, 'اتشال'],
    [(totals.moved || 0) + (totals.renamed || 0), 'اتنقل أو اتغير اسمه'],
    [totals.stale, 'مجلد فشلت قراءته'],
  ]
    .map(
      ([n, label]) =>
        `<div class="stat"><b>${Number(n || 0).toLocaleString('ar-EG')}</b><span>${label}</span></div>`,
    )
    .join('')}</section>
  ${gates ? `<div class="storage-status"><b>المزامنة وقفت للأمان ومحفظتش حاجة:</b><ul>${gates}</ul></div>` : ''}
  ${
    status.runRequest
      ? `<div class="storage-status" data-persistent="true"><b>فيه طلب تشغيل ${status.runRequest.dryRun ? 'تجربة' : 'حقيقي'} مستني.</b> هيبدأ الساعة ${esc(clock(status.nextCheck))} تقريبًا (GitHub بيبص على الطلبات كل ربع ساعة، وساعات بيتأخر). <button class="button ghost" id="sync-cancel" type="button">إلغاء الطلب</button></div>`
      : ''
  }
  <div class="admin-form-actions"><button class="button primary" id="sync-run">تشغيل الآن</button><button class="button ghost" id="sync-dry">تجربة (Dry-run)</button><button class="button ghost" id="sync-pause">${status.paused ? 'استئناف المزامنة' : 'إيقاف مؤقت'}</button></div></section>
  ${githubConnectBox(status)}
  <section class="admin-box"><h2>أحدث الإضافات</h2><div class="admin-list">${itemRows(syncItems(run, 'added'))}</div></section>
  <section class="admin-box"><h2>اللي اتشال</h2><div class="admin-list">${itemRows(syncItems(run, 'removed'))}</div>
  <h2>اللي اتنقل أو اتغير اسمه</h2><div class="admin-list">${itemRows(
    [...syncItems(run, 'moved'), ...syncItems(run, 'renamed')],
    (x) => (x.from ? ` · كان اسمه «${esc(x.from)}»` : x.fromNote ? ` · كان في: ${esc(x.fromNote)}` : ''),
  )}</div></section>
  <section class="admin-box"><h2>مجلدات فشلت قراءتها</h2><p>بيتساب محتواها القديم زي ما هو لحد ما Drive يرد تاني.</p><div class="admin-list">${
    stale
      .map(
        (s) =>
          `<div class="admin-row"><span>${esc(s.note || s.id)}<small>${esc(s.category)} · ${esc(s.reason)} · اتساب ${Number(s.kept || 0)} عنصر</small></span></div>`,
      )
      .join('') || '<p class="admin-muted">لا يوجد.</p>'
  }</div></section>
  <section class="admin-box"><h2>آخر 20 تشغيل</h2><div class="admin-list">${
    (status.runs || [])
      .map(
        (r) =>
          `<div class="admin-row"><span>${esc(statusLabels[r.status] || r.status)} · ${r.mode === 'dry-run' ? 'تجربة' : 'حقيقي'}<small>${esc(when(r.finishedAt || r.receivedAt))} · +${Number(r.totals?.added || 0)} −${Number(r.totals?.removed || 0)}${r.gateCodes?.length ? ` · وقف: ${esc(r.gateCodes.join('، '))}` : ''}</small></span>${r.runUrl ? `<a class="button ghost" href="${esc(r.runUrl)}" target="_blank" rel="noopener">GitHub</a>` : ''}</div>`,
      )
      .join('') || '<p class="admin-muted">لا يوجد.</p>'
  }</div></section>`;
  const dispatch = async (dryRun, button) => {
    const question = dryRun
      ? 'تشغيل تجربة؟ هتقرأ Drive وتطلع تقرير من غير ما تغيّر الموقع.'
      : 'تشغيل حقيقي؟ لو فيه تغييرات هتتحفظ وتنزل على الموقع.';
    if (!confirm(question)) return;
    button.disabled = true;
    try {
      const result = await req('/api/admin/sync/run', {
        method: 'POST',
        body: JSON.stringify({ dryRun, allowRemovals: false }),
      });
      if (result.queued) {
        toast(
          `اتسجّل طلب التشغيل ✓ هيبدأ الساعة ${clock(result.startsBy)} تقريبًا، والنتيجة تظهر هنا بعدها بـ 4 دقايق.`,
        );
        syncDashboard();
      } else toast('اتبعت طلب التشغيل لـ GitHub. النتيجة هتظهر هنا لما يخلص (حوالي 4 دقايق).');
    } catch (error) {
      toast(githubErrors[error.code] || error.message);
    } finally {
      button.disabled = false;
    }
  };
  wireGithubConnect(status);
  const cancel = document.querySelector('#sync-cancel');
  if (cancel)
    cancel.onclick = async () => {
      cancel.disabled = true;
      try {
        await req('/api/admin/sync/run', { method: 'DELETE' });
        toast('اتلغى طلب التشغيل.');
        syncDashboard();
      } catch (error) {
        toast(error.message);
        cancel.disabled = false;
      }
    };
  document.querySelector('#sync-run').onclick = (e) => dispatch(false, e.currentTarget);
  document.querySelector('#sync-dry').onclick = (e) => dispatch(true, e.currentTarget);
  document.querySelector('#sync-pause').onclick = async (e) => {
    const button = e.currentTarget;
    button.disabled = true;
    try {
      await req('/api/admin/sync/pause', {
        method: 'POST',
        body: JSON.stringify({ paused: !status.paused }),
      });
      toast(status.paused ? 'المزامنة رجعت تشتغل.' : 'المزامنة اتوقفت مؤقتًا.');
      syncDashboard();
    } catch (error) {
      toast(error.message);
      button.disabled = false;
    }
  };
}
check();
