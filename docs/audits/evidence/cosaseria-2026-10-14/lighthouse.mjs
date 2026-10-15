import fs from 'node:fs';
import lighthouse from '/tmp/cosaseria-audit-tools/node_modules/lighthouse/core/index.js';
import * as chromeLauncher from '/tmp/cosaseria-audit-tools/node_modules/chrome-launcher/dist/index.js';
const out='/tmp/cosaseria-audit-evidence';const summaries=[];
for(const [name,url,desktop] of [['home-mobile','https://cosaseria.mx/',false],['work-mobile','https://cosaseria.mx/trabajo/',false],['svs-mobile','https://cosaseria.mx/StoneVsSilicon/',false],['home-desktop','https://cosaseria.mx/',true]]){
 const chrome=await chromeLauncher.launch({chromeFlags:['--headless','--no-first-run'],chromePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 try{const config=desktop?{extends:'lighthouse:default',settings:{formFactor:'desktop',screenEmulation:{mobile:false,width:1350,height:940,deviceScaleFactor:1,disabled:false},throttling:{rttMs:40,throughputKbps:10240,cpuSlowdownMultiplier:1,requestLatencyMs:0,downloadThroughputKbps:0,uploadThroughputKbps:0}}}:undefined;
 const r=await lighthouse(url,{port:chrome.port,output:'json',onlyCategories:['performance','accessibility','best-practices','seo'],logLevel:'error'},config);
 fs.writeFileSync(out+'/lh-'+name+'.json',JSON.stringify(r.lhr,null,2));
 const l=r.lhr;const summary={name,url,version:l.lighthouseVersion,date:l.fetchTime,environment:l.environment,settings:l.configSettings,scores:Object.fromEntries(Object.entries(l.categories).map(([k,v])=>[k,v.score])),metrics:Object.fromEntries(['first-contentful-paint','largest-contentful-paint','total-blocking-time','cumulative-layout-shift','speed-index','total-byte-weight'].map(k=>[k,{value:l.audits[k]?.numericValue,display:l.audits[k]?.displayValue}])),failedAudits:Object.values(l.audits).filter(a=>a.score!==null&&a.score<1).map(a=>({id:a.id,score:a.score,title:a.title,display:a.displayValue})),warnings:l.runWarnings};
 summaries.push(summary);fs.writeFileSync(out+'/lighthouse-summary.json',JSON.stringify(summaries,null,2));console.log(JSON.stringify({name,scores:summary.scores,metrics:summary.metrics,warnings:summary.warnings}));
 }finally{await chrome.kill();}
}
