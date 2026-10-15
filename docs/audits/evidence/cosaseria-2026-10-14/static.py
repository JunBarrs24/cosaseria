from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit,unquote
import json,gzip,collections,subprocess,re,xml.etree.ElementTree as ET
root=Path('/Users/junbarrs/cosa-seria'); public=root/'public'
class Doc(HTMLParser):
 def __init__(self): super().__init__();self.tags=[];self.ids=[];self.scripts=[];self.capture=None
 def handle_starttag(self,tag,attrs):
  a=dict(attrs);self.tags.append((tag,a,self.getpos()[0]));
  if 'id' in a:self.ids.append(a['id'])
  if tag=='script' and a.get('type')=='application/ld+json':self.capture=''
 def handle_data(self,data):
  if self.capture is not None:self.capture+=data
 def handle_endtag(self,tag):
  if tag=='script' and self.capture is not None:self.scripts.append(self.capture);self.capture=None
pages={p:Doc() for p in public.rglob('*.html')}
for p,d in pages.items():d.feed(p.read_text())
broken=[];jsons=[];duplicates=[];externals=set()
for p,d in pages.items():
 for x,c in collections.Counter(d.ids).items():
  if c>1:duplicates.append({'file':str(p.relative_to(root)),'id':x,'count':c})
 for s in d.scripts:
  try:json.loads(s);jsons.append({'file':str(p.relative_to(root)),'valid':True})
  except Exception as e:jsons.append({'file':str(p),'valid':False,'error':str(e)})
 for tag,a,line in d.tags:
  for attr in ['href','src','action','poster']:
   u=a.get(attr)
   if not u:continue
   parsed=urlsplit(u)
   if parsed.scheme or parsed.netloc:
    if parsed.scheme in ('https','http'):externals.add(u)
    continue
   path=unquote(parsed.path)
   target=public/path.lstrip('/') if path.startswith('/') else p.parent/path if path else p
   target=target.resolve()
   if target.is_dir():target/= 'index.html'
   if path=='/api/contacto':continue
   if not target.exists():broken.append({'file':str(p.relative_to(root)),'line':line,'url':u,'reason':'missing file'})
   elif parsed.fragment and target in pages and parsed.fragment not in pages[target].ids and parsed.fragment not in ['es','en']:
    broken.append({'file':str(p.relative_to(root)),'line':line,'url':u,'reason':'missing fragment'})
sizes=[{'file':str(p.relative_to(root)),'bytes':p.stat().st_size,'gzip':len(gzip.compress(p.read_bytes()))} for p in public.rglob('*') if p.is_file()]
patterns={'private_key':r'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----','aws_access':r'\bAKIA[A-Z0-9]{16}\b','github_token':r'\bgh[pousr]_[A-Za-z0-9]{30,}\b','stripe_secret':r'\bsk_live_[A-Za-z0-9]{16,}\b','resend':r'\bre_[A-Za-z0-9]{28,}\b'}
findings=[];tracked=subprocess.check_output(['git','ls-files'],cwd=root,text=True).splitlines()
for rel in tracked:
 data=(root/rel).read_bytes().decode('utf8',errors='ignore')
 for name,pat in patterns.items():
  for m in re.finditer(pat,data):findings.append({'file':rel,'line':data[:m.start()].count('\n')+1,'type':name})
print(json.dumps({'pages':len(pages),'brokenLinks':broken,'duplicateIds':duplicates,'jsonld':jsons,'sizes':sorted(sizes,key=lambda x:x['bytes'],reverse=True),'externalUrls':sorted(externals),'secretPatternMatches':findings,'filesTracked':len(tracked)},indent=2))
