const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
module.exports=async function cacheTest(browser){
 const home=fs.readFileSync(path.resolve(__dirname,'../public/index.html'),'utf8');
 const headers=fs.readFileSync(path.resolve(__dirname,'../public/_headers'),'utf8');
 const css=home.match(/href="([^"]*assets\/css\/site\.css[^\"]*)"/)[1];
 const js=home.match(/src="([^"]*assets\/js\/site\.js[^\"]*)"/)[1];
 assert.ok(headers.includes('/assets/css/*\n  Cache-Control: public, max-age=0, must-revalidate'));
 assert.ok(headers.includes('/assets/js/*\n  Cache-Control: public, max-age=0, must-revalidate'));
 let release=0;const resources=[];
 const server=http.createServer((req,res)=>{
  const isJS=req.url.includes('.js'),isCSS=req.url.includes('.css');
  if(isJS||isCSS){resources.push(req.url);res.writeHead(200,{'content-type':isJS?'text/javascript':'text/css','cache-control':release?'public, max-age=0, must-revalidate':'public, max-age=604800'});res.end(isJS?`window.release=${release}`:`body{color:${release?'rgb(40, 50, 60)':'rgb(10, 20, 30)'}}`);return;}
  res.writeHead(200,{'content-type':'text/html','cache-control':'no-cache'});
  res.end(`<link rel="stylesheet" href="${release?css:'/assets/css/site.css'}"><body>Cache test<script src="${release?js:'/assets/js/site.js'}"></script></body>`);
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const p=await browser.newPage();
 try{
  const url='http://127.0.0.1:'+server.address().port+'/';await p.goto(url);assert.equal(await p.evaluate(()=>window.release),0);
  release=1;await p.goto(url);assert.equal(await p.evaluate(()=>window.release),1);assert.equal(await p.evaluate(()=>getComputedStyle(document.body).color),'rgb(40, 50, 60)');
  assert.equal(resources.filter(u=>u==='/assets/js/site.js').length,1);
  assert.ok(resources.includes(new URL(js,url).pathname+new URL(js,url).search));
  console.log('PASS: cached release A → release B uses updated CSS/JS without hard refresh');
 }finally{await p.close();await new Promise(r=>server.close(r));}
};
if(require.main===module){const {chromium}=require('playwright');(async()=>{const b=await chromium.launch({channel:'chrome',headless:true});try{await module.exports(b);}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});}
