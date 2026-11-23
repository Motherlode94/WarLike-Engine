// Visualise a Gaia world BEFORE inserting it into the Engine scene.
// Uses the authoritative heightfield schema and pure canvas projection;
// never constructs a second terrain, changes a height sample or starts Play.
import {gaiaWorldToEntities,heightfieldAt3d} from './gaia-terrain-physics.js';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const finite=(v,d)=>Number.isFinite(v)?v:d;

export function gaiaWorldPreviewMesh(world,{cellsPerTile=18}={}){
 if(!Number.isInteger(cellsPerTile)||cellsPerTile<2||cellsPerTile>48)throw Error('Résolution d’aperçu Gaia invalide');
 const entities=gaiaWorldToEntities(world);
 const faces=[];
 let minX=Infinity,maxX=-Infinity,minZ=Infinity,maxZ=-Infinity,minY=Infinity,maxY=-Infinity;
 for(const entity of entities){
  const t=entity.terrainHeightfield,half=t.size/2;
  minX=Math.min(minX,t.offsetX-half);maxX=Math.max(maxX,t.offsetX+half);
  minZ=Math.min(minZ,t.offsetZ-half);maxZ=Math.max(maxZ,t.offsetZ+half);
  const n=Math.min(cellsPerTile,t.resolution-1);
  const verts=[];
  for(let z=0;z<=n;z++){
   const row=[];
   for(let x=0;x<=n;x++){
    const px=t.offsetX-half+t.size*x/n,pz=t.offsetZ-half+t.size*z/n;
    const py=heightfieldAt3d(t,px,pz);
    if(py===null)throw Error('Échantillon Gaia hors du terrain');
    minY=Math.min(minY,py);maxY=Math.max(maxY,py);
    row.push([px,py,pz]);
   }
   verts.push(row);
  }
  for(let z=0;z<n;z++)for(let x=0;x<n;x++){
   const a=verts[z][x],b=verts[z][x+1],c=verts[z+1][x+1],d=verts[z+1][x];
   faces.push([a,c,b],[a,d,c]);
  }
 }
 return {faces,tiles:entities.length,bounds:{minX,maxX,minY,maxY,minZ,maxZ}};
}

export function drawGaiaWorldPreview(canvas,mesh,{yaw=-.65,pitch=.7,zoom=1}={}){
 if(!canvas||!mesh||!Array.isArray(mesh.faces))throw Error('Aperçu Gaia 3D invalide');
 const ctx=canvas.getContext('2d');
 if(!ctx)throw Error('Canvas 2D indisponible');
 const w=canvas.width,h=canvas.height;
 ctx.clearRect(0,0,w,h);
 const background=ctx.createLinearGradient(0,0,0,h);
 background.addColorStop(0,'#172a40');background.addColorStop(1,'#425e66');
 ctx.fillStyle=background;ctx.fillRect(0,0,w,h);
 const bounds=mesh.bounds,cx=(bounds.minX+bounds.maxX)/2,cz=(bounds.minZ+bounds.maxZ)/2,cy=(bounds.minY+bounds.maxY)/2;
 const cosY=Math.cos(yaw),sinY=Math.sin(yaw),cosP=Math.cos(clamp(pitch,.15,1.35)),sinP=Math.sin(clamp(pitch,.15,1.35));
 const project=([x,y,z])=>{
  const dx=x-cx,dz=z-cz,dy=y-cy;
  const rx=dx*cosY-dz*sinY,rz=dx*sinY+dz*cosY;
  return [rx,dy*cosP-rz*sinP,dy*sinP+rz*cosP];
 };
 const extent=Math.max(1,bounds.maxX-bounds.minX,bounds.maxZ-bounds.minZ,(bounds.maxY-bounds.minY)*2);
 const scale=Math.min(w,h)*.67/extent*clamp(finite(zoom,1),.4,3);
 const centerY=h*.54;
 const projected=mesh.faces.map(tri=>{
  const pts=tri.map(project);
  const u=tri[1].map((v,i)=>v-tri[0][i]),v=tri[2].map((n,i)=>n-tri[0][i]);
  const nx=u[1]*v[2]-u[2]*v[1],ny=u[2]*v[0]-u[0]*v[2],nz=u[0]*v[1]-u[1]*v[0];
  const norm=Math.hypot(nx,ny,nz)||1,up=Math.abs(ny/norm);
  const altitude=(tri[0][1]+tri[1][1]+tri[2][1])/3;
  const rel=(altitude-bounds.minY)/Math.max(1,bounds.maxY-bounds.minY);
  const sun=clamp(.45+.42*(nx*.35+ny*.8+nz*.45)/norm,.18,1);
  const base=up>.7?[84+rel*28,137+rel*15,93-rel*20]:[119+rel*22,112+rel*18,91+rel*25];
  const color='rgb('+base.map(n=>Math.round(clamp(n*sun,0,255))).join(',')+')';
  return {pts,depth:pts.reduce((n,p)=>n+p[2],0)/3,color};
 });
 projected.sort((a,b)=>a.depth-b.depth);
 ctx.lineWidth=.35;ctx.strokeStyle='rgba(11,27,30,.16)';
 for(const face of projected){
  ctx.beginPath();
  face.pts.forEach((p,i)=>{const x=w/2+p[0]*scale,y=centerY-p[1]*scale;if(i)ctx.lineTo(x,y);else ctx.moveTo(x,y)});
  ctx.closePath();ctx.fillStyle=face.color;ctx.fill();ctx.stroke();
 }
 ctx.fillStyle='#e2f4f0';ctx.font='12px system-ui';
 ctx.fillText('GAIA · TERRAIN 3D · '+mesh.tiles+' TUILE(S)',12,22);
 return {faces:mesh.faces.length,tiles:mesh.tiles};
}
