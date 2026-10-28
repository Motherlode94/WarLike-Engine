"""Rebuild the local CC0 3D library from SHA-256 pinned source archives.

Run with Python 3 + Pillow, Blender 4.2.0, then normalize-free-models.mjs
and render-free-model-thumbnails.cjs. Source files are data, never executed.
"""
import argparse,base64,concurrent.futures,hashlib,io,json,re,struct,subprocess,urllib.parse,urllib.request,zipfile
from pathlib import Path,PurePosixPath
from PIL import Image
ROOT=Path(__file__).resolve().parents[2]
IMAGE_CACHE={}
TEXTURES={}
def digest(data):return hashlib.sha256(data).hexdigest()
def slug(value):return re.sub(r'[^a-z0-9]+','-',value.lower()).strip('-')
def gltf_read(data):
 if data[:4]==b'glTF':
  length=struct.unpack_from('<I',data,12)[0];return json.loads(data[20:20+length]),data[28+length:]
 return json.loads(data),None
def embed_gltf(data,filename,z,repairOpacity=False):
 j,binary=gltf_read(data)
 if repairOpacity:
  materials=j.get('materials',[])
  if materials and all(m.get('pbrMetallicRoughness',{}).get('baseColorFactor',[1,1,1,1])[3]==0 for m in materials):
   for material in materials:material['pbrMetallicRoughness']['baseColorFactor'][3]=1
   j.setdefault('asset',{}).setdefault('extras',{})['warlikeFbxOpacityRepair']=True
 parent=PurePosixPath(filename).parent;names={x.lower():x for x in z.namelist()}
 def external(uri):
  if uri.startswith('data:'):return base64.b64decode(uri.split(',',1)[1])
  path=str(parent/urllib.parse.unquote(uri)).replace('\\','/');pieces=[]
  for bit in path.split('/'):
   if bit=='..':
    if pieces:pieces.pop()
   elif bit not in ['', '.']:pieces.append(bit)
  key='/'.join(pieces)
  if key.lower() in names:return z.read(names[key.lower()])
  name=PurePosixPath(uri).name
  if re.fullmatch(r'[a-f0-9]{64}\.(png|jpg|webp)',name):return (ROOT/'assets/free/textures'/name).read_bytes()
  return z.read(key)
 buffers=[external(b['uri']) if 'uri' in b else binary for b in j.get('buffers',[])]
 views=[bytes(buffers[v.get('buffer',0)][v.get('byteOffset',0):v.get('byteOffset',0)+v['byteLength']]) for v in j.get('bufferViews',[])]
 for image in j.get('images',[]):
  if 'uri' in image:payload=external(image.pop('uri'));viewIndex=None
  else:viewIndex=image.pop('bufferView');payload=views[viewIndex]
  key=digest(payload)
  if key not in IMAGE_CACHE:
   with Image.open(io.BytesIO(payload)) as img:
    if max(img.size)>1024:
     img.thumbnail((1024,1024),Image.Resampling.LANCZOS);out=io.BytesIO();img.save(out,format='PNG',compress_level=6);payload=out.getvalue()
   ext='png' if payload.startswith(b'\x89PNG') else 'jpg' if payload.startswith(b'\xff\xd8') else 'webp'
   sha=digest(payload);path=ROOT/'assets/free/textures'/(sha+'.'+ext);path.parent.mkdir(parents=True,exist_ok=True)
   if not path.exists():path.write_bytes(payload)
   IMAGE_CACHE[key]=(sha,ext,len(payload))
  sha,ext,size=IMAGE_CACHE[key];path='assets/free/textures/'+sha+'.'+ext;TEXTURES[path]={'url':'./'+path,'sha256':sha,'bytes':size}
  image['uri']='../../textures/'+sha+'.'+ext;image.pop('mimeType',None)
  if viewIndex is not None:views[viewIndex]=b'\0'*4
 out=bytearray()
 for view,payload in zip(j.get('bufferViews',[]),views):
  out.extend(b'\0'*((-len(out))%4));view.update(buffer=0,byteOffset=len(out),byteLength=len(payload));out.extend(payload)
 out.extend(b'\0'*((-len(out))%4));j['buffers']=[{'byteLength':len(out)}];text=json.dumps(j,separators=(',',':'),ensure_ascii=False).encode();text+=b' '*((-len(text))%4)
 result=struct.pack('<III',0x46546c67,2,28+len(text)+len(out))+struct.pack('<II',len(text),0x4e4f534a)+text+struct.pack('<II',len(out),0x004e4942)+out
 if len(result)>25*1024*1024:raise ValueError('Model exceeds 25 MiB after Web texture optimization')
 return result,j

def category(source,filename,j=None):
 p=source['pack'];n=Path(filename).stem.lower();path=filename.lower()
 if source['author']=='Kenney':
  if 'characters' in p:return 'Characters'
  if p=='cube-pets':return 'Animals'
  if p=='food-kit':return 'Food'
  if p in ['car-kit','toy-car-kit','watercraft-kit']:return 'Vehicles'
 else:
  if 'monster' in p or 'alien' in p or 'enemies' in path:return 'Monsters'
  if p in ['animatedfish','cutefish','farmanimal','ultimateanimatedanimals','animateddinosaurs']:return 'Animals'
  if p in ['animatedmech','animatedrobot']:return 'Monsters'
  if p in ['cars','ships','publictransport','animatedtanks','ultimatespaceships']:return 'Vehicles'
  if p in ['ultimatefood','junkfood']:return 'Food'
 if re.search(r'gun|pistol|rifle|shotgun|sniper|sword|weapon|spear|shield|blaster|bullet|grenade|bayonet|crossbow|bow_|cannon|turret|ballista|scope|magazine|dagger|katana|staff|mace',n) or p in ['ultimategun','scifigun','medievalweapons','scifimodularguns','blaster-kit']:return 'Weapons'
 if re.search(r'vehicle|car_|truck|taxi|ambulance|motorcycle|train_|boat|ship_|aircraft|rover|rocket|saucer|spaceship',n):return 'Vehicles'
 if re.search(r'character|astronaut|soldier|zombie|survivor|human|knight|cleric|monk|ranger|wizard|rogue|ninja|mannequin|adventurer',n) or '/characters/' in path or p in ['ultimatedanimatedcharacter','rpgcharacters','universalanimationlibrary2'] or p in ['ultimatemodularwomen','ultimatemodularcharacters'] and '/individual characters/' in path:return 'Characters'
 if re.search(r'animal|cow|horse|pig_|dog|cat_|chick|fish|shark|dolphin|rabbit|panda|bird|deer|wolf|alpaca|llama|fox',n):return 'Animals'
 if re.search(r'enemy|alien|monster|golem|demon',n):return 'Monsters'
 if re.search(r'tree|plant|flower|grass|bush|rock|cactus|mushroom|crop|water|terrain',n) or p in ['nature-kit','mini-forest','ultimatestylizednature','stylizednaturemegakit','ultimatecrops','texturedfantasynature']:return 'Nature'
 if re.search(r'wall|floor|ceiling|roof|window|door|arch|stairs|railroad|road|tile|house|building|tower|bridge|column|balcony|pillar',n) or re.search(r'city-kit|castle-kit|dungeon|building|village|modularscifi',p):return 'Buildings'
 return 'Props'

def main():
 ap=argparse.ArgumentParser();ap.add_argument('--cache',type=Path,required=True);ap.add_argument('--blender',type=Path);ap.add_argument('--download',action='store_true');args=ap.parse_args();cache=args.cache;cache.mkdir(parents=True,exist_ok=True)
 sources=json.loads((ROOT/'scripts/assets/free-model-sources.json').read_text());old={who:json.loads((ROOT/f'assets/free/{who}/models.json').read_text()) for who in ['kenney','quaternius']};existing={a['id']:a for group in old.values() for a in group};records={who:[] for who in old};jobs=[];report=[]
 def archive(source):
  candidates=[cache/(source['id']+'-complete.zip'),cache/(source['id']+'.zip')];target=next((p for p in candidates if p.exists()),candidates[0])
  if not target.exists():
   if not args.download:raise FileNotFoundError(target)
   with urllib.request.urlopen(source['url'],timeout=180) as response,target.open('wb') as output:
    while payload:=response.read(1024*1024):output.write(payload)
  if digest(target.read_bytes())!=source['sha256']:raise ValueError('Archive hash mismatch: '+source['id'])
  return zipfile.ZipFile(target)
 if args.download:
  def prefetch(source):
   with archive(source):pass
   return source['id']
  with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
   for id in pool.map(prefetch,sources):print('Verified source archive',id,flush=True)
 # Preserve already integrated Quaternius models and their stable IDs.
 records['quaternius']=old['quaternius'][:51]
 full=next(s for s in sources if s['id']=='kenney-full-library');z=archive(full);prefix=z.namelist()[0];catalog=json.loads(z.read(prefix+'catalog.json'));basePacks={p['id'] for p in catalog['packs']}
 (ROOT/'assets/free/kenney/CC0-source-library.txt').write_bytes(z.read(prefix+'LICENSE'))
 for pack in catalog['packs']:
  source={'pack':pack['id'],'author':'Kenney','name':full.get('packNames',{}).get(pack['id'],pack['name']),'sourceUrl':pack['url']}
  for m in pack['models']:
   data=z.read(prefix+m['file']);id='free-'+pack['id']+'-'+Path(m['file']).stem;target=ROOT/'assets/free/kenney'/pack['id']/Path(m['file']).name;target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(data);j,_=gltf_read(data)
   r=record(source,id,target,m['name'],data,j,m['file'],full);r['sourceFile']='https://raw.githubusercontent.com/Hidencod/tge-assets/d4597ae135b1c2abe272da8f2b0797e10f06cb45/'+m['file']
   if id in existing:r.update({k:existing[id][k] for k in ['normalizedSize','triangles','thumbnailUrl'] if k in existing[id]})
   else:
    thumb=target.parent/'previews'/(id+'.webp');thumb.parent.mkdir(exist_ok=True);thumb.write_bytes(z.read(prefix+m['thumb']));r['thumbnailUrl']='./'+str(thumb.relative_to(ROOT))
   records['kenney'].append(r)
 for source in sources:
  if source['id']=='kenney-full-library' or source.get('pack') in basePacks and source['author']=='Kenney' or source['id']=='quaternius-ultimatemonsters':continue
  who=source['author'].lower();z=archive(source);names=z.namelist();dest=ROOT/f'assets/free/{who}'/source['pack'];dest.mkdir(parents=True,exist_ok=True)
  notices=[n for n in names if n.lower().endswith(('.txt','.md')) and ('license' in n.lower() or 'licence' in n.lower())]
  own=[n for n in notices if 'provenance' not in n.lower()]
  if not any('CC0' in z.read(n).decode(errors='replace') for n in own):
   # A handful of old archives had only a short author credit. Keep the exact
   # original notice plus the archived per-pack CC0 evidence; never infer QAL.
   report.append({'pack':source['id'],'note':'CC0 per original pack page; short or absent archive notice'})
  for i,n in enumerate(notices): (dest/('SOURCE-LICENSE-'+str(i)+'.txt')).write_bytes(z.read(n))
  (dest/'CREDITS.txt').write_text(source['author']+'\n'+source['sourceUrl']+'\nCC0 1.0 Universal\nSource archive SHA-256: '+source['sha256']+'\n')
  if source['id'].startswith('kenney-animated-'):
   folder=extract(z,cache/source['id']);
   for skin in sorted(folder.glob('Skins/*.png')):
    id='free-'+source['pack']+'-'+slug(skin.stem);target=dest/(slug(skin.stem)+'.glb');r=record(source,id,target,re.sub('([a-z])([A-Z])',r'\1 \2',skin.stem),b'',{},'Model/characterMedium.fbx',source);r['category']='Characters';records[who].append(r);jobs.append({'source':str(folder/'Model/characterMedium.fbx'),'target':str(target),'folder':str(folder),'skin':str(skin),'animations':[str(p) for p in sorted((folder/'Animations').glob('*.fbx'))],'id':id})
   continue
  options={}
  for n in names:
   suffix=Path(n).suffix.lower()
   if suffix not in ['.glb','.gltf','.fbx','.obj'] or n.startswith('Derived-') or '/__MACOSX/' in n:continue
   # Prefer native glTF, then animated FBX, then OBJ. Duplicate engine exports
   # share one entry; modular pieces remain individual usable scene assets.
   key=slug(Path(n).stem);score={'.glb':0,'.gltf':1,'.fbx':2,'.obj':3}[suffix]+(.2 if 'unity' in n.lower() else 0)
   if key not in options or score<options[key][0]:options[key]=(score,n)
  folder=None;converted=0
  for key,(_,n) in sorted(options.items()):
   id=('free-' if who=='kenney' else 'quaternius-')+source['pack']+'-'+key;target=dest/(key+'.glb');data=z.read(n);j={};name=re.sub('([a-z])([A-Z])',r'\1 \2',Path(n).stem).replace('_',' ').replace('-',' ')
   if Path(n).suffix.lower() in ['.glb','.gltf']:
    try:payload,j=embed_gltf(data,n,z);target.write_bytes(payload)
    except Exception as e:report.append({'pack':source['id'],'file':n,'error':str(e)});continue
    r=record(source,id,target,name,payload,j,n,source);r['sourceSha256']=digest(data);records[who].append(r)
   else:
    if folder is None:folder=extract(z,cache/source['id'])
    r=record(source,id,target,name,b'',{},n,source);r['sourceSha256']=digest(data);records[who].append(r);jobs.append({'source':str(folder/n),'target':str(target),'folder':str(folder),'id':id});converted+=1
  print(source['id'],len(options),'entries,',converted,'DCC conversions',flush=True)
 (cache/'conversion-jobs.json').write_text(json.dumps(jobs,ensure_ascii=False,indent=2))
 if jobs:
  if not args.blender:raise ValueError('--blender is required for FBX/OBJ conversions')
  subprocess.run([str(args.blender),'--background','--factory-startup','--threads','2','--python',str(ROOT/'scripts/assets/convert-models-blender.py'),'--',str(cache/'conversion-jobs.json')],check=True)
  failures=json.loads((cache/'conversion-results.json').read_text());failed={r['id'] for r in failures if 'error' in r};report.extend(failures)
  for who in records:
   records[who]=[r for r in records[who] if r['id'] not in failed]
 jobIds={job['id'] for job in jobs}
 for who,group in records.items():
  for r in group:
   target=ROOT/r['url'][2:];data=target.read_bytes()
   if r['id'] in jobIds:
    data,j=embed_gltf(data,target.name,zipfile.ZipFile(io.BytesIO(empty_zip())),repairOpacity=True);target.write_bytes(data);r['textureFiles']=['./assets/free/textures/'+Path(image['uri']).name for image in j.get('images',[]) if 'uri' in image]
   j,_=gltf_read(data);r.update(sha256=digest(data),bytes=len(data),animationClips=[a.get('name','Animation') for a in j.get('animations',[])])
  (ROOT/f'assets/free/{who}/models.json').write_text(json.dumps(group,ensure_ascii=False,indent=2)+'\n')
 (ROOT/'assets/free/textures.json').write_text(json.dumps(list(TEXTURES.values()),indent=2)+'\n')
 (ROOT/'scripts/assets/import-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
 print('TOTAL',[(who,len(group),sum(a['bytes'] for a in group)) for who,group in records.items()],flush=True)

def record(source,id,target,name,data,j,filename,archive):
 return {'textureFiles':['./assets/free/textures/'+Path(image['uri']).name for image in j.get('images',[]) if 'uri' in image], 'id':id,'name':name,'category':category(source,filename,j),'shape':'glb','url':'./'+str(target.relative_to(ROOT)),'license':'CC0-1.0','author':source['author'],'collection':source['author']+' inclus','pack':source['pack'],'packName':source['name'],'sourceUrl':source['sourceUrl'],'sourceFile':filename,'archiveUrl':archive['url'],'archiveSha256':archive['sha256'],'sha256':digest(data),'bytes':len(data),'animationClips':[a.get('name','Animation') for a in j.get('animations',[])]}
def empty_zip():
 out=io.BytesIO()
 with zipfile.ZipFile(out,'w'):pass
 return out.getvalue()
def extract(z,folder):
 folder.mkdir(parents=True,exist_ok=True)
 for n in z.namelist():
  name=PurePosixPath(n)
  if name.is_absolute() or '..' in name.parts:raise ValueError('Unsafe archive path')
  if n.endswith('/') or Path(n).suffix.lower() not in ['.fbx','.obj','.mtl','.png','.jpg','.jpeg','.txt','.bin','.gltf','.glb']:continue
  target=folder/n;target.parent.mkdir(parents=True,exist_ok=True)
  if not target.exists():target.write_bytes(z.read(n))
 return folder
if __name__=='__main__':main()
