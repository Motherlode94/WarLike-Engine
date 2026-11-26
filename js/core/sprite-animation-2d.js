// Sprite-sheet animation driven by rendering time; no gameplay state duplication.
const finite=(v,fallback)=>Number.isFinite(Number(v))?Number(v):fallback;
export const defaultSpriteAnimation2d=()=>({enabled:false,frames:4,fps:8,loop:true,preview:false});
export function spriteSheetFrame2d(animation,timeSeconds,playing=false){
 if(!animation?.enabled||!(playing||animation.preview))return {index:0,count:1};
 const count=Math.max(1,Math.min(256,Math.floor(finite(animation.frames,1))));
 const fps=Math.max(.1,Math.min(120,finite(animation.fps,8)));
 const elapsed=Math.max(0,finite(timeSeconds,0))*fps;
 const durations=animation.grid?.durations;
 if(Array.isArray(durations)&&durations.length===count&&durations.every(v=>Number.isFinite(v)&&v>=.1&&v<=100)){
  const total=durations.reduce((a,b)=>a+b,0);let cursor=animation.loop===false?Math.min(elapsed,total):elapsed%total;
  for(let i=0;i<count;i++){if(cursor<durations[i])return {index:i,count};cursor-=durations[i];}
  return {index:count-1,count};
 }
 const frame=Math.max(0,Math.floor(elapsed));
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

const spriteClipSnapshot=a=>({frames:a.frames??4,fps:a.fps??8,loop:a.loop!==false,...(a.grid?{grid:structuredClone(a.grid)}:{})});
export function saveSpriteClip2d(animation){
 if(!Array.isArray(animation.clips))animation.clips=[{name:'default',...spriteClipSnapshot(animation)}];
 const clip=animation.clips.find(c=>c.name===animation.activeClip)||animation.clips[0];
 if(!clip)return false;Object.assign(clip,spriteClipSnapshot(animation));if(!animation.grid)delete clip.grid;animation.activeClip=clip.name;return true;
}
export function switchSpriteClip2d(animation,name){
 if(!Array.isArray(animation.clips)||!animation.clips.some(c=>c.name===name))return false;
 saveSpriteClip2d(animation);const clip=animation.clips.find(c=>c.name===name);
 animation.activeClip=name;animation.frames=clip.frames;animation.fps=clip.fps;animation.loop=clip.loop;animation.preview=false;
 if(clip.grid)animation.grid=structuredClone(clip.grid);else delete animation.grid;return true;
}
export function addSpriteClip2d(animation,name){
 name=String(name??'').trim();if(!name||name.length>60)return false;
 saveSpriteClip2d(animation);if(animation.clips.length>=64||animation.clips.some(c=>c.name===name))return false;
 animation.clips.push({name,...spriteClipSnapshot(animation)});return switchSpriteClip2d(animation,name);
}
export function renameSpriteClip2d(animation,name){
 name=String(name??'').trim();if(!name||name.length>60||!Array.isArray(animation.clips)||animation.clips.some(c=>c.name===name))return false;
 const clip=animation.clips.find(c=>c.name===animation.activeClip);if(!clip)return false;clip.name=name;animation.activeClip=name;return true;
}
