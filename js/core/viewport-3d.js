import {getModelGeometry,model3dById} from '../assets/real-models-3d.js';
import {updateSequences,sequenceRuntime} from './logic-sequences.js';
import {get3dAsset} from '../assets/catalog-3d.js';
import {workspace,switchWorkspace} from './workspaces.js';
import {sunAt,visibleLights,updateLighting} from './lighting.js';
// WarLike 3D Beta: self-contained WebGL perspective scene editor.
// Existing scene x/y become ground X/Z; object h is extrusion height. No remote dependencies.
import {state,notify} from './state.js';
import {record} from './history.js';
import {getAsset} from '../assets/catalog.js';
import {game} from './gameplay.js';

export const view3d={enabled:false,yaw:-.68,pitch:.62,radius:25,target:[9,0,6],drag:null,gl:null,error:null,followPlayer:true};
export const playableActor=entities=>entities.find(o=>o.playable3d===true||o.type==='player'||o.type==='character'||o.type==='prefab'&&getAsset(o.assetId)?.category==='Characters')||null;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const V={
 add:(a,b)=>a.map((x,i)=>x+b[i]),sub:(a,b)=>a.map((x,i)=>x-b[i]),
 mul:(a,n)=>a.map(v=>v*n),dot:(a,b)=>a.reduce((t,v,i)=>t+v*b[i],0),
 cross:(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],
 norm:a=>{const d=Math.hypot(...a)||1;return a.map(v=>v/d)}
};
export const objectBounds3d=o=>{
 const asset=getAsset(o.assetId)||get3dAsset(o.assetId);
 const width=Math.max(.25,o.w/64),depth=Math.max(.25,(o.depth3d??(asset?.category==='Vehicles'?o.h*.65:o.w*.8))/64);
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
 uniform vec3 uEye;
 uniform float uRoughness,uMetallic;
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
 vec3 viewDir=normalize(uEye-vWorld);
 vec3 reflected=reflect(-normalize(uSunDir),normal);
 float gloss=pow(max(0.,dot(reflected,viewDir)),mix(48.,5.,clamp(uRoughness,0.04,1.)));
 vec3 specular=mix(vec3(.18),uColor.rgb,clamp(uMetallic,0.,1.))*gloss*uSunIntensity*(1.-uRoughness*.75);
 vec3 lit=uColor.rgb*clamp(irradiance,0.,2.2)+specular;
 float fog=clamp((length(uEye-vWorld)-28.)/85.,0.,.78);
 gl_FragColor=vec4(mix(lit,vec3(.24,.34,.43),fog),uColor.a);
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
const curvedVerts=(kind,segments=16,rings=10)=>{
 const values=[],push=(p,n)=>values.push(...p,...n);
 const surface=(a,b,c)=>{push(a,a.map(v=>v*2));push(b,b.map(v=>v*2));push(c,c.map(v=>v*2))};
 if(kind==='sphere'){
  for(let y=0;y<rings;y++){const v0=-Math.PI/2+y*Math.PI/rings,v1=-Math.PI/2+(y+1)*Math.PI/rings;
   for(let i=0;i<segments;i++){const u0=i*2*Math.PI/segments,u1=(i+1)*2*Math.PI/segments;
    const point=(u,v)=>[Math.cos(u)*Math.cos(v)*.5,Math.sin(v)*.5,Math.sin(u)*Math.cos(v)*.5];
    const a=point(u0,v0),b=point(u1,v0),c=point(u1,v1),d=point(u0,v1);
    surface(a,b,c);surface(a,c,d);
   }}
 }else {
  for(let i=0;i<segments;i++){const u0=i*2*Math.PI/segments,u1=(i+1)*2*Math.PI/segments;
   const x0=Math.cos(u0)*.5,z0=Math.sin(u0)*.5,x1=Math.cos(u1)*.5,z1=Math.sin(u1)*.5;
   const a=[x0,-.5,z0],b=[x1,-.5,z1],c=[kind==='cone'?0:x1,.5,kind==='cone'?0:z1],d=[kind==='cone'?0:x0,.5,kind==='cone'?0:z0];
   const n=[Math.cos((u0+u1)/2),kind==='cone'?.5:0,Math.sin((u0+u1)/2)];
   for(const p of [a,b,c,a,c,d])push(p,n);
   if(kind!=='cone'){for(const p of [[0,.5,0],d,c])push(p,[0,1,0]);}
   for(const p of [[0,-.5,0],b,a])push(p,[0,-1,0]);
  }
 }
 return new Float32Array(values);
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
 if(o.colorCustomized===true&&/^#[0-9a-f]{6}$/i.test(o.color||''))return rgba(o.color);
 return c==='Buildings'?[.57,.58,.68,1]:c==='Vehicles'?[.45,.67,.77,1]:
 c==='Characters'?[.23,.82,.66,1]:c==='Monsters'?[.78,.42,.46,1]:
 c==='Weapons'?[.9,.72,.42,1]:c==='VFX'?[.58,.43,.95,1]:rgba(o.color);
};
export function init3d(canvas,host,buttons){
 let gl=null;try{gl=canvas.getContext('webgl',{antialias:true,alpha:false})}catch(err){view3d.error=String(err.message||err)}
 const renderFailure=message=>{
  view3d.error=message;
  const show=workspace.mode==='3d';
  view3d.enabled=show;canvas.hidden=!show;
  document.getElementById('canvas').hidden=show;
  buttons.toggle.classList.toggle('active',show);
  buttons.status.hidden=!show;
  buttons.status.textContent='ERREUR MOTEUR 3D : '+message;
  document.querySelector('#viewport')?.classList.toggle('view-3d-active',show);
  canvas.style.background='#182534';
  const host=document.getElementById('viewport');
  let warning=host.querySelector('#webglFailure');
  if(!warning){warning=document.createElement('div');warning.id='webglFailure';warning.setAttribute('role','alert');warning.style.cssText='position:absolute;inset:15% 12%;z-index:8;padding:22px;background:#2d1e2a;color:#ffe5e5;border:2px solid #ff7a7a;border-radius:10px;overflow:auto;font:14px system-ui';host.append(warning)}
  warning.hidden=!show;
  warning.textContent='Le rendu 3D WebGL ne peut pas démarrer : '+message+'. Ouvre la console F12 et vérifie l’accélération graphique / WebGL.';
 };
 if(!gl){renderFailure(view3d.error||'WebGL indisponible');return {setEnabled:()=>false,focus:()=>{},syncToWorkspace:()=>renderFailure(view3d.error)}}
 view3d.gl=gl;
 let program;
 try{program=program3d(gl)}catch(err){renderFailure('Compilation shader : '+String(err.message||err));return {setEnabled:()=>false,focus:()=>{},syncToWorkspace:()=>renderFailure(view3d.error)}}
 const loc=n=>gl.getUniformLocation(program,n);
 const u={eye:loc('uEye'),right:loc('uRight'),up:loc('uUp'),forward:loc('uForward'),pos:loc('uPosition'),scale:loc('uScale'),angle:loc('uAngle'),aspect:loc('uAspect'),color:loc('uColor'),roughness:loc('uRoughness'),metallic:loc('uMetallic'),sunDir:loc('uSunDir'),sunColor:loc('uSunColor'),sunIntensity:loc('uSunIntensity'),ambient:loc('uAmbient'),lightCount:loc('uLightCount'),lightPos:loc('uLightPos[0]'),lightColor:loc('uLightColor[0]'),lightDir:loc('uLightDir[0]'),lightPower:loc('uLightPower[0]'),lightRange:loc('uLightRange[0]'),lightCone:loc('uLightCone[0]'),lightSpot:loc('uLightSpot[0]')};
 const aPos=gl.getAttribLocation(program,'aPosition'),aNormal=gl.getAttribLocation(program,'aNormal');
 const makeBuffer=data=>{const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,data,gl.STATIC_DRAW);return {buffer:b,count:data.length/6}};
 const cubes=makeBuffer(cubeVerts()),sphere=makeBuffer(curvedVerts('sphere')),cylinder=makeBuffer(curvedVerts('cylinder')),cone=makeBuffer(curvedVerts('cone')),grid=makeBuffer(gridVerts()),outline=makeBuffer(boundsLines());
 const realGlbBuffers=new Map();
 const ensureModel=id=>{
  if(realGlbBuffers.has(id))return;
  realGlbBuffers.set(id,{status:'loading'});
  getModelGeometry(id).then(data=>{
   const parts=data.parts.map(part=>({mesh:makeBuffer(part.vertices),color:part.color}));
   realGlbBuffers.set(id,{status:'ready',parts,triangles:data.triangleCount});
  }).catch(error=>{realGlbBuffers.set(id,{status:'error',message:String(error.message||error)});console.warn('[WarLike GLB]',id,error)});
 };

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
  const solid=o=>o!==p&&!o.lightType&&!o.audioEnabled&&(o.type==='object'||getAsset(o.assetId)?.category==='Buildings'||o.type==='mesh3d'&&o.collision3d!==false);
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
  if(state.playing&&workspace.mode==='3d'){update3dPlay(dt);updateSequences(dt,{playing:true,entities:state.entities,keys:state.keys,player:playableActor(state.entities)});}
  if(state.playing&&view3d.followPlayer){const pt=playerTarget();if(pt){const t=Math.min(1,dt*9);view3d.target=V.add(V.mul(view3d.target,1-t),V.mul(pt,t))}}
  if(!view3d.enabled)return;
  if(state.playing&&sequenceRuntime.messages.length){const latest=sequenceRuntime.messages.at(-1);buttons.status.textContent='3D PLAY • '+latest.text}else if(state.playing){buttons.status.textContent='3D PLAY • ZQSD/WASD pour bouger • Maj pour courir'}else{buttons.status.textContent='PROJET 3D • Clic pour sélectionner • Clic droit orbite • Molette zoom'}
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
   gl.uniform1f(u.roughness,Math.max(.04,Math.min(1,Number(o.materialRoughness??.7))));
   gl.uniform1f(u.metallic,Math.max(0,Math.min(1,Number(o.materialMetallic??0))));
   const shape=get3dAsset(o.assetId)?.shape;
   const drawShape=(mesh,p,scale,shade)=>{bind(mesh);model(p,scale,shade,angle);gl.drawArrays(gl.TRIANGLES,0,mesh.count)};
   const cube=(p,scale,shade)=>drawShape(cubes,p,scale,shade);
   const round=(p,scale,shade)=>drawShape(sphere,p,scale,shade);
   const cyl=(p,scale,shade)=>drawShape(cylinder,p,scale,shade);
   if(shape==='glb'){
    const id=o.model3dId||o.assetId;ensureModel(id);
    const cached=realGlbBuffers.get(id);
    if(cached?.status==='ready'){
     for(const part of cached.parts){
      const material=o.colorCustomized?color:part.color;
      drawShape(part.mesh,[b.x,b.y,b.z],[b.w,b.h,b.d],material);
     }
    }else{
     // Placeholder only while downloading, or when a GLB cannot be opened.
     cube([b.x,b.y,b.z],[b.w,b.h,b.d],cached?.status==='error'?[.72,.23,.23,1]:[.36,.48,.58,1]);
    }
    continue;
   }
   if(shape){
    if(['sphere','rock','bush'].includes(shape))round([b.x,b.y,b.z],[b.w,b.h,b.d],color);
    else if(['cylinder','barrel','log'].includes(shape))cyl([b.x,b.y,b.z],[b.w,b.h,b.d],color);
    else if(['cone','cactus'].includes(shape))drawShape(cone,[b.x,b.y,b.z],[b.w,b.h,b.d],color);
    else if(['tree','pine'].includes(shape)){
     cyl([b.x,b.y-b.h*.22,b.z],[b.w*.22,b.h*.55,b.d*.22],[.48,.34,.22,1]);
     if(shape==='tree'){
      for(const [dx,dy,dz,scale] of [[0,.18,0,.74],[-.26,.14,.04,.54],[.24,.19,-.08,.53],[0,.40,.12,.49]]){
       round([b.x+b.w*dx,b.y+b.h*dy,b.z+b.d*dz],[b.w*scale,b.h*scale*.63,b.d*scale],color);
      }
     }else{
      for(let level=0;level<3;level++)drawShape(cone,[b.x,b.y+b.h*(.04+level*.23),b.z],[b.w*(1-level*.22),b.h*.51,b.d*(1-level*.22)],color);
     }
    }else if(shape==='humanoid'){
     cube([b.x,b.y+b.h*.08,b.z],[b.w*.58,b.h*.43,b.d*.55],color);
     cube([b.x,b.y+b.h*.34,b.z],[b.w*.5,b.h*.10,b.d*.48],[.31,.41,.49,1]);
     round([b.x,b.y+b.h*.49,b.z],[b.w*.43,b.h*.24,b.d*.42],[.82,.68,.57,1]);
     cube([b.x,b.y+b.h*.58,b.z-b.d*.035],[b.w*.49,b.h*.12,b.d*.45],[.27,.32,.38,1]);
     for(const side of [-1,1]){
      cube([b.x+b.w*side*.39,b.y+b.h*.03,b.z],[b.w*.20,b.h*.41,b.d*.30],color);
      round([b.x+b.w*side*.39,b.y-b.h*.20,b.z],[b.w*.19,b.h*.16,b.d*.31],[.76,.60,.49,1]);
      cube([b.x+b.w*side*.17,b.y-b.h*.31,b.z],[b.w*.21,b.h*.43,b.d*.31],[.27,.36,.42,1]);
      cube([b.x+b.w*side*.17,b.y-b.h*.54,b.z+b.d*.11],[b.w*.26,b.h*.11,b.d*.45],[.18,.24,.28,1]);
     }
    }else if(['car','truck','tank','bike'].includes(shape)){
     cube([b.x,b.y,b.z],[b.w,b.h*.58,b.d],color);
     cube([b.x,b.y+b.h*.36,b.z-b.d*.09],[b.w*.58,b.h*.40,b.d*.75],[.26,.40,.50,1]);
     cube([b.x,b.y+b.h*.36,b.z+b.d*.29],[b.w*.48,b.h*.25,b.d*.035],[.55,.74,.79,1]);
     for(const x of [-.37,.37])for(const z of [-.46,.46]){
      cyl([b.x+b.w*x,b.y-b.h*.37,b.z+b.d*z],[b.w*.20,b.h*.30,b.d*.22],[.13,.16,.19,1]);
      cyl([b.x+b.w*x,b.y-b.h*.37,b.z+b.d*z],[b.w*.11,b.h*.31,b.d*.115],[.46,.49,.51,1]);
     }
     for(const side of [-.33,.33]){
      cube([b.x+b.w*side,b.y-b.h*.06,b.z+b.d*.506],[b.w*.18,b.h*.12,.035],[.85,.83,.69,1]);
      cube([b.x+b.w*side,b.y-b.h*.10,b.z-b.d*.506],[b.w*.2,b.h*.09,.035],[.78,.14,.11,1]);
     }
     if(shape==='tank'){
      cube([b.x,b.y+b.h*.62,b.z],[b.w*.58,b.h*.19,b.d*.55],[.27,.35,.30,1]);
      cyl([b.x,b.y+b.h*.67,b.z+b.d*.54],[b.w*.15,b.h*.14,b.d*.90],[.25,.31,.29,1]);
     }
    }else if(['house','hangar','tower','garage'].includes(shape)){
     cube([b.x,b.y,b.z],[b.w,b.h,b.d],color);
     cube([b.x,b.y+b.h*.52,b.z],[b.w*1.13,b.h*.14,b.d*1.13],[.30,.35,.40,1]);
     cube([b.x,b.y-b.h*.25,b.z+b.d*.513],[b.w*.24,b.h*.5,.05],[.25,.20,.17,1]);
     cube([b.x,b.y-b.h*.18,b.z+b.d*.548],[b.w*.04,b.h*.06,.018],[.78,.67,.42,1]);
     for(const side of [-.31,.31])for(const level of [-.16,.22]){
      cube([b.x+b.w*side,b.y+b.h*level,b.z+b.d*.514],[b.w*.20,b.h*.18,.055],[.21,.32,.39,1]);
      cube([b.x+b.w*side,b.y+b.h*level,b.z+b.d*.552],[b.w*.025,b.h*.18,.012],[.76,.74,.66,1]);
      cube([b.x+b.w*side,b.y+b.h*level,b.z+b.d*.552],[b.w*.20,b.h*.025,.012],[.76,.74,.66,1]);
     }
     cube([b.x,b.y-b.h*.49,b.z+b.d*.53],[b.w*1.12,b.h*.045,b.d*.13],[.44,.44,.41,1]);
    }else if(['lamp','cactus'].includes(shape)){
     cyl([b.x,b.y,b.z],[b.w*.22,b.h,b.d*.22],color);
     round([b.x,b.y+b.h*.48,b.z],[b.w*.55,b.w*.55,b.d*.55],[1,.8,.4,1]);
    }else if(shape==='table'||shape==='bench'){
     cube([b.x,b.y+b.h*.29,b.z],[b.w,b.h*.17,b.d],color);
     for(const x of [-.35,.35])for(const z of [-.33,.33])cube([b.x+b.w*x,b.y-b.h*.16,b.z+b.d*z],[b.w*.13,b.h*.74,b.d*.13],[.43,.33,.27,1]);
    }else cube([b.x,b.y,b.z],[b.w,b.h,b.d],color);
    continue;
   }
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
