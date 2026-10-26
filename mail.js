// Branded emails (sign-in link, password reset, email confirmation, new message) sent from the site's own Gmail.
// Needs GMAIL_USER plus either GMAIL_CLIENT_ID/GMAIL_CLIENT_SECRET/GMAIL_REFRESH_TOKEN (Gmail API over HTTPS,
// which works on hosts that block SMTP, such as Render's free plan) or GMAIL_APP_PASSWORD (SMTP). Without them
// the browser falls back to Firebase's built-in plain emails. For local testing, MAIL_PREVIEW_DIR writes each email as an .html file.
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import nodemailer from 'nodemailer';
import MailComposer from 'nodemailer/lib/mail-composer/index.js';

const SITE = 'https://capital-science-faculty.vercel.app';
const FROM_NAME = 'Capital Science';

// Gmail API credentials come from the environment, or from the dashboard's "Connect Gmail" button (saved in
// Firestore by server.js and handed over with useSavedGmail).
let savedGmail = null;
let gmailToken = { value: '', expires: 0 };
export function useSavedGmail(creds) {
  savedGmail = creds?.clientId && creds?.clientSecret && creds?.refreshToken ? creds : null;
  gmailToken = { value: '', expires: 0 };
}
const gmailApi = () =>
  process.env.GMAIL_CLIENT_ID && process.env.GMAIL_CLIENT_SECRET && process.env.GMAIL_REFRESH_TOKEN
    ? {
        clientId: process.env.GMAIL_CLIENT_ID,
        clientSecret: process.env.GMAIL_CLIENT_SECRET,
        refreshToken: process.env.GMAIL_REFRESH_TOKEN,
      }
    : savedGmail;
const sender = () => process.env.GMAIL_USER || savedGmail?.account;
export const gmailMode = () =>
  process.env.GMAIL_REFRESH_TOKEN ? 'env' : savedGmail ? 'dashboard' : process.env.GMAIL_APP_PASSWORD ? 'smtp' : null;

export const mailConfigured = () =>
  Boolean((sender() && (gmailApi() || process.env.GMAIL_APP_PASSWORD)) || process.env.MAIL_PREVIEW_DIR);

let transport;
function transporter() {
  transport ||= nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD.replace(/\s+/g, '') },
    // Fail fast when SMTP is blocked so the browser falls back to Firebase's email instead of hanging for minutes.
    connectionTimeout: 8000,
    greetingTimeout: 8000,
    socketTimeout: 15000,
  });
  return transport;
}

async function gmailAccessToken() {
  if (gmailToken.value && Date.now() < gmailToken.expires) return gmailToken.value;
  const creds = gmailApi();
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: creds.clientId,
      client_secret: creds.clientSecret,
      refresh_token: creds.refreshToken,
      grant_type: 'refresh_token',
    }),
    signal: AbortSignal.timeout(10000),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`Gmail token refresh failed: ${result.error || response.status}`);
  gmailToken = { value: result.access_token, expires: Date.now() + (result.expires_in - 60) * 1000 };
  return gmailToken.value;
}

async function sendViaGmailApi(message) {
  const raw = (await new MailComposer(message).compile().build()).toString('base64url');
  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: { Authorization: `Bearer ${await gmailAccessToken()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ raw }),
    signal: AbortSignal.timeout(15000),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`Gmail API send failed: ${result.error?.message || response.status}`);
  return result;
}

const esc = (value) =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );

const copy = {
  signin: {
    subject: 'رابط الدخول لحسابك على Capital Science',
    preheader: 'دوس على الزرار عشان تدخل حسابك على Capital Science.',
    eyebrow: 'تسجيل الدخول',
    title: 'رابط الدخول لحسابك',
    intro: (email) =>
      `طلبت الدخول إلى <b>Capital Science</b> بالبريد <span dir="ltr" style="display:inline-block;color:#1d4632;font-weight:700">${esc(email)}</span><br>دوس على الزرار وهتكمّل على طول.`,
    button: 'ادخل لحسابك',
    note: 'الرابط بيشتغل مرة واحدة بس ولفترة محدودة. افتحه من نفس الجهاز لو تقدر.',
  },
  reset: {
    subject: 'إعادة تعيين كلمة المرور على Capital Science',
    preheader: 'اختار كلمة مرور جديدة لحسابك على Capital Science.',
    eyebrow: 'كلمة المرور',
    title: 'اختار كلمة مرور جديدة',
    intro: (email) =>
      `وصلنا طلب لتغيير كلمة مرور الحساب <span dir="ltr" style="display:inline-block;color:#1d4632;font-weight:700">${esc(email)}</span><br>دوس على الزرار واختار كلمة مرور جديدة.`,
    button: 'غيّر كلمة المرور',
    note: 'الرابط بيشتغل مرة واحدة بس ولفترة محدودة. كلمة المرور القديمة بتفضل شغالة لحد ما تغيرها.',
  },
  verify: {
    subject: 'أكّد بريدك الإلكتروني على Capital Science',
    preheader: 'خطوة واحدة عشان نتأكد إن البريد ده بتاعك.',
    eyebrow: 'تأكيد البريد',
    title: 'أكّد بريدك الإلكتروني',
    intro: (email) =>
      `عشان نتأكد إن البريد <span dir="ltr" style="display:inline-block;color:#1d4632;font-weight:700">${esc(email)}</span> بتاعك، دوس على الزرار.<br>بعدها هيبقى هو البريد المعتمد لحسابك.`,
    button: 'أكّد البريد',
    note: 'الرابط بيشتغل مرة واحدة بس ولفترة محدودة.',
  },
  message: {
    subject: 'رسالة جديدة من إدارة Capital Science',
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
  return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light only"><title>${esc(c.title)}</title>
<style>
/* Apple Mail and iOS play this; Gmail and others simply show the still button. */
@keyframes pulse{0%,100%{box-shadow:0 8px 20px -8px rgba(29,70,50,.6)}50%{box-shadow:0 0 0 8px rgba(230,185,100,.25),0 8px 20px -8px rgba(29,70,50,.6)}}
.cta{animation:pulse 2.4s ease-in-out infinite}
</style></head>
<body style="margin:0;padding:0;background:#f1efe6;font-family:${font};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(c.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1efe6;padding:28px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fffdf8;border-radius:22px;overflow:hidden;border:1px solid #e2dfd1">
  <tr><td style="background:#1d4632;padding:20px 20px" dir="ltr">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%"><tr>
      <td width="72" style="width:72px;vertical-align:middle"><a href="${SITE}"><img src="${SITE}/email/atom.gif" width="72" height="72" alt="" style="display:block;width:72px;height:72px;border:0;border-radius:50%"></a></td>
      <td style="vertical-align:middle;padding-left:14px">
        <div style="font:700 20px/1.2 'Helvetica Neue',Arial,sans-serif;letter-spacing:.5px;color:#fffdf8;white-space:nowrap">CAPITAL <span style="color:#e6b964">SCIENCE</span></div>
        <div style="margin-top:4px;font:600 11px/1.4 'Helvetica Neue',Arial,sans-serif;letter-spacing:2px;color:#c9e3d2;white-space:nowrap">STUDENT COMMONS</div>
        <div style="margin-top:8px;font:600 15px/1.5 ${font};color:#fffdf8" dir="rtl" align="left">مساحة طلاب كلية العلوم</div>
      </td>
    </tr></table>
  </td></tr>
  <tr><td style="background:#e6b964;height:3px;line-height:3px;font-size:0">&nbsp;</td></tr>
  <tr><td style="padding:34px 30px 8px" dir="rtl" align="right">
    <div style="display:inline-block;background:#e3ecdf;color:#1d4632;border-radius:999px;padding:4px 12px;font:600 12px ${font}">${esc(c.eyebrow)}</div>
    <h1 style="margin:14px 0 10px;font:700 26px/1.4 ${font};color:#17241c">${esc(c.title)}</h1>
    <p style="margin:0 0 6px;font:16px/1.9 ${font};color:#34433a">أهلًا بيك،</p>
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
      ${kind === 'message' ? 'وقت الرسالة' : 'وقت الطلب'}: <b>${esc(requestedAt())}</b><br>${esc(c.note)}
    </td></tr></table>
    <p style="margin:20px 0 16px;font:13px/1.8 ${font};color:#66705f">الزرار مش شغال؟ <a href="${esc(link)}" style="color:#1d4632;font-weight:700">دوس هنا</a> بدل منه.</p>
    ${kind === 'message' ? '' : `<p style="margin:0 0 26px;font:13px/1.8 ${font};color:#66705f">لو مش انت اللي طلبت ده، تجاهل الرسالة ومحدش هيقدر يدخل حسابك من غير الرابط ده.</p>`}
  </td></tr>
  <tr><td style="padding:0 30px" dir="rtl"><div style="border-top:1px dashed #e6b964;padding:16px 0;text-align:center;font:600 15px ${font};color:#a8732a">متنساش تصلي على النبي ﷺ</div></td></tr>
  <tr><td style="background:#f6f4ec;padding:18px 30px;text-align:center;font:12px/1.8 ${font};color:#7c8676" dir="rtl">
    Capital Science · مساحة طلاب كلية العلوم<br><a href="${SITE}" style="color:#1d4632;font-weight:600;text-decoration:none" dir="ltr">capital-science-faculty.vercel.app</a>
  </td></tr>
</table>
<div style="max-width:560px;margin:14px auto 0;text-align:center;font:11px/1.7 ${font};color:#9aa092" dir="rtl">وصلتك الرسالة دي عشان البريد ده مسجّل على Capital Science.</div>
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
  const message = {
    from: { name: FROM_NAME, address: sender() },
    replyTo: sender(),
    to: email,
    subject: extra.subject
      ? `${extra.subject} · Capital Science`.slice(0, 180)
      : copy[kind].subject,
    html,
    text: authEmailText(kind, email, link, extra),
  };
  return gmailApi() ? sendViaGmailApi(message) : transporter().sendMail(message);
}
