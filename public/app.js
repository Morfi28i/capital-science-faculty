import { dhikrStrip, startDhikrRotation } from '/adhkar.js';
const app = document.querySelector('#app');
const dict = {
  ar: {
    home: 'الرئيسية',
    subjects: 'جروبات المواد',
    lectures: 'ملفات المحاضرات',
    advising: 'الإرشاد الأكاديمي',
    official: 'الجروبات الرسمية',
    developer: 'عن المطور',
    banner: 'الموقع مازال تحت التطوير ولإضافة أفكار أخرى تزيد النفع للجميع تواصل مع المطور Morfi',
    heroTag: 'مساحة طلابية · دفعة 2026/2030',
    heroTitle: 'كل ما تحتاجه\nفي مكان واحد.',
    heroCopy:
      'مجتمع كلية العلوم، منظّم وواضح. اعثر على مجموعاتك ومواردك الأكاديمية، وابقَ على تواصل مع دفعتك.',
    explore: 'اكتشف المساحة',
    made: 'صُنع بعناية لطلاب كلية العلوم',
    groups: 'مجموعات نشطة',
    paths: 'مسارات سهلة',
    community: 'مجتمع واحد',
    open: 'افتح المجموعة',
    search: 'ابحث في المجموعات…',
    all: 'الكل',
    empty: 'لا توجد عناصر هنا حتى الآن.',
    emptyFiles: 'لم تتم إضافة ملفات محاضرات بعد. تابعنا قريبًا.',
    download: 'فتح الملف',
    advisory:
      'اختر مجموعة المرشد الأكاديمي المسجل لك فقط. ستجد اسم مرشدك في التسجيل الأكاديمي أو جدولك الدراسي.',
    cohortwarn: 'اختر جروبًا رسميًا واحدًا فقط. المجموعات مخصصة لطلاب دفعة 2026/2030.',
    contacts: 'مسؤولو قبول طلبات الانضمام',
    officialPages: 'صفحات رسمية',
    contactMorfi: 'تواصل مع Morfi',
    devTitle: 'تعرّف على المطور',
    devName: 'عصام',
    devCopy:
      'أنا عصام، أعمل باسم Morfi وبراند Morphine. موشن ديزاينر ومونتير فريلانسر من مصر، بخبرة تقارب سنتين في الموشن جرافيك التجاري والإعلانات وشغل العملاء.',
    brandLabel: 'البراند',
    role: 'موشن ديزاينر ومونتير فريلانسر',
    specialty: 'موشن جرافيك تجاري · إعلانات وشغل عملاء',
    experience: 'خبرة حوالي سنتين',
    locationLabel: 'الموقع',
    location: 'مصر',
    tools: 'الأدوات',
    portfolio: 'البورتفوليو',
    whatsapp: 'واتساب',
    instagram: 'إنستجرام',
    email: 'جيميل',
    emailValue: 'sdyqs0437@gmail.com',
    about:
      'أستخدم After Effects وPremiere Pro وPhotoshop وCanva لصناعة موشن جرافيك ومونتاج تجاري يخدم أهداف العملاء.',
    smtpNotice: 'تنبيه: إشعارات التسجيل بالبريد غير مفعّلة حاليًا؛ يلزم إعداد خدمة البريد لإرسالها.',
    welcome: 'أهلًا بك',
    intro: 'مساحة تجمع مجموعات كلية العلوم ومواردها في مكان واحد.',
    register: 'أنشئ ملفك الطلابي',
    name: 'الاسم',
    gender: 'الجنس',
    choose: 'اختر',
    male: 'ذكر',
    female: 'أنثى',
    other: 'أفضل عدم الإجابة',
    gmail: 'بريد Gmail',
    picture: 'صورتك (اختياري)',
    continue: 'متابعة',
    skip: 'المتابعة كزائر',
    privacy: 'أنشئ حسابًا موثقًا بالبريد أو Google أو الهاتف. ملفك وصورتك يُحفظان في حسابك بعد التحقق.',
    required: 'أكمل الأسماء المطلوبة واختر الجنس.',
    language: 'English',
    theme: 'تبديل المظهر',
    notice: 'تم حفظ ملفك على هذا الجهاز.',
    admin: 'لوحة الإدارة',
    phone: 'اتصال',
    latest: 'مساحة دفعتك، بلمحة واحدة',
    officialLabel: 'روابط وإرشاد موثوقان',
    filesTitle: 'ملفات المحاضرات',
    subjectsTitle: 'جروبات المواد',
    advisingTitle: 'الإرشاد الأكاديمي',
    officialTitle: 'الجروبات الرسمية',
    pageMissing: 'الصفحة غير موجودة',
  },
  en: {
    home: 'Home',
    subjects: 'Subject groups',
    lectures: 'Lecture files',
    advising: 'Academic advising',
    official: 'Official groups',
    developer: 'Developer',
    banner: 'This site is still in development. Share ideas that can help everyone with Morfi.',
    heroTag: 'Student space · Class of 2026/2030',
    heroTitle: 'Everything you need,\nin one place.',
    heroCopy:
      'A clearer home for the Faculty of Science community. Find your groups and study resources, and stay close to your cohort.',
    explore: 'Explore the space',
    made: 'Thoughtfully made for Faculty of Science students',
    groups: 'Active communities',
    paths: 'Simple pathways',
    community: 'One community',
    open: 'Open group',
    search: 'Search groups…',
    all: 'All',
    empty: 'Nothing here yet.',
    emptyFiles: 'Lecture files have not been added yet. Check back soon.',
    download: 'Open file',
    advisory:
      'Join only the academic adviser assigned to you. You can find their name in your academic registration or class schedule.',
    cohortwarn: 'Choose just one official group. These groups are for students in the class of 2026/2030.',
    contacts: 'Group application coordinators',
    officialPages: 'Official pages',
    contactMorfi: 'Contact Morfi',
    devTitle: 'Meet the developer',
    devName: 'Essam',
    devCopy:
      'I’m Essam, working as Morfi under the Morphine brand. I’m a freelance motion designer and video editor based in Egypt, with around two years of experience in commercial motion graphics, advertising, and client work.',
    brandLabel: 'Brand',
    role: 'Freelance motion designer & video editor',
    specialty: 'Commercial motion graphics · Ads & client work',
    experience: 'Around two years of experience',
    locationLabel: 'Location',
    location: 'Egypt',
    tools: 'Tools',
    portfolio: 'Portfolio',
    whatsapp: 'WhatsApp',
    instagram: 'Instagram',
    email: 'Gmail',
    emailValue: 'sdyqs0437@gmail.com',
    about:
      'I use After Effects, Premiere Pro, Photoshop, and Canva to create commercial motion design and edits that serve client goals.',
    smtpNotice:
      'Registration email alerts are currently off. An email provider API key is required to send them.',
    welcome: 'Welcome',
    intro: 'A home for Faculty of Science groups and study resources.',
    register: 'Create your student profile',
    name: 'Name',
    gender: 'Gender',
    choose: 'Select',
    male: 'Male',
    female: 'Female',
    other: 'Prefer not to say',
    gmail: 'Gmail address',
    picture: 'Your photo (optional)',
    continue: 'Continue',
    skip: 'Continue as guest',
    privacy:
      'Create a verified account with email, Google, or phone. Your profile and portrait are saved after verification.',
    required: 'Please enter your name, gender and a valid Gmail address.',
    language: 'العربية',
    theme: 'Toggle appearance',
    notice: 'Your profile is saved on this device.',
    admin: 'Admin dashboard',
    phone: 'Call',
    latest: 'Your cohort, at a glance',
    officialLabel: 'Official links and guidance',
    filesTitle: 'Lecture files',
    subjectsTitle: 'Subject groups',
    advisingTitle: 'Academic advising',
    officialTitle: 'Official groups',
    pageMissing: 'Page not found',
  },
};
dict.ar.firebaseNotice =
  'تسجيل الحسابات متوقف مؤقتًا حتى ربط مشروع Firebase والتحقق من إعداداته. يمكنك متابعة الموقع كزائر.';
dict.en.firebaseNotice =
  'Account registration is paused until the Firebase project is connected. You can continue as a guest.';
dict.ar.indexedItems = 'ملف ومجلد من Drive';
dict.ar.flatLibrary = 'اضغط على المجلد للدخول إلى محتوياته، ثم واصل حتى تصل إلى الملفات.';
dict.ar.searchFiles = 'ابحث باسم الملف أو المادة أو مسارها…';
dict.ar.loadMore = 'عرض المزيد من الملفات';
dict.ar.browseDrive = 'فتح المجلد';
dict.en.indexedItems = 'Drive files and folders';
dict.en.flatLibrary = 'Open a folder to browse its contents, then continue until you reach the files.';
dict.en.searchFiles = 'Search by file, course, or folder path…';
dict.en.loadMore = 'Load more files';
dict.en.browseDrive = 'Open folder';
Object.assign(dict.ar, {
  profile: 'ملفي الشخصي',
  profileIntro: 'حدّث بياناتك وصورتك في مساحة الكلية.',
  editProfile: 'تعديل الملف',
  saveProfile: 'حفظ التغييرات',
  logout: 'تسجيل الخروج',
  signedOut: 'أنت تتصفح كزائر',
  createProfile: 'إنشاء ملف طلابي',
  chooseAvatar: 'اختار رسمة',
  uploadPhoto: 'أو ارفع صورتك',
  avatarNames: [
    'ذرّة',
    'دورق',
    'DNA',
    'ميكروسكوب',
    'كوكب',
    'ورقة شجر',
    'بلّورة',
    'مغناطيس',
    'تلسكوب',
    'جزيء',
  ],
  profileSaved: 'تم تحديث ملفك وإرسال إشعار بالبريد.',
  profileSavedNoEmail: 'تم تحديث ملفك، لكن تعذر إرسال إشعار البريد.',
  loggedOut: 'تم تسجيل الخروج من هذا الجهاز.',
  emailPrivate: 'بريدك الشخصي لا يظهر للزوار.',
  imageTooLarge: 'حجم الصورة يجب أن يكون أقل من 3.5 ميجابايت.',
  invalidProfile: 'راجع الاسم والنوع وبريد Gmail.',
  updateError: 'تعذر حفظ التغييرات. حاول مرة أخرى.',
  registeredEmail: 'سيُرسل تحديث ملفك وصورتك إلى إدارة الموقع.',
  profileLocalOnly: 'حسابك الموثق محفوظ في Firebase ويمكنك الدخول إليه من أجهزتك.',
  legacyProfile:
    'هذا ملف قديم محفوظ على هذا الجهاز فقط. سجّل دخولك لتوصيله بحساب موثّق مع الاحتفاظ ببياناتك.',
  avatarAlt: 'رسمة',
  profilePhoto: 'الصورة الشخصية',
});
Object.assign(dict.ar, {
  authPassword: 'كلمة المرور',
  googleSignIn: 'المتابعة باستخدام Google',
  haveAccount: 'لدي حساب بالفعل',
  createAccount: 'إنشاء حساب جديد',
  phoneIntl: 'رقم الهاتف بصيغة دولية',
  sendCode: 'إرسال رمز SMS',
  smsCode: 'رمز SMS',
  confirmPhone: 'تأكيد الهاتف',
  phonePrivacy:
    'سيُرسل رقمك إلى Google/Firebase للتحقق ومنع إساءة الاستخدام. إرسال رسائل SMS مدفوع حسب المنطقة.',
  verifyThenLogin: 'افحص بريدك واضغط رابط التحقق، ثم سجّل الدخول هنا.',
  signingIn: 'جارٍ تسجيل الدخول…',
});
Object.assign(dict.en, {
  authPassword: 'Password',
  googleSignIn: 'Continue with Google',
  haveAccount: 'I already have an account',
  createAccount: 'Create a new account',
  phoneIntl: 'Phone number (international format)',
  sendCode: 'Send SMS code',
  smsCode: 'SMS code',
  confirmPhone: 'Confirm phone',
  phonePrivacy:
    'Your number is sent to Google/Firebase for verification and abuse prevention. SMS is billed by destination.',
  verifyThenLogin: 'Check your email and open the verification link, then sign in here.',
  signingIn: 'Signing in…',
});
Object.assign(dict.en, {
  profile: 'My profile',
  profileIntro: 'Update your details and portrait for the faculty space.',
  editProfile: 'Edit profile',
  saveProfile: 'Save changes',
  logout: 'Log out',
  signedOut: 'You are browsing as a guest',
  createProfile: 'Create student profile',
  chooseAvatar: 'Choose an illustration',
  uploadPhoto: 'Or upload your photo',
  avatarNames: [
    'Atom',
    'Flask',
    'DNA',
    'Microscope',
    'Planet',
    'Leaf',
    'Crystal',
    'Magnet',
    'Telescope',
    'Molecule',
  ],
  profileSaved: 'Your profile was updated and an email notice was sent.',
  profileSavedNoEmail: 'Your profile was updated, but the email notice could not be sent.',
  loggedOut: 'You have logged out on this device.',
  emailPrivate: 'Your email is not shown to other visitors.',
  imageTooLarge: 'Choose an image smaller than 3.5 MB.',
  invalidProfile: 'Check the name, gender, and Gmail address.',
  updateError: 'Could not save your changes. Please try again.',
  registeredEmail: 'Your updated profile and portrait will be emailed to the site administrator.',
  profileLocalOnly: 'Your verified account syncs securely through Firebase.',
  legacyProfile:
    'This older profile is saved only on this device. Sign in to link it to a verified account without losing your profile.',
  avatarAlt: 'Illustration',
  profilePhoto: 'Profile photo',
});
Object.assign(dict.ar, {
  filesSub: 'ملفات Drive منظّمة بالمجلدات',
  advisingSub: 'مجموعة مرشدك الأكاديمي',
  heroLead: 'كل ما تحتاجه',
  heroAccent: 'في مكان واحد',
  heroKicker: 'دليل طلاب كلية العلوم',
  statGroups: 'جروب مادة',
  statFiles: 'ملف ومجلد',
  statAdvising: 'مرشد أكاديمي',
  statOfficial: 'رابط رسمي',
  sectionsTitle: 'اختر عنصرك',
  sectionsCopy: 'أربعة أقسام تجمع كل روابط الكلية. اضغط على أي عنصر لتبدأ.',
  ideaTitle: 'عندك فكرة تفيد الدفعة؟',
  ideaCopy: 'الموقع مبني بإيد طالب لزمايله، وبيكبر باقتراحاتكم. ابعت فكرتك لـ Morfi.',
  ideaCta: 'تواصل مع المطور',
  menu: 'القائمة',
  closeMenu: 'إغلاق القائمة',
  toDark: 'التبديل إلى الوضع الداكن',
  toLight: 'التبديل إلى الوضع الفاتح',
  notFoundTitle: 'هذا العنصر غير موجود في الجدول',
  notFoundCopy: 'الصفحة اللي بتدور عليها مش موجودة أو اتنقلت. ارجع للرئيسية وكمل من هناك.',
  backHome: 'العودة للرئيسية',
  results: 'نتيجة',
  noResults: 'لا توجد نتائج مطابقة.',
  skip: 'المتابعة كزائر',
  subjectsDesc: 'جروبات واتساب لكل مادة وسكشن. ادخل جروب مادتك وشعبتك بس.',
  lecturesDesc: 'ماتيريال المحاضرات من Drive لكل دفعة، مرتبة بنفس مجلداتها الأصلية.',
  officialDesc: 'الجروبات والصفحات الرسمية للدفعة والشعب والكلية، في مكان واحد موثوق.',
  devDesc: 'الشخص اللي ورا المساحة دي، وطرق التواصل.',
});
Object.assign(dict.en, {
  filesSub: 'Drive files, organized by folder',
  advisingSub: 'Your academic adviser’s group',
  heroLead: 'Everything you need,',
  heroAccent: 'in one place',
  heroKicker: 'The Faculty of Science student guide',
  statGroups: 'subject groups',
  statFiles: 'files & folders',
  statAdvising: 'academic advisers',
  statOfficial: 'official links',
  sectionsTitle: 'Pick your element',
  sectionsCopy: 'Four sections hold every faculty link. Tap any element to begin.',
  ideaTitle: 'Have an idea that helps the cohort?',
  ideaCopy:
    'This site is built by a student for fellow students, and it grows with your suggestions. Send your idea to Morfi.',
  ideaCta: 'Contact the developer',
  menu: 'Menu',
  closeMenu: 'Close menu',
  toDark: 'Switch to dark theme',
  toLight: 'Switch to light theme',
  notFoundTitle: 'This element is not on the table',
  notFoundCopy:
    'The page you are looking for does not exist or has moved. Head back home and continue from there.',
  backHome: 'Back to home',
  results: 'results',
  noResults: 'No matching items.',
  subjectsDesc: 'WhatsApp groups for every course and section. Join only your own course and group.',
  lecturesDesc: 'Lecture materials from Drive for every cohort, kept in their original folders.',
  officialDesc: 'Official cohort, department and faculty groups and pages, in one trusted place.',
  devDesc: 'The person behind this space, and how to get in touch.',
});
let lang = localStorage.getItem('cs-lang') === 'en' ? 'en' : 'ar',
  // No stored value means "follow the system"; a stored value is an explicit override.
  themeOverride = ['light', 'dark'].includes(localStorage.getItem('cs-theme'))
    ? localStorage.getItem('cs-theme')
    : '',
  db = { subjects: [], lectures: [], advising: [], official: [], contacts: [] },
  emailConfigured = false,
  firebaseEnabled = false,
  // SMS sign-in needs Firebase's paid plan, so it stays hidden unless the server enables it.
  phoneAuthEnabled = false;
const t = (k) => dict[lang][k] || k;
document.addEventListener('click', (e) => {
  const target = e.target.closest('.button,.quick-card,.group-card,.icon-btn,.filter');
  if (!target) return;
  const r = target.getBoundingClientRect(),
    dot = document.createElement('i');
  dot.className = 'ripple';
  dot.style.left = `${e.clientX - r.left}px`;
  dot.style.top = `${e.clientY - r.top}px`;
  target.append(dot);
  setTimeout(() => dot.remove(), 650);
});
const paths = ['/', '/subjects', '/lectures', '/advising', '/official', '/developer', '/profile'];
let siteSnapshot = '';
async function refreshSiteData() {
  try {
    const response = await fetch(`/api/site?fresh=${Date.now()}`, {
      cache: 'no-store',
    });
    if (!response.ok) return;
    const text = await response.text();
    // Re-render only when content actually changed, and never while a visitor is typing in a form,
    // otherwise returning to the tab would wipe half-filled profile fields or the open Drive folder.
    if (text === siteSnapshot) return;
    siteSnapshot = text;
    db = JSON.parse(text);
    emailConfigured = db.emailNotificationsEnabled === true;
    firebaseEnabled = db.firebaseAuthEnabled === true;
    phoneAuthEnabled = db.phoneAuthEnabled === true;
    if (document.activeElement?.matches('input,select,textarea') || document.querySelector('.onboarding'))
      return;
    render();
  } catch {}
}
const siteUpdates =
  typeof BroadcastChannel === 'function' ? new BroadcastChannel('capital-science-updates') : null;
siteUpdates?.addEventListener('message', (event) => {
  if (event.data?.type === 'content-updated') refreshSiteData();
});
window.addEventListener('storage', (event) => {
  if (event.key === 'cs-site-updated') refreshSiteData();
});
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') refreshSiteData();
});
const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
// Swap pages through the View Transitions API where supported, then move focus to the new heading
// so keyboard and screen-reader users land on the page they just opened.
function transition(update) {
  const done = () => {
    window.scrollTo({ top: 0 });
    document.querySelector('#page h1')?.focus({ preventScroll: true });
  };
  if (!document.startViewTransition || reduceMotion() || document.visibilityState !== 'visible') {
    update();
    done();
    return;
  }
  const viewTransition = document.startViewTransition(update);
  // A quick second click skips the running transition; that rejection is expected, not an error.
  viewTransition.ready.catch(() => {});
  viewTransition.finished.finally(done);
}
function navigate(p) {
  if (!paths.includes(p)) p = '/';
  if (p === currentPath()) {
    window.scrollTo({ top: 0, behavior: reduceMotion() ? 'auto' : 'smooth' });
    return;
  }
  history.pushState({}, '', p);
  transition(render);
}
window.addEventListener('popstate', () => transition(render));
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  if (!themeOverride) render();
});
window.addEventListener('storage', (event) => {
  if (event.key !== 'cs-theme') return;
  themeOverride = ['light', 'dark'].includes(event.newValue) ? event.newValue : '';
  applyTheme();
  render();
});
function link(p, label, cl = '') {
  return `<a class="${cl}" href="${p}" data-route="${p}">${label}</a>`;
}
// Stroke icons drawn on a 24px grid; they inherit currentColor so they follow the theme.
const iconPaths = {
  arrow: '<path d="M7 17 17 7M8 7h9v9"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h10"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  users:
    '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.6-3.6 3.2-5.5 6.5-5.5s5.9 1.9 6.5 5.5"/><path d="M15.5 4.8a3.5 3.5 0 0 1 0 6.4M18 14.7c2 .7 3.2 2.5 3.5 5.3"/>',
  folder:
    '<path d="M3 7.5A1.5 1.5 0 0 1 4.5 6H9l2 2.5h8.5A1.5 1.5 0 0 1 21 10v8.5a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5Z"/>',
  file: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z"/><path d="M14 3v5h5M9 13h6M9 17h4"/>',
  compass: '<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5Z"/>',
  shield:
    '<path d="M12 3 4.5 6v5.5c0 4.5 3.2 8.4 7.5 9.5 4.3-1.1 7.5-5 7.5-9.5V6Z"/><path d="m9 12 2 2 4-4"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c.8-4.2 4-6.5 8-6.5s7.2 2.3 8 6.5"/>',
  chat: '<path d="M20 11.5a8 8 0 0 1-11.6 7.1L4 20l1.4-4.2A8 8 0 1 1 20 11.5Z"/>',
  facebook:
    '<path d="M14 8h2.5V4.5H14A3.5 3.5 0 0 0 10.5 8v2.5H8V14h2.5v6.5H14V14h2.5l.5-3.5h-3V8.5A.5.5 0 0 1 14 8Z"/>',
  drive: '<path d="M8.5 3.5h7l6 10.5-3.5 6h-12l-3.5-6Z"/><path d="M8.5 3.5 12 10l-6 10M15.5 3.5 9.5 14h12"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/>',
  phone:
    '<path d="M5 4h3.5l1.5 4.5-2 1.5a11 11 0 0 0 6 6l1.5-2 4.5 1.5V19a1.5 1.5 0 0 1-1.5 1.5A16.5 16.5 0 0 1 3.5 5.5 1.5 1.5 0 0 1 5 4Z"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
  instagram:
    '<rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.2" cy="6.8" r=".6" fill="currentColor"/>',
  spark:
    '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
  alert: '<path d="M12 3.5 2.5 20h19Z"/><path d="M12 10v4M12 17h.01"/>',
  chevron: '<path d="m9 6 6 6-6 6"/>',
  atom: '<circle cx="12" cy="12" r="1.6" fill="currentColor"/><ellipse cx="12" cy="12" rx="9.5" ry="3.8"/><ellipse cx="12" cy="12" rx="9.5" ry="3.8" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="9.5" ry="3.8" transform="rotate(120 12 12)"/>',
  refresh: '<path d="M20 12a8 8 0 1 1-2.3-5.7M20 4v5h-5"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  logout: '<path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 16l-4-4 4-4M6 12h10"/>',
};
function icon(name, cls = '') {
  return `<svg class="ico ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${iconPaths[name] || iconPaths.spark}</svg>`;
}
// The logo: a "C" drawn as an open orbit with a gold electron.
const brandMark = `<svg class="brand-logo" viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" rx="16" class="brand-logo-bg"/><ellipse cx="32" cy="32" rx="22" ry="9" fill="none" class="brand-logo-orbit" stroke-width="2.5" transform="rotate(-32 32 32)"/><path d="M41.5 22.5A13.5 13.5 0 1 0 41.5 41.5" fill="none" class="brand-logo-c" stroke-width="5.5" stroke-linecap="round"/><circle cx="47" cy="17" r="4.5" class="brand-logo-dot"/></svg>`;
function brand(sub = 'STUDENT COMMONS') {
  return `<a class="brand" href="/" data-route="/" aria-label="Capital Science">${brandMark}<span class="brand-text"><span>CAPITAL <b>SCIENCE</b></span><small>${sub}</small></span></a>`;
}
// Each section is presented as an element tile, like a periodic table cell.
const sections = [
  {
    key: 'subjects',
    path: '/subjects',
    num: '01',
    sym: 'Sg',
    icon: 'users',
    sub: 'groups',
  },
  {
    key: 'lectures',
    path: '/lectures',
    num: '02',
    sym: 'Lf',
    icon: 'folder',
    sub: 'filesSub',
  },
  {
    key: 'advising',
    path: '/advising',
    num: '03',
    sym: 'Ad',
    icon: 'compass',
    sub: 'advisingSub',
  },
  {
    key: 'official',
    path: '/official',
    num: '04',
    sym: 'Og',
    icon: 'shield',
    sub: 'officialLabel',
  },
];
function elementBadge(key) {
  const s = sections.find((x) => x.key === key) || {
    num: key === 'developer' ? '05' : key === 'profile' ? '06' : '00',
    sym: key === 'developer' ? 'Mf' : key === 'profile' ? 'Me' : 'Nf',
  };
  return `<span class="element-badge" aria-hidden="true"><small>${s.num}</small><b>${s.sym}</b></span>`;
}
// Content items store the Arabic title in `title` (and English in `titleEn`), except subject groups,
// which store English in `title` and Arabic in `titleAr`. Resolve both shapes per language.
function itemTitle(item) {
  if (lang === 'ar') return item.titleAr || item.title || item.titleEn || '';
  return item.titleEn || item.title || item.titleAr || '';
}
const categoryEnglish = {
  'مواد عامة': 'Core courses',
  سكاشن: 'Sections',
  موارد: 'Resources',
  'الإرشاد الأكاديمي': 'Academic advising',
  'جروبات الدفعة الرسمية': 'Official cohort groups',
  'جروبات الشعب': 'Department groups',
  'صفحات رسمية': 'Official pages',
  'دفعة 2024/2025': 'Class of 2024/25',
  'دفعة 2025/2026': 'Class of 2025/26',
  'دفعة 2026/2027': 'Class of 2026/27',
};
const fmt = (n) => Number(n || 0).toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US');
const avatars = Array.from({ length: 10 }, (_, i) => ({
  id: `art-${String(i + 1).padStart(2, '0')}`,
  // New file names so browsers don't keep showing the older cached drawings.
  src: `/avatars/sci-${String(i + 1).padStart(2, '0')}.svg`,
  name: dict.ar.avatarNames[i],
}));
const defaultAvatar = { male: 'art-01', female: 'art-01', other: 'art-01' };
// Profiles saved before the redraw still point at art-NN; show the same slot's new drawing.
const avatarSrc = (picture) =>
  String(picture || '').replace(/\/avatars\/art-(\d\d)\.svg$/, '/avatars/sci-$1.svg');
const avatarForGender = (gender) =>
  avatars.find((a) => a.id === defaultAvatar[gender])?.src || avatars[4].src;
function getProfile() {
  try {
    const p = JSON.parse(localStorage.getItem('cs-profile') || 'null');
    return localStorage.getItem('cs-registered') === '1' && p?.name && (p?.email || p?.phone) && p?.gender
      ? p
      : null;
  } catch {
    return null;
  }
}
function profileCookieValue(p) {
  return { registered: true, id: String(p.id || '') };
}
function saveProfile(p) {
  localStorage.setItem('cs-profile', JSON.stringify(p));
  localStorage.setItem('cs-registered', '1');
  const cookie = encodeURIComponent(JSON.stringify(profileCookieValue(p)));
  document.cookie = `cs_profile=${cookie}; path=/; max-age=31536000; samesite=lax${location.protocol === 'https:' ? '; secure' : ''}`;
  verifyProfilePersistence();
}
function clearProfile() {
  localStorage.removeItem('cs-profile');
  localStorage.removeItem('cs-registered');
  document.cookie = 'cs_profile=; path=/; max-age=0; samesite=lax';
  sessionStorage.setItem('cs-guest', '1');
  verifyProfilePersistence();
}
async function resetOldProfileSession() {
  const version = '2';
  if (localStorage.getItem('cs-onboarding-version') === version) return;
  localStorage.removeItem('cs-profile');
  localStorage.removeItem('cs-registered');
  sessionStorage.removeItem('cs-guest');
  document.cookie = 'cs_profile=; path=/; max-age=0; samesite=lax';
  localStorage.setItem('cs-onboarding-version', version);
  try {
    const auth = await import('/firebase-auth.js');
    await auth.signOutFirebase();
  } catch {}
}
function avatarGallery(selected = '') {
  return `<fieldset class="avatar-picker"><legend>${t('chooseAvatar')}</legend><div class="avatar-grid">${avatars.map((a, i) => `<label class="avatar-option"><input type="radio" name="avatar-choice" value="${a.src}" ${selected === a.src ? 'checked' : ''}><img src="${a.src}" alt="${t('avatarAlt')} ${i + 1}" loading="lazy"><span>${esc(lang === 'ar' ? a.name : dict.en.avatarNames[i])}</span></label>`).join('')}</div></fieldset>`;
}
const systemDark = () => matchMedia('(prefers-color-scheme: dark)').matches;
const renderedTheme = () => themeOverride || (systemDark() ? 'dark' : 'light');
function applyTheme() {
  if (themeOverride) document.documentElement.dataset.theme = themeOverride;
  else delete document.documentElement.dataset.theme;
}
function toggleTheme() {
  // Pick the opposite of what is on screen; if that equals the system preference, return to "system".
  const target = renderedTheme() === 'dark' ? 'light' : 'dark';
  themeOverride = target === (systemDark() ? 'dark' : 'light') ? '' : target;
  try {
    if (themeOverride) localStorage.setItem('cs-theme', themeOverride);
    else localStorage.removeItem('cs-theme');
  } catch {}
  applyTheme();
}
const currentPath = () => (location.pathname.length > 1 ? location.pathname.replace(/\/+$/, '') : '/');
function navLink(p, label) {
  return `<a href="${p}" data-route="${p}" ${currentPath() === p ? 'aria-current="page"' : ''}>${label}</a>`;
}
function header() {
  const profile = getProfile(),
    avatar = profile?.picture
      ? `<img src="${attr(avatarSrc(profile.picture))}" alt="">`
      : profile?.name
        ? esc(profile.name.slice(0, 1).toLocaleUpperCase())
        : icon('user');
  const dark = renderedTheme() === 'dark';
  return `<header class="topbar"><div class="topbar-inner">${brand()}<nav class="nav" id="site-nav" aria-label="${lang === 'ar' ? 'التنقل الرئيسي' : 'Main'}">${navLink('/', t('home'))}${navLink('/subjects', t('subjects'))}${navLink('/lectures', t('lectures'))}${navLink('/advising', t('advising'))}${navLink('/official', t('official'))}${navLink('/developer', t('developer'))}</nav><div class="tools"><button class="icon-btn lang-btn" id="lang" lang="${lang === 'ar' ? 'en' : 'ar'}">${t('language')}</button><button class="icon-btn" id="theme" aria-label="${dark ? t('toLight') : t('toDark')}" title="${dark ? t('toLight') : t('toDark')}">${dark ? icon('sun') : icon('moon')}</button><a class="avatar-mini" href="/profile" data-route="/profile" aria-label="${t('profile')}" title="${t('profile')}" ${currentPath() === '/profile' ? 'aria-current="page"' : ''}>${avatar}</a><button class="icon-btn mobile-menu" id="mobile-menu" aria-controls="site-nav" aria-expanded="false" aria-label="${t('menu')}">${icon('menu')}</button></div></div></header>`;
}
function banner() {
  return `<a class="dev-banner" href="/developer" data-route="/developer"><span class="banner-dot" aria-hidden="true"></span><span>${t('banner')}</span>${icon('arrow', 'banner-arrow')}</a>`;
}
function footer() {
  return `<footer class="footer"><div class="footer-inner"><div class="foot-main">${brand()}<p>${t('made')}</p></div><nav class="foot-links" aria-label="${lang === 'ar' ? 'روابط الموقع' : 'Site links'}">${sections.map((s) => navLink(s.path, t(s.key))).join('')}${navLink('/developer', t('developer'))}</nav><div class="foot-bottom"><span>© 2026 Capital Science · ${lang === 'ar' ? 'صُنع بإيد طالب' : 'Student made'}</span><a href="/admin">${t('admin')}</a></div></div></footer>`;
}
function categoryTitle(item) {
  return lang === 'ar'
    ? item.categoryAr || item.category || t('all')
    : item.categoryEn ||
        categoryEnglish[item.category] ||
        categoryEnglish[item.categoryAr] ||
        item.category ||
        t('all');
}
function cardNote(item) {
  const note = lang === 'en' && item.noteEn ? item.noteEn : item.note;
  if (!note) return '';
  if (note === 'المجلد الرئيسي' || note === 'Year root')
    return lang === 'ar' ? 'المجلد الرئيسي' : 'Year root';
  // Drive catalog notes are folder paths; notes on regular groups are plain descriptions.
  return item.type ? `${lang === 'ar' ? 'داخل: ' : 'In: '}${note}` : note;
}
function kindIcon(item) {
  if (item.type === 'folder') return 'folder';
  if (item.kind === 'facebook') return 'facebook';
  if (item.kind === 'drive' || item.file) return item.kind === 'drive' && !item.type ? 'drive' : 'file';
  return 'chat';
}
const safeHref = (u) => (/^https?:\/\//i.test(String(u || '')) ? attr(u) : '#');
function card(item, i) {
  const title = itemTitle(item),
    isFolder = item.type === 'folder',
    note = cardNote(item);
  return `<article class="group-card reveal kind-${attr(item.kind || 'link')}" data-category="${attr(item.category || '')}" style="--delay:${Math.min(i % 6, 5) * 50}ms"><div class="card-top"><span class="card-icon">${icon(kindIcon(item))}</span><span class="card-category">${esc(categoryTitle(item))}</span></div><h3>${esc(title)}</h3>${note ? `<p>${esc(note)}</p>` : ''}<a class="card-link" href="${safeHref(item.url)}" target="_blank" rel="noopener noreferrer">${item.file ? t('download') : isFolder ? t('browseDrive') : t('open')} ${icon('arrow')}<span class="visually-hidden"> · ${esc(title)}</span></a></article>`;
}
function esc(s = '') {
  return String(s).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
}
function attr(s = '') {
  return esc(s);
}
// Three tilted orbits with electrons travelling along them (SVG motion paths), and the brand letter as nucleus.
function atom(size = '') {
  const orbit = 'M20 200a180 66 0 1 0 360 0a180 66 0 1 0-360 0';
  const ring = (deg, dur, cls) =>
    `<g transform="rotate(${deg} 200 200)"><ellipse cx="200" cy="200" rx="180" ry="66" class="atom-ring"/><circle r="7" class="atom-electron ${cls}"><animateMotion dur="${dur}s" repeatCount="indefinite" path="${orbit}"/></circle></g>`;
  return `<div class="atom ${size}"><svg viewBox="0 0 400 400" aria-hidden="true">${ring(0, 7, 'gold')}${ring(60, 9, 'mint')}${ring(120, 11, 'gold')}</svg><div class="atom-nucleus"><span>C</span></div></div>`;
}
function atomArt() {
  // Three tilted orbits with electrons; the nucleus carries the brand letter.
  return `<div class="hero-art" aria-hidden="true">${atom()}<div class="float-card float-one"><span class="float-icon">${icon('users')}</span><span><b>${fmt(db.subjects?.length)} ${t('statGroups')}</b><small>${t('latest')}</small></span></div><div class="float-card float-two"><span class="float-icon gold">${icon('shield')}</span><span><b>${t('officialLabel')}</b><small>2026 — 2030</small></span></div></div>`;
}
function home() {
  const stats = [
    [db.subjects?.length, 'statGroups'],
    [db.driveFiles?.length || db.lectures?.length, 'statFiles'],
    [db.advising?.length, 'statAdvising'],
    [db.official?.length, 'statOfficial'],
  ];
  return `<main class="home"><section class="hero"><div class="hero-copy"><div class="eyebrow"><span class="eyebrow-dot"></span>${t('heroTag')}</div><h1 tabindex="-1">${t('heroLead')}<br><span class="hero-accent">${t('heroAccent')}<svg viewBox="0 0 300 18" preserveAspectRatio="none" aria-hidden="true"><path d="M3 13C60 5 140 3 297 9"/></svg></span>.</h1><p>${t('heroCopy')}</p><div class="hero-actions"><a class="button primary" href="/subjects" data-route="/subjects">${t('explore')} ${icon('arrow')}</a><a class="button ghost" href="/lectures" data-route="/lectures">${icon('folder')} ${t('lectures')}</a></div></div>${atomArt()}</section><section class="stats" aria-label="${lang === 'ar' ? 'أرقام الموقع' : 'Site numbers'}">${stats.map(([n, k]) => `<div class="stat reveal"><b>${fmt(n)}</b><span>${t(k)}</span></div>`).join('')}</section><section class="home-bottom"><div class="bottom-heading"><span class="section-index">${t('heroKicker')}</span><h2>${t('sectionsTitle')}</h2><p>${t('sectionsCopy')}</p></div><div class="quick-grid">${sections
    .map(
      (s, i) =>
        `<a class="quick-card element-tile reveal" href="${s.path}" data-route="${s.path}" style="--delay:${i * 70}ms"><span class="tile-num">${s.num}</span><span class="tile-icon">${icon(s.icon)}</span><span class="tile-symbol" aria-hidden="true">${s.sym}</span><span class="quick-name">${t(s.key)}<small>${t(s.sub)}</small></span>${icon('arrow', 'quick-arrow')}</a>`,
    )
    .join(
      '',
    )}</div></section><section class="idea-band reveal"><div><span class="section-index">${t('made')}</span><h2>${t('ideaTitle')}</h2><p>${t('ideaCopy')}</p></div><a class="button primary" href="/developer" data-route="/developer">${t('ideaCta')} ${icon('arrow')}</a></section></main>`;
}
function notFound() {
  return `<main class="page not-found"><div class="nf-tile" aria-hidden="true"><small>404</small><b>Nf</b><span>Not found</span></div><h1 tabindex="-1">${t('notFoundTitle')}</h1><p>${t('notFoundCopy')}</p><a class="button primary" href="/" data-route="/">${t('backHome')} ${icon('arrow')}</a></main>`;
}
function collection(key, title, desc = '', files = false) {
  const items = db[key] || [],
    categories = [...new Set(items.map((x) => x.category).filter(Boolean))];
  if (key === 'lectures') return lectureLibrary(title, desc);
  return `<main class="page section-${key}">${pageHeading(key, title, desc)}${key === 'advising' ? `<div class="notice">${icon('info')}<p>${t('advisory')}</p></div>` : ''}${key === 'official' ? `<div class="notice warning">${icon('alert')}<p>${t('cohortwarn')}</p></div>` : ''}${items.length ? `${filterRow(categories, items, t('search'))}<div class="card-grid" id="cards">${items.map(card).join('')}</div><p class="empty-state compact" id="no-results" hidden>${t('noResults')}</p>` : `<div class="empty-state">${icon(files ? 'folder' : 'spark')}<h2>${files ? t('emptyFiles') : t('empty')}</h2><p>${files ? '' : t('made')}</p></div>`}${key === 'official' && db.contacts?.length ? `<section class="contacts"><span class="section-index">STUDENT SUPPORT</span><h2>${t('contacts')}</h2><div class="contact-row">${db.contacts.map((c) => `<a href="tel:${attr(c.phone)}" class="contact-chip"><span class="contact-icon">${icon('phone')}</span><span><b>${esc(c.name)}</b><small dir="ltr">${esc(c.phone)}</small></span></a>`).join('')}</div></section>` : ''}</main>`;
}
function pageHeading(key, title, desc, extra = '') {
  return `<div class="page-heading">${elementBadge(key)}<div><h1 tabindex="-1">${title}</h1><p>${desc}</p>${extra}</div></div>`;
}
function filterRow(categories, items, placeholder) {
  return `<div class="filter-row"><div class="filters" role="group" aria-label="${lang === 'ar' ? 'تصفية حسب التصنيف' : 'Filter by category'}"><button class="filter active" data-filter="all" aria-pressed="true">${t('all')}</button>${categories
    .map((c) => {
      const sample = items.find((x) => x.category === c);
      return `<button class="filter" data-filter="${attr(c)}" aria-pressed="false">${esc(categoryTitle(sample || { category: c }))}</button>`;
    })
    .join(
      '',
    )}</div><label class="search">${icon('search')}<input id="search" type="search" placeholder="${placeholder}" aria-label="${placeholder}"></label></div>`;
}
function lectureLibrary(title, desc) {
  const items = db.driveFiles || db.lectures || [],
    categories = [...new Set(items.map((x) => x.category).filter(Boolean))];
  return `<main class="page lecture-library">${pageHeading('lectures', title, desc, `<p class="drive-path-note">${icon('drive')} <span>${fmt(items.length)} ${t('indexedItems')} · ${t('flatLibrary')}</span></p>`)}${
    items.length
      ? `${filterRow(categories, items, t('searchFiles'))}<div id="drive-tree" class="drive-tree"></div>`
      : `<div class="empty-state">${icon('folder')}<h2>${t('emptyFiles')}</h2></div>`
  }</main>`;
}
function developer() {
  const tools = ['After Effects', 'Premiere Pro', 'Photoshop', 'Canva'];
  return `<main class="page developer-page">${pageHeading('developer', t('devTitle'), t('devDesc'))}<div class="dev-card"><div class="dev-monogram" aria-hidden="true"><span>M</span><i></i></div><div class="dev-details"><span class="section-index">${t('role')}</span><h2>${t('devName')} · Morfi</h2><p class="dev-lead">${t('devCopy')}</p><dl class="dev-meta"><div><dt>${t('brandLabel')}</dt><dd>Morphine</dd></div><div><dt>${t('locationLabel')}</dt><dd>${t('location')}</dd></div><div><dt>${lang === 'ar' ? 'الخبرة' : 'Experience'}</dt><dd>${t('experience')}</dd></div></dl><p>${t('about')}</p><div class="dev-tools" aria-label="${t('tools')}">${tools.map((x) => `<span>${x}</span>`).join('')}</div><div class="dev-links"><a href="https://morfi28i.github.io/portfolio/" target="_blank" rel="noopener noreferrer">${icon('globe')} ${t('portfolio')}</a><a href="https://wa.me/201009088676" target="_blank" rel="noopener noreferrer">${icon('chat')} ${t('whatsapp')}</a><a href="https://instagram.com/Morfi.28i" target="_blank" rel="noopener noreferrer">${icon('instagram')} ${t('instagram')}</a><a href="mailto:sdyqs0437@gmail.com">${icon('mail')} <span dir="ltr">${t('emailValue')}</span></a></div></div></div><figure class="dev-quote"><span aria-hidden="true">“</span><blockquote>${t('banner')}</blockquote></figure></main>`;
}
// Profile tabs: overview, details, photo, messages, account. The last tab is remembered per session.
const profileTabs = [
  ['overview', 'نظرة عامة', 'Overview', 'atom'],
  ['details', 'بياناتي', 'Details', 'user'],
  ['photo', 'صورتي', 'Photo', 'spark'],
  ['messages', 'رسائلي', 'Messages', 'mail'],
  ['account', 'الحساب', 'Account', 'shield'],
];
function profileNamesOf(p) {
  const names = [p.firstName || '', p.fatherName || '', p.lastName || ''];
  if (!names.some(Boolean)) {
    const parts = String(p.name || '')
      .trim()
      .split(/\s+/);
    names[0] = parts.shift() || '';
    names[2] = parts.pop() || '';
    names[1] = parts.join(' ');
  }
  return names;
}
function profilePictureOf(p) {
  const avatar =
    avatars.find((a) => avatarSrc(p.picture) === a.src || avatarSrc(p.picture).endsWith(a.src))?.src ||
    avatarForGender(p.gender);
  const custom =
    /\/uploads\//.test(p.picture || '') ||
    /^data:image\/(png|jpeg|webp);base64,/.test(p.picture || '') ||
    /^https:\/\//.test(p.picture || '');
  return { avatar, picture: custom ? p.picture : avatar, custom };
}
// What a complete profile needs; each item links to the tab that fixes it.
function profileChecklist(p) {
  const names = profileNamesOf(p),
    L = (ar, en) => (lang === 'ar' ? ar : en);
  return [
    [names.every(Boolean), L('الاسم الثلاثي كامل', 'Full three-part name'), 'details'],
    [['male', 'female', 'other'].includes(p.gender), L('الجنس', 'Gender'), 'details'],
    [Boolean(p.picture), L('صورة أو رسمة شخصية', 'A photo or portrait'), 'photo'],
    [Boolean(p.email || p.phone), L('وسيلة تواصل موثّقة', 'A verified contact'), 'account'],
  ];
}
function profilePage() {
  const p = getProfile(),
    L = (ar, en) => (lang === 'ar' ? ar : en);
  if (!p)
    return `<main class="page profile-page"><section class="profile-welcome"><div class="profile-cover" aria-hidden="true">${atom('small')}</div><div class="profile-welcome-body"><span class="profile-empty-icon">${icon('user')}</span><h1 tabindex="-1">${t('profile')}</h1><p>${firebaseEnabled ? t('privacy') : t('firebaseNotice')}</p><ul class="profile-perks"><li>${icon('mail')} ${L('صندوق رسائل خاص من إدارة الموقع', 'A private inbox from the site team')}</li><li>${icon('user')} ${L('صورتك وبياناتك محفوظة على أي جهاز', 'Your photo and details on every device')}</li><li>${icon('shield')} ${L('حساب موثّق ببريدك أو Google', 'A verified account with email or Google')}</li></ul><button class="button primary" id="create-profile" ${firebaseEnabled ? '' : 'disabled'}>${t('createProfile')} ${icon('arrow')}</button></div></section></main>`;
  const names = profileNamesOf(p),
    { avatar, picture } = profilePictureOf(p),
    checklist = profileChecklist(p),
    done = checklist.filter(([ok]) => ok).length,
    percent = Math.round((done / checklist.length) * 100),
    tab = profileTabs.some(([id]) => id === sessionStorage.getItem('cs-profile-tab'))
      ? sessionStorage.getItem('cs-profile-tab')
      : 'overview',
    pendingEmail = sessionStorage.getItem('cs-pending-email-change') || '',
    canSave = firebaseEnabled && p.id,
    joined = p.createdAt?._seconds || p.createdAt?.seconds,
    contact = p.email || p.phone || '';
  const panel = (id, html) =>
    `<section class="profile-panel" id="profile-panel-${id}" role="tabpanel" aria-labelledby="profile-tab-${id}" ${id === tab ? '' : 'hidden'}>${html}</section>`;
  const hero = `<section class="profile-hero"><div class="profile-cover" aria-hidden="true">${atom('small')}</div><div class="profile-hero-body"><div class="profile-avatar-wrap"><img class="profile-photo" src="${attr(picture)}" alt="${t('profilePhoto')}"><button class="photo-edit" type="button" data-go-tab="photo" aria-label="${L('تغيير الصورة', 'Change photo')}" title="${L('تغيير الصورة', 'Change photo')}">${icon('user')}</button></div><div class="profile-identity"><h1 tabindex="-1">${esc(p.name)}</h1>${contact ? `<p class="profile-contact"><span dir="ltr">${esc(contact)}</span><span class="verified-badge">${icon('shield')} ${L('موثّق', 'Verified')}</span></p>` : ''}<div class="profile-chips">${p.id ? `<button class="profile-chip" id="copy-account-id" type="button" title="${L('نسخ رقم الحساب', 'Copy account ID')}">${icon('file')} <span dir="ltr">ID ··${esc(String(p.id).slice(-6))}</span></button>` : ''}${joined ? `<span class="profile-chip">${icon('spark')} ${L('عضو من', 'Member since')} ${esc(new Date(joined * 1000).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', { month: 'long', year: 'numeric' }))}</span>` : ''}<span class="profile-chip">${icon('check')} ${L('الملف مكتمل', 'Profile complete')} ${fmt(percent)}${lang === 'ar' ? '٪' : '%'}</span></div></div><button class="button ghost profile-logout" id="logout">${icon('logout')} <span>${t('logout')}</span></button></div><nav class="profile-tabs" role="tablist" aria-label="${L('أقسام الملف', 'Profile sections')}">${profileTabs
    .map(
      ([id, ar, en, ic]) =>
        `<button class="profile-tab" id="profile-tab-${id}" role="tab" type="button" data-tab="${id}" aria-controls="profile-panel-${id}" aria-selected="${id === tab}">${icon(ic)}<span>${L(ar, en)}</span>${id === 'messages' ? '<b class="tab-badge" id="unread-badge" hidden></b>' : ''}</button>`,
    )
    .join('')}</nav></section>`;
  const overview = panel(
    'overview',
    `<div class="profile-grid"><article class="profile-card completeness"><div class="ring" style="--p:${percent}" role="img" aria-label="${fmt(percent)}%"><b>${fmt(percent)}${lang === 'ar' ? '٪' : '%'}</b></div><div><h2>${percent === 100 ? L('ملفك مكتمل 🎉', 'Your profile is complete 🎉') : L('كمّل ملفك', 'Complete your profile')}</h2><ul class="checklist">${checklist
      .map(
        ([ok, label, go]) =>
          `<li class="${ok ? 'ok' : ''}">${icon(ok ? 'check' : 'spark')}<span>${label}</span>${ok ? '' : `<button class="link-button" type="button" data-go-tab="${go}">${L('كمّل', 'Fix')}</button>`}</li>`,
      )
      .join(
        '',
      )}</ul></div></article><article class="profile-card inbox-preview"><div class="profile-section-head with-action"><div><h2>${L('آخر الرسائل', 'Latest messages')}</h2></div><button class="link-button" type="button" data-go-tab="messages">${L('كل الرسائل', 'All messages')}</button></div><div id="inbox-preview"><p class="mailbox-loading">${L('جارٍ تحميل الرسائل…', 'Loading messages…')}</p></div></article></div><div class="profile-shortcuts">${[
      ['/lectures', 'folder', t('lectures'), t('filesSub')],
      ['/subjects', 'users', t('subjects'), t('groups')],
      ['/official', 'shield', t('official'), t('officialLabel')],
    ]
      .map(
        ([href, ic, title, sub]) =>
          `<a class="profile-shortcut" href="${href}" data-route="${href}"><span class="tile-icon">${icon(ic)}</span><span><b>${title}</b><small>${sub}</small></span>${icon('arrow', 'quick-arrow')}</a>`,
      )
      .join('')}</div>`,
  );
  const details = panel(
    'details',
    `<article class="profile-card"><div class="profile-section-head"><h2>${L('البيانات الأساسية', 'Your details')}</h2><p>${L('اسمك بيظهر كده في الموقع وفي رسايل الإدارة.', 'This is how your name appears on the site and in messages from the team.')}</p></div><div class="profile-fields"><label>${L('الاسم الأول', 'First name')}<input name="firstName" value="${attr(names[0])}" required maxlength="50" autocomplete="given-name"></label><label>${L('اسم الوالد', 'Father’s name')}<input name="fatherName" value="${attr(names[1])}" required maxlength="50" autocomplete="additional-name"></label><label>${L('اسم العائلة', 'Family name')}<input name="lastName" value="${attr(names[2])}" required maxlength="50" autocomplete="family-name"></label><fieldset class="gender-choice"><legend>${t('gender')}</legend>${[
      ['male', t('male')],
      ['female', t('female')],
      ['other', t('other')],
    ]
      .map(
        ([value, label]) =>
          `<label class="choice-pill"><input type="radio" name="gender" value="${value}" ${p.gender === value ? 'checked' : ''} required><span>${label}</span></label>`,
      )
      .join('')}</fieldset></div></article>`,
  );
  const photo = panel(
    'photo',
    `<article class="profile-card"><div class="profile-section-head"><h2>${L('الصورة الشخصية', 'Profile photo')}</h2><p>${L('اختار رسمة أو ارفع صورتك. التغيير بيظهر فوق على طول، ويتحفظ لما تدوس حفظ.', 'Pick a portrait or upload a photo. It previews above right away and is saved when you press Save.')}</p></div>${avatarGallery(avatar)}<label class="upload-drop">${icon('folder')}<span><b>${t('uploadPhoto')}</b><small>PNG · JPG · WEBP · ${L('لحد 3.5 ميجا', 'up to 3.5 MB')}</small></span><input type="file" id="profile-upload" accept="image/png,image/jpeg,image/webp"></label></article>`,
  );
  const messages = panel(
    'messages',
    p.id
      ? `<article class="profile-card mailbox-card chat-card"><div class="chat-head"><span class="chat-team-avatar"><img src="/favicon.svg" alt="" width="42" height="42"></span><div><h2>${L('إدارة الموقع', 'Site team')}</h2><p>${L('محادثة خاصة بينك وبين الإدارة', 'A private conversation with the site team')}</p></div><button class="icon-btn" id="refresh-mailbox" type="button" aria-label="${L('تحديث', 'Refresh')}" title="${L('تحديث', 'Refresh')}">${icon('refresh')}</button></div><div id="mailbox-list" class="chat-thread" aria-live="polite"><p class="mailbox-loading">${L('جارٍ تحميل الرسائل…', 'Loading messages…')}</p></div><form class="chat-compose" id="chat-compose"><textarea name="message" rows="1" maxlength="2000" required placeholder="${L('اكتب رسالتك للإدارة…', 'Write to the site team…')}" aria-label="${L('رسالتك', 'Your message')}"></textarea><button class="button primary chat-send" type="submit" aria-label="${L('إرسال', 'Send')}">${icon('arrow')}<span>${L('إرسال', 'Send')}</span></button></form><p class="form-error" id="chat-error" aria-live="polite"></p></article>`
      : `<article class="profile-card mailbox-card"><h2>${L('صندوق الرسائل', 'Inbox')}</h2><p>${t('legacyProfile')}</p><button class="button primary" id="link-existing-account">${L('تسجيل الدخول وربط الملف', 'Sign in and link profile')} ${icon('arrow')}</button></article>`,
  );
  const account = panel(
    'account',
    `<article class="profile-card"><div class="profile-section-head"><h2>${L('بيانات الحساب', 'Account')}</h2></div><dl class="account-facts"><div><dt>${L('رقم الحساب', 'Account ID')}</dt><dd dir="ltr">${esc(p.id || '—')}</dd></div><div><dt>${p.email ? L('البريد الإلكتروني', 'Email') : L('الهاتف', 'Phone')}</dt><dd dir="ltr">${esc(contact || '—')}</dd></div><div><dt>${L('الخصوصية', 'Privacy')}</dt><dd>${t('emailPrivate')}</dd></div></dl></article>${
      p.id
        ? `<article class="profile-card contact-change-card"><div class="profile-section-head"><h2>${phoneAuthEnabled ? L('تغيير البريد أو الهاتف', 'Change email or phone') : L('تغيير البريد الإلكتروني', 'Change email')}</h2><p>${L('لا يعتمد أي تغيير قبل تأكيد ملكية وسيلة التواصل الجديدة.', 'A new contact method is not saved until you verify it.')}</p></div><div class="contact-change-row"><label>${L('البريد الجديد', 'New email')}<input id="new-contact-email" type="email" inputmode="email" autocomplete="email" placeholder="name@example.com" dir="ltr"></label><button class="button ghost" id="send-email-change" type="button" hidden disabled>${L('إرسال رابط التحقق', 'Send verification link')}</button></div><p id="email-change-status" class="contact-status" aria-live="polite">${pendingEmail ? esc(L(`مستني تأكيد ${pendingEmail}. افتح الرابط اللي وصلك وبعدين دوس الزرار.`, `Waiting for ${pendingEmail}. Open the link you received, then press the button.`)) : ''}</p><button class="button ghost" id="refresh-email-change" type="button" ${pendingEmail ? '' : 'hidden'}>${L('تحققت من الرابط · تحديث الملف', 'I verified the link · Refresh profile')}</button>${
            phoneAuthEnabled
              ? `<div class="contact-change-row phone-change-row"><label>${L('مفتاح الدولة', 'Country code')}<select id="new-phone-country"><option value="+20" selected>مصر (+20)</option><option value="+966">السعودية (+966)</option><option value="+971">الإمارات (+971)</option><option value="+965">الكويت (+965)</option><option value="+974">قطر (+974)</option><option value="+962">الأردن (+962)</option><option value="+1">United States (+1)</option><option value="+44">United Kingdom (+44)</option></select></label><label>${L('رقم الهاتف الجديد', 'New phone number')}<input id="new-contact-phone" type="tel" inputmode="tel" autocomplete="tel-national" placeholder="01012345678" dir="ltr"></label><button class="button ghost" id="send-phone-change" type="button" hidden disabled>${L('إرسال كود SMS', 'Send SMS code')}</button></div><div id="firebase-phone-update-recaptcha"></div><div id="phone-change-code-area" hidden><label>${L('كود SMS', 'SMS code')}<input id="phone-change-code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="000000" dir="ltr"></label><button class="button ghost" id="confirm-phone-change" type="button">${L('تأكيد الرقم', 'Verify phone')}</button></div><p id="phone-change-status" class="contact-status" aria-live="polite"></p>`
              : ''
          }</article>`
        : ''
    }<article class="profile-card danger-card"><div><h2>${t('logout')}</h2><p>${L('هتخرج من الحساب على الجهاز ده بس.', 'Signs you out on this device only.')}</p></div><button class="button ghost" type="button" data-logout>${icon('logout')} ${t('logout')}</button></article>`,
  );
  // The details and photo tabs share one form, so a single save bar saves both.
  return `<main class="page profile-page">${hero}<form id="profile-form" class="profile-form" novalidate><input type="hidden" name="picture" id="profile-picture" value="${attr(picture)}">${overview}${details}${photo}<div class="profile-save-bar" hidden><p class="profile-save-note">${L('عندك تعديلات لسه متحفظتش.', 'You have unsaved changes.')}</p><p id="profile-error" class="form-error" aria-live="polite"></p><button class="button ghost" type="button" id="discard-profile">${L('تراجع', 'Discard')}</button><button class="button primary" type="submit" ${canSave ? '' : 'disabled'}>${t('saveProfile')} ${icon('arrow')}</button></div></form>${messages}${account}</main>`;
}

function wireAvatarPicker(root) {
  const hidden = root.querySelector('[name="picture"]'),
    upload = root.querySelector('input[type="file"]'),
    preview =
      root.querySelector('.profile-photo,.avatar-preview') || document.querySelector('.profile-photo');
  root.querySelectorAll('[name="avatar-choice"]').forEach((r) =>
    r.addEventListener('change', () => {
      if (r.checked) {
        root.dataset.avatarManual = 'true';
        hidden.value = r.value;
        if (upload) upload.value = '';
        if (preview) preview.src = r.value;
        root.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }),
  );
  upload?.addEventListener('change', async () => {
    const file = upload.files?.[0];
    if (!file) return;
    if (file.size > 3_500_000) {
      upload.value = '';
      const error = root.querySelector('.form-error');
      if (error) error.textContent = t('imageTooLarge');
      return;
    }
    root.dataset.avatarManual = 'true';
    hidden.value = await fileAsDataUrl(file);
    root.querySelectorAll('[name="avatar-choice"]').forEach((r) => (r.checked = false));
    if (preview) preview.src = hidden.value;
    root.dispatchEvent(new Event('input', { bubbles: true }));
  });
}
function fileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const scale = Math.min(1, 1000 / Math.max(image.naturalWidth, image.naturalHeight)),
          canvas = document.createElement('canvas');
        canvas.width = Math.round(image.naturalWidth * scale);
        canvas.height = Math.round(image.naturalHeight * scale);
        canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
        let quality = 0.82,
          data = canvas.toDataURL('image/jpeg', quality);
        while (data.length > 650000 && quality > 0.35) {
          quality -= 0.1;
          data = canvas.toDataURL('image/jpeg', quality);
        }
        if (data.length > 650000) return reject(Error('Choose a smaller image.'));
        resolve(data);
      };
      image.onerror = reject;
      image.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
function messageStamp(m) {
  return m.createdAt?.seconds || m.createdAt?._seconds
    ? new Date((m.createdAt.seconds || m.createdAt._seconds) * 1000).toLocaleString(
        lang === 'ar' ? 'ar-EG' : 'en-US',
        {
          dateStyle: 'medium',
          timeStyle: 'short',
        },
      )
    : '';
}
function messageCard(m, compact = false) {
  const mine = m.sender === 'user',
    L = (ar, en) => (lang === 'ar' ? ar : en),
    who = mine ? L('أنت', 'You') : L('إدارة الموقع', 'Site team');
  if (compact)
    return `<article class="mailbox-message compact ${!mine && !m.readAt ? 'unread' : ''}"><div class="mailbox-message-head"><strong>${esc(m.subject || who)}</strong><time>${esc(messageStamp(m))}</time></div><p>${esc(String(m.message || '').slice(0, 140))}</p></article>`;
  return `<div class="chat-bubble ${mine ? 'mine' : 'theirs'} ${!mine && !m.readAt ? 'unread' : ''}">${m.subject ? `<strong>${esc(m.subject)}</strong>` : ''}<p>${esc(m.message || '')}</p><time>${esc(messageStamp(m))}</time></div>`;
}
let mailboxSeen = 0;
async function loadMailbox({ quiet = false } = {}) {
  const list = document.querySelector('#mailbox-list'),
    preview = document.querySelector('#inbox-preview'),
    L = (ar, en) => (lang === 'ar' ? ar : en);
  if (!list && !preview) return;
  if (list && !quiet)
    list.innerHTML = `<p class="mailbox-loading">${L('جارٍ تحميل الرسائل…', 'Loading messages…')}</p>`;
  try {
    const auth = await import('/firebase-auth.js'),
      messages = await auth.loadMessages(),
      unread = messages.filter((m) => m.sender !== 'user' && !m.readAt);
    const empty = `<div class="empty-inbox">${icon('mail')}<p>${L('مفيش رسائل لسه. ابعت أي سؤال أو مشكلة للإدارة من هنا.', 'No messages yet. Send the site team a question or a problem from here.')}</p></div>`;
    const badge = document.querySelector('#unread-badge');
    if (badge) {
      badge.hidden = !unread.length;
      badge.textContent = fmt(unread.length);
    }
    if (preview)
      preview.innerHTML = messages.length
        ? messages
            .slice(0, 3)
            .map((m) => messageCard(m, true))
            .join('')
        : empty;
    if (!list || !document.body.contains(list)) return;
    // The server returns newest first; a conversation reads oldest first.
    const thread = [...messages].reverse();
    list.innerHTML = thread.length ? thread.map((m) => messageCard(m)).join('') : empty;
    if (thread.length !== mailboxSeen) list.scrollTop = list.scrollHeight;
    mailboxSeen = thread.length;
    // Opening the conversation counts as reading it.
    const panelOpen = !list.closest('[role="tabpanel"]')?.hidden;
    if (panelOpen && unread.length) {
      Promise.all(unread.map((m) => auth.markMessageRead(m.id)))
        .then(() => {
          if (badge) badge.hidden = true;
        })
        .catch(() => {});
    }
  } catch (error) {
    console.error('Inbox load failed:', error);
    const failed = `<p class="mailbox-loading">${L('تعذر تحميل الرسائل دلوقتي. جرّب تاني بعد شوية.', 'Could not load messages right now. Try again shortly.')}</p>`;
    if (list && !quiet) list.innerHTML = failed;
    if (preview) preview.innerHTML = failed;
  }
}
function wireChat() {
  const form = document.querySelector('#chat-compose');
  if (!form) return;
  const box = form.elements.message,
    error = document.querySelector('#chat-error'),
    button = form.querySelector('button'),
    grow = () => {
      box.style.height = 'auto';
      box.style.height = `${Math.min(box.scrollHeight, 160)}px`;
    };
  box.addEventListener('input', grow);
  box.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && matchMedia('(pointer: fine)').matches) {
      e.preventDefault();
      form.requestSubmit();
    }
  });
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = box.value.trim();
    if (!text) return;
    button.disabled = true;
    error.textContent = '';
    try {
      const auth = await import('/firebase-auth.js');
      await auth.sendMessage(text);
      box.value = '';
      grow();
      await loadMailbox({ quiet: true });
    } catch (err) {
      error.textContent = err.message;
    } finally {
      button.disabled = false;
      box.focus();
    }
  });
}
function wireProfile() {
  const form = document.querySelector('#profile-form'),
    legacy = getProfile(),
    L = (ar, en) => (lang === 'ar' ? ar : en);
  document.querySelector('#create-profile')?.addEventListener('click', () => onboarding(true));
  document.querySelector('#link-existing-account')?.addEventListener('click', () => onboarding(true, legacy));
  const logout = async () => {
    try {
      const auth = await import('/firebase-auth.js');
      await auth.signOutFirebase();
    } catch {}
    clearProfile();
    sessionStorage.removeItem('cs-pending-email-change');
    sessionStorage.removeItem('cs-profile-tab');
    render();
    showToast(t('loggedOut'));
  };
  document.querySelectorAll('#logout, [data-logout]').forEach((b) => b.addEventListener('click', logout));
  if (!form) return;
  // Tabs: switch panels in place (no URL change) and remember the choice for this session.
  const setTab = (id, focus = false) => {
    document.querySelectorAll('.profile-tab').forEach((b) => {
      const on = b.dataset.tab === id;
      b.setAttribute('aria-selected', String(on));
      b.tabIndex = on ? 0 : -1;
      if (on && focus) b.focus();
    });
    document.querySelectorAll('.profile-panel').forEach((panel) => {
      panel.hidden = panel.id !== `profile-panel-${id}`;
    });
    sessionStorage.setItem('cs-profile-tab', id);
    updateSaveBar();
    if (id === 'messages') {
      mailboxSeen = 0;
      loadMailbox({ quiet: true });
    }
  };
  const tabs = [...document.querySelectorAll('.profile-tab')];
  tabs.forEach((b, i) => {
    b.tabIndex = b.getAttribute('aria-selected') === 'true' ? 0 : -1;
    b.addEventListener('click', () => setTab(b.dataset.tab));
    b.addEventListener('keydown', (e) => {
      const step = {
        ArrowLeft: lang === 'ar' ? 1 : -1,
        ArrowRight: lang === 'ar' ? -1 : 1,
      }[e.key];
      if (!step) return;
      e.preventDefault();
      setTab(tabs[(i + step + tabs.length) % tabs.length].dataset.tab, true);
    });
  });
  document.querySelectorAll('[data-go-tab]').forEach((b) =>
    b.addEventListener('click', () => {
      setTab(b.dataset.goTab);
      document.querySelector('.profile-tabs')?.scrollIntoView({
        behavior: reduceMotion() ? 'auto' : 'smooth',
        block: 'start',
      });
    }),
  );
  // Show the save bar only while the details or photo differ from what is saved.
  const saveBar = document.querySelector('.profile-save-bar'),
    snapshot = () =>
      JSON.stringify([...new FormData(form)].filter(([k]) => k !== 'profileFile' && k !== 'avatar-choice')),
    initial = snapshot();
  function updateSaveBar() {
    if (saveBar) saveBar.hidden = snapshot() === initial;
  }
  form.addEventListener('input', updateSaveBar);
  form.addEventListener('change', () => setTimeout(updateSaveBar, 0));
  document.querySelector('#discard-profile')?.addEventListener('click', () => render());
  updateSaveBar();
  document.querySelector('#copy-account-id')?.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(String(getProfile()?.id || ''));
      showToast(L('اتنسخ رقم الحساب.', 'Account ID copied.'));
    } catch {
      showToast(
        L('تعذر النسخ. حدّد الرقم وانسخه يدويًا.', 'Could not copy. Select the ID and copy it manually.'),
      );
    }
  });
  loadMailbox();
  wireChat();
  document.querySelector('#refresh-mailbox')?.addEventListener('click', () => loadMailbox());
  // Pick up replies from the team while the conversation is open.
  const poll = setInterval(() => {
    const list = document.querySelector('#mailbox-list');
    if (!list) return clearInterval(poll);
    if (!document.hidden && !list.closest('[role="tabpanel"]')?.hidden) loadMailbox({ quiet: true });
  }, 30_000);
  wireAvatarPicker(form);
  const profile = () => getProfile() || {},
    emailInput = document.querySelector('#new-contact-email'),
    emailButton = document.querySelector('#send-email-change'),
    emailStatus = document.querySelector('#email-change-status');
  const phoneInput = document.querySelector('#new-contact-phone'),
    phoneCountry = document.querySelector('#new-phone-country'),
    phoneButton = document.querySelector('#send-phone-change'),
    phoneStatus = document.querySelector('#phone-change-status');
  let phoneVerification = null,
    pendingEmailChange = sessionStorage.getItem('cs-pending-email-change') || '';
  const normalizedPhone = () => {
    let digits = String(phoneInput?.value || '').replace(/\D/g, ''),
      code = phoneCountry?.value || '+20';
    if (digits.startsWith('00' + code.slice(1))) digits = digits.slice(code.length + 1);
    else if (digits.startsWith(code.slice(1))) digits = digits.slice(code.length - 1);
    if (code === '+20') {
      if (digits.startsWith('0')) digits = digits.slice(1);
      return /^1[0125]\d{8}$/.test(digits) ? '+20' + digits : '';
    }
    if (digits.startsWith('0')) digits = digits.slice(1);
    return /^\d{7,14}$/.test(digits) ? code + digits : '';
  };
  const checkEmail = () => {
    if (!emailInput || !emailButton) return;
    const value = emailInput.value.trim().toLowerCase(),
      valid =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value !== String(profile().email || '').toLowerCase();
    emailButton.hidden = !valid;
    emailButton.disabled = !valid;
    if (emailStatus && !value) emailStatus.textContent = '';
  };
  emailInput?.addEventListener('input', checkEmail);
  emailButton?.addEventListener('click', async () => {
    const value = emailInput.value.trim().toLowerCase();
    emailButton.disabled = true;
    emailStatus.textContent = '';
    try {
      const auth = await import('/firebase-auth.js');
      await auth.checkContactAvailability({ email: value });
      await auth.requestEmailChange(value);
      pendingEmailChange = value;
      sessionStorage.setItem('cs-pending-email-change', value);
      document.querySelector('#refresh-email-change').hidden = false;
      emailStatus.textContent = L(
        'أرسلنا رابط التأكيد إلى البريد الجديد. لن يتغير بريد الحساب قبل فتح الرابط.',
        'A verification link was sent to the new email. Your account will keep the current email until the link is opened.',
      );
    } catch (error) {
      const message =
        error.status === 409 || /already|in use|exists/i.test(error.message)
          ? L(
              'البريد الإلكتروني مسجل بالفعل لحساب آخر.',
              'That email is already registered to another account.',
            )
          : error.message;
      emailStatus.textContent = message;
      emailButton.disabled = false;
    }
  });
  document.querySelector('#refresh-email-change')?.addEventListener('click', async (event) => {
    const button = event.currentTarget;
    button.disabled = true;
    try {
      const auth = await import('/firebase-auth.js'),
        user = await auth.refreshCurrentUser();
      if (!pendingEmailChange || user.email?.toLowerCase() !== pendingEmailChange)
        throw Error(
          L(
            'افتح رابط تأكيد البريد الجديد أولًا ثم ارجع هنا.',
            'Open the new email verification link first, then return here.',
          ),
        );
      const p = profile(),
        saved = await auth.persistProfile({
          name: p.name,
          firstName: p.firstName || '',
          fatherName: p.fatherName || '',
          lastName: p.lastName || '',
          gender: p.gender,
          picture: p.picture,
        });
      saveProfile({
        ...saved,
        email: user.email || '',
        phone: user.phoneNumber || '',
      });
      pendingEmailChange = '';
      sessionStorage.removeItem('cs-pending-email-change');
      showToast(
        saved.notificationSent
          ? L(
              'تم تأكيد البريد وإرسال تحديث الملف إلى الإدارة.',
              'Email verified and the profile update was emailed to the administrator.',
            )
          : L(
              'تم تأكيد البريد، لكن تعذر إرسال إشعار الإدارة.',
              'Email verified, but the administrator email notice could not be sent.',
            ),
      );
      render();
    } catch (error) {
      emailStatus.textContent =
        error.message || L('لم نعثر على تأكيد للبريد الجديد.', 'The new email has not been verified yet.');
    } finally {
      button.disabled = false;
    }
  });
  const updatePhoneButton = () => {
    if (!phoneButton) return;
    const valid = !!normalizedPhone() && normalizedPhone() !== profile().phone;
    phoneButton.hidden = !valid;
    phoneButton.disabled = !valid;
  };
  phoneInput?.addEventListener('input', updatePhoneButton);
  phoneCountry?.addEventListener('change', updatePhoneButton);
  phoneButton?.addEventListener('click', async () => {
    const phone = normalizedPhone();
    if (!phone) return;
    phoneButton.disabled = true;
    phoneStatus.textContent = '';
    try {
      const auth = await import('/firebase-auth.js');
      await auth.checkContactAvailability({ phone });
      phoneVerification = await auth.startPhoneUpdate(
        phone,
        document.querySelector('#firebase-phone-update-recaptcha'),
      );
      document.querySelector('#phone-change-code-area').hidden = false;
      phoneInput.readOnly = true;
      phoneCountry.disabled = true;
      phoneStatus.textContent = L(
        'أرسلنا كود SMS. أدخله لتأكيد الرقم.',
        'An SMS code was sent. Enter it to verify the number.',
      );
    } catch (error) {
      phoneStatus.textContent =
        error.status === 409 || /already|in use|exists/i.test(error.message)
          ? L('رقم الهاتف مسجل بالفعل لحساب آخر.', 'That phone number is already linked to another account.')
          : error.message;
      phoneButton.disabled = false;
    }
  });
  document.querySelector('#confirm-phone-change')?.addEventListener('click', async (event) => {
    const button = event.currentTarget,
      code = document.querySelector('#phone-change-code').value.trim();
    button.disabled = true;
    try {
      if (!phoneVerification) throw Error(L('اطلب كود التحقق أولًا.', 'Request the code first.'));
      const auth = await import('/firebase-auth.js'),
        user = await auth.finishPhoneUpdate(phoneVerification.verificationId, code),
        p = profile(),
        saved = await auth.persistProfile({
          name: p.name,
          firstName: p.firstName || '',
          fatherName: p.fatherName || '',
          lastName: p.lastName || '',
          gender: p.gender,
          picture: p.picture,
        });
      saveProfile({
        ...saved,
        email: user.email || '',
        phone: user.phoneNumber || '',
      });
      showToast(
        saved.notificationSent
          ? L('تم تأكيد الهاتف وإرسال التحديث للإدارة.', 'Phone verified and the profile update was emailed.')
          : L(
              'تم تأكيد الهاتف، لكن تعذر إرسال إشعار الإدارة.',
              'Phone verified, but the administrator email notice could not be sent.',
            ),
      );
      render();
    } catch (error) {
      phoneStatus.textContent = /already|in use|exists/i.test(error.message)
        ? L('رقم الهاتف مسجل بالفعل لحساب آخر.', 'That phone number is already linked to another account.')
        : error.message;
      button.disabled = false;
    }
  });
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const error = form.querySelector('.form-error'),
      button = form.querySelector('[type="submit"]'),
      fd = new FormData(form),
      old = profile(),
      firstName = String(fd.get('firstName') || '').trim(),
      fatherName = String(fd.get('fatherName') || '').trim(),
      lastName = String(fd.get('lastName') || '').trim(),
      payload = {
        name: [firstName, fatherName, lastName].filter(Boolean).join(' '),
        firstName,
        fatherName,
        lastName,
        gender: String(fd.get('gender') || ''),
        picture: String(fd.get('picture') || ''),
      };
    if (!firstName || !fatherName || !lastName || !['male', 'female', 'other'].includes(payload.gender)) {
      error.textContent = t('invalidProfile');
      return;
    }
    error.textContent = '';
    button.disabled = true;
    button.classList.add('is-loading');
    try {
      const auth = await import('/firebase-auth.js'),
        saved = await auth.persistProfile(payload),
        user = await auth.refreshCurrentUser();
      saveProfile({
        ...saved,
        email: user.email || saved.email || '',
        phone: user.phoneNumber || saved.phone || '',
      });
      render();
      showToast(
        saved.notificationSent
          ? L(
              'تم حفظ البيانات وإرسال التحديث للإدارة.',
              'Profile saved and update emailed to the administrator.',
            )
          : L(
              'تم حفظ الملف لكن تعذر إرسال إشعار البريد.',
              'Profile saved, but the email notice could not be sent.',
            ),
      );
    } catch (err) {
      error.textContent = err.message || t('updateError');
      button.disabled = false;
      button.classList.remove('is-loading');
    }
  });
}
function showToast(message) {
  document.querySelector('.toast')?.remove();
  const node = document.createElement('div');
  node.className = 'toast';
  node.setAttribute('role', 'status');
  node.textContent = message;
  document.body.append(node);
  setTimeout(() => node.remove(), 3200);
}
function shell(content) {
  return `<div class="shell">${header()}<div class="dhikr-wrap">${dhikrStrip()}</div><div class="content">${banner()}<div id="page" class="page-transition" tabindex="-1">${content}</div></div>${footer()}</div>`;
}
function render() {
  startDhikrRotation();
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  applyTheme();
  const p = currentPath();
  if (p === '/admin') return;
  const content =
    p === '/'
      ? home()
      : p === '/subjects'
        ? collection('subjects', t('subjectsTitle'), t('subjectsDesc'))
        : p === '/lectures'
          ? collection('lectures', t('filesTitle'), t('lecturesDesc'), true)
          : p === '/advising'
            ? collection('advising', t('advisingTitle'), t('advisory'))
            : p === '/official'
              ? collection('official', t('officialTitle'), t('officialDesc'))
              : p === '/developer'
                ? developer()
                : p === '/profile'
                  ? profilePage()
                  : notFound();
  const titles = {
    '/': '',
    '/subjects': t('subjectsTitle'),
    '/lectures': t('filesTitle'),
    '/advising': t('advisingTitle'),
    '/official': t('officialTitle'),
    '/developer': t('developer'),
    '/profile': t('profile'),
  };
  const pageTitle = p in titles ? titles[p] : t('pageMissing');
  document.title = `${pageTitle ? `${pageTitle} · ` : ''}Capital Science — ${lang === 'ar' ? 'كلية العلوم' : 'Faculty of Science'}`;
  const skip = document.querySelector('.skip-to-content');
  if (skip) skip.textContent = lang === 'ar' ? 'تخطي إلى المحتوى' : 'Skip to content';
  // The menu backdrop lives on <body>, which render() does not rebuild; clear it on every page change.
  document.body.classList.remove('menu-open');
  app.innerHTML = shell(content);
  document.querySelectorAll('[data-route]').forEach((a) =>
    a.addEventListener('click', (e) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
      e.preventDefault();
      navigate(a.dataset.route);
    }),
  );
  document.querySelector('#lang').onclick = () => {
    lang = lang === 'ar' ? 'en' : 'ar';
    localStorage.setItem('cs-lang', lang);
    transition(render);
  };
  document.querySelector('#theme').onclick = () => {
    toggleTheme();
    render();
    document.querySelector('#theme')?.focus();
  };
  const menuButton = document.querySelector('#mobile-menu'),
    nav = document.querySelector('.nav');
  const setMenu = (open) => {
    nav.classList.toggle('nav-open', open);
    document.body.classList.toggle('menu-open', open);
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.setAttribute('aria-label', open ? t('closeMenu') : t('menu'));
    menuButton.innerHTML = icon(open ? 'close' : 'menu');
  };
  menuButton.onclick = (e) => {
    e.stopPropagation();
    setMenu(!nav.classList.contains('nav-open'));
  };
  // A tap anywhere outside the open menu closes it.
  document.onclick = (e) => {
    if (nav.classList.contains('nav-open') && !nav.contains(e.target)) setMenu(false);
  };
  nav.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      setMenu(false);
      menuButton.focus();
    }
  });
  if (p === '/profile') wireProfile();
  else if (p === '/lectures') wireLectureFilters();
  else wireFilters();
  observe();
}
function setActiveFilter(button) {
  document.querySelectorAll('.filter').forEach((b) => {
    b.classList.toggle('active', b === button);
    b.setAttribute('aria-pressed', String(b === button));
  });
}
function wireFilters() {
  const search = document.querySelector('#search'),
    cards = document.querySelectorAll('.group-card'),
    empty = document.querySelector('#no-results');
  let filter = 'all';
  function apply() {
    const q = (search?.value || '').trim().toLocaleLowerCase();
    let shown = 0;
    cards.forEach((c) => {
      // Compare the raw category stored on the card, not its translated label, so filters work in both languages.
      const match =
        (filter === 'all' || c.dataset.category === filter) && c.textContent.toLocaleLowerCase().includes(q);
      c.classList.toggle('hidden', !match);
      if (match) shown++;
    });
    if (empty) empty.hidden = shown > 0;
  }
  document.querySelectorAll('.filter').forEach(
    (b) =>
      (b.onclick = () => {
        setActiveFilter(b);
        filter = b.dataset.filter;
        apply();
      }),
  );
  search?.addEventListener('input', apply);
}
function driveTitle(x) {
  return lang === 'ar' ? x.title || x.titleAr || x.titleEn : x.titleEn || x.title || x.titleAr;
}
function drivePath(item) {
  return (item.note || '')
    .split(/\s*›\s*/)
    .filter((x) => x && x !== 'المجلد الرئيسي' && x !== 'Year root' && x !== 'مجلد السنة');
}
function driveHierarchy(items) {
  const nodes = items.map((item, index) => ({
      item,
      index,
      parent: null,
      children: [],
    })),
    folders = nodes.filter((n) => n.item.type === 'folder'),
    roots = folders.filter((n) => n.item.note === 'المجلد الرئيسي' || n.item.note === 'Year root');
  const norm = (s) =>
    String(s || '')
      .trim()
      .toLocaleLowerCase();
  // Catalog rows crawled from Drive carry the parent folder ID; use it directly when present.
  const folderById = new Map(
    folders.map((f) => [f.item.id || String(f.item.url || '').match(/folders\/([\w-]+)/)?.[1], f]),
  );
  for (const node of nodes) {
    const byId = node.item.parentId && folderById.get(node.item.parentId);
    if (byId && byId !== node) {
      node.parent = byId;
      byId.children.push(node);
      continue;
    }
    const raw = node.item.note || '';
    if (!raw || raw === 'المجلد الرئيسي' || raw === 'Year root') continue;
    const parts = drivePath(node.item),
      parentName = parts.at(-1) || raw,
      expected = parts.slice(0, -1).map(norm).join('›');
    let candidates = folders.filter(
      (f) =>
        f !== node &&
        f.item.category === node.item.category &&
        [f.item.title, f.item.titleAr, f.item.titleEn].some((title) => norm(title) === norm(parentName)),
    );
    const exact = candidates.filter((f) => drivePath(f.item).map(norm).join('›') === expected);
    if (exact.length) candidates = exact;
    if (!candidates.length && (raw === 'مجلد السنة' || raw === 'داخل مجلد السنة'))
      candidates = roots.filter((f) => f.item.category === node.item.category);
    let parent =
      candidates.filter((f) => f.index < node.index).at(-1) ||
      candidates[0] ||
      roots.find((f) => f.item.category === node.item.category);
    if (parent && parent !== node) {
      node.parent = parent;
      parent.children.push(node);
    }
  }
  return { nodes, roots };
}
function driveFolderCard(node) {
  const item = node.item,
    title = driveTitle(item);
  return `<button class="drive-entry drive-folder-entry reveal" type="button" data-folder-index="${node.index}"><span class="drive-entry-icon">${icon('folder')}</span><span class="drive-entry-copy"><b>${esc(title)}</b><small>${fmt(node.children.length)} ${lang === 'ar' ? 'عنصر داخل المجلد' : 'items inside'}</small></span>${icon('chevron', 'drive-entry-arrow')}</button>`;
}
function driveCrumbs(node, nodes) {
  const chain = [];
  for (let n = node; n; n = n.parent) chain.unshift(n);
  return `<div class="drive-breadcrumbs"><button type="button" data-folder-index="root">${lang === 'ar' ? 'كل السنوات' : 'All years'}</button>${chain.map((n) => `${icon('chevron', 'crumb-sep')}<button type="button" data-folder-index="${n.index}">${esc(driveTitle(n.item))}</button>`).join('')}</div>`;
}
function wireLectureFilters() {
  const items = db.driveFiles || db.lectures || [],
    tree = document.querySelector('#drive-tree'),
    search = document.querySelector('#search');
  let filter = 'all',
    query = '',
    current = 'root';
  const hierarchy = driveHierarchy(items);
  function draw() {
    const selected = hierarchy.nodes.filter((n) => filter === 'all' || n.item.category === filter),
      q = query.trim().toLocaleLowerCase();
    let parent = current === 'root' ? null : hierarchy.nodes[Number(current)];
    if (parent && filter !== 'all' && parent.item.category !== filter) {
      parent = null;
      current = 'root';
    }
    // Folders first, then files, keeping Drive's own order inside each group.
    let entries = (parent ? parent.children : selected.filter((n) => !n.parent)).slice().sort(
      (x, y) =>
        (y.item.type === 'folder') - (x.item.type === 'folder') ||
        // Year roots always appear oldest first: 2024/2025, 2025/2026, 2026/2027.
        (parent ? 0 : String(x.item.category).localeCompare(String(y.item.category))),
    );
    if (q)
      entries = hierarchy.nodes.filter(
        (n) =>
          (filter === 'all' || n.item.category === filter) &&
          `${n.item.title || ''} ${n.item.titleAr || ''} ${n.item.titleEn || ''} ${n.item.note || ''} ${n.item.category || ''}`
            .toLocaleLowerCase()
            .includes(q),
      );
    // Searching 2,000+ catalog rows can match hundreds of cards; render the first batch to stay responsive.
    const total = entries.length,
      limit = 120;
    if (q && total > limit) entries = entries.slice(0, limit);
    const searchNote = q
      ? `<p class="search-count" role="status">${lang === 'ar' ? `${fmt(total)} نتيجة${total > limit ? ` · يظهر أول ${fmt(limit)}، دقّق البحث للمزيد` : ''}` : `${fmt(total)} results${total > limit ? ` · showing the first ${fmt(limit)}, refine your search` : ''}`}</p>`
      : '';
    const crumb = (parent ? driveCrumbs(parent, hierarchy.nodes) : '') + searchNote;
    tree.innerHTML = `${crumb}${parent ? `<div class="drive-current"><span>${lang === 'ar' ? 'محتويات المجلد' : 'Folder contents'}</span><a href="${safeHref(parent.item.url)}" target="_blank" rel="noopener noreferrer">${t('browseDrive')} ${icon('arrow')}</a></div>` : ''}<div class="drive-browser-grid">${entries.map((n) => (n.item.type === 'folder' ? driveFolderCard(n) : card(n.item, n.index))).join('') || `<div class="empty-state compact">${q ? t('noResults') : lang === 'ar' ? 'هذا المجلد فارغ.' : 'This folder is empty.'}</div>`}</div>`;
    observe();
  }
  tree.addEventListener('click', (e) => {
    const button = e.target.closest('[data-folder-index]');
    if (!button) return;
    current = button.dataset.folderIndex;
    if (query) {
      query = '';
      search.value = '';
    }
    draw();
  });
  document.querySelectorAll('.filter').forEach(
    (b) =>
      (b.onclick = () => {
        setActiveFilter(b);
        filter = b.dataset.filter;
        current = 'root';
        draw();
      }),
  );
  let searchTimer;
  search?.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      query = search.value;
      draw();
    }, 140);
  });
  draw();
}
function observe() {
  document.documentElement.classList.toggle('can-animate', document.visibilityState === 'visible');
  const io = new IntersectionObserver(
    (es) =>
      es.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add('visible');
          io.unobserve(e.target);
        }
      }),
    { threshold: 0.08 },
  );
  document.querySelectorAll('.reveal').forEach((e) => io.observe(e));
  // SVG motion paths ignore CSS media queries, so stop the orbiting electrons explicitly.
  if (reduceMotion()) document.querySelectorAll('.atom svg').forEach((svg) => svg.pauseAnimations?.());
}
function verifyProfilePersistence() {
  try {
    const profile = getProfile();
    if (!profile) {
      document.cookie = 'cs_profile=; path=/; max-age=0; samesite=lax';
      document.documentElement.dataset.profilePersistence = 'guest-no-cookie';
      return;
    }
    const raw = document.cookie
      .split('; ')
      .find((x) => x.startsWith('cs_profile='))
      ?.slice('cs_profile='.length);
    const saved = raw ? JSON.parse(decodeURIComponent(raw)) : null;
    document.documentElement.dataset.profilePersistence =
      saved?.registered === true ? 'verified' : 'incomplete';
  } catch {
    document.cookie = 'cs_profile=; path=/; max-age=0; samesite=lax';
    document.documentElement.dataset.profilePersistence = 'guest-no-cookie';
  }
}
function generatedAvatar(gender) {
  const palettes = {
    male: ['#294f42', '#93b49b', '#e9c48f'],
    female: ['#714d65', '#cf9cad', '#eacb9d'],
    other: ['#455b82', '#8fa8cb', '#edc788'],
  };
  const [coat, accent, skin] = palettes[gender] || palettes.other;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160"><defs><linearGradient id="a" x2="1" y2="1"><stop stop-color="${accent}"/><stop offset="1" stop-color="#f2eadb"/></linearGradient></defs><rect width="160" height="160" rx="80" fill="url(#a)"/><circle cx="80" cy="67" r="31" fill="${skin}"/><path d="M48 63c1-33 63-42 65 1-12-8-19-21-20-26-9 12-25 21-45 25Z" fill="${coat}"/><path d="M30 160c2-39 22-57 50-57s49 18 51 57" fill="${coat}"/><path d="M66 86q14 10 28 0" fill="none" stroke="#805c50" stroke-width="2" stroke-linecap="round"/><circle cx="68" cy="69" r="2" fill="#453c39"/><circle cx="92" cy="69" r="2" fill="#453c39"/></svg>`;
  return 'data:image/svg+xml,' + encodeURIComponent(svg);
}
function onboarding(force = false, legacyProfile = null) {
  // An email sign-in link must always reopen the flow, even for a visitor who chose guest mode earlier.
  const signInLink = new URLSearchParams(location.search).get('mode') === 'signIn';
  if (!force && !signInLink && (getProfile() || sessionStorage.getItem('cs-guest'))) return;
  const ov = document.createElement('div');
  ov.className = 'onboarding';
  ov.setAttribute('role', 'dialog');
  ov.setAttribute('aria-modal', 'true');
  ov.setAttribute('aria-label', lang === 'ar' ? 'الدخول إلى Capital Science' : 'Join Capital Science');
  ov.innerHTML = `<div class="onboard-left">${brand()}<div class="onboard-decoration" aria-hidden="true">${atom('small')}<p>${lang === 'ar' ? 'كل يوم بداية<br>اكتشاف جديد' : 'Every day, a new<br>discovery begins'}</p></div><span class="onboard-foot">A STUDENT COMMONS · EST 2026</span></div><div class="onboard-main"><button class="onboard-close" id="skip" aria-label="${lang === 'ar' ? 'إغلاق' : 'Close'}">${icon('close')}</button><div class="onboard-step" id="step"><span class="section-index">A SPACE FOR YOUR NEXT CHAPTER</span><h1>${t('welcome')},<br><em>curious mind.</em></h1><p>${t('intro')}</p><button class="button primary" id="begin">${t('continue')} ${icon('arrow')}</button><button class="skip-link" id="guest">${t('skip')}</button></div></div>`;
  document.body.append(ov);
  const step = ov.querySelector('#step'),
    L = (ar, en) => (lang === 'ar' ? ar : en),
    errNode = () => ov.querySelector('#form-error');
  let method = '',
    email = '',
    phoneConfirmation = null,
    authUser = null,
    profileDraft = null;
  const fadeTo = (html) =>
    new Promise((resolve) => {
      step.classList.add('step-leave');
      setTimeout(() => {
        step.innerHTML = html;
        step.classList.remove('step-leave');
        step.classList.add('step-enter');
        requestAnimationFrame(() => step.classList.add('step-ready'));
        setTimeout(() => {
          step.classList.remove('step-enter', 'step-ready');
          resolve();
        }, 520);
      }, 220);
    });
  const closeOverlay = () => {
    ov.classList.add('out');
    setTimeout(() => ov.remove(), 520);
  };
  const guest = () => {
    sessionStorage.setItem('cs-guest', '1');
    closeOverlay();
  };
  ov.querySelector('#skip').onclick = guest;
  ov.querySelector('#guest').onclick = guest;
  const showError = (message) => {
    const node = errNode();
    if (node) node.textContent = message;
  };
  const readableAuthError = (error) => {
    const messages = {
      'auth/invalid-credential': L(
        'البريد أو كلمة المرور غير صحيحين. راجع البيانات أو استخدم استعادة كلمة المرور.',
        'Email or password is incorrect. Check your details or reset your password.',
      ),
      'auth/wrong-password': L(
        'كلمة المرور غير صحيحة. راجعها أو استخدم استعادة كلمة المرور.',
        'That password is incorrect. Check it or reset your password.',
      ),
      'auth/user-not-found': L(
        'لا يوجد حساب بهذا البريد. ارجع واختر إنشاء حساب جديد.',
        'No account was found for this email. Go back and create an account.',
      ),
      'auth/email-not-verified': L(
        'الحساب يحتاج تأكيد البريد. أرسلنا رسالة تحقق جديدة؛ افتحها ثم سجّل الدخول.',
        'Your email must be verified. We sent a new verification email; open it, then sign in.',
      ),
      'auth/too-many-requests': L(
        'محاولات كثيرة. انتظر قليلًا ثم حاول مرة أخرى.',
        'Too many attempts. Wait a little, then try again.',
      ),
      'auth/user-disabled': L(
        'هذا الحساب موقوف. تواصل مع إدارة الموقع.',
        'This account is disabled. Contact the site administrator.',
      ),
      'auth/network-request-failed': L(
        'تعذر الاتصال. تحقق من الإنترنت وحاول مجددًا.',
        'Could not connect. Check your internet and try again.',
      ),
      'auth/billing-not-enabled': L(
        'التسجيل برقم الهاتف مش متاح حاليًا. سجّل بالبريد الإلكتروني أو حساب Google.',
        'Phone sign-in is not available right now. Use your email or Google account.',
      ),
      'auth/operation-not-allowed': L(
        'تسجيل الدخول بالبريد وكلمة المرور غير مفعّل في Firebase.',
        'Email and password sign-in is disabled in Firebase.',
      ),
    };
    return (
      messages[error?.code] ||
      error?.message ||
      L(
        'تعذر تسجيل الدخول. راجع البريد وكلمة المرور أو أعد تعيينها.',
        'Could not sign in. Check your email and password or reset it.',
      )
    );
  };
  const showMethod = async () => {
    method = '';
    email = '';
    phoneConfirmation = null;
    authUser = null;
    await fadeTo(
      `<span class="section-index">${L('خطوة ١ · طريقة الدخول', 'STEP 1 · SIGN-IN METHOD')}</span><h1>${L('اختار طريقة التسجيل', 'Choose how to continue')}</h1><p>${phoneAuthEnabled ? L('اكتب بريدك أو رقمك، أو استخدم حساب Google. كل مرة هنطلب منك خطوة واحدة.', 'Use your email, phone number, or Google. We will guide you one step at a time.') : L('سجّل ببريدك الإلكتروني أو بحساب Google. كل مرة هنطلب منك خطوة واحدة.', 'Use your email or Google account. We will guide you one step at a time.')}</p><p class="form-error" aria-live="polite">${firebaseEnabled ? '' : t('firebaseNotice')}</p><div class="auth-choice-grid"><button class="auth-choice" data-method="email" ${firebaseEnabled ? '' : 'disabled'}><span>${icon('mail')}</span><b>${L('البريد الإلكتروني', 'Email')}</b><small>${L('رابط تأكيد آمن من Firebase', 'Secure Firebase verification link')}</small></button>${phoneAuthEnabled ? `<button class="auth-choice" data-method="phone" ${firebaseEnabled ? '' : 'disabled'}><span>${icon('phone')}</span><b>${L('رقم الهاتف', 'Phone number')}</b><small>${L('تحقق برسالة SMS', 'Verify by SMS')}</small></button>` : ''}<button class="auth-choice" data-method="google" ${firebaseEnabled ? '' : 'disabled'}><span>G</span><b>${L('حساب Google', 'Google account')}</b><small>${L('الاسم والبريد من حسابك', 'Use your Google name and email')}</small></button></div><p class="form-error" id="form-error" aria-live="polite"></p><button class="skip-link" id="back-welcome">${L('رجوع', 'Back')}</button>`,
    );
    step.querySelectorAll('[data-method]').forEach(
      (button) =>
        (button.onclick = () => {
          method = button.dataset.method;
          if (method === 'google') continueGoogle();
          else method === 'email' ? showEmail() : showPhone();
        }),
    );
    step.querySelector('#back-welcome').onclick = showIntro;
  };
  const showIntro = async () => {
    await fadeTo(
      `<span class="section-index">A SPACE FOR YOUR NEXT CHAPTER</span><h1>${t('welcome')},<br><em>curious mind.</em></h1><p>${t('intro')}</p><button class="button primary" id="begin">${t('continue')} ${icon('arrow')}</button><button class="skip-link" id="guest">${t('skip')}</button>`,
    );
    step.querySelector('#begin').onclick = showMethod;
    step.querySelector('#guest').onclick = guest;
  };
  const showExistingPassword = async () => {
    await fadeTo(
      `<span class="section-index">${L('حساب موجود', 'EXISTING ACCOUNT')}</span><h1>${L('أهلًا بعودتك', 'Welcome back')}</h1><p>${L('هذا البريد مرتبط بحساب بالفعل. سجّل الدخول بكلمة المرور أو استعدها من بريدك.', 'This email already has an account. Sign in with your password or reset it using your email.')}</p><form id="login-form"><label>${L('البريد الإلكتروني', 'Email')}<input name="email" type="email" value="${attr(email)}" readonly></label><label>${t('authPassword')}<input name="password" type="password" required autocomplete="current-password"></label><p class="form-error" id="form-error" aria-live="polite"></p><button class="button primary" type="submit">${L('تسجيل الدخول', 'Sign in')} ${icon('arrow')}</button></form><button class="skip-link" id="reset-password">${L('نسيت كلمة المرور؟ أرسل رابط استعادة', 'Forgot your password? Send a reset link')}</button><button class="skip-link" id="email-link-login">${L('الدخول برابط البريد بدل كلمة المرور', 'Sign in with an email link instead')}</button><button class="skip-link" id="back-method">${L('استخدم بريدًا أو طريقة أخرى', 'Use another email or method')}</button>`,
    );
    step.querySelector('#email-link-login').onclick = async () => {
      const button = step.querySelector('#email-link-login');
      button.disabled = true;
      try {
        const auth = await import('/firebase-auth.js');
        await auth.sendEmailSignInLink(email);
        showEmailLinkSent();
      } catch (error) {
        showError(readableAuthError(error));
        button.disabled = false;
      }
    };
    step.querySelector('#reset-password').onclick = async () => {
      const button = step.querySelector('#reset-password');
      button.disabled = true;
      try {
        const auth = await import('/firebase-auth.js');
        await auth.sendPasswordReset(email);
        showError(
          L(
            'لو كان لهذا البريد حساب، هتوصلك رسالة فيها رابط آمن لاختيار كلمة مرور جديدة. افحص الوارد والرسائل غير المرغوب فيها.',
            'If an account exists for this email, a secure password-reset link is on its way. Check your inbox and spam folder.',
          ),
        );
        button.textContent = L('تم طلب رابط الاستعادة', 'Reset link requested');
      } catch (error) {
        showError(readableAuthError(error));
        button.disabled = false;
      }
    };
    step.querySelector('#back-method').onclick = showMethod;
    step.querySelector('#login-form').onsubmit = async (e) => {
      e.preventDefault();
      // Read the form before any await: e.currentTarget is null once the event has finished dispatching.
      const form = e.currentTarget,
        button = form.querySelector('[type=submit]'),
        password = form.elements.password.value;
      button.disabled = true;
      try {
        const auth = await import('/firebase-auth.js'),
          user = await auth.signInEmail(email, password);
        // A verified account without a saved profile continues to the details step instead of failing.
        await completeExisting(user, true);
      } catch (error) {
        showError(readableAuthError(error));
        button.disabled = false;
      }
    };
  };
  const continueEmail = async () => {
    const value = step.querySelector('[name=email]').value.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(value)) {
      showError(L('اكتب بريدًا إلكترونيًا صحيحًا.', 'Enter a valid email address.'));
      return;
    }
    email = value;
    const button = step.querySelector('#email-continue');
    button.disabled = true;
    button.classList.add('is-loading');
    try {
      const auth = await import('/firebase-auth.js');
      if (await auth.checkEmailExists(email)) {
        showExistingPassword();
        return;
      }
      await auth.sendEmailSignInLink(email);
      showEmailLinkSent();
    } catch (error) {
      if (error.status === 409 || /already linked|already in use|already exists/i.test(error.message)) {
        showExistingPassword();
        showToast(L('البريد مرتبط بحساب بالفعل.', 'That email already has an account.'));
      } else {
        showError(error.message || L('تعذر إرسال رابط التأكيد.', 'Could not send the verification link.'));
        button.disabled = false;
        button.classList.remove('is-loading');
      }
    }
  };
  const showEmail = async () => {
    method = 'email';
    await fadeTo(
      `<span class="section-index">${L('البريد · تحقق ١/٢', 'EMAIL · VERIFY 1/2')}</span><h1>${L('اكتب بريدك', 'Enter your email')}</h1><p>${L('هنرسل رابط تأكيد آمن من Firebase. افتحه لإثبات ملكية بريدك، وبعدها أنشئ كلمة المرور. البريد المرتبط بحساب سيحوّلك لتسجيل الدخول.', 'Firebase will send a secure sign-in link. Open it to verify your email, then create a password. Existing accounts will be sent to sign in.')}</p><form id="email-form"><label>${L('البريد الإلكتروني', 'Email address')}<input name="email" type="email" inputmode="email" autocomplete="email" required placeholder="name@example.com" value="${attr(email)}"></label><p class="form-error" id="form-error" aria-live="polite"></p><button id="email-continue" class="button primary" type="submit">${t('continue')} ${icon('arrow')}</button></form><button class="skip-link" id="back-method">${L('رجوع لطرق التسجيل', 'Back to sign-in options')}</button>`,
    );
    step.querySelector('#email-form').onsubmit = (e) => {
      e.preventDefault();
      continueEmail();
    };
    step.querySelector('#back-method').onclick = showMethod;
  };
  const showEmailLinkSent = async () => {
    await fadeTo(
      `<span class="section-index">${L('تحقق من بريدك', 'CHECK YOUR EMAIL')}</span><h1>${L('افتح رابط التأكيد', 'Open the verification link')}</h1><p>${L('أرسلنا رابط تسجيل آمن إلى', 'A secure sign-in link was sent to')} <b>${esc(email)}</b>. ${L('افتحه في هذا المتصفح؛ ستنتقل تلقائيًا لإكمال التسجيل.', 'Open it in this browser to continue your registration.')}</p><button class="button primary" id="resend-link">${L('إعادة إرسال الرابط', 'Resend link')} ${icon('arrow')}</button><p class="form-error" id="form-error" aria-live="polite"></p><button class="skip-link" id="change-email">${L('استخدم بريدًا آخر', 'Use another email')}</button>`,
    );
    step.querySelector('#resend-link').onclick = () => {
      showEmail().then(() => {
        step.querySelector('[name=email]').value = email;
        continueEmail();
      });
    };
    step.querySelector('#change-email').onclick = showEmail;
  };
  const showEmailLinkCompletion = async () => {
    method = 'email';
    const savedEmail = sessionStorage.getItem('cs-pending-email-link') || '';
    email = savedEmail;
    await fadeTo(
      `<span class="section-index">${L('تأكيد البريد', 'VERIFY YOUR EMAIL')}</span><h1>${L('أكمل تسجيل الدخول', 'Complete sign-in')}</h1><p>${L('لأمان حسابك، اكتب نفس البريد الذي طلبت عليه رابط التأكيد.', 'For account security, enter the same email address that received the link.')}</p><form id="email-link-form"><label>${L('البريد الإلكتروني', 'Email address')}<input name="email" type="email" inputmode="email" autocomplete="email" required value="${attr(email)}" placeholder="name@example.com"></label><p class="form-error" id="form-error" aria-live="polite"></p><button class="button primary" type="submit">${L('تأكيد ومتابعة', 'Verify and continue')} ${icon('arrow')}</button></form>`,
    );
    step.querySelector('#email-link-form').onsubmit = async (e) => {
      e.preventDefault();
      email = e.currentTarget.elements.email.value.trim().toLowerCase();
      const button = e.currentTarget.querySelector('[type=submit]');
      button.disabled = true;
      try {
        const auth = await import('/firebase-auth.js');
        authUser = await auth.completeEmailSignInLink(email);
        history.replaceState({}, '', '/profile');
        const existing = await auth.loadProfile();
        if (existing) {
          saveProfile({
            ...existing,
            email: existing.email || authUser.email || '',
            phone: existing.phone || authUser.phoneNumber || '',
          });
          await showSuccess(
            L('أهلًا بعودتك!', 'Welcome back!'),
            L('تم تسجيل دخولك إلى حسابك.', 'You are signed in to your account.'),
          );
          return;
        }
        profileDraft = {
          firstName: '',
          fatherName: '',
          lastName: '',
          email,
          phone: '',
          passwordNeeded: true,
        };
        await showPassword();
      } catch (error) {
        showError(
          error.message ||
            L(
              'تعذر تأكيد الرابط. افتحه من الرسالة نفسها ثم أعد المحاولة.',
              'Could not verify the link. Open it from the email and try again.',
            ),
        );
        button.disabled = false;
      }
    };
  };
  const showPassword = async () => {
    await fadeTo(
      `<span class="section-index">${L('تم التحقق · كلمة المرور', 'VERIFIED · PASSWORD')}</span><h1>${L('أنشئ كلمة مرور', 'Create a password')}</h1><p>${L('اختر كلمة مرور لحماية حسابك. المثال للتوضيح فقط؛ لا تستخدمه كما هو.', 'Choose a password for your account. The example is only a reference; do not use it as-is.')}</p><form id="password-form"><label>${L('كلمة المرور', 'Password')}<input name="password" type="password" minlength="8" autocomplete="new-password" required placeholder="${L('مثال: Ahmed1234', 'Example: Ahmed1234')}"></label><label>${L('تأكيد كلمة المرور', 'Confirm password')}<input name="confirmPassword" type="password" minlength="8" autocomplete="new-password" required></label><p class="form-error" id="form-error" aria-live="polite"></p><button class="button primary" type="submit">${L('متابعة', 'Continue')} ${icon('arrow')}</button></form>`,
    );
    step.querySelector('#password-form').onsubmit = (e) => {
      e.preventDefault();
      const f = new FormData(e.currentTarget),
        password = String(f.get('password') || ''),
        confirmation = String(f.get('confirmPassword') || '');
      if (password.length < 8 || password !== confirmation) {
        showError(
          password.length < 8
            ? L('كلمة المرور يجب ألا تقل عن ٨ أحرف.', 'Use at least 8 characters.')
            : L('كلمتا المرور غير متطابقتين.', 'The passwords do not match.'),
        );
        return;
      }
      profileDraft = { ...profileDraft, password };
      showDetails();
    };
  };
  const phoneCountries = [
    ['مصر', '+20'],
    ['السعودية', '+966'],
    ['الإمارات', '+971'],
    ['الكويت', '+965'],
    ['قطر', '+974'],
    ['الأردن', '+962'],
    ['لبنان', '+961'],
    ['المغرب', '+212'],
    ['تونس', '+216'],
    ['الجزائر', '+213'],
    ['السودان', '+249'],
    ['الولايات المتحدة', '+1'],
    ['المملكة المتحدة', '+44'],
    ['تركيا', '+90'],
  ];
  const normalizePhone = (code, raw) => {
    let digits = String(raw || '').replace(/\D/g, '');
    if (digits.startsWith('00' + code.slice(1))) digits = digits.slice(code.length + 1);
    else if (digits.startsWith(code.slice(1))) digits = digits.slice(code.length - 1);
    if (code === '+20') {
      if (digits.startsWith('0')) digits = digits.slice(1);
      if (!/^1[0125]\d{8}$/.test(digits)) return '';
      return '+20' + digits;
    }
    if (digits.startsWith('0')) digits = digits.slice(1);
    return /^\d{7,14}$/.test(digits) ? code + digits : '';
  };
  const showPhone = async () => {
    method = 'phone';
    await fadeTo(
      `<span class="section-index">${L('الهاتف · تحقق برسالة', 'PHONE · SMS VERIFICATION')}</span><h1>${L('اكتب رقم هاتفك', 'Enter your phone number')}</h1><p>${L('مفتاح مصر +20 محدد تلقائيًا. لن يظهر زر إرسال الكود إلا بعد إدخال رقم صحيح.', 'Egypt +20 is selected by default. The verification button appears only after a valid number is entered.')}</p><form id="phone-form"><label>${L('الدولة ومفتاح الاتصال', 'Country calling code')}<select name="country" autocomplete="tel-country-code">${phoneCountries.map(([name, code]) => `<option value="${code}" ${code === '+20' ? 'selected' : ''}>${lang === 'ar' ? name : { '+20': 'Egypt', '+966': 'Saudi Arabia', '+971': 'UAE', '+965': 'Kuwait', '+974': 'Qatar', '+962': 'Jordan', '+961': 'Lebanon', '+212': 'Morocco', '+216': 'Tunisia', '+213': 'Algeria', '+249': 'Sudan', '+1': 'United States', '+44': 'United Kingdom', '+90': 'Turkey' }[code] || name} (${code})</option>`).join('')}</select></label><label>${L('رقم الهاتف', 'Phone number')}<input name="phone" type="tel" inputmode="tel" autocomplete="tel-national" placeholder="01012345678" required></label><small id="phone-hint" aria-live="polite">${L('أرقام مصر: 010 أو 011 أو 012 أو 015.', 'Egyptian mobile numbers start with 010, 011, 012, or 015.')}</small><div id="firebase-recaptcha"></div><button id="send-phone-code" class="button primary" type="button" hidden disabled>${L('إرسال كود SMS', 'Send SMS code')} ${icon('arrow')}</button><div id="phone-code-area" hidden><label>${L('كود SMS', 'SMS code')}<input name="code" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" placeholder="000000"></label><button id="confirm-phone" class="button primary" type="button">${L('تأكيد الرقم', 'Verify phone')} ${icon('arrow')}</button></div><p class="form-error" id="form-error" aria-live="polite"></p></form><button class="skip-link" id="back-method">${L('رجوع لطرق التسجيل', 'Back to sign-in options')}</button>`,
    );
    const form = step.querySelector('#phone-form'),
      input = form.elements.phone,
      country = form.elements.country,
      send = step.querySelector('#send-phone-code'),
      hint = step.querySelector('#phone-hint');
    const update = () => {
      const valid = !!normalizePhone(country.value, input.value);
      send.hidden = !valid;
      send.disabled = !valid;
      hint.textContent = valid
        ? L('الرقم صحيح، يمكنك طلب كود التحقق.', 'Number looks valid. You can request a verification code.')
        : country.value === '+20'
          ? L(
              'أرقام مصر: 010 أو 011 أو 012 أو 015.',
              'Egyptian mobile numbers start with 010, 011, 012, or 015.',
            )
          : L(
              'أدخل رقمًا صحيحًا مع مفتاح الدولة المحدد.',
              'Enter a valid number for the selected country code.',
            );
    };
    input.addEventListener('input', update);
    country.addEventListener('change', update);
    form.elements.code?.addEventListener('input', () => {});
    step.querySelector('#back-method').onclick = showMethod;
    send.onclick = async () => {
      const full = normalizePhone(country.value, input.value);
      if (!full) {
        update();
        return;
      }
      send.disabled = true;
      try {
        const auth = await import('/firebase-auth.js');
        const result = await auth.startPhoneSignIn(full, step.querySelector('#firebase-recaptcha'));
        phoneConfirmation = result.confirmation;
        step.querySelector('#phone-code-area').hidden = false;
        input.readOnly = true;
        country.disabled = true;
        showToast(L('أرسلنا كود التحقق إلى هاتفك.', 'SMS verification code sent.'));
      } catch (error) {
        const code = error.code || '';
        let message = error.message || L('تعذر إرسال رسالة التحقق.', 'Could not send the SMS code.');
        if (code === 'auth/billing-not-enabled')
          message = L(
            'التسجيل برقم الهاتف مش متاح حاليًا. ارجع واختار البريد الإلكتروني أو حساب Google.',
            'Phone sign-in is not available right now. Go back and use email or Google.',
          );
        else if (code === 'auth/argument-error')
          message = L(
            'تعذر تهيئة اختبار الأمان. أعد تحميل الصفحة ثم حاول مرة أخرى.',
            'Security verification could not initialize. Reload the page and try again.',
          );
        else if (code === 'auth/invalid-phone-number')
          message = L(
            'رقم الهاتف غير صالح. راجع مفتاح الدولة والرقم.',
            'That phone number is invalid. Check the country code and number.',
          );
        else if (code === 'auth/too-many-requests' || code === 'auth/quota-exceeded')
          message = L(
            'وصل التحقق إلى حد الرسائل المتاح حاليًا. حاول لاحقًا.',
            'The current SMS verification limit has been reached. Try again later.',
          );
        else if (code === 'auth/credential-already-in-use' || code === 'auth/phone-number-already-exists')
          message = L(
            'رقم الهاتف مرتبط بحساب بالفعل. استخدم تسجيل الدخول أو رقمًا آخر.',
            'That phone number is already linked to an account. Sign in or use another number.',
          );
        showError(message);
        send.disabled = false;
      }
    };
    step.querySelector('#confirm-phone').onclick = async () => {
      const code = form.elements.code.value.trim(),
        button = step.querySelector('#confirm-phone');
      button.disabled = true;
      try {
        if (!phoneConfirmation) throw Error(L('اطلب كود التحقق أولًا.', 'Request a code first.'));
        const auth = await import('/firebase-auth.js');
        authUser = await auth.confirmPhoneSignIn(phoneConfirmation, code);
        await completeExisting(authUser, true);
      } catch (error) {
        showError(error.message);
        button.disabled = false;
      }
    };
  };
  const completeExisting = async (user, allowNew = false) => {
    const auth = await import('/firebase-auth.js');
    let current = null;
    try {
      current = await auth.loadProfile();
    } catch {}
    if (current) {
      saveProfile({
        ...current,
        email: current.email || user.email || '',
        phone: current.phone || user.phoneNumber || '',
      });
      showSuccess(
        L('أهلًا بعودتك!', 'Welcome back!'),
        L('تم تسجيل دخولك إلى حسابك.', 'You are signed in to your account.'),
      );
      return;
    }
    if (!allowNew && user.emailVerified && method === 'google') {
      authUser = user;
      profileDraft = {
        firstName: (user.displayName || '').split(/\s+/)[0] || '',
        fatherName: '',
        lastName: (user.displayName || '').split(/\s+/).slice(1).join(' '),
        email: user.email || '',
        phone: user.phoneNumber || '',
        passwordNeeded: false,
      };
      showDetails();
      return;
    }
    if (allowNew) {
      authUser = user;
      profileDraft = {
        firstName: '',
        fatherName: '',
        lastName: '',
        email: user.email || '',
        phone: user.phoneNumber || '',
        passwordNeeded: false,
      };
      showDetails();
      return;
    }
    throw Error(
      L(
        'لم نعثر على ملف مرتبط بالحساب. تواصل مع الدعم.',
        'No profile is linked to this account. Contact support.',
      ),
    );
  };
  const continueGoogle = async () => {
    if (!firebaseEnabled) {
      showMethod();
      showError(t('firebaseNotice'));
      return;
    }
    try {
      const auth = await import('/firebase-auth.js');
      authUser = await auth.signInGoogle();
      await completeExisting(authUser, true);
    } catch (error) {
      showMethod();
      showError(
        error.message || L('تعذر تسجيل الدخول باستخدام Google.', 'Google sign-in could not be completed.'),
      );
    }
  };
  const showDetails = async () => {
    const d = profileDraft || {
      firstName: '',
      fatherName: '',
      lastName: '',
      email: email,
      phone: '',
      passwordNeeded: method === 'email',
    };
    await fadeTo(
      `<span class="section-index">${L('الخطوة التالية · بياناتك', 'NEXT · YOUR DETAILS')}</span><h1>${L('عرّفنا بنفسك', 'Tell us about you')}</h1><p>${L('اكتب اسمك الأول واسم الوالد واسم العائلة. كل الأسماء مطلوبة.', 'Enter your first name, father’s name, and family name. All are required.')}</p><form id="details-form"><div class="profile-name-fields"><label>${L('الاسم الأول', 'First name')}<input name="firstName" required maxlength="50" autocomplete="given-name" value="${attr(d.firstName)}"></label><label>${L('اسم الوالد', 'Father’s name')}<input name="fatherName" required maxlength="50" autocomplete="additional-name" value="${attr(d.fatherName)}"></label><label>${L('اسم العائلة', 'Family name')}<input name="lastName" required maxlength="50" autocomplete="family-name" value="${attr(d.lastName)}"></label></div><fieldset class="gender-choice"><legend>${L('الجنس', 'Gender')}</legend>${[
        ['male', L('ذكر', 'Male')],
        ['female', L('أنثى', 'Female')],
        ['other', L('أفضل عدم الإجابة', 'Prefer not to say')],
      ]
        .map(
          ([value, label]) =>
            `<label class="choice-pill"><input type="radio" name="gender" value="${value}" ${d.gender === value ? 'checked' : ''} required><span>${label}</span></label>`,
        )
        .join(
          '',
        )}</fieldset><p class="form-error" id="form-error" aria-live="polite"></p><button class="button primary" type="submit">${L('متابعة إلى الصورة', 'Continue to photo')} ${icon('arrow')}</button></form>`,
    );
    step.querySelector('#details-form').onsubmit = (e) => {
      e.preventDefault();
      const f = new FormData(e.currentTarget),
        first = String(f.get('firstName') || '').trim(),
        father = String(f.get('fatherName') || '').trim(),
        last = String(f.get('lastName') || '').trim(),
        gender = String(f.get('gender') || '');
      if (!first || !father || !last || !['male', 'female', 'other'].includes(gender)) {
        showError(
          L(
            'أكمل الاسم الأول واسم الوالد واسم العائلة والجنس.',
            'Complete your first, father’s, and family names, and select gender.',
          ),
        );
        return;
      }
      profileDraft = {
        ...d,
        firstName: first,
        fatherName: father,
        lastName: last,
        gender,
      };
      showPhoto();
    };
  };
  const showPhoto = async () => {
    const initial = avatarForGender(profileDraft?.gender || 'other');
    await fadeTo(
      `<span class="section-index">${L('الخطوة الأخيرة · صورتك', 'LAST STEP · YOUR PHOTO')}</span><h1>${L('اختر صورتك', 'Choose a profile photo')}</h1><p>${L('اختر رسمة من المجموعة أو ارفع صورة من جهازك. الصورة اختيارية.', 'Choose an illustration or upload a photo. Adding a photo is optional.')}</p><form id="photo-form"><div class="avatar-preview-wrap"><img class="avatar-preview" src="${attr(initial)}" alt="${t('profilePhoto')}"></div><input type="hidden" name="picture" value="${attr(initial)}">${avatarGallery(initial)}<label class="upload-drop">${icon('folder')}<span><b>${t('uploadPhoto')}</b><small>PNG · JPG · WEBP · ${L('لحد 3.5 ميجا', 'up to 3.5 MB')}</small></span><input name="profileFile" type="file" accept="image/png,image/jpeg,image/webp"></label><p class="form-error" id="form-error" aria-live="polite"></p><button class="button primary" type="submit">${L('إنشاء الحساب', 'Create account')} ${icon('arrow')}</button></form><button class="skip-link" id="skip-photo">${L('المتابعة بدون صورة', 'Continue without a photo')}</button>`,
    );
    const form = step.querySelector('#photo-form');
    wireAvatarPicker(form);
    step.querySelector('#skip-photo').onclick = () => submitProfile(form, true);
    form.onsubmit = (e) => {
      e.preventDefault();
      submitProfile(form, false);
    };
  };
  const submitProfile = async (form, skipPhoto) => {
    const f = new FormData(form);
    let picture = skipPhoto
      ? avatarForGender(profileDraft?.gender || 'other')
      : String(f.get('picture') || avatarForGender(profileDraft?.gender || 'other'));
    const file = f.get('profileFile');
    if (!skipPhoto && file?.size) {
      if (file.size > 3_500_000) {
        showError(t('imageTooLarge'));
        return;
      }
      try {
        picture = await fileAsDataUrl(file);
      } catch {
        showError(L('تعذر قراءة الصورة. جرّب صورة أخرى.', 'Could not read that image. Try another one.'));
        return;
      }
    }
    profileDraft = { ...profileDraft, picture };
    const button = form.querySelector('[type=submit]');
    button.disabled = true;
    button.classList.add('is-loading');
    button.textContent = t('signingIn');
    try {
      const auth = await import('/firebase-auth.js');
      if (method === 'email') {
        if (!authUser) throw Error(L('افتح رابط التأكيد أولًا.', 'Open the verification link first.'));
        await auth.setEmailPassword(email, profileDraft.password);
      }
      if (!authUser) throw Error(L('أكمل التحقق أولًا.', 'Complete verification first.'));
      const name = [profileDraft.firstName, profileDraft.fatherName, profileDraft.lastName]
        .filter(Boolean)
        .join(' ');
      const saved = await auth.persistProfile({
        name,
        firstName: profileDraft.firstName,
        fatherName: profileDraft.fatherName,
        lastName: profileDraft.lastName,
        gender: profileDraft.gender,
        picture,
      });
      sessionStorage.removeItem('cs-pending-profile');
      saveProfile({
        ...saved,
        email: saved.email || email || '',
        phone: saved.phone || profileDraft.phone || '',
      });
      showSuccess(
        L('أهلًا بك في مجتمعنا!', 'Welcome to the community!'),
        saved.notificationSent
          ? L(
              'اكتمل تسجيلك وأُرسلت بيانات الملف إلى إدارة الموقع.',
              'Registration is complete and your profile was emailed to the site owner.',
            )
          : L(
              'اكتمل تسجيلك، لكن تعذر إرسال إشعار البريد إلى الإدارة.',
              'Registration is complete, but the owner notification email could not be sent.',
            ),
      );
    } catch (error) {
      showError(error.message || t('updateError'));
      button.disabled = false;
      button.classList.remove('is-loading');
      button.innerHTML = `${L('إنشاء الحساب', 'Create account')} ${icon('arrow')}`;
    }
  };
  const showSuccess = async (title, copy) => {
    await fadeTo(
      `<div class="signup-success"><span class="success-mark">✓</span><span class="section-index">CAPITAL SCIENCE · COMMUNITY</span><h1>${title}</h1><p>${copy}</p><button id="enter-site" class="button primary">${L('ادخل للموقع', 'Enter the site')} ${icon('arrow')}</button></div>`,
    );
    step.querySelector('#enter-site').onclick = closeOverlay;
  };
  ov.querySelector('#begin').onclick = showMethod;
  if (legacyProfile) {
    method = legacyProfile.email ? 'email' : 'phone';
    email = legacyProfile.email || '';
    showMethod();
  } else if (new URLSearchParams(location.search).get('mode') === 'signIn') {
    import('/firebase-auth.js')
      .then((auth) => auth.isEmailSignInLink())
      .then((isLink) => {
        if (isLink) showEmailLinkCompletion();
      })
      .catch(() => {});
  }
}
(async () => {
  await resetOldProfileSession();
  try {
    siteSnapshot = await fetch('/api/site').then((r) => r.text());
    db = JSON.parse(siteSnapshot);
    emailConfigured = db.emailNotificationsEnabled === true;
    firebaseEnabled = db.firebaseAuthEnabled === true;
    phoneAuthEnabled = db.phoneAuthEnabled === true;
  } catch {}
  render();
  verifyProfilePersistence();
  onboarding();
})();
