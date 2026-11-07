"""Orthographic mesh thumbnails with per-pixel depth and interpolated UVs.
No painter ordering: intersecting triangles and recessed surfaces occlude correctly.
"""
import numpy as np
from PIL import Image

def rasterize(xy, depths, uv, faces, atlas, shades, size):
    pixels=np.zeros((size,size,4),dtype=np.uint8)
    zbuffer=np.full((size,size),-np.inf)
    texture=np.asarray(atlas.convert('RGB'));height,width=texture.shape[:2]
    for tri,shade in zip(faces,shades):
        a,b,c=xy[tri]
        low=np.maximum(np.floor(np.min([a,b,c],axis=0)).astype(int),0)
        high=np.minimum(np.ceil(np.max([a,b,c],axis=0)).astype(int),size-1)
        if np.any(low>high):continue
        denominator=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1])
        if abs(denominator)<1e-10:continue
        xx,yy=np.meshgrid(np.arange(low[0],high[0]+1)+.5,np.arange(low[1],high[1]+1)+.5)
        w0=((b[1]-c[1])*(xx-c[0])+(c[0]-b[0])*(yy-c[1]))/denominator
        w1=((c[1]-a[1])*(xx-c[0])+(a[0]-c[0])*(yy-c[1]))/denominator
        w2=1-w0-w1
        z=w0*depths[tri[0]]+w1*depths[tri[1]]+w2*depths[tri[2]]
        region=np.s_[low[1]:high[1]+1,low[0]:high[0]+1]
        visible=(w0>=-1e-8)&(w1>=-1e-8)&(w2>=-1e-8)&(z>zbuffer[region]+1e-10)
        if not np.any(visible):continue
        tx=w0*uv[tri[0],0]+w1*uv[tri[1],0]+w2*uv[tri[2],0]
        ty=w0*uv[tri[0],1]+w1*uv[tri[1],1]+w2*uv[tri[2],1]
        colors=texture[np.floor(ty*height).astype(int)%height,np.floor(tx*width).astype(int)%width]
        target=pixels[region];target[visible,:3]=np.clip(colors[visible]*shade,0,255).astype(np.uint8);target[visible,3]=255
        zbuffer[region][visible]=z[visible]
    return Image.fromarray(pixels)

def render_mesh_thumbnail(pos,uv,faces,atlas,size=256):
    # Render at double resolution for clean wheel edges and thin silhouettes.
    resolution=size*2
    points=pos-(pos.max(0)+pos.min(0))/2
    right=np.array([1.,0.,-1.]);right/=np.linalg.norm(right)
    up=np.array([-.5,np.sqrt(1.5),-.5]);up/=np.linalg.norm(up)
    direction=np.cross(right,up)
    xy=np.column_stack((points@right,-points@up))
    xy=(xy-(xy.min(0)+xy.max(0))/2)*(resolution*.8125/max(np.ptp(xy,axis=0)))+resolution/2
    light=np.array([-.4,.85,.35]);light/=np.linalg.norm(light)
    normals=np.cross(pos[faces[:,1]]-pos[faces[:,0]],pos[faces[:,2]]-pos[faces[:,0]])
    normals/=np.maximum(np.linalg.norm(normals,axis=1,keepdims=True),1e-9)
    shades=.58+.42*np.maximum(0,normals@light)
    return rasterize(xy,points@direction,uv,faces,atlas,shades,resolution).resize((size,size),Image.Resampling.LANCZOS)
