import http from 'node:http';
import {readFile,writeFile,appendFile,mkdir} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root=process.cwd(), dbPath=path.join(root,'data/site.json'), driveCatalogPath=path.join(root,'data/drive-catalog.json'), sessions=new Map();
await mkdir(path.join(root,'uploads'),{recursive:true});
await mkdir(path.join(root,'public','uploads'),{recursive:true});
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.pdf':'application/pdf'};
const json=(res,code,obj)=>{res.writeHead(code,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(obj));};
async function body(req,limit=2_000_000){let b=[];let n=0;for await(const c of req){n+=c.length;if(n>limit)throw Error('Request too large');b.push(c)}return JSON.parse(Buffer.concat(b).toString()||'{}')}
const readDB=async()=>JSON.parse(await readFile(dbPath,'utf8'));
const saveDB=async d=>writeFile(dbPath,JSON.stringify(d,null,2));
const emailNotificationsEnabled=()=>Boolean(process.env.RESEND_API_KEY);
const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function sendRegistrationEmail(profile,isUpdate=false,photoAttachment=null){
 const picture=escapeHtml(profile.picture);
 const response=await fetch('https://api.resend.com/emails',{
  method:'POST',
  headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,'Content-Type':'application/json'},
  body:JSON.stringify({
   from:process.env.RESEND_FROM||'onboarding@resend.dev',
   to:['essamsidek123@gmail.com'],
   subject:isUpdate?'Capital Science Faculty profile updated':'New Capital Science Faculty registration',
   text:`${isUpdate?'Profile update':'New registration'}\nName: ${profile.name}\nEmail: ${profile.email}\nGender: ${profile.gender}\nPicture: ${profile.picture}`,
   html:`<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:24px;color:#24362c"><h2>${isUpdate?'Student profile updated':'New student registration'}</h2><p><b>Name:</b> ${escapeHtml(profile.name)}</p><p><b>Email:</b> ${escapeHtml(profile.email)}</p><p><b>Gender:</b> ${escapeHtml(profile.gender)}</p><p><b>Profile picture:</b></p><a href="${picture}"><img src="${picture}" alt="Student profile portrait" width="144" height="144" style="object-fit:cover;border-radius:50%;background:#edf2e9"></a></div>`,
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
function session(req){const c=req.headers.cookie||'';const m=c.match(/(?:^|; )admin_session=([^;]+)/);return m&&sessions.has(m[1])?m[1]:null;}
function safeUrl(u){try{const x=new URL(u);return ['https:','http:'].includes(x.protocol)}catch{return false}}
async function api(req,res,url){
 if(req.method==='GET'&&url.pathname==='/api/site'){const db=await readDB();let driveFiles=db.lectures;try{driveFiles=JSON.parse(await readFile(driveCatalogPath,'utf8'))}catch{}return json(res,200,{...db,driveFiles,emailNotificationsEnabled:emailNotificationsEnabled()});}
 if(req.method==='POST'&&['/api/register','/api/profile/update'].includes(url.pathname)){
  const isUpdate=url.pathname==='/api/profile/update';
  const d=await body(req,6_000_000);if(!d.name||!d.email||!d.gender)return json(res,400,{error:'Please complete the required fields'});
  const clean={name:String(d.name).trim().slice(0,100),email:String(d.email).trim().slice(0,254),gender:String(d.gender).slice(0,20),picture:d.picture?String(d.picture).slice(0,5_000_000):'generated-avatar'};
  if(!/^[^\s@]+@gmail\.com$/i.test(clean.email))return json(res,400,{error:'Please enter a valid Gmail address'});
  const publicBase=process.env.PUBLIC_URL||'https://capital-science-faculty.onrender.com';let pictureLink='No photo supplied',photoAttachment=null;
  if(/^\/avatars\/art-(0[1-9]|10)\.svg$/.test(clean.picture)){
   pictureLink=new URL(clean.picture,publicBase).toString();
  }else if(clean.picture.startsWith('data:image/')){
   const m=clean.picture.match(/^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/);if(!m)return json(res,400,{error:'Photo must be PNG, JPEG, or WebP'});
   const ext=m[1]==='jpeg'?'jpg':m[1],filename=`${crypto.randomBytes(18).toString('hex')}.${ext}`;await writeFile(path.join(root,'public','uploads',filename),Buffer.from(m[2],'base64'));photoAttachment={filename:`student-profile.${ext}`,content:m[2]};
   pictureLink=new URL(`/uploads/${filename}`,publicBase).toString();
  }else if(clean.picture.startsWith(`${publicBase}/uploads/`)||clean.picture.startsWith(`${publicBase}/avatars/`)){
   pictureLink=clean.picture;
  }
  const saved={name:clean.name,email:clean.email,gender:clean.gender,picture:pictureLink,createdAt:new Date().toISOString()};
  await appendFile(path.join(root,'data',isUpdate?'profile-updates.jsonl':'registrations.jsonl'),JSON.stringify(saved)+'\n');
  let emailSent=false;
  if(emailNotificationsEnabled()){
   try{await sendRegistrationEmail({...saved,picture:pictureLink},isUpdate,photoAttachment);emailSent=true}
   catch(error){console.error('Registration email delivery failed:',error.message)}
  }
  return json(res,isUpdate?200:201,{ok:true,emailConfigured:emailNotificationsEnabled(),emailSent,profile:{name:saved.name,email:saved.email,gender:saved.gender,picture:saved.picture}});
 }
 if(url.pathname.startsWith('/api/admin')){
  if(req.method==='POST'&&url.pathname==='/api/admin/login'){
   const d=await body(req);if(!process.env.ADMIN_PASSWORD)return json(res,503,{error:'Admin password is not configured. Set ADMIN_PASSWORD before starting the server.'});
   const a=Buffer.from(String(d.password||'')),b=Buffer.from(process.env.ADMIN_PASSWORD);if(a.length!==b.length||!crypto.timingSafeEqual(a,b))return json(res,401,{error:'Incorrect password'});
   const token=crypto.randomBytes(32).toString('hex');sessions.set(token,Date.now());res.setHeader('Set-Cookie',`admin_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800${process.env.NODE_ENV==='production'?'; Secure':''}`);return json(res,200,{ok:true});
  }
  if(req.method==='POST'&&url.pathname==='/api/admin/logout'){const t=session(req);if(t)sessions.delete(t);res.setHeader('Set-Cookie','admin_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');return json(res,200,{ok:true});}
  if(req.method==='GET'&&url.pathname==='/api/admin/session')return json(res,200,{authenticated:Boolean(session(req))});
  if(!session(req))return json(res,401,{error:'Sign in required'});
  const match=url.pathname.match(/^\/api\/admin\/(subjects|lectures|advising|official)(?:\/([^/]+))?$/);
  if(match){const [,key,id]=match,db=await readDB();if(req.method==='GET')return json(res,200,db[key]);
   if(req.method==='POST'||req.method==='PUT'){const item=await body(req);if(!item.title||!item.url||!safeUrl(item.url))return json(res,400,{error:'A title and valid http(s) URL are required'});const obj={...item,id:id||crypto.randomUUID(),title:String(item.title).slice(0,180),url:String(item.url).slice(0,2000)};if(id){const i=db[key].findIndex(x=>x.id===id);if(i<0)return json(res,404,{error:'Not found'});db[key][i]=obj}else db[key].unshift(obj);await saveDB(db);return json(res,200,obj)}
   if(req.method==='DELETE'&&id){db[key]=db[key].filter(x=>x.id!==id);await saveDB(db);return json(res,200,{ok:true})}
  }
 }
 return json(res,404,{error:'Not found'});
}
const server=http.createServer(async(req,res)=>{try{const url=new URL(req.url,'http://localhost');if(url.pathname.startsWith('/api/'))return await api(req,res,url);
 const route=url.pathname;const rel=route==='/admin'||route==='/admin/'?'/admin.html':['/','/subjects','/lectures','/advising','/official','/developer','/profile'].includes(route)?'/index.html':decodeURIComponent(route);const file=path.resolve(root,'public',`.${rel}`);if(!file.startsWith(path.join(root,'public')+path.sep)||!existsSync(file)){res.writeHead(404);return res.end('Not found')};res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'});res.end(await readFile(file));
 }catch(e){json(res,e.message==='Request too large'?413:500,{error:e.message==='Request too large'?'Request too large':'Server error'})}});
server.listen(Number(process.env.PORT||3000),()=>console.log(`Capital Science Faculty is running on http://localhost:${process.env.PORT||3000}`));
