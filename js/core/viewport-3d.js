import {animatorPoseOptions,noteAnimatorAction} from './animator-graph.js';
import {lanActor,isLanGuest} from './lan-state.js';
import {solidBody3d,collisionWorldBounds3d,raycastScene3d} from './collision-3d.js';
import {gameplayInputBlocked,gameplayKeys} from './gameplay-input.js';
import {sameFaction,healthOf} from './ai-perception.js';
import {progressionDamageScale,awardExperience} from './rpg-progression.js';
import {damageSimulationNode} from './simulation-nodes.js';
import {heroCenter} from './hero-movement.js';
import {tickHeroRuntime} from './superhero-runtime.js';
import {createFxRenderer3d} from './fx-renderer-3d.js';
import {tickFxRuntime,emitFx} from './fx-runtime.js';
import {isTypingTarget} from './editor-clipboard.js';
import {sampleRigPose,deformGlbParts,animationClipForState} from './gltf-animation.js';
import {cameraRigFor,cameraTargetFor,resolveCameraBoom,cameraPose,cameraDamping} from './play-camera.js';
import {gameIsRunning,gameSession} from './game-session.js';
import {updateHorrorAudio} from './horror-audio.js';
import {tickEngineDiagnostics} from './engine-diagnostics.js';
import {updateDriving3d,currentVehicle3d,isDriveable3d,driving3d,resetDriving3d} from './vehicle-3d.js';
import {updateGenreHud} from '../ui/genre-hud.js';
import {updateOpenWorld} from './open-world-systems.js';
import {sequenceRuntime} from './logic-sequences.js';
import {updateHorror,updateHorrorPerception,horror} from './horror-survival.js';
import {renderQuality} from './render-quality.js';
import {stepPhysics3d} from './physics-3d.js';
import {loadRapier3d,createRapierScene,stepRapierScene,synchronizeRapierScene,disposeRapierScene} from './rapier-physics-3d.js';
import {updateController3d,updateAi,updateStats,attack3d,damage} from './gameplay-components.js';
import {getModelGeometry,getTextureImage,model3dById} from '../assets/real-models-3d.js';
import {updateSequences} from './logic-sequences.js';
import {get3dAsset} from '../assets/catalog-3d.js';
import {workspace,switchWorkspace} from './workspaces.js';
import {sunAt,visibleLights,updateLighting} from './lighting.js';
// WarLike 3D Beta: self-contained WebGL perspective scene editor.
// Existing scene x/y become ground X/Z; object h is extrusion height. No remote dependencies.
import {state,notify} from './state.js';
import {record} from './history.js';
import {getAsset} from '../assets/catalog.js';
import {game} from './gameplay.js';
import {initSceneGizmo3d} from './gizmos-3d.js';
import {orderRtsMove,orderRtsGroup,isRtsUnit,updateRtsOrders} from './rts-orders.js';

export const view3d={enabled:false,yaw:-.68,pitch:.62,radius:25,target:[9,0,6],drag:null,gl:null,error:null,followPlayer:true};
export const playableActor=entities=>lanActor(entities,entities.find(o=>o.playable3d===true||o.type==='player'||o.type==='character'||o.type==='prefab'&&getAsset(o.assetId)?.category==='Characters')||null);
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
 const height=Math.max(.2,(asset?.shape==='glb'?o.h:asset?.category==='Buildings'?o.h*1.45:asset?.category==='Vehicles'?o.h*.60:o.h)/64);
 return {x:(o.x+o.w/2)/64,y:height/2+(Number(o.elevation3d)||0),z:(o.y+(o.depth3d??o.h)/2)/64,w:width,h:height,d:depth};
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
// Ray against oriented scene boxes. Thin ground tiles cannot swallow actor clicks.
export function pickEntity3d(entities,point,cam,{playing=false}={}){
 const f=1/Math.tan(Math.PI/6),direction=V.norm(V.add(cam.forward,V.add(V.mul(cam.right,(point.x-point.w/2)*2/(point.h*f)),V.mul(cam.up,(point.h/2-point.y)*2/(point.h*f)))));let selected=null,distance=300;
 for(const o of entities){if(!playing&&o.editorHidden||playing&&(o.visible===false||o.sequenceEnabled===false||o._hiddenInVehicle||o._sequenceDestroyed))continue;const b=objectBounds3d(o),angle=(Number(o.rotation)||0)*Math.PI/180,cs=Math.cos(angle),sn=Math.sin(angle),dx=cam.eye[0]-b.x,dy=cam.eye[1]-b.y,dz=cam.eye[2]-b.z;
  const origin=[dx*cs+dz*sn,dy,-dx*sn+dz*cs],ray=[direction[0]*cs+direction[2]*sn,direction[1],-direction[0]*sn+direction[2]*cs],extents=[b.w/2,b.h/2,b.d/2];let near=0,far=distance,hit=true;
  for(let a=0;a<3;a++){if(Math.abs(ray[a])<1e-8){if(Math.abs(origin[a])>extents[a]){hit=false;break}}else{const t1=(-extents[a]-origin[a])/ray[a],t2=(extents[a]-origin[a])/ray[a];near=Math.max(near,Math.min(t1,t2));far=Math.min(far,Math.max(t1,t2));if(near>far){hit=false;break}}}
  if(hit&&far>0&&near<distance){distance=near;selected=o}
 }return selected;
}
const shader=(gl,type,text)=>{
 const sh=gl.createShader(type);gl.shaderSource(sh,text);gl.compileShader(sh);
 if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(sh)||'Erreur shader');return sh;
};
const program3d=gl=>{
 const vs=`precision highp float;
 attribute vec3 aPosition;attribute vec3 aNormal;attribute vec2 aTexcoord;varying vec2 vTexcoord;
 uniform vec3 uEye,uRight,uUp,uForward,uPosition,uScale;
 uniform float uAngle,uAspect;
 varying vec3 vNormal,vWorld;
 void main(){
 vTexcoord=aTexcoord;vec3 q=aPosition*uScale;
 float cs=cos(uAngle),sn=sin(uAngle);
 q=vec3(q.x*cs-q.z*sn,q.y,q.x*sn+q.z*cs);
 vec3 rel=q+uPosition-uEye;
 vWorld=q+uPosition;vec3 scaledNormal=aNormal/max(abs(uScale),vec3(.0001));vNormal=normalize(vec3(scaledNormal.x*cs-scaledNormal.z*sn,scaledNormal.y,scaledNormal.x*sn+scaledNormal.z*cs));
 float d=max(0.01,dot(rel,uForward));
 float f=1.7320508;
 float clipZ=d*1.00066689-0.20006669;
 gl_Position=vec4(dot(rel,uRight)*f/uAspect,dot(rel,uUp)*f,clipZ,d);
 
 }`;
 const fs=`precision highp float;
 uniform vec4 uColor;uniform sampler2D uBaseColorTexture;uniform bool uUseTexture;uniform float uAlphaCutoff;varying vec2 vTexcoord;
 uniform vec3 uEye;
 uniform float uRoughness,uMetallic,uExposure,uFogDensity;
 uniform vec3 uFlashPos,uFlashDir;
 uniform float uFlashPower;
 uniform vec3 uSunDir,uSunColor;
 uniform float uSunIntensity,uAmbient;
 uniform int uLightCount;
 uniform vec3 uLightPos[8],uLightColor[8],uLightDir[8];
 uniform float uLightPower[8],uLightRange[8],uLightCone[8],uLightSpot[8];
 varying vec3 vNormal,vWorld;
 void main(){
 vec4 baseColor=uColor;if(uUseTexture){vec4 texel=texture2D(uBaseColorTexture,vTexcoord);baseColor*=vec4(pow(texel.rgb,vec3(2.2)),texel.a);}if(uAlphaCutoff<0.)baseColor.a=1.;else if(baseColor.a<uAlphaCutoff)discard;
 vec3 normal=normalize(vNormal);
 if(!gl_FrontFacing)normal=-normal;
 vec3 skyLight=vec3(.60,.73,.91),groundLight=vec3(.24,.27,.32);
 vec3 irradiance=mix(groundLight,skyLight,clamp(normal.y*.5+.5,0.,1.))*uAmbient;
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
 vec3 flashRay=vWorld-uFlashPos;
 float flashDist=length(flashRay);
 float flashCone=smoothstep(.78,.94,dot(normalize(flashRay),normalize(uFlashDir)));
 float flashFalloff=pow(max(0.,1.-flashDist/16.),2.);
 irradiance+=vec3(1.,.92,.72)*uFlashPower*flashCone*flashFalloff*max(0.,dot(normal,-normalize(flashRay)));
 vec3 viewDir=normalize(uEye-vWorld);
 vec3 reflected=reflect(-normalize(uSunDir),normal);
 float gloss=pow(max(0.,dot(reflected,viewDir)),mix(48.,5.,clamp(uRoughness,0.04,1.)));
 vec3 specular=mix(vec3(.18),baseColor.rgb,clamp(uMetallic,0.,1.))*gloss*uSunIntensity*(1.-uRoughness*.75);
 vec3 lit=baseColor.rgb*clamp(irradiance,0.,3.0)+specular;
 float fog=1.-exp(-pow(max(0.,length(uEye-vWorld)-22.)*uFogDensity,2.));
 vec3 fogged=mix(lit,vec3(.24,.34,.43),clamp(fog,0.,.87));
 vec3 exposed=fogged*uExposure;
 vec3 mapped=exposed/(vec3(1.)+exposed);
 gl_FragColor=vec4(pow(max(mapped,vec3(0.)),vec3(1./2.2)),baseColor.a);
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
 const drivingHud=document.createElement('div');
 drivingHud.id='warlikeVehicle3dHud';drivingHud.hidden=true;
 drivingHud.setAttribute('aria-live','off');
 host.append(drivingHud);

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
 const u={eye:loc('uEye'),right:loc('uRight'),up:loc('uUp'),forward:loc('uForward'),pos:loc('uPosition'),scale:loc('uScale'),angle:loc('uAngle'),aspect:loc('uAspect'),color:loc('uColor'),roughness:loc('uRoughness'),metallic:loc('uMetallic'),exposure:loc('uExposure'),fogDensity:loc('uFogDensity'),flashPos:loc('uFlashPos'),flashDir:loc('uFlashDir'),flashPower:loc('uFlashPower'),sunDir:loc('uSunDir'),sunColor:loc('uSunColor'),sunIntensity:loc('uSunIntensity'),ambient:loc('uAmbient'),lightCount:loc('uLightCount'),lightPos:loc('uLightPos[0]'),lightColor:loc('uLightColor[0]'),lightDir:loc('uLightDir[0]'),lightPower:loc('uLightPower[0]'),lightRange:loc('uLightRange[0]'),lightCone:loc('uLightCone[0]'),lightSpot:loc('uLightSpot[0]')};
 const aPos=gl.getAttribLocation(program,'aPosition'),aNormal=gl.getAttribLocation(program,'aNormal'),aTexcoord=gl.getAttribLocation(program,'aTexcoord');
 const textureUniform=loc('uBaseColorTexture'),useTexture=loc('uUseTexture'),alphaCutoff=loc('uAlphaCutoff');
 const makeBuffer=(data,dynamic=false)=>{const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,data,dynamic?gl.DYNAMIC_DRAW:gl.STATIC_DRAW);return {buffer:b,count:data.length/6}};
 const cubes=makeBuffer(cubeVerts()),sphere=makeBuffer(curvedVerts('sphere')),cylinder=makeBuffer(curvedVerts('cylinder')),cone=makeBuffer(curvedVerts('cone')),grid=makeBuffer(gridVerts()),outline=makeBuffer(boundsLines());
 const realGlbBuffers=new Map(),animationStates=new WeakMap();
 const ensureModel=id=>{
  if(realGlbBuffers.has(id))return;
  realGlbBuffers.set(id,{status:'loading'});
  getModelGeometry(id).then(async data=>{
   const parts=await Promise.all(data.parts.map(async part=>{
    const mesh=makeBuffer(part.vertices,!!data.rig);
    if(part.texture){
     const image=await getTextureImage(part.texture),texture=gl.createTexture();
     gl.bindTexture(gl.TEXTURE_2D,texture);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);
     gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);
     const powerOfTwo=value=>(value&(value-1))===0;
     const repeat=powerOfTwo(image.width)&&powerOfTwo(image.height);
     gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,repeat?part.texture.wrapS:gl.CLAMP_TO_EDGE);
     gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,repeat?part.texture.wrapT:gl.CLAMP_TO_EDGE);
     gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
     const uvBuffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,uvBuffer);gl.bufferData(gl.ARRAY_BUFFER,part.texcoords,gl.STATIC_DRAW);
     Object.assign(mesh,{texture,uvBuffer});
    }
    Object.assign(mesh,{alphaMode:part.alphaMode,alphaCutoff:part.alphaCutoff});
    return {mesh,color:part.color,roughness:part.roughness,metallic:part.metallic};
   }));
   realGlbBuffers.set(id,{status:'ready',parts,geometry:data,normalizedSize:data.normalizedSize,triangles:data.triangleCount});
  }).catch(error=>{
   const message=String(error.message||error);
   realGlbBuffers.set(id,{status:'error',message});
   console.warn('[WarLike GLB]',id,error);
   const status=document.querySelector('#view3dStatus');
   if(status&&workspace.mode==='3d'){status.textContent='GLB indisponible : '+id+' — '+message;status.title=message}
  });
 };

 gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);
 // glTF models may include material surfaces wound in either orientation. Keep them visible in the editor.
 gl.disable(gl.CULL_FACE);
 const bind=mesh=>{gl.bindBuffer(gl.ARRAY_BUFFER,mesh.buffer);gl.vertexAttribPointer(aPos,3,gl.FLOAT,false,24,0);gl.vertexAttribPointer(aNormal,3,gl.FLOAT,false,24,12);gl.enableVertexAttribArray(aPos);gl.enableVertexAttribArray(aNormal);
  gl.uniform1i(useTexture,mesh.texture?1:0);gl.uniform1f(alphaCutoff,mesh.alphaMode==='OPAQUE'?-1:mesh.alphaMode==='MASK'?mesh.alphaCutoff:.01);
  if(mesh.texture){gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,mesh.texture);gl.uniform1i(textureUniform,0);gl.bindBuffer(gl.ARRAY_BUFFER,mesh.uvBuffer);gl.vertexAttribPointer(aTexcoord,2,gl.FLOAT,false,0,0);gl.enableVertexAttribArray(aTexcoord)}
  else{gl.disableVertexAttribArray(aTexcoord);gl.vertexAttrib2f(aTexcoord,0,0)}
  if(mesh.alphaMode==='BLEND'){gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA)}else gl.disable(gl.BLEND);
 };
 const model=(pos,scale,color,angle=0)=>{gl.uniform3fv(u.pos,pos);gl.uniform3fv(u.scale,scale);gl.uniform1f(u.angle,angle);gl.uniform4fv(u.color,color)};
 view3d.enabled=workspace.mode==='3d';
 const resize=()=>{const d=Math.min(2,window.devicePixelRatio||1),w=Math.round(host.clientWidth*d),h=Math.round(host.clientHeight*d);if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h}gl.viewport(0,0,w,h)};
 const focusScene=()=>{
  const arr=state.selected.length?state.entities.filter(o=>state.selected.includes(o.id)):state.entities;
  if(!arr.length){view3d.target=[9,0,6];view3d.radius=25;return}
  let minx=Infinity,maxx=-Infinity,minz=Infinity,maxz=-Infinity,miny=Infinity,maxy=-Infinity;
  for(const o of arr){const b=objectBounds3d(o);minx=Math.min(minx,b.x-b.w/2);maxx=Math.max(maxx,b.x+b.w/2);minz=Math.min(minz,b.z-b.d/2);maxz=Math.max(maxz,b.z+b.d/2);miny=Math.min(miny,b.y-b.h/2);maxy=Math.max(maxy,b.y+b.h/2)}
  view3d.target=[(minx+maxx)/2,(miny+maxy)/2,(minz+maxz)/2];view3d.radius=clamp(Math.max(maxx-minx,maxy-miny,maxz-minz)*1.8,2.5,150);
 };
 const sync=()=>{canvas.hidden=!view3d.enabled;document.getElementById('canvas').hidden=view3d.enabled;buttons.toggle.classList.toggle('active',view3d.enabled);buttons.toggle.textContent=view3d.enabled?'◈ 3D Beta':'▣ 2D';buttons.status.hidden=!view3d.enabled;document.querySelector('#viewport')?.classList.toggle('view-3d-active',view3d.enabled);if(view3d.enabled)resize()};
 const change=enabled=>{if(state.playing)return false;if(!switchWorkspace(enabled?'3d':'2d'))return false;view3d.enabled=enabled;focusScene();sync();return true};
 buttons.toggle.addEventListener('click',()=>change(!view3d.enabled));
 buttons.focus.addEventListener('click',()=>{if(view3d.enabled)focusScene()});
 focusScene();sync();
 // Hub restores workspace.mode directly; do not leave a 3D project on the 2D canvas.
 // Keep the view renderer synchronized after loading or creating a named project.
 const syncProjectView=()=>{
  if(state.playing)return;
  const expected=workspace.mode==='3d';
  if(view3d.enabled===expected)return;
  view3d.enabled=expected;focusScene();sync();
 };
 document.addEventListener('warlike:project',syncProjectView);
 document.addEventListener('warlike:change',syncProjectView);
 syncProjectView();
 const fxRenderer=createFxRenderer3d(gl);view3d.fxStats=fxRenderer.stats;
 const update3dPlay=dt=>{
  if(!gameIsRunning())return;
  tickEngineDiagnostics(dt);
  const p=playableActor(state.entities),input=p&&healthOf(p)<=0?new Set():gameplayKeys(state.keys);
  if(gameplayInputBlocked())state.keyPresses?.clear();
  tickHeroRuntime(state.entities,p,dt,{mode:'3d',sceneId:gameSession.currentSceneId,keys:state.keys,pressedKeys:state.keyPresses,yaw:view3d.yaw,inputBlocked:gameplayInputBlocked()});
  if(p)p._vehicleInputConsumed=false;
  updateStats(state.entities,dt);
  updateOpenWorld(dt,p,state.entities,sequenceRuntime.globals);
  if(physicsSession){
   // Keep scene mutations and scripts synchronized with the native physics world.
   if(!synchronizeRapierScene(physicsSession,state.entities)){
    const api=physicsSession.api;
    disposeRapierScene(physicsSession);
    try{physicsSession=createRapierScene(api,state.entities);physicsAccumulator=0}
    catch(error){console.warn('[WarLike] Rapier scene rebuild failed',error);physicsSession=null}
   }
  }
  if(physicsSession){
   physicsAccumulator+=dt;
   const fixed=1/60;
   let steps=0;
   while(physicsAccumulator>=fixed&&steps++<6){stepRapierScene(physicsSession,fixed);physicsAccumulator-=fixed}
  }else stepPhysics3d(state.entities,dt);
  if(!p)return;
  updateHorror(dt,p,state.entities,input);updateHorrorPerception(dt,p,state.entities,input);updateHorrorAudio(dt,p,state.entities,input,horror);horror.jumpscare=Math.max(0,horror.jumpscare-dt);
  const inVehicle=updateDriving3d(state.entities,p,input,dt);
  if(!inVehicle)updateController3d(p,input,dt,view3d.yaw,state.entities,{pressedKeys:gameplayInputBlocked()?new Set():state.keyPresses});
  updateAi(state.entities,p,dt);
  p._attackCooldown=Math.max(0,(p._attackCooldown||0)-dt);
  if(!inVehicle&&healthOf(p)>0&&(input.has('f')||!gameplayInputBlocked()&&state.keyPresses?.has('f'))&&p._attackCooldown===0){if(isFps()){shootFps();return;}const weapon=p.inventory?.equipment?.weapon;const hit=attack3d(p,state.entities,{range:weapon?180:110,damageAmount:weapon?35:15});p._attackCooldown=.45;if(hit){p.animation='attack';emitFx('electric',heroCenter(hit,'3d'),{mode:'3d',color:'#ffd899',count:16,ring:true,lifetime:.3,scale:.7})}}
 };
 const isFps=()=>state.playing&&workspace.mode==='3d'&&!currentVehicle3d(state.entities)&&cameraRigFor(playableActor(state.entities)).mode==='firstPerson';
 let boomDistance=null,cameraFrame=1/60,lastCameraActor=null,lastCameraScene=null;
 const camera=()=>{
  if(!isFps()){
   const desired=sceneCamera3d(view3d.target,view3d.yaw,view3d.pitch,view3d.radius);
   if(!state.playing)return desired;
   const actor=currentVehicle3d(state.entities)||playableActor(state.entities),rig=cameraRigFor(actor,!!currentVehicle3d(state.entities));
   const obstacles=state.entities.filter(o=>o!==actor&&solidBody3d(o)).map(collisionWorldBounds3d);
   const boom=rig.collision?resolveCameraBoom(view3d.target,desired.eye,obstacles,{previousDistance:boomDistance,dt:0}):{eye:desired.eye,distance:view3d.radius};
   return cameraPose(view3d.target,boom.eye);

  }
  const p=playableActor(state.entities),b=objectBounds3d(p),eye=[b.x,b.y-b.h/2+b.h*.9,b.z];
  const forward=V.norm([-Math.sin(view3d.yaw)*Math.cos(view3d.pitch),-Math.sin(view3d.pitch),-Math.cos(view3d.yaw)*Math.cos(view3d.pitch)]);
  const right=V.norm(V.cross(forward,[0,1,0])),up=V.norm(V.cross(right,forward));
  return {eye,forward,right,up};
 };
 const shootFps=()=>{
  if(!isFps()||!gameIsRunning()||gameplayInputBlocked())return false;
  const player=playableActor(state.entities),cam=camera();if(healthOf(player)<=0||(player._attackCooldown||0)>0)return false;
  player._attackCooldown=.23;noteAnimatorAction(player,'attack',.35);
  const damageable=o=>healthOf(o)>0&&!sameFaction(o,player)&&(o.assetId?.includes('character-')||o.ai?.enabled||o.simulationNode?.kind==='destructible'&&o.simulationNode.health>0);
  const hit=raycastScene3d(cam.eye,cam.forward,state.entities,{exclude:player,maxDistance:45,target:damageable}),best=hit&&damageable(hit.entity)?hit.entity:null;
  if(hit&&!best)emitFx('electric',hit.point,{mode:'3d',color:'#ffd899',count:10,lifetime:.2});
  if(best){const amount=25*progressionDamageScale(player),before=best.stats?.health??best.hp??100;if(best.simulationNode?.kind==='destructible')damageSimulationNode(best,amount,player,{mode:'3d'});else{damage(best,amount);if(before>0&&(best.stats?.health??best.hp)<=0)awardExperience(player,40)}best.animation='hurt';emitFx('electric',heroCenter(best,'3d'),{mode:'3d',color:'#ffd899',count:12,lifetime:.25})}
  return !!best;
 };
 const playerTarget=()=>{const vehicle=currentVehicle3d(state.entities),p=vehicle||playableActor(state.entities);return p?cameraTargetFor(objectBounds3d(p),cameraRigFor(p,!!vehicle)):null};
 let wasPlaying=false,editorCamera=null;
 let physicsSession=null,physicsGeneration=0,physicsAccumulator=0;
 const stopRapier=()=>{physicsGeneration++;disposeRapierScene(physicsSession);physicsSession=null;physicsAccumulator=0;};
 const enterPlay=()=>{
  editorCamera={yaw:view3d.yaw,pitch:view3d.pitch,radius:view3d.radius,target:view3d.target.slice()};view3d.drag=null;boomDistance=null;resetDriving3d();
  const p=playableActor(state.entities),pt=playerTarget(),rig=cameraRigFor(p);view3d.followPlayer=!!pt;if(pt){view3d.target=pt.slice();view3d.radius=rig.distance;view3d.yaw=Math.PI-(Number(p.rotation)||0)*Math.PI/180;view3d.pitch=rig.mode==='firstPerson'?0:rig.mode==='orbit'?.62:.18}
  if(localStorage.getItem('warlike.rapier3d')!=='enabled')return;
  const token=++physicsGeneration;
  loadRapier3d().then(api=>{
   if(!api||token!==physicsGeneration||!state.playing||workspace.mode!=='3d')return;
   try{physicsSession=createRapierScene(api,state.entities)}
   catch(error){console.warn('[WarLike] Rapier unavailable, using built-in physics',error);physicsSession=null}
  });
 };

 const selectionRect=document.createElement('div');selectionRect.className='scene-selection-rectangle';selectionRect.hidden=true;host.append(selectionRect);const editorKeys=new Set();
 document.addEventListener('keydown',e=>{if(state.playing||!view3d.enabled||view3d.drag?.nav!=='look'||isTypingTarget(e.target))return;if(['KeyW','KeyA','KeyS','KeyD','KeyQ','KeyE','ShiftLeft','ShiftRight'].includes(e.code)){e.preventDefault();editorKeys.add(e.code)}});document.addEventListener('keyup',e=>editorKeys.delete(e.code));window.addEventListener('blur',()=>{editorKeys.clear();view3d.drag=null;selectionRect.hidden=true});
 const updateGizmos=initSceneGizmo3d({canvas,host,state,view3d,project3d,objectBounds3d,getCamera:camera,record,notify});
 const rectPoint=e=>{const r=canvas.getBoundingClientRect();return {x:e.clientX-r.left,y:e.clientY-r.top,w:r.width,h:r.height}};
 const pick=(point,cam)=>pickEntity3d(state.entities,point,cam,{playing:state.playing});
 view3d.pickAt=(clientX,clientY)=>{const r=canvas.getBoundingClientRect();return pick({x:clientX-r.left,y:clientY-r.top,w:r.width,h:r.height},camera())};
 canvas.addEventListener('contextmenu',e=>e.preventDefault());
 canvas.addEventListener('pointerdown',e=>{
  if(!view3d.enabled)return;
  const p=rectPoint(e),cam=camera();
  if(state.playing){
   if(!gameIsRunning()||gameplayInputBlocked())return;
   if(e.button===0&&!isLanGuest()){const unit=pick(p,cam);if(unit&&isRtsUnit(unit)){state.selected=e.shiftKey||e.ctrlKey||e.metaKey?(state.selected.includes(unit.id)?state.selected.filter(id=>id!==unit.id):[...state.selected,unit.id]):[unit.id];e.preventDefault();notify();return}}
   if(e.button===2&&!isLanGuest()){const target=pick(p,cam);if(target&&(target.ai?.enabled||target.tags?.includes('enemy'))&&orderRtsGroup(state.entities,state.selected,'attack',target.id)){e.preventDefault();return}const hit=groundHit3d(p.x,p.y,cam,p.w,p.h);if(hit&&orderRtsMove(state.entities,state.selected,{x:hit[0]*64,y:hit[2]*64})){e.preventDefault();return}}
   if(isFps()){if(e.button===0){if(isLanGuest())state.keyPresses.add('f');else shootFps();canvas.requestPointerLock?.()}return}
   if(e.button===2){view3d.drag={button:2,x:p.x,y:p.y,yaw:view3d.yaw,pitch:view3d.pitch,pointer:e.pointerId,selected:null,moved:false};canvas.setPointerCapture(e.pointerId)}
   return;
  }
  if(![0,1,2].includes(e.button))return;e.preventDefault();
  const hand=document.querySelector('[data-tool="hand"]')?.classList.contains('active');
  const nav=e.altKey?(e.button===2?'dolly':e.button===1?'pan':'orbit'):e.button===2?'look':e.button===1||hand?'pan':null;
  const baseSelection=state.selected.slice(),selected=!nav&&e.button===0?pick(p,cam):null;
  if(!nav&&e.button===0&&selected){
   if(e.ctrlKey||e.metaKey||e.shiftKey){state.selected=state.selected.includes(selected.id)?state.selected.filter(i=>i!==selected.id):[...state.selected,selected.id];notify()}
   else {if(!state.selected.includes(selected.id))state.selected=[selected.id];notify()}
  }else if(!nav&&e.button===0&&!e.shiftKey&&!e.ctrlKey&&!e.metaKey){state.selected=[];notify()}
  const point=groundHit3d(p.x,p.y,cam,p.w,p.h);
  view3d.drag={button:e.button,nav:nav||(!selected?'marquee':'move'),x:p.x,y:p.y,target:[...view3d.target],eye:cam.eye.slice(),radius:view3d.radius,yaw:view3d.yaw,pitch:view3d.pitch,start:point,baseSelection,add:e.shiftKey||e.ctrlKey||e.metaKey,selected:selected&&e.button===0?state.entities.filter(o=>state.selected.includes(o.id)).map(o=>({id:o.id,x:o.x,y:o.y,z:o.z||0})):null,moved:false,pointer:e.pointerId};
  canvas.setPointerCapture(e.pointerId);
 });
 document.addEventListener('mousemove',e=>{if(document.pointerLockElement===canvas&&isFps()&&gameIsRunning()&&!gameplayInputBlocked()){const sensitivity=cameraRigFor(playableActor(state.entities)).sensitivity;view3d.yaw-=e.movementX*sensitivity;view3d.pitch=clamp(view3d.pitch+e.movementY*sensitivity,-1.25,1.25)}});
 canvas.addEventListener('pointermove',e=>{
  if(!view3d.enabled)return;const p=rectPoint(e),cam=camera();
  if(state.playing){
   if(!gameIsRunning()||gameplayInputBlocked())return;const d=view3d.drag;if(d?.button===2&&d.pointer===e.pointerId){view3d.yaw=d.yaw-(p.x-d.x)*.009;view3d.pitch=clamp(d.pitch+(p.y-d.y)*.006,-.22,1.15)}
   return;
  }
  const drag=view3d.drag;if(!drag||drag.pointer!==e.pointerId)return;
  const dx=p.x-drag.x,dy=p.y-drag.y;
  if(Math.hypot(dx,dy)>4)drag.moved=true;
  if(drag.nav==='look'||drag.nav==='orbit'){
   view3d.yaw=drag.yaw-dx*.009;view3d.pitch=clamp(drag.pitch+dy*.009,-1.48,1.48);
   if(drag.nav==='look'){const radius=drag.radius;view3d.target=[drag.eye[0]-radius*Math.cos(view3d.pitch)*Math.sin(view3d.yaw),drag.eye[1]-radius*Math.sin(view3d.pitch),drag.eye[2]-radius*Math.cos(view3d.pitch)*Math.cos(view3d.yaw)]}
  }else if(drag.nav==='dolly')view3d.radius=clamp(drag.radius*Math.exp(dy*.01),.4,150);
  else if(drag.nav==='pan'){
   const amount=view3d.radius/Math.max(180,p.h)*1.9;
   view3d.target=V.add(drag.target,V.add(V.mul(cam.right,-dx*amount),V.mul(cam.up,dy*amount)));
  }else if(drag.nav==='marquee'&&drag.moved){
   const left=Math.min(drag.x,p.x),top=Math.min(drag.y,p.y),right=Math.max(drag.x,p.x),bottom=Math.max(drag.y,p.y),scale=Number.parseFloat(getComputedStyle(document.body).zoom)||1;
   Object.assign(selectionRect.style,{left:left/scale+'px',top:top/scale+'px',width:(right-left)/scale+'px',height:(bottom-top)/scale+'px'});selectionRect.hidden=false;
   const ids=state.entities.filter(o=>{if(o.editorHidden)return false;const b=objectBounds3d(o),screen=project3d([b.x,b.y,b.z],cam,p.w,p.h);return screen&&screen.x>=left&&screen.x<=right&&screen.y>=top&&screen.y<=bottom}).map(o=>o.id);
   state.selected=drag.add?[...new Set([...drag.baseSelection,...ids])]:ids;
  }else if(drag.button===0&&drag.selected&&drag.start){
   const hit=groundHit3d(p.x,p.y,cam,p.w,p.h);
   if(hit){for(const start of drag.selected){const obj=state.entities.find(o=>o.id===start.id);if(obj){obj.x=Math.round(start.x+(hit[0]-drag.start[0])*64);obj.y=Math.round(start.y+(hit[2]-drag.start[2])*64)}}}
  }
 });
 const stop=e=>{const d=view3d.drag;if(!d||d.pointer!==e.pointerId)return;
  if(d.moved&&d.selected&&d.button===0)record('Déplacer en vue 3D');
  view3d.drag=null;editorKeys.clear();selectionRect.hidden=true;notify();
 };
 canvas.addEventListener('pointerup',stop);canvas.addEventListener('pointercancel',stop);canvas.addEventListener('lostpointercapture',stop);
 canvas.addEventListener('wheel',e=>{if(!view3d.enabled||e.defaultPrevented)return;e.preventDefault();if(state.playing&&(isFps()||!gameIsRunning()))return;view3d.radius=clamp(view3d.radius*Math.exp(e.deltaY*.001),state.playing?1.2:3,state.playing?16:150)},{passive:false});

 let previousTime=performance.now();
 function draw(now=performance.now()){
  requestAnimationFrame(draw);
  const dt=Math.min(.1,Math.max(0,(now-previousTime)/1000));previousTime=now;
  if(document.hidden)return;cameraFrame=gameIsRunning()?dt:0;
  if(!state.playing&&view3d.enabled&&view3d.drag?.nav==='look'&&editorKeys.size){
   const right=Number(editorKeys.has('KeyD'))-Number(editorKeys.has('KeyA')),forward=Number(editorKeys.has('KeyW'))-Number(editorKeys.has('KeyS')),up=Number(editorKeys.has('KeyE'))-Number(editorKeys.has('KeyQ')),length=Math.hypot(right,forward,up);
   if(length){const cam=camera(),speed=clamp(view3d.radius*.7,2.5,40)*(editorKeys.has('ShiftLeft')||editorKeys.has('ShiftRight')?3:1)*dt/length,delta=V.add(V.add(V.mul(cam.right,right*speed),V.mul(cam.forward,forward*speed)),[0,up*speed,0]);view3d.target=V.add(view3d.target,delta);view3d.drag.eye=V.add(view3d.drag.eye,delta);view3d.drag.target=view3d.target.slice();if(!view3d.drag.moved){view3d.drag.moved=true;document.dispatchEvent(new Event('warlike:scene-navigation'))}}
  }
  updateLighting(dt,state.playing&&workspace.mode==='3d');
  if(state.playing&&!wasPlaying)enterPlay();
  if(!state.playing&&wasPlaying){view3d.followPlayer=false;view3d.drag=null;if(editorCamera)Object.assign(view3d,editorCamera);editorCamera=null;if(document.pointerLockElement===canvas)document.exitPointerLock?.();resetDriving3d();stopRapier();}
  wasPlaying=state.playing;
  if(state.playing&&workspace.mode==='3d'&&!isLanGuest()){updateRtsOrders(state.entities,dt,gameIsRunning(),{mode:'3d'});update3dPlay(dt);updateSequences(dt,{mode:'3d',yaw:view3d.yaw,playing:true,entities:state.entities,keys:gameplayKeys(state.keys),pressedKeys:gameplayInputBlocked()?new Set():state.keyPresses,player:playableActor(state.entities),allocateId(){state.nextId=Math.max(state.nextId,...state.entities.map(o=>o.id+1));return state.nextId++},onSceneChange(){state.nextId=Math.max(0,...state.entities.map(o=>o.id))+1}});}
  if(state.playing&&gameIsRunning()&&view3d.followPlayer){const actor=currentVehicle3d(state.entities)||playableActor(state.entities),pt=playerTarget();if(pt){const cut=actor!==lastCameraActor||gameSession.currentSceneId!==lastCameraScene||Math.hypot(...V.sub(pt,view3d.target))>12,t=cut?1:cameraDamping(cameraRigFor(actor).followSharpness,dt);view3d.target=V.add(V.mul(view3d.target,1-t),V.mul(pt,t));if(cut)boomDistance=null}lastCameraActor=actor;lastCameraScene=gameSession.currentSceneId;}
  if(!view3d.enabled){updateGizmos();return}
  updateGenreHud(state);updateGizmos();
  const vehicleHud=document.getElementById('warlikeVehicle3dHud');
  if(vehicleHud){
   const car=currentVehicle3d(state.entities);
   const player=playableActor(state.entities);
   const nearby=!car&&player?state.entities.filter(isDriveable3d).map(o=>({o,d:Math.hypot((o.x+(o.w||32)/2)-(player.x+(player.w||32)/2),(o.y+(o.depth3d||o.h||32)/2)-(player.y+(player.depth3d||player.h||32)/2))})).sort((a,b)=>a.d-b.d)[0]:null;
   vehicleHud.hidden=!state.playing||(!car&&!(nearby&&nearby.d<Math.max(150,(nearby.o.w||64)*.85)));
   if(car)vehicleHud.textContent=car.name+' · '+Math.round(Math.abs(driving3d.speed)*.36)+' km/h · Rapport '+(car.vehicleSystems?.transmission?.gear??1)+' · ZQSD conduire · E sortir · Espace frein à main'+(car.vehicleWeapon?.enabled?' · F tirer':'');
   else if(nearby)vehicleHud.textContent='E — Entrer dans '+nearby.o.name;
  }
  const crosshair=document.getElementById('fpsCrosshair');if(crosshair)crosshair.hidden=!isFps();
  const horrorHud=document.getElementById('horror3dHud');
  if(horrorHud){
   horrorHud.hidden=!(state.playing&&horror.enabled);
   if(!horrorHud.hidden)horrorHud.textContent=(horror.jumpscare>0?'⚠ DANGER !  |  ':'☾ SURVIVAL HORROR  |  ')+'L : lampe '+(horror.flashlight?'ON':'OFF')+'  |  Batterie '+Math.round(horror.battery)+'%  |  Peur '+Math.round(horror.fear)+'%';
  }
  if(state.playing&&sequenceRuntime.messages.length){const latest=sequenceRuntime.messages.at(-1);buttons.status.textContent='3D PLAY • '+latest.text}else if(state.playing){buttons.status.textContent='3D PLAY • ZQSD/WASD pour bouger • Maj pour courir'}else{buttons.status.textContent='SCÈNE 3D • Alt+gauche : orbite • Molette centrale : déplacer • Clic droit + ZQSD : naviguer • F : cadrer'}
  resize();const w=canvas.clientWidth,h=canvas.clientHeight;if(!w||!h)return;
  const solar=sunAt();gl.clearColor(...solar.sky,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
  if(state.playing&&!isFps()){const actor=currentVehicle3d(state.entities)||playableActor(state.entities),rig=cameraRigFor(actor,!!currentVehicle3d(state.entities)),desired=sceneCamera3d(view3d.target,view3d.yaw,view3d.pitch,view3d.radius);boomDistance=rig.collision?resolveCameraBoom(view3d.target,desired.eye,state.entities.filter(o=>o!==actor&&solidBody3d(o)).map(collisionWorldBounds3d),{previousDistance:boomDistance,dt:cameraFrame}).distance:view3d.radius}
  gl.useProgram(program);const cam=camera();
  gl.uniform3fv(u.flashPos,cam.eye);gl.uniform3fv(u.flashDir,cam.forward);
  gl.uniform1f(u.flashPower,state.playing&&horror.enabled&&horror.flashlight&&horror.battery>0?3.1:0);
  gl.uniform3fv(u.eye,cam.eye);gl.uniform3fv(u.forward,cam.forward);gl.uniform3fv(u.right,cam.right);gl.uniform3fv(u.up,cam.up);gl.uniform1f(u.aspect,w/h);
  gl.uniform3fv(u.sunDir,solar.direction);gl.uniform3fv(u.sunColor,solar.color);
  gl.uniform1f(u.exposure,renderQuality.exposure3d);gl.uniform1f(u.fogDensity,renderQuality.fog3d);
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
  const objects=[...state.entities].filter(o=>(state.playing||!o.editorHidden)&&(!state.playing||!((o.audioEnabled||o.lightType)&&!o.assetId)&&o.visible!==false&&o.sequenceEnabled!==false&&!o._hiddenInVehicle&&!o._hiddenInHouse&&!o._modeEliminated)&&(!isFps()||o!==playableActor(state.entities)));
  // Depth buffering resolves overlapping faces, including the composite mesh parts.
  bind(cubes);
  for(const o of objects){
   const b=objectBounds3d(o),color=assetColor(o),asset=getAsset(o.assetId),category=asset?.category;
   const angle=(o.rotation||0)*Math.PI/180;
   gl.uniform1f(u.roughness,Math.max(.04,Math.min(1,Number(o.materialRoughness??.7))));
   gl.uniform1f(u.metallic,Math.max(0,Math.min(1,Number(o.materialMetallic??0))));
   const shape=o.model3dId?'glb':get3dAsset(o.assetId)?.shape;
   const drawShape=(mesh,p,scale,shade)=>{bind(mesh);model(p,scale,shade,angle);gl.drawArrays(gl.TRIANGLES,0,mesh.count)};
   const cube=(p,scale,shade)=>drawShape(cubes,p,scale,shade);
   const round=(p,scale,shade)=>drawShape(sphere,p,scale,shade);
   const cyl=(p,scale,shade)=>drawShape(cylinder,p,scale,shade);
   if(shape==='glb'){
    const id=o.model3dId||o.assetId;ensureModel(id);
    const cached=realGlbBuffers.get(id);
    if(cached?.status==='ready'){
     let posed=null;const rig=cached.geometry.rig;
     if(rig?.animations.length&&(state.playing||o.animationPreview||o.animatorPreview)){
      if(o.animatorGraph&&o.animatorGraph.enabled!==false&&o._animatorFrame){let track=animationStates.get(o);if(!track){track={buffers:[]};animationStates.set(o,track)}track.graph=true;const options=animatorPoseOptions(o._animatorFrame,rig.animations,o.animationMap||{});posed=deformGlbParts(cached.geometry,sampleRigPose(rig,null,0,options),{buffers:track.buffers})}else{
      if(animationStates.get(o)?.graph)animationStates.delete(o);
      const desired=o.animationAuto===false?o.animation3dClip||'idle':(o.animation==='dead'?'death':o.animation||'idle');
      const clip=animationClipForState(rig.animations,desired,o.animationMap||{},animationStates.get(o),{automatic:o.animationAuto!==false});
      if(clip){
       let track=animationStates.get(o);if(!track){track={clip,time:0,previous:null,transition:1,buffers:[],oneShot:o.animationAuto!==false&&['attack','hurt'].includes(desired)};animationStates.set(o,track)}
       if(track.clip!==clip){track.previous={clip:track.clip,time:track.time};track.clip=clip;track.time=0;track.transition=0;track.oneShot=o.animationAuto!==false&&['attack','hurt'].includes(desired)}else if(track.oneShot&&track.time>=clip.duration&&desired==='attack'){track.time=0}
       const step=state.playing&&!gameIsRunning()?0:dt*Math.max(.05,Math.min(4,Number(o.animationSpeed)||1));track.time+=step;track.transition=Math.min(1,track.transition+step/.18);
       const loop=!track.oneShot&&o.animationLoop!==false&&!/death|die|jump_start|jump_land/i.test(clip.name);
       posed=deformGlbParts(cached.geometry,sampleRigPose(rig,clip,track.time,{loop,previous:track.previous,blend:track.transition}),{buffers:track.buffers});
      }
      }
     }
     for(const [partIndex,part] of cached.parts.entries()){
      if(posed){gl.bindBuffer(gl.ARRAY_BUFFER,part.mesh.buffer);gl.bufferSubData(gl.ARRAY_BUFFER,0,posed[partIndex])}
      else if(rig){gl.bindBuffer(gl.ARRAY_BUFFER,part.mesh.buffer);gl.bufferSubData(gl.ARRAY_BUFFER,0,cached.geometry.parts[partIndex].vertices)}
      const material=o.colorCustomized?color:part.color;
      gl.uniform1f(u.roughness,Math.max(.04,Math.min(1,Number(o.materialRoughness??part.roughness??1))));
      gl.uniform1f(u.metallic,Math.max(0,Math.min(1,Number(o.materialMetallic??part.metallic??0))));
      const size=cached.normalizedSize||[1,1,1],scale=Math.min(b.w/size[0],b.h/size[1],b.d/size[2]);
      drawShape(part.mesh,[b.x,(Number(o.elevation3d)||0)+size[1]*scale/2,b.z],[scale,scale,scale],material);
     }
    }else{
     // Never substitute an unrelated cube for an actual GLB asset.
     // The model loading/error state is reported in #view3dStatus.
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
     // Default TPS character: procedural walking/running pose for unrigged primitives.
     // A rendered idle mannequin must not appear frozen while the controller moves it.
     const locomoting=state.playing&&(o.animation==='walk'||o.animation==='run');
     const cadence=o.animation==='run'?13:8;
     const stride=locomoting?Math.sin(now*.001*cadence):0;
     const bounce=locomoting?Math.abs(Math.sin(now*.001*cadence))*.025*b.h:0;
     cube([b.x,b.y+b.h*.08+bounce,b.z],[b.w*.58,b.h*.43,b.d*.55],color);
     cube([b.x,b.y+b.h*.34+bounce,b.z],[b.w*.5,b.h*.10,b.d*.48],[.31,.41,.49,1]);
     round([b.x,b.y+b.h*.49+bounce,b.z],[b.w*.43,b.h*.24,b.d*.42],[.82,.68,.57,1]);
     cube([b.x,b.y+b.h*.58+bounce,b.z-b.d*.035],[b.w*.49,b.h*.12,b.d*.45],[.27,.32,.38,1]);
     for(const side of [-1,1]){
      const swing=stride*side;
      cube([b.x+b.w*side*.39,b.y+b.h*.03+bounce,b.z-b.d*swing*.20],[b.w*.20,b.h*.41,b.d*.30],color);
      round([b.x+b.w*side*.39,b.y-b.h*.20+bounce,b.z-b.d*swing*.25],[b.w*.19,b.h*.16,b.d*.31],[.76,.60,.49,1]);
      cube([b.x+b.w*side*.17,b.y-b.h*.31,b.z+b.d*swing*.16],[b.w*.21,b.h*.43,b.d*.31],[.27,.36,.42,1]);
      cube([b.x+b.w*side*.17,b.y-b.h*.54+Math.max(0,swing)*b.h*.075,b.z+b.d*(.11+swing*.28)],[b.w*.26,b.h*.11,b.d*.45],[.18,.24,.28,1]);
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
  if(!state.playing)tickFxRuntime(state.entities.filter(o=>o.fxEmitter?.preview),dt,'3d');
  fxRenderer.draw(cam,w,h,state.playing?state.entities:[]);
  if(!state.playing){gl.useProgram(program);bind(outline);for(const o of objects.filter(o=>state.selected.includes(o.id))){const b=objectBounds3d(o);model([b.x,b.y,b.z],[b.w*1.03,b.h*1.03,b.d*1.03],[.32,1,.8,1],(o.rotation||0)*Math.PI/180);gl.drawArrays(gl.LINES,0,outline.count)}}
 }
 requestAnimationFrame(draw);
 return {setEnabled:change,focus:focusScene,syncToWorkspace:()=>{view3d.enabled=workspace.mode==='3d';focusScene();sync()}};
}
