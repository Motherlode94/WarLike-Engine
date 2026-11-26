// Sprite-sheet animation driven by rendering time; no gameplay state duplication.
const finite=(v,fallback)=>Number.isFinite(Number(v))?Number(v):fallback;
export const defaultSpriteAnimation2d=()=>({enabled:false,frames:4,fps:8,loop:true,preview:false});
export function spriteSheetFrame2d(animation,timeSeconds,playing=false){
 if(!animation?.enabled||!(playing||animation.preview))return {index:0,count:1};
 const count=Math.max(1,Math.min(256,Math.floor(finite(animation.frames,1))));
 const fps=Math.max(.1,Math.min(120,finite(animation.fps,8)));
 const frame=Math.max(0,Math.floor(Math.max(0,finite(timeSeconds,0))*fps));
 return {index:animation.loop===false?Math.min(count-1,frame):frame%count,count};
}
export function drawSpriteSheet2d(ctx,image,entity,timeSeconds,playing=false){
 if(!image?.complete||!image.naturalWidth||!image.naturalHeight)return false;
 const animation=entity.spriteAnimation2d;
 const {index,count}=spriteSheetFrame2d(animation,timeSeconds,playing);
 if(animation?.enabled&&animation.grid){
  const grid=animation.grid,columns=grid.columns,rows=grid.rows;
  if(!Number.isInteger(columns)||!Number.isInteger(rows)||columns<1||rows<1||columns*rows>4096)return false;
  const sequence=Array.isArray(grid.sequence)?grid.sequence:Array.from({length:Math.min(256,columns*rows)},(_,i)=>i);
  if(!sequence.length||sequence.length>256||sequence.some(i=>!Number.isInteger(i)||i<0||i>=columns*rows))return false;
  const frame=spriteSheetFrame2d({...animation,frames:sequence.length},timeSeconds,playing).index;
  const cell=sequence[frame],fw=image.naturalWidth/columns,fh=image.naturalHeight/rows;
  if(fw<1||fh<1)return false;
  ctx.drawImage(image,(cell%columns)*fw,Math.floor(cell/columns)*fh,fw,fh,entity.x,entity.y,entity.w,entity.h);
  return true;
 }
 const frameWidth=image.naturalWidth/count;
 if(!Number.isFinite(frameWidth)||frameWidth<1)return false;
 ctx.drawImage(image,index*frameWidth,0,frameWidth,image.naturalHeight,entity.x,entity.y,entity.w,entity.h);
 return true;
}
