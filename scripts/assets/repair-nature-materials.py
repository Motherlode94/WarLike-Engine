"""Restore original Ruins nature textures omitted by the archive's OBJ/MTL links.
Usage: python scripts/assets/repair-nature-materials.py /path/to/original/data.zip
Only the pinned archive and explicit material-to-image mapping are accepted.
"""
import hashlib,json,struct,sys,zipfile,subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
ARCHIVE_SHA='add26f9403ca1c6354566c2366aadca806eab4d4971fa35c0d4b48c080b0c447'
MATERIALS={'Texture_Leaves':('Textures/Leaf_Texture.png','image/png'),'Bark':('Textures/Bark_Texture.jpg','image/jpeg')}
archive=Path(sys.argv[1]).read_bytes();assert hashlib.sha256(archive).hexdigest()==ARCHIVE_SHA,'Unverified source archive'
from io import BytesIO
source=zipfile.ZipFile(BytesIO(archive));manifest=ROOT/'assets/free/quaternius/models.json';models=json.loads(manifest.read_text());count=0
for asset in models:
 if asset['pack']!='ultimatemodularruins' or asset['category']!='Nature':continue
 if asset.get('materialRepair',{}).get('recipe')=='ruins-original-textures-v1':continue
 path=ROOT/asset['url'];original=path.read_bytes();json_size=struct.unpack_from('<I',original,12)[0];doc=json.loads(original[20:20+json_size]);offset=20+json_size
 binary=bytearray(original[offset+8:offset+8+struct.unpack_from('<I',original,offset)[0]])
 repairs=[]
 for material in doc.get('materials',[]):
  if material.get('name') not in MATERIALS:continue
  pbr=material.setdefault('pbrMetallicRoughness',{})
  if pbr.get('baseColorTexture'):continue
  name,mime=MATERIALS[material['name']];payload=source.read(name)
  while len(binary)%4:binary.append(0)
  view=len(doc.setdefault('bufferViews',[]));doc['bufferViews'].append({'buffer':0,'byteOffset':len(binary),'byteLength':len(payload)});binary.extend(payload)
  image=len(doc.setdefault('images',[]));doc['images'].append({'name':Path(name).stem,'mimeType':mime,'bufferView':view})
  sampler=len(doc.setdefault('samplers',[]));doc['samplers'].append({'magFilter':9729,'minFilter':9987,'wrapS':10497,'wrapT':10497})
  texture=len(doc.setdefault('textures',[]));doc['textures'].append({'source':image,'sampler':sampler});pbr['baseColorTexture']={'index':texture};pbr['baseColorFactor']=[1,1,1,1]
  if material['name']=='Texture_Leaves':material.update(alphaMode='MASK',alphaCutoff=.5,doubleSided=True)
  repairs.append({'material':material['name'],'sourceFile':name,'sha256':hashlib.sha256(payload).hexdigest()})
 if not repairs:continue
 doc['buffers'][0]['byteLength']=len(binary)
 while len(binary)%4:binary.append(0)
 encoded=json.dumps(doc,separators=(',',':')).encode();encoded+=b' '*((-len(encoded))%4)
 result=struct.pack('<III',0x46546c67,2,28+len(encoded)+len(binary))+struct.pack('<II',len(encoded),0x4e4f534a)+encoded+struct.pack('<II',len(binary),0x004e4942)+binary
 path.write_bytes(result);asset['bytes']=len(result);asset['sha256']=hashlib.sha256(result).hexdigest()
 asset['materialRepair']={'recipe':'ruins-original-textures-v1','sourceArchiveSha256':ARCHIVE_SHA,'previousGlbSha256':hashlib.sha256(original).hexdigest(),'textures':repairs}
 count+=1
if count:
 # Keep the shared catalog in its existing JavaScript JSON number format.
 formatted=subprocess.run(['node','-e',"let s='';process.stdin.on('data',c=>s+=c);process.stdin.on('end',()=>process.stdout.write(JSON.stringify(JSON.parse(s),null,2)+'\\n'))"],input=json.dumps(models),text=True,capture_output=True,check=True).stdout
 manifest.write_text(formatted)
print('Restored original textures in',count,'nature GLBs')
