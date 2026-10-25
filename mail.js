// Branded emails (sign-in link, password reset, email confirmation, new message) sent from the site's own Gmail.
// Needs GMAIL_USER and GMAIL_APP_PASSWORD (a Google "app password"). Without them the browser falls back to
// Firebase's built-in plain emails. For local testing, MAIL_PREVIEW_DIR writes each email as an .html file.
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import nodemailer from 'nodemailer';

const SITE = 'https://capital-science-faculty.vercel.app';
const FROM_NAME = 'Capital Science · كلية العلوم';

export const mailConfigured = () =>
  Boolean((process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) || process.env.MAIL_PREVIEW_DIR);

let transport;
function transporter() {
  transport ||= nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD.replace(/\s+/g, '') },
  });
  return transport;
}

const esc = (value) =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );

const copy = {
  signin: {
    subject: '🔐 رابط الدخول لحسابك · Capital Science',
    preheader: 'دوس على الزرار عشان تدخل حسابك على Capital Science.',
    eyebrow: 'تسجيل الدخول',
    title: 'رابط الدخول لحسابك',
    intro: (email) =>
      `طلبت الدخول إلى <b>Capital Science</b> بالبريد <b dir="ltr" style="color:#1d4632">${esc(email)}</b>. دوس على الزرار وهتكمّل على طول.`,
    button: 'ادخل لحسابك',
    note: 'الرابط بيشتغل مرة واحدة بس ولفترة محدودة. افتحه من نفس الجهاز لو تقدر.',
  },
  reset: {
    subject: '🔑 إعادة تعيين كلمة المرور · Capital Science',
    preheader: 'اختار كلمة مرور جديدة لحسابك على Capital Science.',
    eyebrow: 'كلمة المرور',
    title: 'اختار كلمة مرور جديدة',
    intro: (email) =>
      `وصلنا طلب لتغيير كلمة مرور الحساب <b dir="ltr" style="color:#1d4632">${esc(email)}</b>. دوس على الزرار واختار كلمة مرور جديدة.`,
    button: 'غيّر كلمة المرور',
    note: 'الرابط بيشتغل مرة واحدة بس ولفترة محدودة. كلمة المرور القديمة بتفضل شغالة لحد ما تغيرها.',
  },
  verify: {
    subject: '✉️ أكّد بريدك الإلكتروني · Capital Science',
    preheader: 'خطوة واحدة عشان نتأكد إن البريد ده بتاعك.',
    eyebrow: 'تأكيد البريد',
    title: 'أكّد بريدك الإلكتروني',
    intro: (email) =>
      `عشان نتأكد إن البريد <b dir="ltr" style="color:#1d4632">${esc(email)}</b> بتاعك، دوس على الزرار. بعدها هيبقى هو البريد المعتمد لحسابك.`,
    button: 'أكّد البريد',
    note: 'الرابط بيشتغل مرة واحدة بس ولفترة محدودة.',
  },
  message: {
    subject: '💬 رسالة جديدة من إدارة الموقع · Capital Science',
    preheader: 'وصلتك رسالة جديدة على Capital Science.',
    eyebrow: 'رسالة جديدة',
    title: 'وصلتك رسالة من إدارة الموقع',
    intro: () => 'فيه رسالة جديدة مستنياك في صندوق رسايلك على الموقع، وتقدر ترد عليها من هناك.',
    button: 'افتح رسايلي',
    note: 'الرد بيوصل لإدارة الموقع على طول من صفحة ملفك.',
  },
};

function requestedAt() {
  return new Date().toLocaleString('ar-EG', {
    timeZone: 'Africa/Cairo',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: 'numeric',
    minute: '2-digit',
  });
}

// Table layout and inline styles only: that is what Gmail, Outlook and phone mail apps render reliably.
export function authEmailHtml(kind, email, link, extra = {}) {
  const c = copy[kind];
  const font = "'Segoe UI',Tahoma,'IBM Plex Sans Arabic',Arial,sans-serif";
  return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${esc(c.title)}</title>
<style>
/* Apple Mail and iOS play these; Gmail and others simply show the still version. */
@keyframes pulse{0%,100%{box-shadow:0 8px 20px -8px rgba(29,70,50,.6)}50%{box-shadow:0 0 0 8px rgba(230,185,100,.25),0 8px 20px -8px rgba(29,70,50,.6)}}
@keyframes rise{from{opacity:0;transform:translateY(12px)}}
.cta{animation:pulse 2.4s ease-in-out infinite}
.rise{animation:rise .8s ease-out both}
</style></head>
<body style="margin:0;padding:0;background:#f1efe6;font-family:${font};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(c.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1efe6;padding:28px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fffdf8;border-radius:22px;overflow:hidden;border:1px solid #e2dfd1">
  <tr><td style="background:#1d4632;line-height:0"><a href="${SITE}" style="display:block"><img src="${SITE}/email/hero.gif?v=2" width="560" height="210" alt="Capital Science · مساحة طلاب كلية العلوم" style="display:block;width:100%;max-width:560px;height:auto;border:0;color:#fffdf8;font:700 18px ${font};background:#1d4632"></a>  </td></tr>
  <tr><td class="rise" style="padding:34px 30px 8px" dir="rtl" align="right">
    <div style="display:inline-block;background:#e3ecdf;color:#1d4632;border-radius:999px;padding:4px 12px;font:600 12px ${font}">${esc(c.eyebrow)}</div>
    <h1 style="margin:14px 0 10px;font:700 26px/1.4 ${font};color:#17241c">${esc(c.title)}</h1>
    <p style="margin:0 0 6px;font:16px/1.9 ${font};color:#34433a">أهلًا بيك 👋</p>
    <p style="margin:0 0 24px;font:16px/1.9 ${font};color:#34433a">${c.intro(email)}</p>
    ${
      extra.subject || extra.message
        ? `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 24px;background:#f3f8f2;border-right:4px solid #2f6b4c;border-radius:12px"><tr><td style="padding:16px 18px;font:15px/1.9 ${font};color:#25332a" dir="rtl">${extra.subject ? `<b style="display:block;margin-bottom:6px;color:#1d4632">${esc(extra.subject)}</b>` : ''}${esc(extra.message || '').replace(/\n/g, '<br>')}</td></tr></table>`
        : ''
    }
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%"><tr><td align="center" style="padding:4px 0 26px">
      <a href="${esc(link)}" class="cta" style="display:inline-block;background:#1d4632;color:#fffdf8;text-decoration:none;font:700 17px ${font};padding:15px 38px;border-radius:999px;box-shadow:0 8px 20px -8px rgba(29,70,50,.6)">${esc(c.button)} ←</a>
    </td></tr></table>
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f9f7f0;border:1px solid #ece8da;border-radius:14px"><tr><td style="padding:14px 16px;font:14px/1.8 ${font};color:#4d5a50" dir="rtl">
      🕒 ${kind === 'message' ? 'وقت الرسالة' : 'وقت الطلب'}: <b>${esc(requestedAt())}</b><br>⏳ ${esc(c.note)}
    </td></tr></table>
    <p style="margin:22px 0 6px;font:13px/1.8 ${font};color:#66705f">الزرار مش شغال؟ انسخ الرابط ده وافتحه في المتصفح:</p>
    <p style="margin:0 0 22px;font:12px/1.6 Consolas,monospace;color:#1d4632;word-break:break-all;direction:ltr;text-align:left"><a href="${esc(link)}" style="color:#1d4632">${esc(link)}</a></p>
    ${kind === 'message' ? '' : `<p style="margin:0 0 26px;font:13px/1.8 ${font};color:#66705f">🔒 لو مش انت اللي طلبت ده، تجاهل الرسالة ومحدش هيقدر يدخل حسابك من غير الرابط ده.</p>`}
  </td></tr>
  <tr><td style="padding:0 30px" dir="rtl"><div style="border-top:1px dashed #e6b964;padding:16px 0;text-align:center;font:600 15px ${font};color:#a8732a">متنساش تصلي على النبي ﷺ</div></td></tr>
  <tr><td style="background:#f6f4ec;padding:18px 30px;text-align:center;font:12px/1.8 ${font};color:#7c8676" dir="rtl">
    Capital Science · مساحة طلاب كلية العلوم<br><a href="${SITE}" style="color:#1d4632;font-weight:600;text-decoration:none" dir="ltr">capital-science-faculty.vercel.app</a>
  </td></tr>
</table>
<div style="max-width:560px;margin:14px auto 0;text-align:center;font:11px ${font};color:#9aa092">الرسالة دي اتبعتت تلقائي، متردش عليها.</div>
</td></tr></table></body></html>`;
}

function authEmailText(kind, email, link, extra = {}) {
  const c = copy[kind];
  const body = extra.message ? `\n\n${extra.subject ? `${extra.subject}\n` : ''}${extra.message}` : '';
  return `${c.title}\n\nأهلًا بيك،\n${c.intro(email).replace(/<[^>]+>/g, '')}${body}\n\n${c.button}: ${link}\n\n${c.note}\nلو مش انت اللي طلبت ده، تجاهل الرسالة.\n\nمتنساش تصلي على النبي ﷺ\nCapital Science · ${SITE}`;
}

export async function sendAuthEmail(kind, email, link, extra = {}) {
  const html = authEmailHtml(kind, email, link, extra);
  if (process.env.MAIL_PREVIEW_DIR) {
    await mkdir(process.env.MAIL_PREVIEW_DIR, { recursive: true });
    const file = path.join(process.env.MAIL_PREVIEW_DIR, `${Date.now()}-${kind}.html`);
    await writeFile(file, html);
    return { preview: file };
  }
  return transporter().sendMail({
    from: { name: FROM_NAME, address: process.env.GMAIL_USER },
    to: email,
    subject: extra.subject
      ? `${copy[kind].subject.split(' · ')[0]}: ${extra.subject}`.slice(0, 180)
      : copy[kind].subject,
    html,
    text: authEmailText(kind, email, link, extra),
  });
}
