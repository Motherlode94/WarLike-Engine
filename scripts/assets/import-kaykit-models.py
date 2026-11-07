"""Rebuild bundled gameplay-oriented KayKit packs from the pinned official KayKit checkout.
Usage: python scripts/assets/import-kaykit-models.py /path/to/checkout pack-id
Only JSON, binary geometry and PNG inputs are read; no source code is executed.
"""
import hashlib,json,struct,sys,subprocess
from pathlib import Path
import numpy as np
from PIL import Image
from importlib.util import spec_from_file_location,module_from_spec
_thumbnail_spec=spec_from_file_location("mesh_thumbnail",Path(__file__).with_name("mesh-thumbnail.py"))
_thumbnail_module=module_from_spec(_thumbnail_spec);_thumbnail_spec.loader.exec_module(_thumbnail_module)
render_mesh_thumbnail=_thumbnail_module.render_mesh_thumbnail
ROOT=Path(__file__).resolve().parents[2]
PACKS={
 'furniture-bits':('KayKit-Furniture-Bits-1.0','96d5930a8dbdb363409bbc2d3341718b00e17c9c','Furniture Bits',['rp','simulation','lifesim','horror']),
 'city-builder-bits':('KayKit-City-Builder-Bits-1.0','63976910ca04d16f0fc531b9c614244be8128713','City Builder Bits',['company','battlefield','tactical','openworld','rp','simulation','rts']),
 'space-base-bits':('KayKit-Space-Base-Bits-1.0','6dfbcac9927d06283752c4defd4882cfe0d29666','Space Base Bits',['survival','simulation','rts','fourx'])
}
pack=sys.argv[2];repo,REVISION,title,genres=PACKS[pack]
SOURCE='https://github.com/KayKit-Game-Assets/'+repo
src=Path(sys.argv[1]).resolve()
assert subprocess.check_output(['git','-C',str(src),'rev-parse','HEAD'],text=True).strip()==REVISION
folder=next(src.glob('addons/*/Assets/gltf'))
out=ROOT/'assets/free/kaykit'/pack; (out/'previews').mkdir(parents=True,exist_ok=True)
license=(src/'LICENSE.txt').read_bytes(); assert b'Creative Commons Zero' in license
(out/'LICENSE.txt').write_bytes(license)
records=[]; inputs={}
def digest(b):return hashlib.sha256(b).hexdigest()
def read(p):
 b=p.read_bytes();inputs[str(p.relative_to(src))]=digest(b);return b
def accessor(doc,raw,i):
 a=doc['accessors'][i];v=doc['bufferViews'][a['bufferView']];n={'SCALAR':1,'VEC2':2,'VEC3':3}[a['type']]
 return np.frombuffer(raw,dtype={5126:'<f4',5123:'<u2',5125:'<u4'}[a['componentType']],count=a['count']*n,offset=v.get('byteOffset',0)+a.get('byteOffset',0)).reshape(-1,n)
for path in sorted(folder.glob('*.gltf')):
 doc=json.loads(read(path));assert len(doc['buffers'])==1
 raw=read(folder/doc['buffers'][0]['uri']);binary=bytearray(raw)
 for image in doc.get('images',[]):
  uri=image.pop('uri');imageBytes=read(folder/uri)
  while len(binary)%4:binary.append(0)
  image['bufferView']=len(doc['bufferViews']);doc['bufferViews'].append({'buffer':0,'byteOffset':len(binary),'byteLength':len(imageBytes)})
  binary.extend(imageBytes)
 doc['buffers']=[{'byteLength':len(binary)}]
 while len(binary)%4:binary.append(0)
 js=json.dumps(doc,separators=(',',':')).encode();js+=b' '*((-len(js))%4)
 glb=struct.pack('<III',0x46546c67,2,28+len(js)+len(binary))+struct.pack('<II',len(js),0x4e4f534a)+js+struct.pack('<II',len(binary),0x004e4942)+binary
 name=path.stem.lower().replace('_','-');assetId='kaykit-'+pack+'-'+name
 target=out/(name+'.glb');target.write_bytes(glb)
 positions=[];uvs=[];faces=[]
 def visit(index,parent):
  node=doc['nodes'][index]
  if 'matrix' in node:matrix=np.array(node['matrix']).reshape(4,4).T
  else:
   x,y,z,w=node.get('rotation',[0,0,0,1]);matrix=np.eye(4)
   matrix[:3,:3]=np.array([[1-2*(y*y+z*z),2*(x*y-z*w),2*(x*z+y*w)],[2*(x*y+z*w),1-2*(x*x+z*z),2*(y*z-x*w)],[2*(x*z-y*w),2*(y*z+x*w),1-2*(x*x+y*y)]])@np.diag(node.get('scale',[1,1,1]));matrix[:3,3]=node.get('translation',[0,0,0])
  matrix=parent@matrix
  if 'mesh' in node:
   for prim in doc['meshes'][node['mesh']]['primitives']:
    points=accessor(doc,raw,prim['attributes']['POSITION']);offset=sum(len(x) for x in positions)
    positions.append((np.column_stack((points,np.ones(len(points))))@matrix.T)[:,:3]);uvs.append(accessor(doc,raw,prim['attributes']['TEXCOORD_0']));faces.append(accessor(doc,raw,prim['indices']).reshape(-1,3)+offset)
  for child in node.get('children',[]):visit(child,matrix)
 for index in doc['scenes'][doc.get('scene',0)]['nodes']:visit(index,np.eye(4))
 pos=np.concatenate(positions);uv=np.concatenate(uvs);indices=np.concatenate(faces)
 size=pos.max(0)-pos.min(0)
 # Pixel depth testing prevents hidden surfaces bleeding through vehicles/crates.
 atlas=Image.open(next(folder.glob('*.png')))
 img=render_mesh_thumbnail(pos,uv,indices,atlas)
 thumb=out/'previews'/(assetId+'.png');img.save(thumb)
 prefix='./'+str(out.relative_to(ROOT))
 records.append(dict(id=assetId,name=path.stem.replace('_',' ').title(),category=('Vehicles' if name.startswith(('car-','spacetruck','lander')) else 'Buildings' if name.startswith(('building-','basemodule','cargodepot','tunnel','structure','drill-','landingpad')) else 'Props'),shape='glb',url=prefix+'/'+target.name,license='CC0-1.0',author='KayKit',collection='KayKit inclus',pack=pack,packName=title,genres=genres,sourceUrl=SOURCE,normalizedSize=(size/max(size)).tolist(),triangles=len(indices),thumbnailUrl=prefix+'/previews/'+thumb.name,animationClips=[],textureFiles=[],bytes=len(glb),sha256=digest(glb),sourceFile=str(path.relative_to(src)),sourceRevision=REVISION))
(out/'models.json').write_text(json.dumps(records,indent=2)+'\n')
(out/'provenance.json').write_text(json.dumps(dict(source=SOURCE,revision=REVISION,license='CC0-1.0',inputs=inputs,outputs={r['url']:r['sha256'] for r in records}),indent=2)+'\n')
print(f'{len(records)} textured GLBs with individual mesh previews')

allRecords=[]
for folder in sorted((ROOT/'assets/free/kaykit').glob('*/models.json')):allRecords.extend(json.loads(folder.read_text()))
(ROOT/'assets/free/kaykit/models.json').write_text(json.dumps(allRecords,indent=2)+'\n')
(ROOT/'js/assets/kaykit-game-assets.js').write_text('// Official KayKit CC0 packs; original geometry and embedded textures.\nexport const kaykitModels3d='+json.dumps(allRecords,separators=(',',':'))+';\n')
