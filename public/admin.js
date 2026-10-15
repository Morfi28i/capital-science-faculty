const app = document.querySelector('#app');
let kind = 'subjects',
  items = [],
  editingId = null;
const labels = {
  subjects: 'جروبات المواد',
  lectures: 'ملفات المحاضرات',
  advising: 'الإرشاد الأكاديمي',
  official: 'الجروبات الرسمية',
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
  if (!r.ok) throw Error(d.error || 'Request failed');
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
        body: JSON.stringify({ password: new FormData(e.currentTarget).get('password') }),
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
function dashboard() {
  editingId = null;
  app.innerHTML = `<div class="admin-layout"><aside class="admin-side">${brand}<nav class="admin-nav" aria-label="الأقسام">${Object.entries(
    labels,
  )
    .map(
      ([k, v]) =>
        `<button data-kind="${k}" class="${kind === k ? 'active' : ''}" ${kind === k ? 'aria-current="page"' : ''}>${v}</button>`,
    )
    .join(
      '',
    )}</nav></aside><main class="admin-main"><div class="admin-head"><div><span class="section-index">CONTENT MANAGEMENT</span><h1>${labels[kind]}</h1></div><button class="button ghost" id="mode-toggle">الوضع البسيط</button><a class="button ghost" href="/" target="_blank" rel="noopener">عرض الموقع</a><button class="button" id="logout">تسجيل الخروج</button></div><div id="storage-status" class="storage-status" role="status"></div><section class="admin-box"><h2 id="item-form-title">إضافة عنصر</h2><form class="admin-form" id="item-form">${itemFormFields()}<datalist id="category-options"></datalist><div class="admin-form-actions"><button class="button primary" id="item-submit">إضافة العنصر</button><button class="button ghost" type="button" id="cancel-edit" hidden>إلغاء التعديل</button></div></form></section><section class="admin-box"><div class="admin-toolbar"><h2>العناصر الحالية</h2><input id="item-search" type="search" placeholder="ابحث في العناصر…"></div><div class="admin-list" id="list"><p class="admin-muted">جارٍ التحميل…</p></div></section><section class="admin-box"><h2>الرسائل للمستخدمين</h2><p>تصل الرسالة إلى صندوق بريد الحساب داخل الموقع، وتُرسل بالبريد أيضًا لمن لديه بريد موثّق.</p><form class="admin-form" id="email-form"><label>نوع الإرسال<select name="mode"><option value="private">شخص محدد</option><option value="all">كل المستخدمين</option></select></label><label>المستلم: ID أو بريد أو هاتف<input name="target" placeholder="معرّف الحساب أو البريد أو +20…" dir="ltr"></label><label class="wide">عنوان الرسالة<input name="subject" maxlength="180" required></label><label class="wide">نص الرسالة<textarea name="message" maxlength="10000" rows="5" required></textarea></label><div class="admin-form-actions"><button class="button primary">إرسال الرسالة</button></div></form><div class="admin-toolbar"><input id="user-search" type="search" placeholder="ابحث عن حساب بالاسم أو ID أو البريد أو الهاتف"><button class="button ghost" id="load-users">بحث</button></div><div class="admin-list" id="user-results"></div></section></main></div>`;
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
      const result = await req('/api/admin/email', { method: 'POST', body: JSON.stringify(data) });
      toast(
        `تم التسليم داخل الموقع إلى ${result.inAppDelivered} حساب؛ البريد وصل ${result.emailSent}، وتعذر إرساله إلى ${result.emailFailed}.`,
      );
      emailForm.reset();
      target.disabled = false;
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
              `<div class="admin-row"><span>${esc(u.name || '—')}<small>${esc(u.id)} · ${esc(u.email || u.phone || 'بدون وسيلة تواصل')}</small></span><button type="button" class="target-user" data-id="${esc(u.id)}">استهداف</button></div>`,
          )
          .join('') || '<p class="admin-muted">لا توجد حسابات مطابقة.</p>');
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
        await req(`/api/admin/${kind}`, { method: 'POST', body: JSON.stringify(o) });
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
          await req(`/api/admin/${kind}/${encodeURIComponent(b.dataset.id)}`, { method: 'DELETE' });
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
check();
