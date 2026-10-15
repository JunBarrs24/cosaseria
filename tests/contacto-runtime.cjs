// Real workerd + SQLite Durable Objects. Only the email transport is mocked.
const {Miniflare,convertV4MiniflareOptions}=require('miniflare');
const {build}=require('esbuild');
const assert=require('node:assert/strict');
const path=require('node:path');
(async()=>{
 const script=await build({stdin:{contents:`import {RegistroContacto as Original} from './src/registro-contacto.js';
 export class RegistroContacto extends Original { constructor(ctx,env){let fallarRecibo=false;const storage=new Proxy(ctx.storage,{get(t,p){if(p==='put')return(...args)=>{if(fallarRecibo)throw Error('receipt storage failed');return t.put(...args);};const v=Reflect.get(t,p,t);return typeof v==='function'?v.bind(t):v;}});super({storage},{...env,EMAIL:{send:async data=>{const r=await env.MAIL.fetch('https://mail.test/',{method:'POST',body:JSON.stringify(data)});if(!r.ok)throw Error('provider');fallarRecibo=r.headers.get('x-fail-receipt')==='yes';return r.json();}}});} }
 export default {fetch(){return new Response('test');}};`,resolveDir:path.resolve(__dirname,'..')},bundle:true,format:'esm',write:false,platform:'neutral'});
 let enviados=0,modo='ok',liberar;
 const mf=new Miniflare(convertV4MiniflareOptions({modules:true,script:script.outputFiles[0].text,compatibilityDate:'2026-08-16',durableObjects:{CONTACTO:{className:'RegistroContacto',useSQLite:true}},bindings:{CORREO_DESTINO:'test@example.test',CORREO_ORIGEN:'test@example.test'},serviceBindings:{MAIL:async()=>{enviados++;if(modo==='lento')await new Promise(r=>{liberar=r;});return Response.json(modo==='malrecibo'?{}:{messageId:'mock'},{status:modo==='error'?503:200,headers:{'x-fail-receipt':modo==='receipt-failure'?'yes':'no'}});}}}));
 const nuevo=()=>`${Date.now()}.${crypto.randomUUID()}`;
 const pedir=(obj,ruta,body)=>obj.fetch('https://interno/'+ruta,{method:'POST',body:JSON.stringify(body)});
 try{
  const ns=await mf.getDurableObjectNamespace('CONTACTO');
  const cuota=ns.get(ns.idFromName('cuota:test'));
  const ids=Array.from({length:12},nuevo);
  const limites=await Promise.all(ids.map(id=>pedir(cuota,'limite',{id})));
  assert.equal(limites.filter(r=>r.status===204).length,5);
  const aceptado=ids[limites.findIndex(r=>r.status===204)];
  assert.equal((await pedir(cuota,'limite',{id:aceptado})).status,204);
  console.log('PASS: 12 cuotas concurrentes → exactamente 5; repetir aceptado no consume cuota');
  for(const caso of ['ok','error','malrecibo']){
   modo=caso;const id=nuevo(),obj=ns.get(ns.idFromName('envio:'+id)),body={id,huella:'abc',datos:{nombre:'Test',email:'test@example.test',problema:'Prueba'}};
   const antes=enviados;
   const respuestas=await Promise.all(Array.from({length:8},()=>pedir(obj,'enviar',body)));
   assert.equal(enviados-antes,1);
   assert.ok(respuestas.every(r=>[200,202,502].includes(r.status)));
   assert.equal((await pedir(obj,'enviar',body)).status,caso==='ok'?200:502);
   assert.equal((await pedir(obj,'enviar',{...body,huella:'diferente'})).status,409);
   assert.equal(enviados-antes,1);
   console.log(`PASS: ${caso}: 8 solicitudes concurrentes + retry + conflicto → 1 invocación al correo`);
  }
  modo='receipt-failure';
  {const id=nuevo(),obj=ns.get(ns.idFromName('envio:'+id)),body={id,huella:'abc',datos:{nombre:'Test',email:'test@example.test',problema:'Prueba'}};
   const antes=enviados;let fallo=false;
   try{const r=await pedir(obj,'enviar',body);fallo=r.status>=500;}catch{fallo=true;}
   assert.equal(fallo,true);
   assert.equal((await pedir(obj,'enviar',body)).status,202);
   assert.equal(enviados-antes,1);
   console.log('PASS: caída al guardar recibo conserva reserva; retry 202 sin segundo correo');
  }
  modo='lento';const id=nuevo(),obj=ns.get(ns.idFromName('envio:'+id)),body={id,huella:'abc',datos:{nombre:'Test',email:'test@example.test',problema:'Prueba'}};
  const pendiente=pedir(obj,'enviar',body);
  while(!liberar)await new Promise(r=>setTimeout(r,5));
  assert.equal((await pedir(obj,'enviar',body)).status,202);
  liberar();assert.equal((await pendiente).status,200);
  assert.equal((await pedir(obj,'enviar',{...body,id:'invalido'})).status,400);
  console.log('PASS: proveedor lento conserva reserva durable y devuelve 202 al reintento');
 }finally{await mf.dispose();}
})().catch(e=>{console.error(e);process.exitCode=1;});
