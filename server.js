import http from 'node:http';
import {readFile,writeFile,appendFile,mkdir} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import nodemailer from 'nodemailer';

const root=process.cwd(), dbPath=path.join(root,'data/site.json'), sessions=new Map();
await mkdir(path.join(root,'uploads'),{recursive:true});
await mkdir(path.join(root,'public','uploads'),{recursive:true});
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.pdf':'application/pdf'};
const json=(res,code,obj)=>{res.writeHead(code,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(obj));};
async function body(req,limit=2_000_000){let b=[];let n=0;for await(const c of req){n+=c.length;if(n>limit)throw Error('Request too large');b.push(c)}return JSON.parse(Buffer.concat(b).toString()||'{}')}
const readDB=async()=>JSON.parse(await readFile(dbPath,'utf8'));
const saveDB=async d=>writeFile(dbPath,JSON.stringify(d,null,2));
function session(req){const c=req.headers.cookie||'';const m=c.match(/(?:^|; )admin_session=([^;]+)/);return m&&sessions.has(m[1])?m[1]:null;}
function safeUrl(u){try{const x=new URL(u);return ['https:','http:'].includes(x.protocol)}catch{return false}}
async function api(req,res,url){
 if(req.method==='GET'&&url.pathname==='/api/site')return json(res,200,await readDB());
 if(req.method==='POST'&&url.pathname==='/api/register'){
  const d=await body(req,6_000_000);if(!d.name||!d.email||!d.gender)return json(res,400,{error:'Please complete the required fields'});
  const clean={name:String(d.name).trim().slice(0,100),email:String(d.email).trim().slice(0,254),gender:String(d.gender).slice(0,20),picture:d.picture?String(d.picture).slice(0,5_000_000):'generated-avatar'};
  if(!/^[^\s@]+@gmail\.com$/i.test(clean.email))return json(res,400,{error:'Please enter a valid Gmail address'});
  let pictureLink='No photo supplied';
  if(clean.picture.startsWith('data:image/svg+xml,')){
   const filename=`${crypto.randomBytes(18).toString('hex')}.svg`;await writeFile(path.join(root,'public','uploads',filename),decodeURIComponent(clean.picture.slice('data:image/svg+xml,'.length)));
   pictureLink=new URL(`/uploads/${filename}`,process.env.PUBLIC_URL||`http://localhost:${process.env.PORT||3000}`).toString();
  }else if(clean.picture.startsWith('data:image/')){
   const m=clean.picture.match(/^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/);if(!m)return json(res,400,{error:'Photo must be PNG, JPEG, or WebP'});
   const ext=m[1]==='jpeg'?'jpg':m[1],filename=`${crypto.randomBytes(18).toString('hex')}.${ext}`;await writeFile(path.join(root,'public','uploads',filename),Buffer.from(m[2],'base64'));
   pictureLink=new URL(`/uploads/${filename}`,process.env.PUBLIC_URL||`http://localhost:${process.env.PORT||3000}`).toString();
  }
  const saved={name:clean.name,email:clean.email,gender:clean.gender,picture:pictureLink,createdAt:new Date().toISOString()};
  await appendFile(path.join(root,'data/registrations.jsonl'),JSON.stringify(saved)+'\n');
  if(process.env.SMTP_HOST&&process.env.SMTP_USER&&process.env.SMTP_PASS){
   const transport=nodemailer.createTransport({host:process.env.SMTP_HOST,port:Number(process.env.SMTP_PORT||587),secure:process.env.SMTP_SECURE==='true',auth:{user:process.env.SMTP_USER,pass:process.env.SMTP_PASS}});
   const pic=pictureLink;
   await transport.sendMail({from:process.env.SMTP_FROM||process.env.SMTP_USER,to:'essamsidek123@gmail.com',subject:'New Capital Science Faculty registration',text:`Name: ${clean.name}\nEmail: ${clean.email}\nGender: ${clean.gender}\nPicture: ${pic}`});
  }
  return json(res,201,{ok:true,emailConfigured:Boolean(process.env.SMTP_HOST)});
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
  const match=url.pathname.match(/^\/api\/admin\/(subjects|lectures|advising)(?:\/([^/]+))?$/);
  if(match){const [,key,id]=match,db=await readDB();if(req.method==='GET')return json(res,200,db[key]);
   if(req.method==='POST'||req.method==='PUT'){const item=await body(req);if(!item.title||!item.url||!safeUrl(item.url))return json(res,400,{error:'A title and valid http(s) URL are required'});const obj={...item,id:id||crypto.randomUUID(),title:String(item.title).slice(0,180),url:String(item.url).slice(0,2000)};if(id){const i=db[key].findIndex(x=>x.id===id);if(i<0)return json(res,404,{error:'Not found'});db[key][i]=obj}else db[key].unshift(obj);await saveDB(db);return json(res,200,obj)}
   if(req.method==='DELETE'&&id){db[key]=db[key].filter(x=>x.id!==id);await saveDB(db);return json(res,200,{ok:true})}
  }
 }
 return json(res,404,{error:'Not found'});
}
const server=http.createServer(async(req,res)=>{try{const url=new URL(req.url,'http://localhost');if(url.pathname.startsWith('/api/'))return await api(req,res,url);
 const rel=decodeURIComponent(url.pathname==='/admin' || url.pathname==='/admin/'?'/admin.html':url.pathname==='/'?'/index.html':url.pathname);const file=path.resolve(root,'public',`.${rel}`);if(!file.startsWith(path.join(root,'public')+path.sep)||!existsSync(file)){res.writeHead(404);return res.end('Not found')};res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'});res.end(await readFile(file));
 }catch(e){json(res,e.message==='Request too large'?413:500,{error:e.message==='Request too large'?'Request too large':'Server error'})}});
server.listen(Number(process.env.PORT||3000),()=>console.log(`Capital Science Faculty is running on http://localhost:${process.env.PORT||3000}`));
