import http from 'node:http';
import {readFile,writeFile,appendFile,mkdir} from 'node:fs/promises';
import {existsSync,readFileSync} from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {applicationDefault, cert, getApps, initializeApp} from 'firebase-admin/app';
import {getAuth} from 'firebase-admin/auth';
import {FieldValue, getFirestore} from 'firebase-admin/firestore';

const root=process.cwd(), dbPath=path.join(root,'data/site.json'), driveCatalogPath=path.join(root,'data/drive-catalog.json');
await mkdir(path.join(root,'uploads'),{recursive:true});
await mkdir(path.join(root,'public','uploads'),{recursive:true});
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.pdf':'application/pdf'};
const json=(res,code,obj)=>{res.writeHead(code,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(obj));};
async function body(req,limit=2_000_000){let b=[];let n=0;for await(const c of req){n+=c.length;if(n>limit)throw Error('Request too large');b.push(c)}return JSON.parse(Buffer.concat(b).toString()||'{}')}
const readLocalDB=async()=>JSON.parse(await readFile(dbPath,'utf8'));
const siteContentRef=()=>firebase().db.collection('site').doc('content');
async function readDB(){
 if(!firebaseConfigured())return readLocalDB();
 const ref=siteContentRef(),snapshot=await ref.get();
 if(snapshot.exists)return snapshot.data();
 // Seed Firestore once from the checked-in catalog. Transactions prevent two
 // cold starts from overwriting an edit made during the first request.
 const initial=await readLocalDB();
 return firebase().db.runTransaction(async tx=>{
  const current=await tx.get(ref);
  if(current.exists)return current.data();
  tx.set(ref,initial);
  return initial;
 });
}
async function saveDB(d){
 if(firebaseConfigured()){
  await siteContentRef().set(d);
  return;
 }
 await writeFile(dbPath,JSON.stringify(d,null,2));
}
const emailNotificationsEnabled=()=>Boolean(process.env.RESEND_API_KEY);
function firebaseWebConfig(){
 let generated={};try{generated=JSON.parse(readFileSync(path.join(root,'public','firebase-config.json'),'utf8'))}catch{}
 let appHosting={};try{appHosting=JSON.parse(process.env.FIREBASE_WEBAPP_CONFIG||'{}')}catch{}
 const project={...generated,...appHosting};
 return {apiKey:project.apiKey||process.env.FIREBASE_API_KEY,authDomain:project.authDomain||process.env.FIREBASE_AUTH_DOMAIN,projectId:project.projectId||process.env.FIREBASE_PROJECT_ID,appId:project.appId||process.env.FIREBASE_APP_ID,messagingSenderId:project.messagingSenderId||process.env.FIREBASE_MESSAGING_SENDER_ID};
}
const firebaseServiceAccountFile=()=>process.env.FIREBASE_SERVICE_ACCOUNT_FILE||'/etc/secrets/firebase-service-account.json';
const firebaseCredentialsAvailable=()=>Boolean(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)||existsSync(firebaseServiceAccountFile())||Boolean(process.env.FIREBASE_CONFIG)||Boolean(process.env.K_SERVICE);
const firebaseConfigured=()=>Object.values(firebaseWebConfig()).every(Boolean)&&firebaseCredentialsAvailable();
function firebase(){
 if(!firebaseConfigured())throw new Error('Firebase is not fully configured.');
 let app=getApps()[0];
 if(!app){let projectId=process.env.FIREBASE_PROJECT_ID||'';try{projectId=projectId||JSON.parse(process.env.FIREBASE_CONFIG||'{}').projectId||''}catch{}
  if(process.env.FIREBASE_SERVICE_ACCOUNT_JSON||existsSync(firebaseServiceAccountFile())){let serviceAccount;try{serviceAccount=process.env.FIREBASE_SERVICE_ACCOUNT_JSON?JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON):JSON.parse(readFileSync(firebaseServiceAccountFile(),'utf8'))}catch{throw new Error('Firebase Admin service-account secret must contain valid JSON.')}app=initializeApp({credential:cert(serviceAccount),projectId:projectId||serviceAccount.project_id});}
  else app=initializeApp({credential:applicationDefault(),...(projectId?{projectId}:{})});
 }
 return {auth:getAuth(app),db:getFirestore(app)};
}
async function verifiedFirebaseUser(req){
 const token=String(req.headers.authorization||'').replace(/^Bearer\s+/i,'');if(!token)throw Object.assign(new Error('Sign in to continue.'),{status:401});
 const {auth}=firebase();return auth.verifyIdToken(token,true);
}
const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function sendRegistrationEmail(profile,isUpdate=false,photoAttachment=null){
 const isDataPicture=String(profile.picture||'').startsWith('data:image/');
 const picture=isDataPicture?'':escapeHtml(String(profile.picture||'').startsWith('/avatars/')?new URL(profile.picture,process.env.PUBLIC_URL||'https://capital-science-faculty.onrender.com').toString():profile.picture);
 const pictureDescription=isDataPicture?'Attached to this email':(profile.picture||'Not supplied');
 const response=await fetch('https://api.resend.com/emails',{
  method:'POST',
  headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,'Content-Type':'application/json'},
  body:JSON.stringify({
   from:process.env.RESEND_FROM||'onboarding@resend.dev',
   to:['essamsidek123@gmail.com'],
   subject:isUpdate?'Capital Science Faculty profile updated':'New Capital Science Faculty registration',
   text:`${isUpdate?'Profile update':'New registration'}\nName: ${profile.name}\n${profile.email?'Email: '+profile.email:'Phone: '+(profile.phone||'Not supplied')}\nGender: ${profile.gender}\nPicture: ${pictureDescription}`,
   html:`<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:24px;color:#24362c"><h2>${isUpdate?'Student profile updated':'New student registration'}</h2><p><b>Name:</b> ${escapeHtml(profile.name)}</p><p><b>${profile.email?'Email':'Phone'}:</b> ${escapeHtml(profile.email||profile.phone||'Not supplied')}</p><p><b>Gender:</b> ${escapeHtml(profile.gender)}</p><p><b>Profile picture:</b> ${isDataPicture?'Attached to this email':picture?`<a href="${picture}">View portrait</a>`:'Not supplied'}</p></div>`,
   ...(photoAttachment?{attachments:[photoAttachment]}:{})
  }),
  signal:AbortSignal.timeout(8000)
 });
 if(!response.ok){
  const result=await response.json().catch(()=>({}));
  throw new Error(`Email provider returned HTTP ${response.status}${result.message?`: ${result.message}`:''}`);
 }
 return response.json();
}
async function sendManagedEmail(to,subject,message){
 const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({from:process.env.RESEND_FROM||'onboarding@resend.dev',to:[to],subject:subject.slice(0,180),text:message.slice(0,10000),html:`<div style="font-family:Arial,sans-serif;white-space:pre-wrap">${escapeHtml(message.slice(0,10000))}</div>`}),signal:AbortSignal.timeout(10000)});
 if(!response.ok)throw new Error(`Email provider returned HTTP ${response.status}`);return response.json();
}
function signAdminToken(token){return crypto.createHmac('sha256',process.env.ADMIN_PASSWORD||'').update(token).digest('hex')}
function session(req){const c=req.headers.cookie||'';const m=c.match(/(?:^|; )admin_session=([^;]+)/);if(!m||!process.env.ADMIN_PASSWORD)return null;const [token,signature]=m[1].split('.');if(!token||!signature)return null;const expected=signAdminToken(token);const a=Buffer.from(signature),b=Buffer.from(expected);return a.length===b.length&&crypto.timingSafeEqual(a,b)?token:null;}
function safeUrl(u){try{const x=new URL(u);return ['https:','http:'].includes(x.protocol)}catch{return false}}
async function api(req,res,url){
 if(req.method==='GET'&&url.pathname==='/api/firebase-config')return json(res,200,{enabled:firebaseConfigured(),firebase:firebaseConfigured()?firebaseWebConfig():null});
 if(req.method==='GET'&&url.pathname==='/api/site'){
  const db=await readDB();let driveFiles=[];
  try{driveFiles=JSON.parse(await readFile(driveCatalogPath,'utf8'))}catch{driveFiles=db.lectures||[]}
  const managedRoots=(db.lectures||[]).filter(item=>Array.isArray(item.folders));
  const managedByCategory=new Map(managedRoots.map(item=>[String(item.category||'').trim().toLocaleLowerCase(),item]));
  const mergedRoots=new Set();
  driveFiles=driveFiles.map(item=>{
   if(item.type!=='folder'||!['المجلد الرئيسي','Year root'].includes(item.note))return item;
   const managed=managedRoots.find(entry=>entry.url===item.url)||managedByCategory.get(String(item.categoryAr||item.category||'').trim().toLocaleLowerCase());
   if(!managed)return item;
   mergedRoots.add(managed.id);
   return {...item,title:managed.title||item.title,titleAr:managed.title||item.titleAr,titleEn:managed.titleEn||item.titleEn,url:managed.url||item.url,categoryAr:managed.category||item.categoryAr};
  });
  const extraLectures=(db.lectures||[]).filter(item=>!Array.isArray(item.folders)&&!mergedRoots.has(item.id));
  driveFiles.push(...extraLectures.map(item=>({...item,id:item.id||item.url,type:'file',file:true,categoryEn:item.categoryEn||item.category||''})));
  return json(res,200,{...db,driveFiles,emailNotificationsEnabled:emailNotificationsEnabled(),firebaseAuthEnabled:firebaseConfigured(),contentStoragePersistent:firebaseConfigured()});
 }
 if(url.pathname.startsWith('/api/firebase/')){
  if(!firebaseConfigured())return json(res,503,{error:'Firebase is not configured. Connect the Firebase web app and Admin SDK credentials.'});
  try{
   const decoded=await verifiedFirebaseUser(req),{db}=firebase(),ref=db.collection('users').doc(decoded.uid);
   if(req.method==='GET'&&url.pathname==='/api/firebase/profile'){const snap=await ref.get();return json(res,200,{profile:snap.exists?snap.data():null});}
   if(req.method==='GET'&&url.pathname==='/api/firebase/messages'){const snap=await ref.collection('messages').orderBy('createdAt','desc').limit(100).get();return json(res,200,{messages:snap.docs.map(x=>({id:x.id,...x.data()}))});}
   const readMessage=url.pathname.match(/^\/api\/firebase\/messages\/([A-Za-z0-9_-]+)\/read$/);if(req.method==='POST'&&readMessage){const message=ref.collection('messages').doc(readMessage[1]);if(!(await message.get()).exists)return json(res,404,{error:'Message not found.'});await message.update({readAt:FieldValue.serverTimestamp()});return json(res,200,{ok:true});}
   if((req.method==='POST'&&['/api/firebase/register','/api/firebase/profile'].includes(url.pathname))||(req.method==='PUT'&&url.pathname==='/api/firebase/profile')){
    if(!decoded.email_verified&&!decoded.phone_number)return json(res,403,{error:'Verify your email or phone before saving a profile.'});
    const d=await body(req,5_000_000);if(!String(d.name||'').trim()||!['male','female','other'].includes(d.gender))return json(res,400,{error:'Please complete your name and gender.'});
    const picture=String(d.picture||'').slice(0,700_000);if(picture&&!(/^\/avatars\/art-(0[1-9]|10)\.svg$/.test(picture)||/^data:image\/(png|jpeg|webp);base64,/.test(picture)||/^https:\/\//.test(picture)))return json(res,400,{error:'Unsupported profile image.'});
    const before=await ref.get(),profile={id:decoded.uid,name:String(d.name).trim().slice(0,100),gender:d.gender,email:decoded.email||null,phone:decoded.phone_number||null,picture,providers:decoded.firebase?.sign_in_provider?[decoded.firebase.sign_in_provider]:[],createdAt:before.exists?before.get('createdAt'):FieldValue.serverTimestamp(),updatedAt:FieldValue.serverTimestamp()};
    await ref.set(profile,{merge:true});let emailSent=false;
    if(!before.exists&&emailNotificationsEnabled()){try{let photoAttachment=null;const match=profile.picture.match(/^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/);if(match){const ext=match[1]==='jpeg'?'jpg':match[1];photoAttachment={filename:`student-profile.${ext}`,content:match[2]}}await sendRegistrationEmail(profile,false,photoAttachment);emailSent=true}catch(error){console.error('Registration email delivery failed:',error.message)}}
    return json(res,before.exists?200:201,{ok:true,emailSent,profile:{...profile,createdAt:undefined,updatedAt:undefined}});
   }
  }catch(error){return json(res,error.status||401,{error:error.status?error.message:'Firebase authentication failed.'});}
 }
 if(req.method==='POST'&&['/api/register','/api/profile/update'].includes(url.pathname)){
  return json(res,503,{error:'Verified registration is available only through Firebase Auth.'});
 }
 if(url.pathname.startsWith('/api/admin')){
  if(req.method==='POST'&&url.pathname==='/api/admin/login'){
   const d=await body(req);if(!process.env.ADMIN_PASSWORD)return json(res,503,{error:'Admin password is not configured. Set ADMIN_PASSWORD before starting the server.'});
   const a=Buffer.from(String(d.password||'')),b=Buffer.from(process.env.ADMIN_PASSWORD);if(a.length!==b.length||!crypto.timingSafeEqual(a,b))return json(res,401,{error:'Incorrect password'});
   const token=crypto.randomBytes(32).toString('hex'),signed=`${token}.${signAdminToken(token)}`;res.setHeader('Set-Cookie',`admin_session=${signed}; HttpOnly; SameSite=Strict; Path=/${process.env.NODE_ENV==='production'||process.env.K_SERVICE?'; Secure':''}`);return json(res,200,{ok:true});
  }
  if(req.method==='POST'&&url.pathname==='/api/admin/logout'){res.setHeader('Set-Cookie','admin_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');return json(res,200,{ok:true});}
  if(req.method==='GET'&&url.pathname==='/api/admin/session')return json(res,200,{authenticated:Boolean(session(req))});
  if(!session(req))return json(res,401,{error:'Sign in required'});
  if(req.method==='GET'&&url.pathname==='/api/admin/users'){
   if(!firebaseConfigured())return json(res,503,{error:'Firebase must be configured before accounts can be managed.'});
   const query=(url.searchParams.get('q')||'').trim().toLocaleLowerCase(),{auth,db}=firebase(),result=await auth.listUsers(1000),profiles=await db.collection('users').get();
   const byId=new Map(profiles.docs.map(x=>[x.id,x.data()]));const users=result.users.map(u=>{const p=byId.get(u.uid)||{};return {id:u.uid,name:p.name||u.displayName||'',email:u.email||'',phone:u.phone_number||'',gender:p.gender||'',picture:p.picture||'',createdAt:u.metadata.creationTime||''}}).filter(u=>!query||[u.id,u.name,u.email,u.phone].some(v=>String(v).toLocaleLowerCase().includes(query))).slice(0,500);
   return json(res,200,{users,nextPageToken:result.pageToken||null});
  }
  if(req.method==='POST'&&url.pathname==='/api/admin/email'){
   if(!emailNotificationsEnabled())return json(res,503,{error:'Resend email is not configured.'});if(!firebaseConfigured())return json(res,503,{error:'Firebase must be configured before targeting accounts.'});
   const d=await body(req),subject=String(d.subject||'').trim(),message=String(d.message||'').trim();if(!subject||!message)return json(res,400,{error:'Subject and message are required.'});
   const {db}=firebase();let targets=[];
   if(d.mode==='all')targets=(await db.collection('users').limit(500).get()).docs.map(x=>({id:x.id,...x.data()}));
   else {const target=String(d.target||'').trim();if(!target)return json(res,400,{error:'Enter a user ID, verified email, or phone number.'});let snapshot;if(target.includes('@'))snapshot=await db.collection('users').where('email','==',target.toLowerCase()).limit(1).get();else if(target.startsWith('+'))snapshot=await db.collection('users').where('phone','==',target).limit(1).get();else {const doc=await db.collection('users').doc(target).get();snapshot={docs:doc.exists?[doc]:[]}}targets=snapshot.docs.map(x=>({id:x.id,...x.data()}))}
   if(!targets.length)return json(res,404,{error:'No matching account was found.'});let emailSent=0,emailFailed=0,inAppDelivered=0;
   for(const target of targets){try{await db.collection('users').doc(target.id).collection('messages').add({subject,message,from:'Morfi',createdAt:FieldValue.serverTimestamp(),readAt:null});inAppDelivered++}catch{continue}const address=String(target.email||'').trim().toLowerCase();if(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)){try{await sendManagedEmail(address,subject,message);emailSent++}catch{emailFailed++}}}
   return json(res,200,{ok:true,matched:targets.length,inAppDelivered,emailSent,emailFailed,limit:d.mode==='all'?500:1});
  }
  const match=url.pathname.match(/^\/api\/admin\/(subjects|lectures|advising|official)(?:\/([^/]+))?$/);
  if(match){const [,key,id]=match,db=await readDB();if(req.method==='GET')return json(res,200,db[key]);
   if(req.method==='POST'||req.method==='PUT'){const item=await body(req);if(!item.title||!item.url||!safeUrl(item.url))return json(res,400,{error:'A title and valid http(s) URL are required'});const obj={...item,id:id||crypto.randomUUID(),title:String(item.title).slice(0,180),url:String(item.url).slice(0,2000)};if(id){const i=db[key].findIndex(x=>x.id===id);if(i<0)return json(res,404,{error:'Not found'});db[key][i]=obj}else db[key].unshift(obj);await saveDB(db);return json(res,200,obj)}
   if(req.method==='DELETE'&&id){db[key]=db[key].filter(x=>x.id!==id);await saveDB(db);return json(res,200,{ok:true})}
  }
 }
 return json(res,404,{error:'Not found'});
}
const server=http.createServer(async(req,res)=>{try{const url=new URL(req.url,'http://localhost');if(url.pathname.startsWith('/api/'))return await api(req,res,url);
 const route=url.pathname;if(route==='/admin'||route==='/admin/'){res.setHeader('Set-Cookie',`admin_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${process.env.NODE_ENV==='production'||process.env.K_SERVICE?'; Secure':''}`);res.setHeader('Cache-Control','no-store');}
 const rel=route==='/admin'||route==='/admin/'?'/admin.html':['/','/subjects','/lectures','/advising','/official','/developer','/profile'].includes(route)?'/index.html':decodeURIComponent(route);const file=path.resolve(root,'public',`.${rel}`);if(!file.startsWith(path.join(root,'public')+path.sep)||!existsSync(file)){res.writeHead(404);return res.end('Not found')};res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'});res.end(await readFile(file));
 }catch(e){json(res,e.message==='Request too large'?413:500,{error:e.message==='Request too large'?'Request too large':'Server error'})}});
server.listen(Number(process.env.PORT||3000),()=>console.log(`Capital Science Faculty is running on http://localhost:${process.env.PORT||3000}`));
