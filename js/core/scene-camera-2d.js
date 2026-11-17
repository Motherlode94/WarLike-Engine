// Game camera for the 2D Web runtime. Shares scene data with WarLike Editor.
// Existing scenes without a Camera2D retain the legacy player-follow settings.
const num=(v,fallback=0)=>Number.isFinite(Number(v))?Number(v):fallback;
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
export const defaultSceneCamera2d=()=>({
 enabled:true,priority:0,mode:'follow',targetId:0,zoom:1,
 followSharpness:9,offsetX:0,offsetY:0,pixelPerfect:false
});
export function activeSceneCamera2d(entities=[]){
 return entities.filter(o=>o&&o.camera2d&&o.camera2d.enabled!==false&&o.enabled!==false)
  .sort((a,b)=>num(b.camera2d.priority)-num(a.camera2d.priority)||a.id-b.id)[0]||null;
}
export function targetForCamera2d(camera,entities=[]){
 const id=num(camera?.camera2d?.targetId,0);
 return entities.find(o=>o!==camera&&id>0&&o.id===id)||
  entities.find(o=>o!==camera&&(o.type==='player'||o.playable2d===true))||null;
}
export function cameraView2d(camera,entities,viewport,dt,{snap=false,previous=null}={}){
 if(!camera?.camera2d||!viewport?.width||!viewport?.height)return null;
 const settings=camera.camera2d,zoom=clamp(num(settings.zoom,1),.2,5);
 let cx=num(camera.x)+num(camera.w)/2,cy=num(camera.y)+num(camera.h)/2;
 if(settings.mode==='follow'){
  const player=targetForCamera2d(camera,entities);
  if(player){cx=num(player.x)+num(player.w)/2;cy=num(player.y)+num(player.h)/2;}
 }
 cx+=num(settings.offsetX);cy+=num(settings.offsetY);
 const desiredX=viewport.width/2-cx*zoom,desiredY=viewport.height/2-cy*zoom;
 const sharpness=clamp(num(settings.followSharpness,9),0,60);
 const factor=snap||!previous||settings.mode!=='follow'?1:1-Math.exp(-sharpness*Math.max(0,dt));
 let x=previous?num(previous.x)+(desiredX-num(previous.x))*factor:desiredX;
 let y=previous?num(previous.y)+(desiredY-num(previous.y))*factor:desiredY;
 if(settings.pixelPerfect){x=Math.round(x);y=Math.round(y);}
 return {x,y,zoom};
}
