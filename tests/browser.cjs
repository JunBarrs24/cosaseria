const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const server=require('./server.cjs');
const out=process.env.CS_EVIDENCE||'/tmp/cosaseria-fixes';fs.mkdirSync(out,{recursive:true});
(async()=>{
 const s=server();await new Promise(r=>s.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+s.address().port;
 let b;const results=[];
 try{
 b=await chromium.launch({channel:'chrome',headless:true});
 for(const lang of ['es','en'])for(const width of [390,1440]){
  console.log('Checking game',lang,width);
  const context=await b.newContext({viewport:{width,height:900}});const p=await context.newPage();const requests=[],errors=[];
  p.on('request',r=>requests.push(r.url()));p.on('pageerror',e=>errors.push(e.message));
  await p.goto(base+'/StoneVsSilicon/'+(lang==='en'?'en/':''));await p.waitForLoadState('networkidle');
  assert.equal(await p.locator('html').getAttribute('lang'),lang==='en'?'en':'es-MX');
  assert.equal(await p.locator('video').count(),1);
  assert.equal(requests.filter(u=>/stone_peb|stone_rolla|silicon_bit|silicon_ping|poster-|\.mp4/.test(u)).length,0,'hidden roster/media loaded early: '+requests.filter(u=>/stone_peb|stone_rolla|silicon_bit|silicon_ping|poster-|\.mp4/.test(u)).join(','));
  assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'horizontal overflow');
  assert.equal(await p.locator('[aria-pressed]').count(),0);
  await p.addScriptTag({path:require.resolve('axe-core/axe.min.js')});
  let axe=await p.evaluate(()=>axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}}));
  assert.deepEqual(axe.violations.map(v=>[v.id,v.nodes.map(n=>n.target)]),[]);
  for(const id of ['historia','roster-piedra','roster-silicio']){
   const trigger=p.locator('[data-abre-modal="'+id+'"]').last();await trigger.click();
   assert.ok(await p.locator('#'+id).evaluate(el=>el.open));
   assert.ok(await p.evaluate(()=>!!document.activeElement.closest('dialog')));
   for(let i=0;i<8;i++){await p.keyboard.press(i%2?'Shift+Tab':'Tab');assert.ok(await p.evaluate(()=>!!document.activeElement.closest('dialog')),'focus escaped');}
   await p.addScriptTag({path:require.resolve('axe-core/axe.min.js')});
   axe=await p.evaluate(()=>axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}}));
   assert.deepEqual(axe.violations.map(v=>[v.id,v.nodes.map(n=>n.target)]),[]);
   if(id==='roster-piedra'&&width===390)await p.screenshot({path:`${out}/game-${lang}-modal.png`});
   await p.keyboard.press('Escape');assert.equal(await p.locator('#'+id).evaluate(el=>el.open),false);
   assert.equal(await trigger.evaluate(el=>document.activeElement===el),true);
  }
  await p.goto(base+'/StoneVsSilicon/'+(lang==='en'?'en/':''));await p.screenshot({path:`${out}/game-${lang}-${width}.png`});
  assert.deepEqual(errors,[]);results.push({case:`game ${lang} ${width}`,axeViolations:0,keyboard:true,hiddenMediaRequests:0});await context.close();
 }
 for(const lang of ['es','en']){
  console.log('Checking noJS',lang);
  const context=await b.newContext({javaScriptEnabled:false,viewport:{width:390,height:900}});const p=await context.newPage();await p.goto(base+'/StoneVsSilicon/'+(lang==='en'?'en/':''));
  assert.equal(await p.locator('video').count(),1);assert.ok(await p.locator('video source').getAttribute('src'));
  assert.ok(await p.locator('#historia').isVisible());assert.ok(await p.locator('#roster-piedra').isVisible());
  assert.equal(await p.locator('#roster-piedra noscript img').count(),5);
  await p.locator('[data-abre-modal="roster-piedra"]').click();assert.ok(p.url().endsWith('#roster-piedra'));
  assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await p.locator('video').evaluate(v=>v.scrollIntoView({behavior:'instant',block:'center'}));
  await p.locator('video').evaluate(v=>{v.muted=true;return Promise.race([v.play(),new Promise((_,reject)=>setTimeout(()=>reject(new Error('video play timeout')),10000))]);});
  await p.waitForFunction(()=>document.querySelector('video').currentTime>0);
  await p.locator('video').evaluate(v=>v.pause());
  results.push({case:`noJS ${lang}`,content:true,oneVideo:true,videoPlayed:true});await context.close();
 }
 for (const ruta of ['/','/trabajo/','/servicios/','/notas/microservicios-cuando-no/','/privacidad/']) {
  console.log('Checking page',ruta);
  const p=await b.newPage({viewport:{width:390,height:900},reducedMotion:'reduce'});await p.goto(base+ruta);
  assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'overflow '+ruta);
  await p.addScriptTag({path:require.resolve('axe-core/axe.min.js')});
  const axeResult=await p.evaluate(()=>axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}}));
  assert.deepEqual(axeResult.violations.map(v=>[v.id,v.nodes.map(n=>n.target)]),[],ruta);
  if(ruta==='/trabajo/'){await p.locator('article').filter({hasText:'StoneVsSilicon'}).first().screenshot({path:out+'/portfolio-game.png'});}
  results.push({case:ruta+' mobile',axeViolations:0});await p.close();
 }
 for(const dpr of [2,3]){
  const p=await b.newPage({viewport:{width:390,height:900},deviceScaleFactor:dpr});await p.goto(base+'/StoneVsSilicon/');
  await p.locator('#h-portada img').evaluate(img=>img.decode());
  await p.locator('#h-portada').screenshot({path:out+'/logo-dpr-'+dpr+'.png'});
  results.push({case:'logo DPR '+dpr,src:await p.locator('#h-portada img').evaluate(img=>img.currentSrc.split('/').pop())});await p.close();
 }
 // Client contract checks. No request can leave this local server.
 for(const mode of ['success','invalid-json','wrong-contract','false-success','bad-request','rate-limit','unavailable','renew','initial-token-failure','network-error','validation','timeout']){
  console.log('Checking contact',mode);
  const p=await b.newPage();let gets=0,posts=0,ids=[];
  await p.route('**/api/contacto',async route=>{
   if(route.request().method()==='GET'){
    gets++;if(mode==='initial-token-failure'&&gets===1){await route.fulfill({status:503,contentType:'application/json',body:'{}'});return;}
    await route.fulfill({contentType:'application/json',body:JSON.stringify({token:'test-token-'+gets,expiresAt:Date.now()+7200000})});return;
   }
   posts++;const body=route.request().postData();ids.push(body.match(/name="envio_id"\r\n\r\n([^\r]+)/)?.[1]);
   if(mode==='network-error'){await route.abort();return;}
   if(mode==='timeout'){await new Promise(r=>setTimeout(r,16000));await route.abort().catch(()=>{});return;}
   if(mode==='invalid-json'){await route.fulfill({contentType:'application/json',body:'not json'});return;}
   if(['false-success','bad-request','rate-limit','unavailable'].includes(mode)){await route.fulfill({status:({'false-success':200,'bad-request':400,'rate-limit':429,'unavailable':503})[mode],contentType:'application/json',body:JSON.stringify({ok:false,codigo:'RECHAZADO',mensaje:'No enviado. Conserva tu texto.'})});return;}
   if(mode==='wrong-contract'){await route.fulfill({contentType:'application/json',body:'{"ok":true}'});return;}
   if(mode==='validation'){await route.fulfill({status:422,contentType:'application/json',body:JSON.stringify({ok:false,codigo:'VALIDACION',mensaje:'Revisa el correo.',campos:{email:'Correo no aceptado.'}})});return;}
   if(mode==='renew'&&posts===1){await route.fulfill({status:403,contentType:'application/json',body:JSON.stringify({ok:false,codigo:'TOKEN_CADUCADO',mensaje:'Renueva'})});return;}
   await route.fulfill({contentType:'application/json',body:JSON.stringify({ok:true,codigo:'ENVIADO',mensaje:'Recibido.'})});
  });
  await p.goto(base+'/');await p.locator('[name="nombre"]').fill('Ana');
  if(mode==='initial-token-failure')await p.waitForTimeout(100);
  await p.locator('[name="email"]').fill('ana@example.test');await p.locator('[name="problema"]').fill('Conservar este mensaje');
  const status=p.locator('[data-recado]');assert.equal(await status.getAttribute('role'),'status');assert.equal(await status.getAttribute('aria-live'),'polite');
  await p.locator('form button[type="submit"]').click();
  await p.waitForFunction(()=>!document.querySelector('form button[type="submit"]').disabled,{},{timeout:20000});
  if(['success','renew','initial-token-failure'].includes(mode)){assert.equal(await p.locator('[name="problema"]').inputValue(),'');assert.ok((await status.textContent()).includes('Recibido'));}
  else {assert.equal(await p.locator('[name="problema"]').inputValue(),'Conservar este mensaje');assert.ok((await status.textContent()).length>0);}
  if(mode==='renew'){assert.equal(posts,2);assert.equal(ids[0],ids[1]);assert.equal(gets,2);}
  if(mode==='initial-token-failure')assert.ok(gets>=2);
  if(mode==='validation'){assert.equal(await p.locator('[name="email"]').getAttribute('aria-invalid'),'true');assert.equal(await p.locator('[name="email"]').evaluate(el=>document.activeElement===el),true);await p.locator('[name="email"]').fill('otra@example.test');assert.equal(await p.locator('[name="email"]').getAttribute('aria-invalid'),null);}
  if(mode==='network-error'){await p.locator('form button[type="submit"]').click();await p.waitForFunction(()=>!document.querySelector('form button[type="submit"]').disabled);assert.equal(ids[0],ids[1]);}
  results.push({case:`contact ${mode}`,passed:true,gets,posts});await p.close();
 }
 await require('./cache.cjs')(b);results.push({case:'cached release transition',passed:true});
 console.log(JSON.stringify(results,null,2));fs.writeFileSync(out+'/browser.json',JSON.stringify(results,null,2));
 }finally{if(b)await b.close();await new Promise(r=>s.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
