"""Render decoded local GLB parts with depth, original colors and foliage alpha.
Usage: node scripts/assets/export-nature-preview-jobs.mjs /tmp/jobs
       python scripts/assets/render-nature-previews.py /tmp/jobs/jobs.json
"""
import json,sys
from pathlib import Path
from concurrent.futures import ProcessPoolExecutor
import numpy as np
from PIL import Image

def linear_to_srgb(c):return np.where(c<=.0031308,c*12.92,1.055*np.maximum(c,0)**(1/2.4)-.055)
def srgb_to_linear(c):return np.where(c<=.04045,c/12.92,((c+.055)/1.055)**2.4)
def wrap(values,mode):
 if mode==33071:return np.clip(values,0,1-1e-8)
 if mode==33648:
  values=np.mod(values,2);return np.minimum(np.where(values>1,2-values,values),1-1e-8)
 return np.mod(values,1)

def render_parts(parts,size=256):
 resolution=size*2
 vertices=[np.asarray(p['vertices']).reshape(-1,6) for p in parts]
 positions=np.concatenate([v[:,:3] for v in vertices]);center=(positions.min(0)+positions.max(0))/2
 right=np.array([1.,0.,-1.]);right/=np.linalg.norm(right)
 up=np.array([-.5,np.sqrt(1.5),-.5]);up/=np.linalg.norm(up);direction=np.cross(right,up)
 projected=np.column_stack(((positions-center)@right,-(positions-center)@up))
 offset=(projected.min(0)+projected.max(0))/2;scale=resolution*.8125/max(np.ptp(projected,axis=0))
 light=np.array([-.4,.85,.35]);light/=np.linalg.norm(light)
 pixels=np.zeros((resolution,resolution,4),np.float32);zbuffer=np.full((resolution,resolution),-np.inf);fragments=[]
 # Opaque/cutout surfaces write depth first; blend fragments are resolved per pixel.
 ordered=sorted(zip(parts,vertices),key=lambda pair:pair[0].get('alphaMode')=='BLEND')
 for part,v in ordered:
  pos=v[:,:3]-center;xy=(np.column_stack((pos@right,-pos@up))-offset)*scale+resolution/2;depths=pos@direction
  uv=np.asarray(part.get('texcoords',np.zeros((len(v),2)))).reshape(-1,2)
  color=np.array(part.get('color',[1,1,1,1]),np.float32)
  vc=np.asarray(part.get('vertexColors',np.ones((len(v),4)))).reshape(-1,4)
  texture=np.asarray(part.get('image',Image.new('RGBA',(1,1),'white')).convert('RGBA'),np.float32)/255
  th,tw=texture.shape[:2];texture=texture.copy();texture[:,:,:3]=srgb_to_linear(texture[:,:,:3])
  normals=v[:,3:];normals=normals/np.maximum(np.linalg.norm(normals,axis=1,keepdims=True),1e-9)
  shading=np.ones(len(v)) if part.get('unlit') else .58+.42*np.maximum(0,normals@light)
  mode=part.get('alphaMode','OPAQUE');emissive=np.asarray(part.get('emissive',[0,0,0]))
  for tri in np.arange(len(v)).reshape(-1,3):
   a,b,c=xy[tri];lo=np.maximum(np.floor(np.min([a,b,c],axis=0)).astype(int),0);hi=np.minimum(np.ceil(np.max([a,b,c],axis=0)).astype(int),resolution-1)
   if np.any(lo>hi):continue
   den=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1])
   if abs(den)<1e-10:continue
   xx,yy=np.meshgrid(np.arange(lo[0],hi[0]+1)+.5,np.arange(lo[1],hi[1]+1)+.5)
   w0=((b[1]-c[1])*(xx-c[0])+(c[0]-b[0])*(yy-c[1]))/den;w1=((c[1]-a[1])*(xx-c[0])+(a[0]-c[0])*(yy-c[1]))/den;w2=1-w0-w1
   weights=np.stack((w0,w1,w2),axis=-1);z=weights@depths[tri];region=np.s_[lo[1]:hi[1]+1,lo[0]:hi[0]+1]
   visible=(w0>=-1e-8)&(w1>=-1e-8)&(w2>=-1e-8)&(z>zbuffer[region]+1e-10)
   if not np.any(visible):continue
   texcoords=weights@uv[tri];tx=np.minimum((wrap(texcoords[:,:,0],part.get('wrapS',10497))*tw).astype(int),tw-1);ty=np.minimum((wrap(texcoords[:,:,1],part.get('wrapT',10497))*th).astype(int),th-1)
   rgba=texture[ty,tx]*color*(weights@vc[tri]);rgba[:,:,:3]=rgba[:,:,:3]*(weights@shading[tri])[:,:,None]+emissive
   if mode=='MASK':visible &= rgba[:,:,3]>=part.get('alphaCutoff',.5)
   elif mode=='BLEND':visible &= rgba[:,:,3]>1e-5
   if not np.any(visible):continue
   if mode=='BLEND':
    y,x=np.nonzero(visible);fragments.append(((y+lo[1])*resolution+x+lo[0],z[visible],rgba[visible]))
   else:
    rgba[:,:,3]=1;pixels[region][visible]=rgba[visible];zbuffer[region][visible]=z[visible]
 if fragments:
  ids=np.concatenate([f[0] for f in fragments]);zs=np.concatenate([f[1] for f in fragments]);colors=np.concatenate([f[2] for f in fragments]);order=np.lexsort((-zs,ids));ids=ids[order];colors=colors[order]
  _,start,counts=np.unique(ids,return_index=True,return_counts=True);ranks=np.arange(len(ids))-np.repeat(start,counts)
  transmission=np.ones(resolution*resolution,np.float32);accum=np.zeros((resolution*resolution,3),np.float32)
  for rank in range(int(ranks.max())+1):
   active=ranks==rank;idx=ids[active];rgba=colors[active];alpha=np.clip(rgba[:,3],0,1)
   accum[idx]+=transmission[idx,None]*rgba[:,:3]*alpha[:,None];transmission[idx]*=1-alpha
  flat=pixels.reshape(-1,4);alpha=1-transmission+transmission*flat[:,3]
  rgb=accum+transmission[:,None]*flat[:,:3]*flat[:,3,None];flat[:,:3]=rgb/np.maximum(alpha[:,None],1e-10);flat[:,3]=alpha
 pixels[:,:,:3]=linear_to_srgb(pixels[:,:,:3]);image=Image.fromarray(np.clip(pixels*255,0,255).astype(np.uint8))
 return image.resize((size,size),Image.Resampling.LANCZOS)

def render_job(path):
 job=json.loads(Path(path).read_text());parts=[]
 for part in job['parts']:
  p=dict(part)
  for field in ['vertices','texcoords','vertexColors']:
   if field in p:p[field]=np.fromfile(p[field],dtype='<f4')
  if p.get('texture'):p['image']=Image.open(p['texture']).convert('RGBA')
  parts.append(p)
 image=render_parts(parts);image.save(job['target']);return job['id']
if __name__=='__main__':
 jobs=json.loads(Path(sys.argv[1]).read_text())
 if len(sys.argv)>2:jobs=[p for p in jobs if sys.argv[2] in p]
 with ProcessPoolExecutor(max_workers=4) as pool:
  for i,_ in enumerate(pool.map(render_job,jobs),1):
   if i%50==0:print(i,'/',len(jobs),flush=True)
 print('Rendered',len(jobs),'nature previews with original materials',flush=True)
