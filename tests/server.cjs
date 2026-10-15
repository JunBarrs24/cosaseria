// Local static server for browser/lab tests only. No contact endpoint or emails.
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const zlib=require('node:zlib');
function server(root=path.resolve(__dirname,'../public')){
 return http.createServer((req,res)=>{
  let pathname;try{pathname=decodeURIComponent(new URL(req.url,'http://local').pathname);}catch{res.writeHead(400);res.end();return;}
  let target=path.resolve(root,'.'+pathname);
  if(!target.startsWith(root+path.sep)&&target!==root){res.writeHead(403);res.end();return;}
  if(fs.existsSync(target)&&fs.statSync(target).isDirectory())target=path.join(target,'index.html');
  if(!fs.existsSync(target)){res.writeHead(404);res.end('Not found');return;}
  const types={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml','.avif':'image/avif','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.woff2':'font/woff2','.mp4':'video/mp4','.xml':'application/xml','.txt':'text/plain'};
  const ext=path.extname(target);let bytes=fs.readFileSync(target);const headers={'content-type':types[ext]||'application/octet-stream','cache-control':'no-cache'};
  if(['.html','.css','.js','.svg'].includes(ext)&&req.headers['accept-encoding']?.includes('gzip')){bytes=zlib.gzipSync(bytes);headers['content-encoding']='gzip';}
  res.writeHead(200,headers);res.end(bytes);
 });
}
module.exports=server;
if(require.main===module){const s=server(process.env.CS_PUBLIC_ROOT||undefined);s.listen(Number(process.env.PORT||8897),'127.0.0.1',()=>console.log('Static test server '+s.address().port));}
