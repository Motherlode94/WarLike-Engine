import {workspace,switchWorkspace} from './workspaces.js';
import {sunAt,visibleLights,updateLighting} from './lighting.js';
// WarLike 3D Beta: self-contained WebGL perspective scene editor.
// Existing scene x/y become ground X/Z; object h is extrusion height. No remote dependencies.
import {state,notify} from './state.js';
import {record} from './history.js';
import {getAsset} from '../assets/catalog.js';
import {game} from './gameplay.js';

export const view3d={enabled:false,yaw:-.68,pitch:.62,radius:25,target:[9,0,6],drag:null,gl:null,error:null,followPlayer:true};
export const playableActor=entities=>entities.find(o=>o.type==='player'||o.type==='character'||o.type==='prefab'&&getAsset(o.assetId)?.category==='Characters')||null;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const V={
 add:(a,b)=>a.map((x,i)=>x+b[i]),sub:(a,b)=>a.map((x,i)=>x-b[i]),
 mul:(a,n)=>a.map(v=>v*n),dot:(a,b)=>a.reduce((t,v,i)=>t+v*b[i],0),
 cross:(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],
 norm:a=>{const d=Math.hypot(...a)||1;return a.map(v=>v/d)}
};
export const objectBounds3d=o=>{
 const asset=getAsset(o.assetId);
 const width=Math.max(.25,o.w/64),depth=Math.max(.25,(asset?.category==='Vehicles'?o.h*.65:o.w*.8)/64);
 const height=Math.max(.2,(asset?.category==='Buildings'?o.h*1.45:asset?.category==='Vehicles'?o.h*.60:o.h)/64);
 return {x:(o.x+o.w/2)/64,y:height/2+(Number(o.elevation3d)||0),z:(o.y+o.h/2)/64,w:width,h:height,d:depth};
};
export const sceneCamera3d=(target,yaw,pitch,radius)=>{
 const eye=[target[0]+radius*Math.cos(pitch)*Math.sin(yaw),target[1]+radius*Math.sin(pitch),target[2]+radius*Math.cos(pitch)*Math.cos(yaw)];
 const forward=V.norm(V.sub(target,eye)),right=V.norm(V.cross(forward,[0,1,0])),up=V.norm(V.cross(right,forward));
 return {eye,forward,right,up};
};
export const project3d=(p,cam,width,height)=>{
 const rel=V.sub(p,cam.eye),d=V.dot(rel,cam.forward);
 if(d<=.1)return null;
 const f=1/Math.tan(Math.PI/6);
 return {x:width/2+V.dot(rel,cam.right)*f*height/(2*d),y:height/2-V.dot(rel,cam.up)*f*height/(2*d),depth:d};
};
export const groundHit3d=(sx,sy,cam,width,height)=>{
 const f=1/Math.tan(Math.PI/6),r=V.norm(V.add(cam.forward,V.add(V.mul(cam.right,(sx-width/2)*2/(height*f)),V.mul(cam.up,(height/2-sy)*2/(height*f)))));
 if(Math.abs(r[1])<1e-5)return null;
 const t=-cam.eye[1]/r[1];return t>0?V.add(cam.eye,V.mul(r,t)):null;
};
const shader=(gl,type,text)=>{
 const sh=gl.createShader(type);gl.shaderSource(sh,text);gl.compileShader(sh);
 if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(sh)||'Erreur shader');return sh;
};
const program3d=gl=>{
 const vs=`attribute vec3 aPosition;attribute vec3 aNormal;
 uniform vec3 uEye,uRight,uUp,uForward,uPosition,uScale;
 uniform float uAngle,uAspect;
 varying vec3 vNormal,vWorld;
 void main(){
 vec3 q=aPosition*uScale;
 float cs=cos(uAngle),sn=sin(uAngle);
 q=vec3(q.x*cs-q.z*sn,q.y,q.x*sn+q.z*cs);
 vec3 rel=q+uPosition-uEye;
 vWorld=q+uPosition;vNormal=normalize(vec3(aNormal.x*cs-aNormal.z*sn,aNormal.y,aNormal.x*sn+aNormal.z*cs));
 float d=max(0.01,dot(rel,uForward));
 float f=1.7320508;
 float clipZ=d*1.004-0.201;
 gl_Position=vec4(dot(rel,uRight)*f/uAspect,dot(rel,uUp)*f,clipZ,d);
 
 }`;
 const fs=`precision mediump float;
 uniform vec4 uColor;
 uniform vec3 uSunDir,uSunColor;
 uniform float uSunIntensity,uAmbient;
 uniform int uLightCount;
 uniform vec3 uLightPos[8],uLightColor[8],uLightDir[8];
 uniform float uLightPower[8],uLightRange[8],uLightCone[8],uLightSpot[8];
 varying vec3 vNormal,vWorld;
 void main(){
 vec3 normal=normalize(vNormal);
 vec3 irradiance=vec3(uAmbient);
 irradiance+=uSunColor*uSunIntensity*max(0.,dot(normal,normalize(uSunDir)));
 for(int i=0;i<8;i++){
  if(i>=uLightCount)break;
  vec3 displacement=uLightPos[i]-vWorld;
  float dist=length(displacement);
  vec3 L=displacement/max(dist,.001);
  float decay=pow(max(0.,1.-dist/max(uLightRange[i],.01)),2.);
  float cone=1.;
  if(uLightSpot[i]>.5){
   float alignment=dot(normalize(-L),normalize(uLightDir[i]));
   cone=smoothstep(uLightCone[i]-.12,uLightCone[i],alignment);
  }
  irradiance+=uLightColor[i]*uLightPower[i]*max(0.,dot(normal,L))*decay*cone;
 }
 gl_FragColor=vec4(uColor.rgb*clamp(irradiance,0.,2.2),uColor.a);
 }`;
 const p=gl.createProgram();gl.attachShader(p,shader(gl,gl.VERTEX_SHADER,vs));gl.attachShader(p,shader(gl,gl.FRAGMENT_SHADER,fs));gl.linkProgram(p);
 if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p)||'Erreur programme');
 return p;
};
const face=(corners,n)=>{const out=[];for(const i of [0,1,2,0,2,3])out.push(...corners[i],...n);return out};
const cubeVerts=()=>{
 const a=-.5,b=.5;
 return new Float32Array([
 ...face([[a,a,b],[b,a,b],[b,b,b],[a,b,b]],[0,0,1]),
 ...face([[b,a,a],[a,a,a],[a,b,a],[b,b,a]],[0,0,-1]),
 ...face([[b,a,b],[b,a,a],[b,b,a],[b,b,b]],[1,0,0]),
 ...face([[a,a,a],[a,a,b],[a,b,b],[a,b,a]],[-1,0,0]),
 ...face([[a,b,b],[b,b,b],[b,b,a],[a,b,a]],[0,1,0]),
 ...face([[a,a,a],[b,a,a],[b,a,b],[a,a,b]],[0,-1,0])
 ]);
};
const lines=(vertices)=>new Float32Array(vertices.flatMap(([a,b])=>[...a,0,1,0,...b,0,1,0]));
const gridVerts=()=>{
 const out=[];for(let n=-50;n<=50;n+=2){
 out.push([[-50,0,n],[50,0,n]],[[n,0,-50],[n,0,50]]);
 }return lines(out);
};
const boundsLines=()=>{
 const p=[[-.5,-.5,-.5],[.5,-.5,-.5],[.5,-.5,.5],[-.5,-.5,.5],[-.5,.5,-.5],[.5,.5,-.5],[.5,.5,.5],[-.5,.5,.5]];
 return lines([[p[0],p[1]],[p[1],p[2]],[p[2],p[3]],[p[3],p[0]],[p[4],p[5]],[p[5],p[6]],[p[6],p[7]],[p[7],p[4]],[p[0],p[4]],[p[1],p[5]],[p[2],p[6]],[p[3],p[7]]]);
};
const rgba=hex=>{
 const m=/^#([a-f\d]{6})$/i.exec(hex||'');
 return m?[1,3,5].map(i=>parseInt(m[1].slice(i-1,i+1),16)/255).concat(1):[.46,.65,.72,1];
};
const assetColor=o=>{
 const a=getAsset(o.assetId),c=a?.category;
 return c==='Buildings'?[.57,.58,.68,1]:c==='Vehicles'?[.45,.67,.77,1]:
 c==='Characters'?[.23,.82,.66,1]:c==='Monsters'?[.78,.42,.46,1]:
 c==='Weapons'?[.9,.72,.42,1]:c==='VFX'?[.58,.43,.95,1]:rgba(o.color);
};
export function init3d(canvas,host,buttons){
 let gl=null;try{gl=canvas.getContext('webgl',{antialias:true,alpha:false})}catch(err){view3d.error=String(err.message||err)}
 if(!gl){view3d.error=view3d.error||'WebGL indisponible sur ce navigateur';buttons.status.textContent=view3d.error;buttons.toggle.disabled=true;return}
 view3d.gl=gl;
 let program;
 try{program=program3d(gl)}catch(err){view3d.error=err.message;buttons.status.textContent='WebGL : '+err.message;buttons.toggle.disabled=true;return}
 const loc=n=>gl.getUniformLocation(program,n);
 const u={eye:loc('uEye'),right:loc('uRight'),up:loc('uUp'),forward:loc('uForward'),pos:loc('uPosition'),scale:loc('uScale'),angle:loc('uAngle'),aspect:loc('uAspect'),color:loc('uColor'),sunDir:loc('uSunDir'),sunColor:loc('uSunColor'),sunIntensity:loc('uSunIntensity'),ambient:loc('uAmbient'),lightCount:loc('uLightCount'),lightPos:loc('uLightPos[0]'),lightColor:loc('uLightColor[0]'),lightDir:loc('uLightDir[0]'),lightPower:loc('uLightPower[0]'),lightRange:loc('uLightRange[0]'),lightCone:loc('uLightCone[0]'),lightSpot:loc('uLightSpot[0]')};
 const aPos=gl.getAttribLocation(program,'aPosition'),aNormal=gl.getAttribLocation(program,'aNormal');
 const makeBuffer=data=>{const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,data,gl.STATIC_DRAW);return {buffer:b,count:data.length/6}};
 const cubes=makeBuffer(cubeVerts()),grid=makeBuffer(gridVerts()),outline=makeBuffer(boundsLines());
 gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);
 const bind=mesh=>{gl.bindBuffer(gl.ARRAY_BUFFER,mesh.buffer);gl.vertexAttribPointer(aPos,3,gl.FLOAT,false,24,0);gl.vertexAttribPointer(aNormal,3,gl.FLOAT,false,24,12);gl.enableVertexAttribArray(aPos);gl.enableVertexAttribArray(aNormal)};
 const model=(pos,scale,color,angle=0)=>{gl.uniform3fv(u.pos,pos);gl.uniform3fv(u.scale,scale);gl.uniform1f(u.angle,angle);gl.uniform4fv(u.color,color)};
 view3d.enabled=workspace.mode==='3d';
 const resize=()=>{const d=Math.min(2,window.devicePixelRatio||1),w=Math.round(host.clientWidth*d),h=Math.round(host.clientHeight*d);if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h}gl.viewport(0,0,w,h)};
 const focusScene=()=>{
  const arr=state.selected.length?state.entities.filter(o=>state.selected.includes(o.id)):state.entities;
  if(!arr.length){view3d.target=[9,0,6];view3d.radius=25;return}
  let minx=Infinity,maxx=-Infinity,minz=Infinity,maxz=-Infinity;
  for(const o of arr){const b=objectBounds3d(o);minx=Math.min(minx,b.x);maxx=Math.max(maxx,b.x);minz=Math.min(minz,b.z);maxz=Math.max(maxz,b.z)}
  view3d.target=[(minx+maxx)/2,0,(minz+maxz)/2];view3d.radius=clamp(Math.max(12,Math.hypot(maxx-minx,maxz-minz)*1.8),7,100);
 };
 const sync=()=>{canvas.hidden=!view3d.enabled;document.getElementById('canvas').hidden=view3d.enabled;buttons.toggle.classList.toggle('active',view3d.enabled);buttons.toggle.textContent=view3d.enabled?'◈ 3D Beta':'▣ 2D';buttons.status.hidden=!view3d.enabled;document.querySelector('#viewport')?.classList.toggle('view-3d-active',view3d.enabled);if(view3d.enabled)resize()};
 const change=enabled=>{if(state.playing)return false;if(!switchWorkspace(enabled?'3d':'2d'))return false;view3d.enabled=enabled;focusScene();sync();return true};
 buttons.toggle.addEventListener('click',()=>change(!view3d.enabled));
 buttons.focus.addEventListener('click',()=>{if(view3d.enabled)focusScene()});
 focusScene();sync();
 const update3dPlay=dt=>{
  const p=playableActor(state.entities);
  if(!p)return;
  const k=state.keys,side=Number(k.has('d')||k.has('arrowright'))-Number(k.has('a')||k.has('q')||k.has('arrowleft'));
  const forward=Number(k.has('w')||k.has('z')||k.has('arrowup'))-Number(k.has('s')||k.has('arrowdown'));
  const length=Math.hypot(side,forward);
  if(!length)return;
  const speed=(k.has('shift')?7:4.2)*64*dt/length;
  const wx=(side*Math.cos(view3d.yaw)+forward*Math.sin(view3d.yaw))*speed;
  const wz=(-side*Math.sin(view3d.yaw)+forward*Math.cos(view3d.yaw))*speed;
  const overlaps=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
  const solid=o=>o!==p&&!o.lightType&&!o.audioEnabled&&(o.type==='object'||getAsset(o.assetId)?.category==='Buildings');
  const prevX=p.x;p.x+=wx;if(state.entities.some(o=>solid(o)&&overlaps(p,o)))p.x=prevX;
  const prevY=p.y;p.y+=wz;if(state.entities.some(o=>solid(o)&&overlaps(p,o)))p.y=prevY;
  p.animation='walk';
 };
 const camera=()=>sceneCamera3d(view3d.target,view3d.yaw,view3d.pitch,view3d.radius);
 const playerTarget=()=>{const p=playableActor(state.entities);return p?[(p.x+p.w/2)/64,.5,(p.y+p.h/2)/64]:null};
 let wasPlaying=false;
 const enterPlay=()=>{const pt=playerTarget();view3d.followPlayer=!!pt;if(pt){view3d.target=pt.slice();view3d.radius=12;view3d.pitch=.5}};

 const rectPoint=e=>{const r=canvas.getBoundingClientRect();return {x:e.clientX-r.left,y:e.clientY-r.top,w:r.width,h:r.height}};
 const pick=(point,cam)=>{
  let best=null,score=Infinity;
  for(const o of state.entities){const b=objectBounds3d(o),screen=project3d([b.x,b.y,b.z],cam,point.w,point.h);if(!screen)continue;
   const radius=Math.max(12,Math.max(b.w,b.h,b.d)*point.h/(2*screen.depth));
   const d=Math.hypot(screen.x-point.x,screen.y-point.y);
   if(d<radius*1.35&&screen.depth+d*.2<score){best=o;score=screen.depth+d*.2}
  }return best;
 };
 canvas.addEventListener('contextmenu',e=>e.preventDefault());
 canvas.addEventListener('pointerdown',e=>{
  if(!view3d.enabled)return;
  const p=rectPoint(e),cam=camera();
  if(state.playing){
   if(e.button===2){view3d.drag={button:2,x:p.x,y:p.y,yaw:view3d.yaw,pitch:view3d.pitch,pointer:e.pointerId,selected:null,moved:false};canvas.setPointerCapture(e.pointerId)}
   return;
  }
  const selected=e.button===0?pick(p,cam):null;
  if(e.button===0&&selected){
   if(e.ctrlKey||e.metaKey||e.shiftKey){state.selected=state.selected.includes(selected.id)?state.selected.filter(i=>i!==selected.id):[...state.selected,selected.id];notify()}
   else {if(!state.selected.includes(selected.id))state.selected=[selected.id];notify()}
  }else if(e.button===0&&!e.shiftKey&&!e.ctrlKey){state.selected=[];notify()}
  const point=groundHit3d(p.x,p.y,cam,p.w,p.h);
  view3d.drag={button:e.button,x:p.x,y:p.y,target:[...view3d.target],yaw:view3d.yaw,pitch:view3d.pitch,start:point,selected:selected&&e.button===0?state.entities.filter(o=>state.selected.includes(o.id)).map(o=>({id:o.id,x:o.x,y:o.y,z:o.z||0})):null,moved:false,pointer:e.pointerId};
  canvas.setPointerCapture(e.pointerId);
 });
 canvas.addEventListener('pointermove',e=>{
  if(!view3d.enabled)return;const p=rectPoint(e),cam=camera();
  if(state.playing){
   const d=view3d.drag;if(d?.button===2&&d.pointer===e.pointerId){view3d.yaw=d.yaw-(p.x-d.x)*.009;view3d.pitch=clamp(d.pitch+(p.y-d.y)*.009,.08,1.5)}
   return;
  }
  const drag=view3d.drag;if(!drag||drag.pointer!==e.pointerId)return;
  const dx=p.x-drag.x,dy=p.y-drag.y;
  if(Math.hypot(dx,dy)>4)drag.moved=true;
  if(drag.button===2){
   view3d.yaw=drag.yaw-dx*.009;view3d.pitch=clamp(drag.pitch+dy*.009,.08,1.5);
  }else if(drag.button===1||drag.button===0&&!drag.selected){
   const amount=view3d.radius/Math.max(180,p.h)*1.9;
   view3d.target=V.add(drag.target,V.add(V.mul(cam.right,-dx*amount),V.mul(cam.up,dy*amount)));
  }else if(drag.button===0&&drag.selected&&drag.start){
   const hit=groundHit3d(p.x,p.y,cam,p.w,p.h);
   if(hit){for(const start of drag.selected){const obj=state.entities.find(o=>o.id===start.id);if(obj){obj.x=Math.round(start.x+(hit[0]-drag.start[0])*64);obj.y=Math.round(start.y+(hit[2]-drag.start[2])*64)}}}
  }
 });
 const stop=e=>{const d=view3d.drag;if(!d||d.pointer!==e.pointerId)return;
  if(d.moved&&d.selected&&d.button===0)record('Déplacer en vue 3D');
  view3d.drag=null;notify();
 };
 canvas.addEventListener('pointerup',stop);canvas.addEventListener('pointercancel',stop);canvas.addEventListener('lostpointercapture',stop);
 canvas.addEventListener('wheel',e=>{if(!view3d.enabled)return;e.preventDefault();view3d.radius=clamp(view3d.radius*Math.exp(e.deltaY*.001),3,150)},{passive:false});

 let previousTime=performance.now();
 function draw(now=performance.now()){
  requestAnimationFrame(draw);
  const dt=Math.min(.1,Math.max(0,(now-previousTime)/1000));previousTime=now;
  updateLighting(dt,state.playing&&workspace.mode==='3d');
  if(state.playing&&!wasPlaying)enterPlay();
  if(!state.playing&&wasPlaying)view3d.followPlayer=false;
  wasPlaying=state.playing;
  if(state.playing&&workspace.mode==='3d')update3dPlay(dt);
  if(state.playing&&view3d.followPlayer){const pt=playerTarget();if(pt){const t=Math.min(1,dt*9);view3d.target=V.add(V.mul(view3d.target,1-t),V.mul(pt,t))}}
  if(!view3d.enabled)return;
  resize();const w=canvas.clientWidth,h=canvas.clientHeight;if(!w||!h)return;
  const solar=sunAt();gl.clearColor(...solar.sky,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
  gl.useProgram(program);const cam=camera();
  gl.uniform3fv(u.eye,cam.eye);gl.uniform3fv(u.forward,cam.forward);gl.uniform3fv(u.right,cam.right);gl.uniform3fv(u.up,cam.up);gl.uniform1f(u.aspect,w/h);
  gl.uniform3fv(u.sunDir,solar.direction);gl.uniform3fv(u.sunColor,solar.color);
  gl.uniform1f(u.sunIntensity,solar.intensity);gl.uniform1f(u.ambient,solar.ambient);
  const lamps=visibleLights(state.entities,cam.eye,8);
  const padded=(key,def)=>Array.from({length:8},(_,i)=>lamps[i]?.[key]??def).flat();
  gl.uniform1i(u.lightCount,lamps.length);
  gl.uniform3fv(u.lightPos,new Float32Array(padded('position',[0,0,0])));
  gl.uniform3fv(u.lightColor,new Float32Array(padded('color',[0,0,0])));
  gl.uniform3fv(u.lightDir,new Float32Array(padded('direction',[0,-1,0])));
  gl.uniform1fv(u.lightPower,new Float32Array(padded('intensity',0)));
  gl.uniform1fv(u.lightRange,new Float32Array(padded('range',1)));
  gl.uniform1fv(u.lightCone,new Float32Array(padded('cone',.7)));
  gl.uniform1fv(u.lightSpot,new Float32Array(lamps.map(l=>l.spot?1:0).concat(Array(8-lamps.length).fill(0))));
  gl.disable(gl.CULL_FACE);
  bind(grid);model([0,-.02,0],[1,1,1],[.22,.34,.42,1]);gl.drawArrays(gl.LINES,0,grid.count);
  const objects=[...state.entities].filter(o=>!state.playing||!o._hiddenInVehicle&&!o._hiddenInHouse&&!o._modeEliminated);
  // Depth buffering resolves overlapping faces, including the composite mesh parts.
  bind(cubes);
  for(const o of objects){
   const b=objectBounds3d(o),color=assetColor(o),asset=getAsset(o.assetId),category=asset?.category;
   const angle=(o.rotation||0)*Math.PI/180;
   const cube=(p,scale,shade)=>{model(p,scale,shade,angle);gl.drawArrays(gl.TRIANGLES,0,cubes.count)};
   cube([b.x,b.y,b.z],[b.w,b.h,b.d],color);
   if(category==='Buildings'){
    cube([b.x,b.y+b.h*.51,b.z],[b.w*1.12,b.h*.12,b.d*1.14],[.24,.34,.43,1]);
    cube([b.x,b.y-b.h*.25,b.z+b.d*.509],[b.w*.2,b.h*.49,.04],[.24,.20,.18,1]);
    for(const side of [-.28,.28])cube([b.x+b.w*side,b.y+b.h*.13,b.z+b.d*.515],[b.w*.20,b.h*.19,.05],[.52,.81,.90,1]);
   }else if(category==='Vehicles'){
    cube([b.x,b.y+b.h*.46,b.z],[b.w*.54,b.h*.52,b.d*.84],[.37,.59,.68,1]);
    for(const x of [-.37,.37])for(const z of [-.42,.42])cube([b.x+b.w*x,b.y-b.h*.43,b.z+b.d*z],[b.w*.14,b.h*.3,b.d*.26],[.14,.19,.22,1]);
   }else if(category==='Characters'||category==='Monsters'||o.type==='character'||o.type==='player'){
    cube([b.x,b.y+b.h*.59,b.z],[b.w*.48,b.h*.36,b.d*.5],category==='Monsters'?[.61,.73,.57,1]:[.89,.72,.58,1]);
    for(const x of [-.2,.2])cube([b.x+b.w*x,b.y-b.h*.53,b.z],[b.w*.27,b.h*.38,b.d*.28],[.24,.32,.38,1]);
   }
  }
  if(!state.playing){bind(outline);for(const o of objects.filter(o=>state.selected.includes(o.id))){const b=objectBounds3d(o);model([b.x,b.y,b.z],[b.w*1.03,b.h*1.03,b.d*1.03],[.32,1,.8,1],(o.rotation||0)*Math.PI/180);gl.drawArrays(gl.LINES,0,outline.count)}}
 }
 requestAnimationFrame(draw);
 return {setEnabled:change,focus:focusScene,syncToWorkspace:()=>{view3d.enabled=workspace.mode==='3d';focusScene();sync()}};
}
