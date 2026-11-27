import {runtimeProfiler,profileStart,profileScope,profileDraw,createGpuProfiler} from './runtime-profiler.js';
import {createEditorPlayCamera} from './editor-play-camera.js';
import {cacheAnimationGeometry,skeletalClips,sampleEntityRigPose,hasSkeletalPreview,skeletalFrame} from './skeletal-animation.js';
import {waterSettings,waterSurface3d,waterColor} from './stylized-water.js';
import {validTerrainHeightfield} from './gaia-terrain-physics.js';
import {terrainSurfaceMesh3d} from './gaia-terrain-sculpt.js';
import {validRoadSpline,roadSurfaceBuffers3d} from './gaia-road-spline.js';
import {roadStreetscapeBuffers3d} from './gaia-road-streetscape.js';
import {validRoadJunction,roadJunctionBuffers3d} from './gaia-road-junctions.js';
import {gaiaJunctionSignalPositions,gaiaTrafficSignalSeconds} from './gaia-traffic-ai.js';
import {runRuntimeFrame} from './runtime-session.js';
import {companyController,commandCompany,selectCompanySquad} from './company-runtime.js';
import {moveCompanyCamera} from './company-camera.js';
import {updateCompanyMarkers} from '../runtime/ui/company-ui.js';
import {resetBattlefield,tickBattlefield,battlefieldMatch,consumeBattlefieldShot,isBattlefieldSoldier} from './battlefield-runtime.js';
import {updateBattlefieldHud} from '../runtime/ui/battlefield-hud.js';
import {rotationQuaternion3d,quaternionEuler3d} from './collider-3d.js';
import {affineCorrection3d,normalMatrix3d,updateEditorEntityHierarchy3d,updateAffineEditorPose3d,boneSocketTransform3d,buildMeshSnapIndex3d,nearestMeshSnapFeature3d} from './scene-graph-v2.js';

import {survivalPlacement} from './survival-building.js';
import {animatorPoseOptions,noteAnimatorAction} from './animator-graph.js';
import {lanActor,isLanGuest} from './lan-state.js';
import {solidBody3d,raycastScene3d} from './collision-3d.js';
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
import {cameraObstacleForEntity,cameraRigFor,cameraTargetFor,resolveCameraBoom,cameraPose,cameraDamping,cameraHandoffStep} from './play-camera.js';
import {activeSceneCamera,sceneCameraView,cameraMovementYaw} from './scene-camera-3d.js';
import {CameraTransition3d} from './camera-transition-3d.js';
import {gameIsRunning,gameSession} from './game-session.js';
import {updateHorrorAudio} from './horror-audio.js';
import {tickEngineDiagnostics} from './engine-diagnostics.js';
import {updateDriving3d,currentVehicle3d,isDriveable3d,driving3d,resetDriving3d} from './vehicle-3d.js';
import {aircraftCameraView,aircraftFlightInstruments,nextAircraftCameraMode} from './aircraft-camera.js';
import {vehicleRigPose} from './vehicle-articulation.js';
import {aircraftRigPose} from './aircraft-visual-rig.js';
import {updateGenreHud} from '../runtime/ui/genre-hud.js';
import {updateOpenWorld} from './open-world-systems.js';
import {sequenceRuntime} from './logic-sequences.js';
import {updateHorror,updateHorrorPerception,horror} from './horror-survival.js';
import {renderQuality,viewportPixelSize} from './render-quality.js';
import {sunShadowFrame3d,createSunShadowMap3d} from './shadow-map-3d.js';
import {createEnvironmentIbl3d} from './environment-ibl-3d.js';
import {decodeRadianceHdr} from './hdr-radiance-3d.js';
import {prefilterHdriFace3d} from './ibl-prefilter-3d.js';
import {environmentProbeUniforms3d} from './environment-probes-3d.js';
import {gameProject} from './game-project.js';
import {storeProjectHdri,loadProjectHdri,deleteProjectHdri} from './project-hdri-assets.js';
import {stepPhysics3d} from './physics-3d.js';
import {rapierStatus,loadRapier3d,createRapierScene,activateRapierQueries3d,moveRapierCharacter3d,stepRapierScene,synchronizeRapierScene,disposeRapierScene} from './rapier-physics-3d.js';
import {updateController3d,updateAi,updateStats,attack3d,damage} from './gameplay-components.js';
import {getModelGeometry,getTextureImage,model3dById} from '../assets/real-models-3d.js';
import {updateSequences,emitSequenceSignal} from './logic-sequences.js';
import {createGrabSession3d,discardGrabSession3d,tickGrab3d,releaseGrab3d} from './grab-physics-3d.js';
import {get3dAsset} from '../assets/catalog-3d.js';
import {workspace,switchWorkspace} from './workspaces.js';
import {sunAt,visibleLights,updateLighting} from './lighting.js';
// WarLike 3D Beta: self-contained WebGL perspective scene editor.
// Existing scene x/y become ground X/Z; object h is extrusion height. No remote dependencies.
import {state,notify} from './state.js';
import {editorServices} from './editor-services.js';
const record=(...args)=>editorServices.record(...args);
import {getAsset} from '../assets/catalog.js';
import {game} from './gameplay.js';
const initSceneGizmo3d=(...args)=>editorServices.initSceneGizmo3d(...args);
import {glbVisualPlacement3d} from './glb-visual-transform-3d.js';
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
 const f=1/Math.tan((cam.fieldOfView||60)*Math.PI/360);
 return {x:width/2+V.dot(rel,cam.right)*f*height/(2*d),y:height/2-V.dot(rel,cam.up)*f*height/(2*d),depth:d};
};
export const groundHit3d=(sx,sy,cam,width,height)=>{
 const f=1/Math.tan((cam.fieldOfView||60)*Math.PI/360),r=V.norm(V.add(cam.forward,V.add(V.mul(cam.right,(sx-width/2)*2/(height*f)),V.mul(cam.up,(height/2-sy)*2/(height*f)))));
 if(Math.abs(r[1])<1e-5)return null;
 const t=-cam.eye[1]/r[1];return t>0?V.add(cam.eye,V.mul(r,t)):null;
};
// Triangle-accurate raycasting against the same normalized vertex positions the
// WebGL renderer draws. Double-sided Moller-Trumbore; nearest positive hit.
export function raycastTriangles3d(origin,direction,vertices,transform,{maxDistance=1e4}={}){
 if(!vertices||vertices.length%18!==0||!Array.isArray(origin)||!Array.isArray(direction))return null;
 const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
 const sub=(a,b)=>a.map((v,i)=>v-b[i]),dot=(a,b)=>a.reduce((v,n,i)=>v+n*b[i],0);
 let result=null,best=maxDistance;
 for(let i=0;i<vertices.length;i+=18){
  const point=j=>transform([vertices[i+j],vertices[i+j+1],vertices[i+j+2]]);
  const a=point(0),b=point(6),c=point(12),u=sub(b,a),v=sub(c,a);
  const p=cross(direction,v),det=dot(u,p);if(Math.abs(det)<1e-9)continue;
  const inv=1/det,tvec=sub(origin,a),x=dot(tvec,p)*inv;if(x<-1e-7||x>1+1e-7)continue;
  const q=cross(tvec,u),y=dot(direction,q)*inv;if(y<-1e-7||x+y>1+1e-7)continue;
  const distance=dot(v,q)*inv;if(distance<=1e-6||distance>=best)continue;
  let normal=cross(u,v),length=Math.hypot(...normal);if(length<1e-9)continue;
  normal=normal.map(n=>n/length);if(dot(normal,direction)>0)normal=normal.map(n=>-n);
  best=distance;result={distance,point:origin.map((n,k)=>n+direction[k]*distance),normal,triangle:i/18,vertices:[a,b,c],barycentric:[1-x-y,x,y]};
 }
 return result;
}
export function sceneRay3d(x,y,cam,width,height){
 const f=1/Math.tan((cam.fieldOfView||60)*Math.PI/360);
 const direction=V.norm(V.add(cam.forward,V.add(V.mul(cam.right,(x-width/2)*2/(height*f)),V.mul(cam.up,(height/2-y)*2/(height*f)))));
 return {origin:[...cam.eye],direction};
}
// Ray against oriented scene boxes. Thin ground tiles cannot swallow actor clicks.
export function pickEntity3d(entities,point,cam,{playing=false}={}){
 const f=1/Math.tan((cam.fieldOfView||60)*Math.PI/360),direction=V.norm(V.add(cam.forward,V.add(V.mul(cam.right,(point.x-point.w/2)*2/(point.h*f)),V.mul(cam.up,(point.h/2-point.y)*2/(point.h*f)))));let selected=null,distance=300;
 for(const o of entities){if(!playing&&o.editorHidden||playing&&(o.enabled===false||o.visible===false||o.sequenceEnabled===false||o._hiddenInVehicle||o._sequenceDestroyed))continue;const b=objectBounds3d(o),angle=(Number(o.rotation)||0)*Math.PI/180,cs=Math.cos(angle),sn=Math.sin(angle),dx=cam.eye[0]-b.x,dy=cam.eye[1]-b.y,dz=cam.eye[2]-b.z;
  const origin=[dx*cs+dz*sn,dy,-dx*sn+dz*cs],ray=[direction[0]*cs+direction[2]*sn,direction[1],-direction[0]*sn+direction[2]*cs],extents=[b.w/2,b.h/2,b.d/2];let near=0,far=distance,hit=true;
  for(let a=0;a<3;a++){if(Math.abs(ray[a])<1e-8){if(Math.abs(origin[a])>extents[a]){hit=false;break}}else{const t1=(-extents[a]-origin[a])/ray[a],t2=(extents[a]-origin[a])/ray[a];near=Math.max(near,Math.min(t1,t2));far=Math.min(far,Math.max(t1,t2));if(near>far){hit=false;break}}}
  if(hit&&far>0&&near<distance){distance=near;selected=o}
 }return selected;
}
const shader=(gl,type,text)=>{
 const sh=gl.createShader(type);gl.shaderSource(sh,text);gl.compileShader(sh);
 if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(sh)||'Erreur shader');return sh;
};
export const program3d=gl=>{
 const derivatives=!!gl.getExtension("OES_standard_derivatives"),explicitLod=!!gl.getExtension("EXT_shader_texture_lod");
 const vs=`precision highp float;
 attribute vec3 aPosition;attribute vec3 aNormal;attribute vec2 aTexcoord;varying vec2 vTexcoord;attribute vec4 aVertexColor;varying vec4 vVertexColor;
 attribute vec4 aMaterialUV0,aMaterialUV1;varying vec4 vMaterialUV0,vMaterialUV1;
 uniform vec3 uEye,uRight,uUp,uForward,uPosition,uScale;
 uniform vec4 uRotation;uniform float uAspect,uProjectionFactor,uNearClip,uFarClip;uniform bool uViewModel,uUseAffine;uniform mat3 uViewBasis,uAffineNormal;uniform mat4 uAffineMatrix;
 uniform bool uShadowPass;uniform vec3 uShadowEye,uShadowRight,uShadowUp,uShadowForward;uniform float uShadowExtent,uShadowNear,uShadowFar;
 vec3 rotateQ(vec3 v){return v+2.0*cross(uRotation.xyz,cross(uRotation.xyz,v)+uRotation.w*v);}
 varying vec3 vNormal,vWorld;
 void main(){
 vMaterialUV0=aMaterialUV0;vMaterialUV1=aMaterialUV1;vTexcoord=aTexcoord;vVertexColor=aVertexColor;vec3 q=aPosition*uScale;
 q=uViewModel?uViewBasis*q:rotateQ(q);
 vec3 worldPosition=q+uPosition;
 if(uUseAffine)worldPosition=(uAffineMatrix*vec4(worldPosition,1.0)).xyz;
 vec3 rel=worldPosition-uEye;
 vWorld=worldPosition;if(uShadowPass){vec3 ray=worldPosition-uShadowEye;float d=dot(ray,uShadowForward);gl_Position=vec4(dot(ray,uShadowRight)/uShadowExtent,dot(ray,uShadowUp)/uShadowExtent,2.*(d-uShadowNear)/(uShadowFar-uShadowNear)-1.,1.);return;}vec3 scaledNormal=aNormal/max(abs(uScale),vec3(.0001));vec3 worldNormal=uViewModel?uViewBasis*scaledNormal:rotateQ(scaledNormal);vNormal=normalize(uUseAffine?uAffineNormal*worldNormal:worldNormal);
 float d=max(0.01,dot(rel,uForward));
 float f=uProjectionFactor;
 float clipZ=d*(uFarClip+uNearClip)/(uFarClip-uNearClip)-2.0*uFarClip*uNearClip/(uFarClip-uNearClip);
 gl_Position=vec4(dot(rel,uRight)*f/uAspect,dot(rel,uUp)*f,clipZ,d);

 }`;
 const fs=`${explicitLod?"#extension GL_EXT_shader_texture_lod : enable\n":""}${derivatives?"#extension GL_OES_standard_derivatives : enable\n":""}precision highp float;
 varying vec4 vMaterialUV0,vMaterialUV1;
 uniform sampler2D uNormalMap,uMetallicRoughnessMap,uOcclusionMap,uEmissiveMap;
 uniform bool uHasNormalMap,uHasMetallicRoughnessMap,uHasOcclusionMap,uHasEmissiveMap;
 uniform float uNormalScale,uOcclusionStrength;
 varying vec4 vVertexColor;uniform bool uUnlit;uniform vec3 uEmissive;
 uniform vec4 uColor;uniform sampler2D uBaseColorTexture;uniform bool uUseTexture;uniform float uAlphaCutoff;varying vec2 vTexcoord;
 uniform vec3 uEye;
 uniform float uRoughness,uMetallic,uExposure,uFogDensity;
 uniform vec3 uFlashPos,uFlashDir;
 uniform float uFlashPower;
 uniform vec3 uSunDir,uSunColor;
 uniform float uSunIntensity,uAmbient;
 uniform float uEnvironmentMaxLod;uniform bool uEnvironmentEnabled;uniform samplerCube uEnvironmentSharp,uEnvironmentDiffuse;uniform int uProbeCount;uniform vec3 uProbePositions[4],uProbeTints[4];uniform float uProbeRadius[4],uProbeStrength[4];
 uniform bool uShadowPass,uShadowsEnabled,uViewModel;uniform sampler2D uShadowMap;uniform float uShadowTexelSize,uShadowBias;uniform vec3 uShadowEye,uShadowRight,uShadowUp,uShadowForward;uniform float uShadowExtent,uShadowNear,uShadowFar;
 uniform int uLightCount;
 uniform vec3 uLightPos[8],uLightColor[8],uLightDir[8];
 uniform float uLightPower[8],uLightRange[8],uLightCone[8],uLightSpot[8];
 varying vec3 vNormal,vWorld;
 // glTF metallic-roughness: GGX specular distribution, correlated Smith visibility,
 // Schlick Fresnel. All direct sources use this same energy-conserving BRDF.
 vec3 directBRDF(vec3 base, float metal, float rough, vec3 N, vec3 V, vec3 L){
  float NoL=max(dot(N,L),0.),NoV=max(dot(N,V),0.);
  if(NoL<=0.||NoV<=0.)return vec3(0.);
  vec3 H=(L+V)/max(length(L+V),.00001);
  float NoH=max(dot(N,H),0.),VoH=max(dot(V,H),0.);
  float alpha=rough*rough,a2=alpha*alpha;
  // The cross product avoids cancellation at very small roughness.
  vec3 NxH=cross(N,H);float d=dot(NxH,NxH)+NoH*NoH*a2;
  float D=a2/(3.14159265*max(d*d,1e-14));
  float visibility=.5/max(NoL*sqrt(NoV*NoV*(1.-a2)+a2)+NoV*sqrt(NoL*NoL*(1.-a2)+a2),.000001);
  vec3 F0=mix(vec3(.04),base,metal);
  vec3 F=F0+(vec3(1.)-F0)*pow(1.-VoH,5.);
  vec3 diffuse=(vec3(1.)-F)*(1.-metal)*base/3.14159265;
  return (diffuse+F*D*visibility)*NoL;
 }
 // 24-bit depth packed into RGB for WebGL1; no depth texture extension needed.
 vec3 packShadowDepth(float depth){vec3 e=fract(depth*vec3(1.,255.,65025.));e.xy-=e.yz/255.;return e;}
 float unpackShadowDepth(vec4 p){return dot(p.rgb,vec3(1.,1./255.,1./65025.));}
 vec3 rgbmEnvironment(vec4 texel){return texel.rgb*texel.a*8.;}
 float sunShadowVisibility(vec3 position,vec3 normal,vec3 sunDirection){
  if(!uShadowsEnabled||uViewModel)return 1.;
  vec3 toLight=position-uShadowEye;
  vec2 uv=vec2(dot(toLight,uShadowRight),dot(toLight,uShadowUp))*.5/uShadowExtent+.5;
  float depth=(dot(toLight,uShadowForward)-uShadowNear)/(uShadowFar-uShadowNear);
  if(uv.x<=0.||uv.y<=0.||uv.x>=1.||uv.y>=1.||depth<=0.||depth>=1.)return 1.;
  float slope=1.-max(dot(normal,normalize(sunDirection)),0.);
  float bias=uShadowBias*(1.+slope*2.);
  float visible=0.;
  for(int x=0;x<2;x++)for(int y=0;y<2;y++){
   vec2 offset=(vec2(float(x),float(y))-.5)*uShadowTexelSize;
   float stored=unpackShadowDepth(texture2D(uShadowMap,uv+offset));
   visible+=depth-bias<=stored?1.:0.;
  }
  return visible*.25;
 }
 void main(){
 vec4 baseColor=uColor*vVertexColor;if(uUseTexture){vec4 texel=texture2D(uBaseColorTexture,vTexcoord);baseColor*=vec4(pow(texel.rgb,vec3(2.2)),texel.a);}if(uAlphaCutoff<0.)baseColor.a=1.;else if(baseColor.a<uAlphaCutoff)discard;if(uShadowPass){gl_FragColor=vec4(packShadowDepth(gl_FragCoord.z),1.);return;}
 float roughness=uRoughness,metallic=uMetallic;
 if(uHasMetallicRoughnessMap){vec4 mr=texture2D(uMetallicRoughnessMap,vMaterialUV0.xy);roughness*=mr.g;metallic*=mr.b;}
 roughness=clamp(roughness,.04,1.);metallic=clamp(metallic,0.,1.);
 vec3 normal=normalize(vNormal);
 if(!gl_FrontFacing)normal=-normal;
 ${derivatives?`if(uHasNormalMap){
  vec3 dp1=dFdx(vWorld),dp2=dFdy(vWorld);vec2 duv1=dFdx(vMaterialUV0.zw),duv2=dFdy(vMaterialUV0.zw);
  vec3 dp2perp=cross(dp2,normal),dp1perp=cross(normal,dp1);
  vec3 T=dp2perp*duv1.x+dp1perp*duv2.x,B=dp2perp*duv1.y+dp1perp*duv2.y;
  float determinant=max(dot(T,T),dot(B,B));
  if(determinant>1e-12){float inv=inversesqrt(determinant);vec3 sampled=texture2D(uNormalMap,vMaterialUV0.zw).xyz*2.-1.;sampled.xy*=uNormalScale;normal=normalize(mat3(T*inv,B*inv,normal)*sampled);}
 }`:''}
 vec3 skyLight=vec3(.60,.73,.91),groundLight=vec3(.24,.27,.32);
 float ao=uHasOcclusionMap?mix(1.,texture2D(uOcclusionMap,vMaterialUV1.xy).r,uOcclusionStrength):1.;
 vec3 ambientLight=mix(groundLight,skyLight,clamp(normal.y*.5+.5,0.,1.))*uAmbient*ao;
 vec3 viewDir=(uEye-vWorld)/max(length(uEye-vWorld),.00001);
 vec3 F0=mix(vec3(.04),baseColor.rgb,metallic);
 // Cheap hemispherical reflection for glTF metals. This is *not* prefiltered
 // environment-map IBL: sky/ground are sampled from the reflected eye ray.
 // Grazing Fresnel and roughness determine response; ambient AO applies to both.
 float NoV=max(dot(normal,viewDir),0.);
 vec3 indirectFresnel=F0+(vec3(1.)-F0)*pow(1.-NoV,5.);
 vec3 reflected=reflect(-viewDir,normal);
 vec3 reflectedSky=mix(groundLight,skyLight,clamp(reflected.y*.5+.5,0.,1.));
 float specularStrength=mix(.12,.45,1.-roughness);
 vec3 indirectDiffuse=ambientLight*baseColor.rgb*(1.-metallic)*(vec3(1.)-indirectFresnel);
 vec3 indirectSpecular=reflectedSky*uAmbient*ao*indirectFresnel*specularStrength;
 // Source-convolved GGX levels; optional explicit LOD on WebGL1.
 // BRDF coefficients follow the analytic split-sum fit documented by Epic:
 // https://www.unrealengine.com/blog/physically-based-shading-on-mobile
 vec4 fit=roughness*vec4(-1.,-.0275,-.572,.022)+vec4(1.,.0425,1.04,-.04);
 float grazing=min(fit.x*fit.x,exp2(-9.28*NoV))*fit.x+fit.y;
 vec2 integrated=vec2(-1.04,1.04)*grazing+fit.zw;
 vec3 environmentReflectance=clamp(F0*integrated.x+integrated.y,0.,1.);
 if(uEnvironmentEnabled){
  vec3 probeTint=vec3(1.);
  for(int probeIndex=0;probeIndex<4;probeIndex++){
   if(probeIndex>=uProbeCount)break;
   float distanceToProbe=length(vWorld-uProbePositions[probeIndex]);
   float influence=clamp(1.-distanceToProbe/max(uProbeRadius[probeIndex],.01),0.,1.);
   probeTint=mix(probeTint,uProbeTints[probeIndex],clamp(influence*uProbeStrength[probeIndex],0.,1.));
  }
  vec3 environmentDiffuse=rgbmEnvironment(textureCube(uEnvironmentDiffuse,normal))*probeTint;
  float environmentLod=roughness*uEnvironmentMaxLod;
  vec3 environmentSpecular=rgbmEnvironment(${explicitLod?'textureCubeLodEXT(uEnvironmentSharp,reflected,environmentLod)':'textureCube(uEnvironmentSharp,reflected,environmentLod)'})*probeTint;
  indirectDiffuse=environmentDiffuse*uAmbient*ao*baseColor.rgb*(1.-metallic)*(vec3(1.)-environmentReflectance);
  indirectSpecular=environmentSpecular*uAmbient*ao*environmentReflectance;
 }
 vec3 indirect=indirectDiffuse+indirectSpecular;
 vec3 direct=directBRDF(baseColor.rgb,metallic,roughness,normal,viewDir,normalize(uSunDir))*uSunColor*uSunIntensity*sunShadowVisibility(vWorld,normal,uSunDir);
 for(int i=0;i<8;i++){
  if(i>=uLightCount)break;
  vec3 displacement=uLightPos[i]-vWorld;
  float dist=length(displacement);
  vec3 L=displacement/max(dist,.001);
  float decay=pow(max(0.,1.-dist/max(uLightRange[i],.01)),2.);
  float cone=1.;
  if(uLightSpot[i]>.5){
   float alignment=dot(-L,normalize(uLightDir[i]));
   cone=smoothstep(uLightCone[i]-.12,uLightCone[i],alignment);
  }
  direct+=directBRDF(baseColor.rgb,metallic,roughness,normal,viewDir,L)*uLightColor[i]*uLightPower[i]*decay*cone;
 }
 vec3 flashRay=vWorld-uFlashPos;
 float flashDist=length(flashRay);
 vec3 flashDirection=flashRay/max(flashDist,.001);
 float flashCone=smoothstep(.78,.94,dot(flashDirection,normalize(uFlashDir)));
 float flashFalloff=pow(max(0.,1.-flashDist/16.),2.);
 direct+=directBRDF(baseColor.rgb,metallic,roughness,normal,viewDir,-flashDirection)*vec3(1.,.92,.72)*uFlashPower*flashCone*flashFalloff;
 vec3 emissive=uEmissive;if(uHasEmissiveMap)emissive*=pow(texture2D(uEmissiveMap,vMaterialUV1.zw).rgb,vec3(2.2));
 vec3 lit=(uUnlit?baseColor.rgb:indirect+direct)+emissive;
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
 const aircraftHud=document.createElement('div');
 aircraftHud.id='warlikeAircraft3dHud';aircraftHud.hidden=true;
 aircraftHud.setAttribute('aria-live','off');
 aircraftHud.style.cssText='position:absolute;left:16px;bottom:58px;z-index:11;pointer-events:none;white-space:pre-line;padding:10px 14px;max-width:min(420px,90vw);border-radius:10px;background:rgba(10,20,34,.83);border:1px solid rgba(180,220,255,.32);color:#e2f4ff;font:600 13px/1.65 ui-monospace,Consolas,monospace;font-variant-numeric:tabular-nums;box-shadow:0 4px 18px rgba(0,0,0,.26)';
 host.append(aircraftHud);
 let aircraftViewMode=null,aircraftViewFor=null,aircraftCameraKeyHeld=false;
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
 const u={eye:loc('uEye'),right:loc('uRight'),up:loc('uUp'),forward:loc('uForward'),pos:loc('uPosition'),scale:loc('uScale'),rotation:loc('uRotation'),aspect:loc('uAspect'),projectionFactor:loc('uProjectionFactor'),nearClip:loc('uNearClip'),farClip:loc('uFarClip'),color:loc('uColor'),roughness:loc('uRoughness'),metallic:loc('uMetallic'),exposure:loc('uExposure'),fogDensity:loc('uFogDensity'),flashPos:loc('uFlashPos'),flashDir:loc('uFlashDir'),flashPower:loc('uFlashPower'),sunDir:loc('uSunDir'),sunColor:loc('uSunColor'),sunIntensity:loc('uSunIntensity'),ambient:loc('uAmbient'),lightCount:loc('uLightCount'),lightPos:loc('uLightPos[0]'),lightColor:loc('uLightColor[0]'),lightDir:loc('uLightDir[0]'),lightPower:loc('uLightPower[0]'),lightRange:loc('uLightRange[0]'),lightCone:loc('uLightCone[0]'),lightSpot:loc('uLightSpot[0]'),shadowPass:loc('uShadowPass'),shadowEnabled:loc('uShadowsEnabled'),shadowMap:loc('uShadowMap'),shadowTexel:loc('uShadowTexelSize'),shadowBias:loc('uShadowBias'),shadowEye:loc('uShadowEye'),shadowRight:loc('uShadowRight'),shadowUp:loc('uShadowUp'),shadowForward:loc('uShadowForward'),shadowExtent:loc('uShadowExtent'),shadowNear:loc('uShadowNear'),shadowFar:loc('uShadowFar'),environmentMaxLod:loc('uEnvironmentMaxLod'),environmentEnabled:loc('uEnvironmentEnabled'),environmentSharp:loc('uEnvironmentSharp'),environmentDiffuse:loc('uEnvironmentDiffuse'),probeCount:loc('uProbeCount'),probePositions:loc('uProbePositions[0]'),probeTints:loc('uProbeTints[0]'),probeRadius:loc('uProbeRadius[0]'),probeStrength:loc('uProbeStrength[0]')};
 let environmentIbl=null,lastIblSignature='',importedHdr=null;
 let hdrOperation=0;
 const announceHdri=(event,detail)=>globalThis.window?.dispatchEvent(new CustomEvent(event,{detail}));
 const applyHdrBytes=async(bytes,{name='environment.hdr',persist=false,projectId=gameProject.id}={})=>{
  if(!globalThis.__WARLIKE_BUILD__&&projectId!==gameProject.id)return null;
  const hdr=decodeRadianceHdr(bytes);
  if(!environmentIbl)throw Error('IBL unavailable on this GPU');
  // A stale file read must never overwrite the active project's GPU environment.
  if(!globalThis.__WARLIKE_BUILD__&&projectId!==gameProject.id)return null;
  environmentIbl.updateHdri(hdr,prefilterHdriFace3d);
  importedHdr=hdr;
  if(persist)await storeProjectHdri(projectId,name,bytes);
  return {width:hdr.width,height:hdr.height,name,projectId,persisted:persist};
 };
 const restoreHdr=async(projectId=gameProject.id)=>{
  const operation=++hdrOperation;
  importedHdr=null;lastIblSignature='';
  const entry=await loadProjectHdri(projectId);
  if(operation!==hdrOperation||projectId!==gameProject.id)return;
  if(!entry){announceHdri('warlike:hdri-cleared',{});return}
  const result=await applyHdrBytes(entry.bytes,{name:entry.name,projectId});
  if(operation===hdrOperation&&result)announceHdri('warlike:hdri-ready',{...result,persisted:true});
 };
 const loadBundledHdr=async()=>{
  // The exported game carries the actual HDRI in its archive, no cloud needed.
  if(!globalThis.__WARLIKE_BUILD__||!globalThis.__WARLIKE_HDRI_INCLUDED__)return false;
  const response=await fetch('./assets/environment.hdr');
  if(!response.ok)return false;
  await applyHdrBytes(new Uint8Array(await response.arrayBuffer()));
  return true;
 };
 globalThis.window?.addEventListener('warlike:hdri-import',event=>{
  const operation=++hdrOperation,projectId=gameProject.id,file=event.detail;
  Promise.resolve(file?.arrayBuffer()).then(data=>applyHdrBytes(new Uint8Array(data),{name:file.name,persist:true,projectId}))
   .then(detail=>{if(operation===hdrOperation&&detail)announceHdri('warlike:hdri-ready',detail)})
   .catch(error=>announceHdri('warlike:hdri-error',{message:error.message}));
 });
 globalThis.window?.addEventListener('warlike:hdri-clear',()=>{
  ++hdrOperation;const projectId=gameProject.id;importedHdr=null;lastIblSignature='';
  deleteProjectHdri(projectId).then(()=>announceHdri('warlike:hdri-cleared',{}))
   .catch(error=>announceHdri('warlike:hdri-error',{message:error.message}));
 });
 globalThis.window?.addEventListener('warlike:hdri-project',event=>{
  restoreHdr(event.detail?.projectId||gameProject.id).catch(error=>announceHdri('warlike:hdri-error',{message:error.message}));
 });
 Promise.resolve().then(async()=>{if(!await loadBundledHdr())await restoreHdr()})
  .catch(error=>announceHdri('warlike:hdri-error',{message:error.message}));
 if((gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS)||0)>=8)try{environmentIbl=createEnvironmentIbl3d(gl)}
 catch(error){console.warn('[WarLike IBL]',error)}
 let shadowMap=null;
 try{shadowMap=createSunShadowMap3d(gl,{size:1024});}
 catch(error){console.warn('[WarLike Shadow]',error);}
 const viewModelUniform=loc('uViewModel'),viewBasisUniform=loc('uViewBasis');
 const useAffineUniform=loc('uUseAffine'),affineMatrixUniform=loc('uAffineMatrix'),affineNormalUniform=loc('uAffineNormal');
 const aPos=gl.getAttribLocation(program,'aPosition'),aNormal=gl.getAttribLocation(program,'aNormal'),aTexcoord=gl.getAttribLocation(program,'aTexcoord');
 const aVertexColor=gl.getAttribLocation(program,'aVertexColor'),unlitUniform=loc('uUnlit'),emissiveUniform=loc('uEmissive');
 const textureUniform=loc('uBaseColorTexture'),useTexture=loc('uUseTexture'),alphaCutoff=loc('uAlphaCutoff');
 const normalScaleUniform=loc('uNormalScale'),occlusionStrengthUniform=loc('uOcclusionStrength');
 const mapSlots=[['metallicRoughness','uMetallicRoughnessMap','uHasMetallicRoughnessMap'],['normal','uNormalMap','uHasNormalMap'],['occlusion','uOcclusionMap','uHasOcclusionMap'],['emissive','uEmissiveMap','uHasEmissiveMap']].map(([key,sampler,enabled],index)=>({key,unit:index+1,sampler:loc(sampler),enabled:loc(enabled)}));
 const materialUVAttributes=[gl.getAttribLocation(program,'aMaterialUV0'),gl.getAttribLocation(program,'aMaterialUV1')];
 const uploadTexture=async descriptor=>{
  const image=await getTextureImage(descriptor),texture=gl.createTexture();
  gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);
  const pot=value=>(value&(value-1))===0,repeat=pot(image.width)&&pot(image.height);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,repeat?descriptor.wrapS:gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,repeat?descriptor.wrapT:gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);return texture;
 };
 const makeBuffer=(data,dynamic=false)=>{const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,data,dynamic?gl.DYNAMIC_DRAW:gl.STATIC_DRAW);return {buffer:b,count:data.length/6}};
 const cubes=makeBuffer(cubeVerts()),sphere=makeBuffer(curvedVerts('sphere')),cylinder=makeBuffer(curvedVerts('cylinder')),cone=makeBuffer(curvedVerts('cone')),grid=makeBuffer(gridVerts()),outline=makeBuffer(boundsLines());
 const waterMesh=makeBuffer(new Float32Array(0),true);
 const terrainMeshes=new Map();
 const realGlbBuffers=new Map(),animationStates=new WeakMap(),animatedHitVertices=new WeakMap();
 view3d.modelDiagnostics=()=>[...realGlbBuffers].map(([id,value])=>({id,status:value.status,triangles:value.triangles||0,warnings:value.materialWarnings||[],message:value.message||null,maps:value.parts?.map(p=>Object.keys(p.mesh.materialMaps||{}))||[]}));
 const ensureModel=id=>{
  if(realGlbBuffers.has(id))return;
  realGlbBuffers.set(id,{status:'loading'});
  getModelGeometry(id).then(async data=>{
   const textureWarnings=[...(data.materialWarnings||[])];
   if(!gl.getExtension('OES_standard_derivatives')&&data.parts.some(part=>part.materialMaps?.normal))textureWarnings.push('Normal maps indisponibles : extension WebGL OES_standard_derivatives absente.');
   const parts=await Promise.all(data.parts.map(async part=>{
    const mesh=makeBuffer(part.vertices,!!data.rig);
    mesh.materialMaps={};
    const maps={base:part.texture?{texture:part.texture,texcoords:part.texcoords}:null,...part.materialMaps};
    for(const [key,map] of Object.entries(maps))if(map){
     try{
      const texture=await uploadTexture(map.texture);
      if(key==='base'){
       const uvBuffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,uvBuffer);gl.bufferData(gl.ARRAY_BUFFER,map.texcoords,gl.STATIC_DRAW);Object.assign(mesh,{texture,uvBuffer});
      }else mesh.materialMaps[key]=texture;
     }catch(error){textureWarnings.push('Texture '+key+' : '+String(error?.message||error));}
    }
    mesh.materialUVBuffers=[['metallicRoughness','normal'],['occlusion','emissive']].map(keys=>{
     if(!keys.some(key=>mesh.materialMaps[key]))return null;
     const values=new Float32Array(mesh.count*4);
     for(let i=0;i<mesh.count;i++)for(let j=0;j<2;j++){
      const uv=part.materialMaps?.[keys[j]]?.texcoords;values[i*4+j*2]=uv?.[i*2]||0;values[i*4+j*2+1]=uv?.[i*2+1]||0;
     }
     const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,values,gl.STATIC_DRAW);return buffer;
    });
    mesh.normalScale=part.normalScale??1;mesh.occlusionStrength=part.occlusionStrength??1;
    if(part.vertexColors){mesh.colorBuffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,mesh.colorBuffer);gl.bufferData(gl.ARRAY_BUFFER,part.vertexColors,gl.STATIC_DRAW);}
    Object.assign(mesh,{alphaMode:part.alphaMode,alphaCutoff:part.alphaCutoff,unlit:part.unlit,emissive:part.emissive});
    return {mesh,color:part.color,roughness:part.roughness,metallic:part.metallic};
   }));
   if(textureWarnings.length){
    console.warn('[WarLike GLB] Matériaux incomplets :',id,textureWarnings.join(' ; '));
    const status=document.querySelector('#view3dStatus');
    if(status&&workspace.mode==='3d'){status.textContent='GLB : textures manquantes — '+id;status.title=textureWarnings.join('\n')}
   }
   realGlbBuffers.set(id,{status:'ready',parts,geometry:data,normalizedSize:data.normalizedSize,triangles:data.triangleCount,materialWarnings:textureWarnings});
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
  gl.uniform1i(unlitUniform,mesh.unlit?1:0);gl.uniform3fv(emissiveUniform,mesh.emissive||[0,0,0]);
  if(mesh.colorBuffer){gl.bindBuffer(gl.ARRAY_BUFFER,mesh.colorBuffer);gl.vertexAttribPointer(aVertexColor,4,gl.FLOAT,false,0,0);gl.enableVertexAttribArray(aVertexColor)}else{gl.disableVertexAttribArray(aVertexColor);gl.vertexAttrib4f(aVertexColor,1,1,1,1)}
  gl.uniform1f(normalScaleUniform,mesh.normalScale??1);gl.uniform1f(occlusionStrengthUniform,mesh.occlusionStrength??1);
  for(const slot of mapSlots){
   const texture=mesh.materialMaps?.[slot.key];gl.uniform1i(slot.enabled,texture?1:0);gl.uniform1i(slot.sampler,slot.unit);
   gl.activeTexture(gl.TEXTURE0+slot.unit);gl.bindTexture(gl.TEXTURE_2D,texture||null);
  }
  for(let i=0;i<materialUVAttributes.length;i++){
   const attribute=materialUVAttributes[i];if(attribute<0)continue;
   if(mesh.materialUVBuffers?.[i]){gl.bindBuffer(gl.ARRAY_BUFFER,mesh.materialUVBuffers[i]);gl.vertexAttribPointer(attribute,4,gl.FLOAT,false,0,0);gl.enableVertexAttribArray(attribute)}
   else{gl.disableVertexAttribArray(attribute);gl.vertexAttrib4f(attribute,0,0,0,0)}
  }
  gl.uniform1i(useTexture,mesh.texture?1:0);gl.uniform1f(alphaCutoff,mesh.alphaMode==='OPAQUE'?-1:mesh.alphaMode==='MASK'?mesh.alphaCutoff:.01);
  if(mesh.texture){gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,mesh.texture);gl.uniform1i(textureUniform,0);gl.bindBuffer(gl.ARRAY_BUFFER,mesh.uvBuffer);gl.vertexAttribPointer(aTexcoord,2,gl.FLOAT,false,0,0);gl.enableVertexAttribArray(aTexcoord)}
  else{gl.disableVertexAttribArray(aTexcoord);gl.vertexAttrib2f(aTexcoord,0,0)}
  gl.depthMask(mesh.alphaMode!=='BLEND');
  if(mesh.alphaMode==='BLEND'){gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA)}else gl.disable(gl.BLEND);
 };
 const model=(pos,scale,color,angle=0,object=null)=>{gl.uniform1i(viewModelUniform,0);let correction=null;try{if(object)correction=affineCorrection3d(object)}catch(error){if(!object._affineWarning){console.warn('[WarLike] Affine 3D '+object.name,error);object._affineWarning=true}}gl.uniform1i(useAffineUniform,!!correction);if(correction){gl.uniformMatrix4fv(affineMatrixUniform,false,new Float32Array(correction));gl.uniformMatrix3fv(affineNormalUniform,false,new Float32Array(normalMatrix3d(correction)))}const q=object?rotationQuaternion3d(object):{x:0,y:-Math.sin(angle/2),z:0,w:Math.cos(angle/2)};gl.uniform3fv(u.pos,pos);gl.uniform3fv(u.scale,scale);gl.uniform4fv(u.rotation,[q.x,q.y,q.z,q.w]);gl.uniform4fv(u.color,color)};
 view3d.enabled=workspace.mode==='3d';
 const resize=()=>{const {width:w,height:h}=viewportPixelSize(host.clientWidth,host.clientHeight,window.devicePixelRatio||1);if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h}gl.viewport(0,0,w,h)};
 const focusScene=()=>{
  const visualEntities=state.entities.filter(o=>o.enabled!==false&&!o.sceneCamera3d&&o.lightType!=='directional');
  const arr=state.selected.length?state.entities.filter(o=>state.selected.includes(o.id)):(visualEntities.length?visualEntities:state.entities);
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
 const cameraTransition=new CameraTransition3d();
 let transitionPose=null;
 const currentSceneCameraPose=()=>transitionPose||sceneCameraView(activeSceneCamera(state.entities),state.entities,{yaw:view3d.yaw,pitch:view3d.pitch});
 const grabSession=createGrabSession3d();
 const update3dPlay=dt=>{
  if(!gameIsRunning()||companyController(state.entities))return;
  tickBattlefield(state.entities,dt,{keys:gameplayKeys(state.keys),pressedKeys:gameplayInputBlocked()?new Set():state.keyPresses,onPlayerRespawn:resetDriving3d});
  if(battlefieldMatch.active&&battlefieldMatch.winner!==null)return;
  updateRtsOrders(state.entities,dt,true,{mode:'3d'});
  tickEngineDiagnostics(dt);
  const p=playableActor(state.entities),input=p&&healthOf(p)<=0?new Set():gameplayKeys(state.keys);
  if(gameplayInputBlocked())state.keyPresses?.clear();
  tickHeroRuntime(state.entities,p,dt,{mode:'3d',sceneId:gameSession.currentSceneId,keys:state.keys,pressedKeys:state.keyPresses,yaw:(cameraMovementYaw(currentSceneCameraPose())??view3d.yaw),inputBlocked:gameplayInputBlocked()});
  if(p)p._vehicleInputConsumed=false;
  updateStats(state.entities,dt);
  updateOpenWorld(dt,p,state.entities,sequenceRuntime.globals);
  if(physicsSession){
   // Keep scene mutations and scripts synchronized with the native physics world.
   if(!synchronizeRapierScene(physicsSession,state.entities)){
    const api=physicsSession.api;
    disposeRapierScene(physicsSession);
    try{physicsSession=createRapierScene(api,state.entities);activateRapierQueries3d(physicsSession);physicsAccumulator=0;for(const warning of physicsSession.errors)console.warn('[WarLike] Collision Rapier : '+warning)}
    catch(error){console.warn('[WarLike] Rapier scene rebuild failed',error);physicsSession=null}
   }
  }
  if(physicsSession){
   physicsAccumulator+=dt;
   const fixed=1/60;
   let steps=0;
   while(physicsAccumulator>=fixed&&steps++<6){profileScope('physics3d',()=>stepRapierScene(physicsSession,fixed));physicsAccumulator-=fixed}
  }else profileScope('physics3d',()=>stepPhysics3d(state.entities,dt));
  if(!p)releaseGrab3d(grabSession,state.entities);
  if(!p)return;
  updateHorror(dt,p,state.entities,input);updateHorrorPerception(dt,p,state.entities,input);updateHorrorAudio(dt,p,state.entities,input,horror);horror.jumpscare=Math.max(0,horror.jumpscare-dt);
  const inVehicle=updateDriving3d(state.entities,p,input,dt,{pressedKeys:gameplayInputBlocked()?new Set():state.keyPresses});
  if(!inVehicle)updateController3d(p,input,dt,(cameraMovementYaw(currentSceneCameraPose())??view3d.yaw),state.entities,{pressedKeys:gameplayInputBlocked()?new Set():state.keyPresses,moveCharacter:physicsSession?.actors.get(p.id)?.controller?(actor,dx,dy,dz,options)=>moveRapierCharacter3d(physicsSession,actor,dx,dy,dz,options):null});
  // Physics pickup shares the same 3D actor, colliders and camera yaw as gameplay.
  // G = take/drop; T = throw. Never allow picking while driving or UI blocks input.
  const aim=[-Math.sin(view3d.yaw)*Math.cos(view3d.pitch),-Math.sin(view3d.pitch),-Math.cos(view3d.yaw)*Math.cos(view3d.pitch)];
  const actorEye=[(Number(p.x)||0)/64+(Number(p.w)||32)/128,(Number(p.elevation3d)||0)+(Number(p.h)||96)/64*.85,(Number(p.y)||0)/64+(Number(p.depth3d??p.h)||32)/128];
  tickGrab3d(grabSession,{actor:inVehicle?null:p,entities:state.entities,origin:actorEye,direction:aim,
   pressedKeys:gameplayInputBlocked()?new Set():state.keyPresses,blocked:gameplayInputBlocked(),dt,
   onEvent:(action,target)=>emitSequenceSignal('grab3d:'+action+':'+target.id)});

  updateAi(state.entities,p,dt);
  p._attackCooldown=Math.max(0,(p._attackCooldown||0)-dt);
  // Mouse left fires, mouse right aims. F remains an optional legacy attack binding.
  if(p.adventure?.combatEnabled!==false&&!inVehicle&&healthOf(p)>0&&(!gameplayInputBlocked()&&fpsFiring||input.has('f')||!gameplayInputBlocked()&&state.keyPresses?.has('f'))&&p._attackCooldown===0){if(isFps()){shootFps();return;}const weapon=p.inventory?.equipment?.weapon;const hit=attack3d(p,state.entities,{range:weapon?180:110,damageAmount:weapon?35:15});p._attackCooldown=.45;if(hit){p.animation='attack';emitFx('electric',heroCenter(hit,'3d'),{mode:'3d',color:'#ffd899',count:16,ring:true,lifetime:.3,scale:.7})}}
 };
 const isFps=()=>state.playing&&workspace.mode==='3d'&&!currentVehicle3d(state.entities)&&(activeSceneCamera(state.entities)?.sceneCamera3d?.mode==='firstPerson'||!activeSceneCamera(state.entities)&&cameraRigFor(playableActor(state.entities)).mode==='firstPerson');
 let boomDistance=null,cameraFrame=1/60,lastCameraActor=null,lastCameraScene=null,cameraHandoffRemaining=0;
 const camera=()=>{
  if(state.playing){
   const vehicle=currentVehicle3d(state.entities);
   if(vehicle?.aircraftPhysics?.enabled){
    const pose=aircraftCameraView(vehicle,{mode:aircraftViewMode||vehicle.aircraftCamera?.mode});
    if(pose)return pose;
   }
   const sceneCam=currentSceneCameraPose();if(sceneCam)return sceneCam;
  }
  if(!isFps()){
   const desired=sceneCamera3d(view3d.target,view3d.yaw,view3d.pitch,view3d.radius);
   if(!state.playing||companyController(state.entities))return desired;
   const actor=currentVehicle3d(state.entities)||playableActor(state.entities),rig=cameraRigFor(actor,!!currentVehicle3d(state.entities));
   const obstacles=state.entities.filter(o=>o!==actor&&solidBody3d(o)).map(cameraObstacleForEntity);
   const boom=rig.collision?resolveCameraBoom(view3d.target,desired.eye,obstacles,{previousDistance:boomDistance,dt:0}):{eye:desired.eye,distance:view3d.radius};
   return cameraPose(view3d.target,boom.eye);

  }
  const p=playableActor(state.entities),b=objectBounds3d(p),eye=[b.x,b.y-b.h/2+b.h*.9,b.z];
  const forward=V.norm([-Math.sin(view3d.yaw)*Math.cos(view3d.pitch),-Math.sin(view3d.pitch),-Math.cos(view3d.yaw)*Math.cos(view3d.pitch)]);
  const right=V.norm(V.cross(forward,[0,1,0])),up=V.norm(V.cross(right,forward));
  return {eye,forward,right,up};
 };
 let fpsAiming=false,fpsFiring=false;
 const shootFps=()=>{
  if(!isFps()||!gameIsRunning()||gameplayInputBlocked())return false;
  const player=playableActor(state.entities),cam=camera();if(player.adventure?.combatEnabled===false)return false;if(healthOf(player)<=0||(player._attackCooldown||0)>0)return false;
  if(!consumeBattlefieldShot(player))return false;
  player._attackCooldown=.23;noteAnimatorAction(player,'attack',.35);
  const damageable=o=>healthOf(o)>0&&!sameFaction(o,player)&&(isBattlefieldSoldier(o)||o.vehicleConfig?.driveable&&o.stats||o.assetId?.includes('character-')||o.ai?.enabled||o.simulationNode?.kind==='destructible'&&o.simulationNode.health>0);
  const hit=raycastScene3d(cam.eye,cam.forward,state.entities,{exclude:player,maxDistance:45,target:damageable}),best=hit&&damageable(hit.entity)?hit.entity:null;
  if(hit&&!best)emitFx('electric',hit.point,{mode:'3d',color:'#ffd899',count:10,lifetime:.2});
  if(best){const amount=25*progressionDamageScale(player),before=best.stats?.health??best.hp??100;if(best.simulationNode?.kind==='destructible')damageSimulationNode(best,amount,player,{mode:'3d'});else{best._battlefieldThreat=player.id;damage(best,amount);if(before>0&&(best.stats?.health??best.hp)<=0)awardExperience(player,40)}best.animation='hurt';emitFx('electric',heroCenter(best,'3d'),{mode:'3d',color:'#ffd899',count:12,lifetime:.25})}
  return !!best;
 };
 const fireThirdPerson=()=>{
  // A short click must fire immediately, even if no rendering frame occurs
  // between pointerdown/pointerup; held fire still uses the frame cooldown.
  const player=playableActor(state.entities);
  if(!player||isFps()||!gameIsRunning()||gameplayInputBlocked()||
     currentVehicle3d(state.entities)||player.adventure?.combatEnabled===false||
     healthOf(player)<=0||(player._attackCooldown||0)>0)return false;
  const weapon=player.inventory?.equipment?.weapon;
  const hit=attack3d(player,state.entities,{range:weapon?180:110,damageAmount:weapon?35:15});
  player._attackCooldown=.45;
  if(hit){player.animation='attack';emitFx('electric',heroCenter(hit,'3d'),{mode:'3d',color:'#ffd899',count:16,ring:true,lifetime:.3,scale:.7})}
  return true;
 };
 const releasePlayMouse=e=>{if(!e||e.button===0)fpsFiring=false;if(!e||e.button===2)fpsAiming=false;};canvas.addEventListener('pointerup',releasePlayMouse);canvas.addEventListener('pointercancel',()=>releasePlayMouse());window.addEventListener('pointerup',releasePlayMouse);window.addEventListener('blur',()=>releasePlayMouse());
 const playerTarget=()=>{const vehicle=currentVehicle3d(state.entities),p=vehicle||playableActor(state.entities);return p?cameraTargetFor(objectBounds3d(p),cameraRigFor(p,!!vehicle)):null};

 let physicsSession=null,physicsGeneration=0,physicsAccumulator=0;
 const stopRapier=()=>{physicsGeneration++;disposeRapierScene(physicsSession);physicsSession=null;physicsAccumulator=0;};
 const enterPlay=()=>{
  resetBattlefield(state.entities);fpsAiming=false;fpsFiring=false;
  view3d.drag=null;boomDistance=null;cameraHandoffRemaining=0;lastCameraActor=null;lastCameraScene=null;resetDriving3d();aircraftViewMode=null;aircraftViewFor=null;aircraftCameraKeyHeld=false;
  const p=playableActor(state.entities),pt=playerTarget(),rig=cameraRigFor(p);view3d.followPlayer=!!pt&&!activeSceneCamera(state.entities);if(pt){view3d.target=pt.slice();view3d.radius=rig.distance;view3d.yaw=Math.PI-(Number(p.rotation)||0)*Math.PI/180;view3d.pitch=rig.mode==='firstPerson'?0:rig.mode==='orbit'?.62:.18}
  if(companyController(state.entities)){view3d.followPlayer=false;view3d.target=[14,0,14];view3d.radius=32;view3d.pitch=.92;view3d.yaw=-.55;return}
  if(gameProject.physics3d==='builtin')return;
  const token=++physicsGeneration;
  loadRapier3d().then(api=>{
   if(!api||token!==physicsGeneration||!state.playing||workspace.mode!=='3d')return;
   try{physicsSession=createRapierScene(api,state.entities);activateRapierQueries3d(physicsSession);for(const error of physicsSession.errors)console.warn('[WarLike] Collision Rapier : '+error)}
   catch(error){console.warn('[WarLike] Rapier unavailable, using built-in physics',error);physicsSession=null}
  });
 };
 const syncPlayCamera=createEditorPlayCamera(view3d,{enter:enterPlay,leave(){
  releasePlayMouse();editorKeys.clear();
  try{if(document.pointerLockElement===canvas)document.exitPointerLock?.();resetDriving3d();discardGrabSession3d(grabSession)}finally{stopRapier()}
 }});
 document.addEventListener('warlike:change',()=>syncPlayCamera(state.playing&&workspace.mode==='3d'));


 const selectionRect=document.createElement('div');selectionRect.className='scene-selection-rectangle';selectionRect.hidden=true;host.append(selectionRect);const editorKeys=new Set();
 document.addEventListener('keydown',e=>{if(state.playing||!view3d.enabled||view3d.drag?.nav!=='look'||isTypingTarget(e.target))return;if(['KeyW','KeyA','KeyS','KeyD','KeyQ','KeyE','ShiftLeft','ShiftRight'].includes(e.code)){e.preventDefault();editorKeys.add(e.code)}});document.addEventListener('keyup',e=>editorKeys.delete(e.code));window.addEventListener('blur',()=>{editorKeys.clear();view3d.drag=null;selectionRect.hidden=true});
 const updateGizmos=initSceneGizmo3d({canvas,host,state,view3d,project3d,objectBounds3d,getCamera:camera,record,notify});
 const sceneCameraMarkers=document.createElement('div');
 sceneCameraMarkers.className='warlike-scene-camera-markers';
 sceneCameraMarkers.style.cssText='position:absolute;inset:0;pointer-events:none;z-index:10;overflow:hidden';
 host.append(sceneCameraMarkers);
 const renderSceneCameraMarkers=()=>{
  sceneCameraMarkers.replaceChildren();
  if(state.playing||!view3d.enabled)return;
  const rect=canvas.getBoundingClientRect(),cam=camera();
  for(const actor of state.entities.filter(o=>o.sceneCamera3d)){
   const pos=[(Number(actor.x)||0)/64,(Number(actor.elevation3d)||0),(Number(actor.y)||0)/64];
   const point=project3d(pos,cam,rect.width,rect.height);
   if(!point)continue;
   const label=document.createElement('button');label.type='button';
   label.textContent='▣ '+actor.name;
   label.title='Sélectionner la Camera · réglages dans Inspector';
   label.style.cssText='position:absolute;pointer-events:auto;transform:translate(-50%,-50%);padding:3px 7px;border-radius:5px;background:#182838dd;border:1px solid #7fc8e8;color:#e7faff;font:11px system-ui;cursor:pointer';
   label.style.left=point.x+'px';label.style.top=point.y+'px';
   label.onclick=()=>{state.selected=[actor.id];notify();};
   sceneCameraMarkers.append(label);
  }
 };

 const rectPoint=e=>{const r=canvas.getBoundingClientRect();return {x:e.clientX-r.left,y:e.clientY-r.top,w:r.width,h:r.height}};
 const meshSnapCache=new WeakMap();
 const nearbySnap=(hit,contexts,mode)=>{
  if(!hit||!['vertex','edge'].includes(mode))return hit;
  const radius=Math.min(1,Math.max(.03,hit.distance*.018));
  let best=null;
  for(const {entity,loaded,deformed,transform,correction} of contexts){
   const bounds=objectBounds3d(entity);
   // Reject distant models before creating their spatial indices.
   const center=[bounds.x,(Number(entity.elevation3d)||0)+bounds.h/2,bounds.z];
   if(Math.hypot(...center.map((v,i)=>v-hit.point[i]))>Math.max(bounds.w,bounds.h,bounds.d)*2+radius)continue;
   const signature=JSON.stringify([entity.model3dId||entity.assetId,entity.x,entity.y,entity.elevation3d,entity.w,entity.h,entity.depth3d,entity.rotation,entity.rotationX3d,entity.rotationZ3d,correction]);
   let cached=meshSnapCache.get(entity);
   if(!cached||cached.signature!==signature){
    const parts=loaded.geometry.parts.map((part,i)=>({vertices:deformed?.[i]||part.vertices}));
    cached={signature,index:buildMeshSnapIndex3d(parts,transform,{cellSize:.2})};
    // Animated vertex buffers are updated in place: invalidate this cache
    // after every evaluated animated rig pose.
    meshSnapCache.set(entity,cached);
   }
   const found=nearestMeshSnapFeature3d(cached.index,hit.point,mode,{radius});
   if(found&&(!best||found.snapDistance<best.snapDistance))best={...found,entity};
  }
  return best?{...hit,...best}:hit;
 };
 const meshHit=(point,cam,{excludeIds=[]}={})=>{
  const ray=sceneRay3d(point.x,point.y,cam,point.w,point.h);
  let nearest=null;
  const contexts=[];
  for(const entity of state.entities){
   if(excludeIds.includes(entity.id)||entity.editorHidden||entity.enabled===false)continue;
   const id=entity.model3dId||entity.assetId,loaded=realGlbBuffers.get(id);
   if(loaded?.status!=='ready')continue;
   const box=objectBounds3d(entity),size=loaded.normalizedSize||[1,1,1];
   const {position:glbPosition,scale:glbScale}=glbVisualPlacement3d(box,Number(entity.elevation3d)||0,size);
   const renderY=glbPosition[1];
   const q=rotationQuaternion3d(entity),qx=q.x,qy=q.y,qz=q.z,qw=q.w;
   let correction=null;try{correction=affineCorrection3d(entity)}catch{}
   const transform=pos=>{
    const v=pos.map((n,i)=>n*glbScale[i]);
    const t=[2*(qy*v[2]-qz*v[1]),2*(qz*v[0]-qx*v[2]),2*(qx*v[1]-qy*v[0])];
    const rotated=[v[0]+qw*t[0]+qy*t[2]-qz*t[1],v[1]+qw*t[1]+qz*t[0]-qx*t[2],v[2]+qw*t[2]+qx*t[1]-qy*t[0]];
    const world=[rotated[0]+box.x,rotated[1]+renderY,rotated[2]+box.z];
    return correction?[
     correction[0]*world[0]+correction[4]*world[1]+correction[8]*world[2]+correction[12],
     correction[1]*world[0]+correction[5]*world[1]+correction[9]*world[2]+correction[13],
     correction[2]*world[0]+correction[6]*world[1]+correction[10]*world[2]+correction[14]
    ]:world;
   };
   const deformed=animatedHitVertices.get(entity);
   contexts.push({entity,loaded,deformed,transform,correction});
   for(const [partIndex,part] of loaded.geometry.parts.entries()){
    const hit=raycastTriangles3d(ray.origin,ray.direction,deformed?.[partIndex]||part.vertices,transform,{maxDistance:nearest?.distance??1e4});
    if(hit&&(!nearest||hit.distance<nearest.distance))nearest={...hit,entity,kind:'triangle'};
   }
  }
  const snapping=localStorage.getItem('warlike.snap3d.enabled')==='true';
  const mode=snapping?(localStorage.getItem('warlike.snap3d.mode')||'grid'):'grid';
  return snapping&&['vertex','edge'].includes(mode)?nearbySnap(nearest,contexts,mode):nearest;
 };
 view3d.surfaceAt=(clientX,clientY,{excludeIds=[],groundFallback=true}={})=>{
  const rect=canvas.getBoundingClientRect(),point={x:clientX-rect.left,y:clientY-rect.top,w:rect.width,h:rect.height},cam=camera();
  const mode=localStorage.getItem('warlike.snap3d.enabled')==='true'?(localStorage.getItem('warlike.snap3d.mode')||'grid'):'grid';
  const raw=meshHit(point,cam,{excludeIds});
  const mesh=raw;
  const floor=groundFallback?groundHit3d(point.x,point.y,cam,point.w,point.h):null;
  if(!floor)return mesh;
  const dist=Math.hypot(...floor.map((v,i)=>v-cam.eye[i]));
  return mesh&&mesh.distance<dist?mesh:{point:floor,normal:[0,1,0],distance:dist,kind:'ground'};
 };
 const pick=(point,cam)=>{
  const mesh=meshHit(point,cam);
  if(mesh)return mesh.entity;
  // A loaded GLB missed by triangle raycasting must not be selected by its
  // much larger oriented bounding box (e.g. through a doorway).
  const fallback=state.entities.filter(o=>{
   const id=o.model3dId||o.assetId;
   return realGlbBuffers.get(id)?.status!=='ready';
  });
  return pickEntity3d(fallback,point,cam,{playing:state.playing});
 };
 view3d.groundAt=(clientX,clientY)=>{const r=canvas.getBoundingClientRect(),hit=groundHit3d(clientX-r.left,clientY-r.top,camera(),r.width,r.height);return hit?{x:hit[0]*64,y:hit[2]*64}:null};
 view3d.pickAt=(clientX,clientY)=>{const r=canvas.getBoundingClientRect();return pick({x:clientX-r.left,y:clientY-r.top,w:r.width,h:r.height},camera())};
 canvas.addEventListener('contextmenu',e=>e.preventDefault());
 canvas.addEventListener('pointerdown',e=>{
  if(!view3d.enabled)return;
  const p=rectPoint(e),cam=camera();
  if(state.playing){
   if(!gameIsRunning()||gameplayInputBlocked())return;
   if(companyController(state.entities)&&!isLanGuest()){
    const picked=pick(p,cam);e.preventDefault();
    if(e.button===0){
     if(picked?.companyUnit&&picked.team===1){state.selected=selectCompanySquad(state.entities,picked.companyUnit.squadId,{selected:state.selected,add:e.shiftKey||e.ctrlKey});notify()}
     view3d.drag={nav:'company-marquee',x:p.x,y:p.y,pointer:e.pointerId,baseSelection:[...state.selected],add:e.shiftKey||e.ctrlKey,moved:false};canvas.setPointerCapture(e.pointerId);
    }else if(e.button===2){
     if(picked&&(picked.companyUnit||picked.companyBase)&&picked.team===2)commandCompany(state.entities,state.selected,'attack',picked.id);
     else {const hit=groundHit3d(p.x,p.y,cam,p.w,p.h);if(hit)commandCompany(state.entities,state.selected,'move',{x:hit[0]*64,y:hit[2]*64})}
    }else if(e.button===1){view3d.drag={nav:'company-pan',x:p.x,y:p.y,target:[...view3d.target],pointer:e.pointerId,moved:false};canvas.setPointerCapture(e.pointerId)}
    return;
   }
   if(!isFps()&&e.button===0&&!isLanGuest()){const unit=pick(p,cam);if(unit&&isRtsUnit(unit)){state.selected=e.shiftKey||e.ctrlKey||e.metaKey?(state.selected.includes(unit.id)?state.selected.filter(id=>id!==unit.id):[...state.selected,unit.id]):[unit.id];e.preventDefault();notify();return}}
   if(!isFps()&&e.button===2&&!isLanGuest()){const target=pick(p,cam);if(target&&(target.ai?.enabled||target.tags?.includes('enemy'))&&orderRtsGroup(state.entities,state.selected,'attack',target.id)){e.preventDefault();return}const hit=groundHit3d(p.x,p.y,cam,p.w,p.h);if(hit&&orderRtsMove(state.entities,state.selected,{x:hit[0]*64,y:hit[2]*64})){e.preventDefault();return}}
   // Free look starts on pointer movement, without holding a button.
   // The first aim/fire click may capture the cursor for continuous rotation
   // at screen edges. Pointer Lock can be denied; never block gameplay for it.
   if((e.button===0||e.button===2)&&shouldMouseLook()&&document.pointerLockElement!==canvas&&typeof canvas.requestPointerLock==='function'){
    try{const pending=canvas.requestPointerLock();pending?.catch?.(()=>{});}catch{/* Browser denied capture; keep free-look. */}
   }
   if(isFps()){if(e.button===0){e.preventDefault();fpsFiring=true;shootFps()}else if(e.button===2){e.preventDefault();fpsAiming=true}return}
   if(e.button===0){e.preventDefault();fpsFiring=true;fireThirdPerson();return}if(e.button===2){e.preventDefault();fpsAiming=true;return}
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
  view3d.drag={button:e.button,nav:nav||(!selected?'marquee':'move'),x:p.x,y:p.y,target:[...view3d.target],eye:cam.eye.slice(),radius:view3d.radius,yaw:view3d.yaw,pitch:view3d.pitch,start:point,baseSelection,add:e.shiftKey||e.ctrlKey||e.metaKey,selected:selected&&e.button===0?state.entities.filter(o=>state.selected.includes(o.id)).map(o=>({id:o.id,x:o.x,y:o.y,z:o.z||0,worldMatrix3d:Array.isArray(o.worldMatrix3d)?[...o.worldMatrix3d]:null,matrixReference3d:Array.isArray(o.matrixReference3d)?[...o.matrixReference3d]:null})):null,moved:false,pointer:e.pointerId};
  canvas.setPointerCapture(e.pointerId);
 });
 // Free mouse look in Play: no click or pointer lock required, including TPS rigs.
 const shouldMouseLook=()=>state.playing&&workspace.mode==='3d'&&view3d.enabled&&gameIsRunning()&&!gameplayInputBlocked()&&!companyController(state.entities)&&!!(currentVehicle3d(state.entities)||playableActor(state.entities));
 const applyMouseLook=e=>{
  if(!shouldMouseLook()||e.pointerType==='touch')return;
  const activeVehicle=currentVehicle3d(state.entities);
  const rig=cameraRigFor(activeVehicle||playableActor(state.entities),!!activeVehicle);
  const sensitivity=(Number.isFinite(rig.sensitivity)?rig.sensitivity:.003)*(fpsAiming?.65:1);
  const dx=Number.isFinite(e.movementX)?e.movementX:0,dy=Number.isFinite(e.movementY)?e.movementY:0;
  view3d.yaw-=dx*sensitivity;view3d.pitch=clamp(view3d.pitch+dy*sensitivity,-1.25,1.25);
 };
 document.addEventListener('mousemove',e=>{if(document.pointerLockElement===canvas)applyMouseLook(e)});
 canvas.addEventListener('pointermove',e=>{if(document.pointerLockElement!==canvas)applyMouseLook(e)});
 canvas.addEventListener('pointermove',e=>{
  if(!view3d.enabled)return;const p=rectPoint(e),cam=camera();
  if(state.playing){
   if(!gameIsRunning()||gameplayInputBlocked())return;const d=view3d.drag;
   if(companyController(state.entities)&&d?.pointer===e.pointerId){
    const dx=p.x-d.x,dy=p.y-d.y;d.moved ||= Math.hypot(dx,dy)>5;
    if(d.nav==='company-pan'){const amount=view3d.radius/Math.max(180,p.h)*1.9;view3d.target=V.add(d.target,V.add(V.mul(cam.right,-dx*amount),V.mul(cam.up,dy*amount)));view3d.target[1]=0}
    else if(d.nav==='company-marquee'&&d.moved){
     const left=Math.min(d.x,p.x),top=Math.min(d.y,p.y),right=Math.max(d.x,p.x),bottom=Math.max(d.y,p.y),scale=Number.parseFloat(getComputedStyle(document.body).zoom)||1;
     Object.assign(selectionRect.style,{left:left/scale+'px',top:top/scale+'px',width:(right-left)/scale+'px',height:(bottom-top)/scale+'px'});selectionRect.hidden=false;
     let ids=d.add?[...d.baseSelection]:[];for(const unit of state.entities.filter(o=>o.companyUnit&&o.team===1&&healthOf(o)>0)){const b=objectBounds3d(unit),at=project3d([b.x,b.y,b.z],cam,p.w,p.h);if(at&&at.x>=left&&at.x<=right&&at.y>=top&&at.y<=bottom)ids=selectCompanySquad(state.entities,unit.companyUnit.squadId,{selected:ids,add:true})}state.selected=ids;
    }return;
   }// No click-drag camera rotation in Play.
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
   if(hit){for(const start of drag.selected){const obj=state.entities.find(o=>o.id===start.id);if(obj){obj.x=Math.round(start.x+(hit[0]-drag.start[0])*64);obj.y=Math.round(start.y+(hit[2]-drag.start[2])*64);if(start.worldMatrix3d&&start.matrixReference3d)updateAffineEditorPose3d(obj,start.worldMatrix3d,start.matrixReference3d)}}updateEditorEntityHierarchy3d(state.entities,{worldOverrideIds:new Set(drag.selected.map(o=>o.id))})}
  }
 });
 const stop=e=>{const d=view3d.drag;if(!d||d.pointer!==e.pointerId)return;
  if(d.moved&&d.selected&&d.button===0)record('Déplacer en vue 3D');
  view3d.drag=null;editorKeys.clear();selectionRect.hidden=true;notify();
 };
 canvas.addEventListener('pointerup',stop);canvas.addEventListener('pointercancel',stop);canvas.addEventListener('lostpointercapture',stop);
 canvas.addEventListener('wheel',e=>{if(!view3d.enabled||e.defaultPrevented)return;e.preventDefault();if(state.playing&&(isFps()||!gameIsRunning()))return;view3d.radius=clamp(view3d.radius*Math.exp(e.deltaY*.001),state.playing?(companyController(state.entities)?12:1.2):3,state.playing?(companyController(state.entities)?70:16):150)},{passive:false});

 document.addEventListener('warlike:company-focus',event=>{if(!state.playing||!companyController(state.entities)||![event.detail?.x,event.detail?.y].every(Number.isFinite))return;view3d.target=[event.detail.x/64,0,event.detail.y/64]});
 let captureFrame=null;document.addEventListener('warlike:capture-frame',event=>{captureFrame=event.detail?.resolve});
 const gpuProfiler=createGpuProfiler(gl);let previousTime=performance.now();
 function draw(now=performance.now()){
  requestAnimationFrame(draw);
  const dt=Math.min(.1,Math.max(0,(now-previousTime)/1000));previousTime=now;
  if(document.hidden)return;const finishProfile=workspace.mode==='3d'?runtimeProfiler.frame(now,{mode:'3d',phase:state.playing?gameSession.phase:'editor',entities:state.entities.length}):()=>{};cameraFrame=gameIsRunning()?dt:0;
  if(!state.playing&&view3d.enabled&&view3d.drag?.nav==='look'&&editorKeys.size){
   const right=Number(editorKeys.has('KeyD'))-Number(editorKeys.has('KeyA')),forward=Number(editorKeys.has('KeyW'))-Number(editorKeys.has('KeyS')),up=Number(editorKeys.has('KeyE'))-Number(editorKeys.has('KeyQ')),length=Math.hypot(right,forward,up);
   if(length){const cam=camera(),speed=clamp(view3d.radius*.7,2.5,40)*(editorKeys.has('ShiftLeft')||editorKeys.has('ShiftRight')?3:1)*dt/length,delta=V.add(V.add(V.mul(cam.right,right*speed),V.mul(cam.forward,forward*speed)),[0,up*speed,0]);view3d.target=V.add(view3d.target,delta);view3d.drag.eye=V.add(view3d.drag.eye,delta);view3d.drag.target=view3d.target.slice();if(!view3d.drag.moved){view3d.drag.moved=true;document.dispatchEvent(new Event('warlike:scene-navigation'))}}
  }
  const company=state.playing&&workspace.mode==='3d'?companyController(state.entities):null;if(company&&!gameplayInputBlocked()){view3d.target=moveCompanyCamera(view3d.target,view3d.yaw,gameplayKeys(state.keys),dt,company.company.bounds)}
  updateLighting(dt,state.playing&&workspace.mode==='3d');
  syncPlayCamera(state.playing&&workspace.mode==='3d');
  if(state.playing&&workspace.mode==='3d'&&!isLanGuest()){runRuntimeFrame(dt,{update(dt){update3dPlay(dt);updateSequences(dt,{mode:'3d',yaw:view3d.yaw,playing:true,entities:state.entities,keys:gameplayKeys(state.keys),pressedKeys:gameplayInputBlocked()?new Set():state.keyPresses,player:playableActor(state.entities),allocateId(){state.nextId=Math.max(state.nextId,...state.entities.map(o=>o.id+1));return state.nextId++},onSceneChange(){state.nextId=Math.max(0,...state.entities.map(o=>o.id))+1}});}});}
  if(state.playing&&gameIsRunning()&&view3d.followPlayer){
   const vehicle=currentVehicle3d(state.entities);
   const actor=vehicle||playableActor(state.entities),pt=playerTarget();
   if(pt){
    const sceneChanged=lastCameraScene!==null&&gameSession.currentSceneId!==lastCameraScene;
    const handoff=!!lastCameraActor&&actor!==lastCameraActor&&!sceneChanged;
    if(handoff)cameraHandoffRemaining=.65;
    if(sceneChanged)cameraHandoffRemaining=0;
    const far= Math.hypot(...V.sub(pt,view3d.target))>12;
    const snap=sceneChanged||(!handoff&&far);
    const rig=cameraRigFor(actor,!!vehicle);
    const result=cameraHandoffStep(view3d.target,pt,view3d.radius,rig.distance,dt,
     {sharpness:rig.followSharpness,snap});
    view3d.target=result.target;
    if(cameraHandoffRemaining>0){view3d.radius=result.distance;cameraHandoffRemaining=Math.max(0,cameraHandoffRemaining-dt)}
    if(snap)boomDistance=null;
   }
   lastCameraActor=actor;lastCameraScene=gameSession.currentSceneId;
  }
  if(state.playing&&workspace.mode==='3d'){
   const selectedCamera=activeSceneCamera(state.entities);
   const desired=sceneCameraView(selectedCamera,state.entities,{yaw:view3d.yaw,pitch:view3d.pitch});
   transitionPose=cameraTransition.update(selectedCamera,desired,dt);
  }else{cameraTransition.reset();transitionPose=null}
  if(!view3d.enabled){updateGizmos();finishProfile();return}
  const endRenderProfile=profileStart('render3d'),endGpuProfile=gpuProfiler.begin();updateGenreHud(state);updateBattlefieldHud(state);updateGizmos();renderSceneCameraMarkers();
  const activeAircraft=state.playing?currentVehicle3d(state.entities):null;
  const aircraft=activeAircraft?.aircraftPhysics?.enabled?activeAircraft:null;
  if(aircraft){
   if(aircraftViewFor!==aircraft.id){
    aircraftViewMode=aircraft.aircraftCamera?.mode==='cockpit'?'cockpit':'chase';
    aircraftViewFor=aircraft.id;aircraftCameraKeyHeld=false;
   }
   const keys=gameplayKeys(state.keys),toggle=keys.has('v');
   if(toggle&&!aircraftCameraKeyHeld&&!gameplayInputBlocked())aircraftViewMode=nextAircraftCameraMode(aircraftViewMode);
   aircraftCameraKeyHeld=toggle;
   const info=aircraftFlightInstruments(aircraft);
   const display=name=>Number.isFinite(name)?name.toFixed(1):'0.0';
   aircraftHud.textContent=(info.kind==='helicopter'?'HÉLICOPTÈRE':'AVION')+' · '+(aircraftViewMode==='cockpit'?'COCKPIT':'EXTÉRIEUR')+
    '\nALT '+display(info.altitudeMeters)+' m   V/S '+display(info.verticalSpeedMs)+' m/s'+
    '\nVITESSE '+display(info.speedKmh)+' km/h   CAP '+Math.round(info.headingDeg)+'°'+
    '\nTANGAGE '+Math.round(info.pitchDeg)+'°   ROULIS '+Math.round(info.bankDeg)+'°   PUISSANCE '+info.powerPercent+'%'+
    (aircraft.aircraftSystems?.enabled?'\nTRAIN '+(aircraft.aircraftSystems.gear.deployed?'SORTI':'RENTRÉ')+' · VOLETS '+Math.round(aircraft.aircraftSystems.flaps.position*100)+'% · AÉROFREIN '+(aircraft.aircraftSystems.airbrake.deployed?'ON':'OFF'):'')+'\nV caméra · G train · B volets · X aérofrein · E sortir';
   aircraftHud.hidden=false;
  }else{aircraftHud.hidden=true;aircraftViewFor=null;aircraftViewMode=null;aircraftCameraKeyHeld=false}
  const vehicleHud=document.getElementById('warlikeVehicle3dHud');
  if(vehicleHud){
   const car=currentVehicle3d(state.entities);
   const player=playableActor(state.entities);
   const nearby=!car&&player?state.entities.filter(isDriveable3d).map(o=>({o,d:Math.hypot((o.x+(o.w||32)/2)-(player.x+(player.w||32)/2),(o.y+(o.depth3d||o.h||32)/2)-(player.y+(player.depth3d||player.h||32)/2))})).sort((a,b)=>a.d-b.d)[0]:null;
   vehicleHud.hidden=!state.playing||(!car&&!(nearby&&nearby.d<Math.max(150,(nearby.o.w||64)*.85)));
   if(car)vehicleHud.textContent=car.aircraftPhysics?.enabled?car.name+' · W/Z gaz ou collectif · S réduire · Flèches/IJKL tangage/roulis · A/D lacet · V caméra · E sortie au sol':car.name+' · '+Math.round(Math.abs(driving3d.speed)*.36)+' km/h · Rapport '+(car.vehicleSystems?.transmission?.gear??1)+' · ZQSD conduire · E sortir · Espace frein à main'+(car.vehicleWeapon?.enabled?' · F tirer':'');
   else if(nearby)vehicleHud.textContent='E — Entrer dans '+nearby.o.name;
  }
  // No intrusive fixed center reticle; weapon aim is controlled by the camera.
  const horrorHud=document.getElementById('horror3dHud');
  if(horrorHud){
   horrorHud.hidden=!(state.playing&&horror.enabled);
   if(!horrorHud.hidden)horrorHud.textContent=(horror.jumpscare>0?'⚠ DANGER !  |  ':'☾ SURVIVAL HORROR  |  ')+'L : lampe '+(horror.flashlight?'ON':'OFF')+'  |  Batterie '+Math.round(horror.battery)+'%  |  Peur '+Math.round(horror.fear)+'%';
  }
  if(state.playing&&sequenceRuntime.messages.length){const latest=sequenceRuntime.messages.at(-1);buttons.status.textContent='3D PLAY • '+latest.text}else if(state.playing){buttons.status.textContent=companyController(state.entities)?'RTS · clic : escouade · clic droit : ordre · flèches : caméra':'3D PLAY • Souris : regarder • Clic gauche : attaquer • Clic droit : viser • ZQSD/WASD : bouger'}else{buttons.status.textContent='SCÈNE 3D • Alt+gauche : orbite • Molette centrale : déplacer • Clic droit + ZQSD : naviguer • F : cadrer'}if(state.playing&&!companyController(state.entities))buttons.status.textContent+=grabSession.heldId!=null?' · G déposer · T lancer':' · G saisir objet physique';
  if(state.playing)buttons.status.textContent+=companyController(state.entities)?' · Navigation A* et collisions internes':' · Physique : '+(physicsSession?'Rapier'+(physicsSession.skipped?.size?' · '+physicsSession.skipped.size+' collider(s) incompatible(s)':''):gameProject.physics3d==='builtin'?'interne':rapierStatus().error?'interne (Rapier indisponible)':'chargement Rapier');
  resize();const w=canvas.clientWidth,h=canvas.clientHeight;if(!w||!h)return;
  const solar=sunAt(undefined,state.entities);gl.clearColor(...solar.sky,1);gl.depthMask(true);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
  if(state.playing&&!activeSceneCamera(state.entities)&&!isFps()&&!companyController(state.entities)){const actor=currentVehicle3d(state.entities)||playableActor(state.entities),rig=cameraRigFor(actor,!!currentVehicle3d(state.entities)),desired=sceneCamera3d(view3d.target,view3d.yaw,view3d.pitch,view3d.radius);boomDistance=rig.collision?resolveCameraBoom(view3d.target,desired.eye,state.entities.filter(o=>o!==actor&&solidBody3d(o)).map(cameraObstacleForEntity),{previousDistance:boomDistance,dt:cameraFrame}).distance:view3d.radius}
  gl.useProgram(program);gl.uniform1i(u.shadowPass,0);gl.uniform1i(u.shadowEnabled,0);let cam=camera();updateBattlefieldHud(state,{camera:cam,width:w,height:h,project:project3d});updateCompanyMarkers({camera:cam,width:w,height:h,project:project3d});
  gl.uniform3fv(u.flashPos,cam.eye);gl.uniform3fv(u.flashDir,cam.forward);
  gl.uniform1f(u.flashPower,state.playing&&horror.enabled&&horror.flashlight&&horror.battery>0?3.1:0);
  gl.uniform3fv(u.eye,cam.eye);gl.uniform3fv(u.forward,cam.forward);gl.uniform3fv(u.right,cam.right);gl.uniform3fv(u.up,cam.up);gl.uniform1f(u.aspect,w/h);
  gl.uniform1f(u.projectionFactor,1/Math.tan((cam.fieldOfView||60)*Math.PI/360));
  gl.uniform1f(u.nearClip,cam.nearClip||.1);
  gl.uniform1f(u.farClip,cam.farClip||300);
  gl.uniform3fv(u.sunDir,solar.direction);gl.uniform3fv(u.sunColor,solar.color);
  gl.uniform1f(u.exposure,renderQuality.exposure3d);gl.uniform1f(u.fogDensity,renderQuality.fog3d);
  gl.uniform1f(u.sunIntensity,solar.intensity);gl.uniform1f(u.ambient,solar.ambient);
  if(environmentIbl){
   const signature=[...solar.direction,...solar.color,solar.intensity].map(v=>Math.round(v*12)/12).join(',');
   if(!importedHdr&&signature!==lastIblSignature){
    environmentIbl.update({sunDirection:solar.direction,sunColor:solar.color,sunIntensity:solar.intensity});
    lastIblSignature=signature;
   }
   gl.activeTexture(gl.TEXTURE6);gl.bindTexture(gl.TEXTURE_CUBE_MAP,environmentIbl.sharp);
   gl.activeTexture(gl.TEXTURE7);gl.bindTexture(gl.TEXTURE_CUBE_MAP,environmentIbl.diffuse);
   gl.uniform1i(u.environmentSharp,6);gl.uniform1i(u.environmentDiffuse,7);gl.uniform1f(u.environmentMaxLod,environmentIbl.maxLod);
   gl.uniform1i(u.environmentEnabled,1);
   gl.activeTexture(gl.TEXTURE0);
  }else gl.uniform1i(u.environmentEnabled,0);

  const probes=environmentProbeUniforms3d(state.entities,{observer:cam.eye});
  gl.uniform1i(u.probeCount,probes.count);
  if(probes.count){gl.uniform3fv(u.probePositions,probes.positions);gl.uniform3fv(u.probeTints,probes.tints);gl.uniform1fv(u.probeRadius,probes.radius);gl.uniform1fv(u.probeStrength,probes.strength);}
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
  if(!state.playing&&!globalThis.__WARLIKE_BUILD__){bind(grid);model([0,-.02,0],[1,1,1],[.22,.34,.42,1]);profileDraw(grid.count,'lines');gl.drawArrays(gl.LINES,0,grid.count)}
  // Update attached child world matrices after gizmos, scripts and physics.
  if(state.entities.some(o=>o.parentId!==null&&o.parentId!==undefined||Array.isArray(o.worldMatrix3d)))try{updateEditorEntityHierarchy3d(state.entities,{physicsOwnsDynamics:state.playing})}catch(error){if(!view3d._hierarchyWarned){console.warn('[WarLike] Hiérarchie 3D',error);view3d._hierarchyWarned=true}}
  const objects=[...state.entities].filter(o=>(state.playing||!o.editorHidden)&&(!state.playing||!((o.audioEnabled||o.lightType)&&!o.assetId)&&o.enabled!==false&&o.visible!==false&&o.sequenceEnabled!==false&&!o._hiddenInVehicle&&!o._hiddenInHouse&&!o._modeEliminated)&&(!isFps()||o!==playableActor(state.entities)));
  if(objects.some(o=>o.socket3d?.targetId!==undefined)){
   const order=new Map(objects.map((o,i)=>[o.id,i]));
   const depth=o=>{let count=0,p=o.socket3d?.targetId,seen=new Set([o.id]);while(order.has(p)&&!seen.has(p)&&count<64){seen.add(p);count++;p=objects[order.get(p)].socket3d?.targetId}return count};
   objects.sort((a,b)=>depth(a)-depth(b)||order.get(a.id)-order.get(b.id));
  }
  if(state.playing&&survivalPlacement.active&&survivalPlacement.entity)objects.push(survivalPlacement.entity);
  if(!state.playing&&view3d.assetPlacementPreview)objects.push(view3d.assetPlacementPreview);
  // Draw opaque surfaces first, then alpha surfaces across ALL entities.
  // Camera-space depth (not radial distance) keeps side-on surfaces ordered.
  const opaqueDraws=[],transparentDraws=[];
  const submit=(position,draw,transparent=false,object=null)=>{
   if(transparent){
    // Use the same affine correction as the vertex shader for parented meshes.
    let world=position;
    try{const m=object&&affineCorrection3d(object);if(m)world=[0,1,2].map(i=>m[i]*position[0]+m[i+4]*position[1]+m[i+8]*position[2]+m[i+12])}catch{}
    transparentDraws.push({depth:V.dot(V.sub(world,cam.eye),cam.forward),draw});
   }else opaqueDraws.push({draw,object});
  };
  bind(cubes);
  for(const o of objects){
   const b=o.roadSpline?{x:0,y:0,z:0,w:1,h:1,d:1}:objectBounds3d(o),color=assetColor(o),asset=getAsset(o.assetId),category=asset?.category;
   const angle=(o.rotation||0)*Math.PI/180;
   if(o.roadJunction3d&&validRoadJunction(o.roadJunction3d)){
    const roads=state.entities.filter(r=>r.roadSpline),tiles=state.entities.filter(t=>validTerrainHeightfield(t.terrainHeightfield)&&t.enabled!==false);
    const signature=JSON.stringify([o.roadJunction3d,roads.filter(r=>o.roadJunction3d.roadIds.includes(r.id)).map(r=>r.roadSpline),tiles.map(t=>[t.id,t.terrainRevision3d||0])]);
    let cached=terrainMeshes.get(o.id);
    if(!cached||cached.signature!==signature){
     if(cached){gl.deleteBuffer(cached.mesh.buffer);if(cached.mesh.colorBuffer)gl.deleteBuffer(cached.mesh.colorBuffer)}
     try{const patch=roadJunctionBuffers3d(o.roadJunction3d,roads,tiles);cached={mesh:makeBuffer(patch.renderVertices),surfaceY:patch.positions[1],signature};terrainMeshes.set(o.id,cached)}
     catch(error){console.warn('[WarLike Junction]',o.name,error.message);continue}
    }
    submit([0,0,0],()=>{
     gl.uniform1f(u.roughness,.92);gl.uniform1f(u.metallic,0);
     bind(cached.mesh);model([0,0,0],[1,1,1],[.20,.22,.26,1]);
     profileDraw(cached.mesh.count,'triangles');gl.drawArrays(gl.TRIANGLES,0,cached.mesh.count);
    },false,o);
    // Traffic lights share the exact WB 2.5 signal function and simulation clock.
    // Housing and illuminated lenses are ordinary 3D geometry, not UI overlays.
    const signals=gaiaJunctionSignalPositions(o.roadJunction3d,roads,gaiaTrafficSignalSeconds());
    for(const signal of signals){
     const y=cached.surfaceY;
     const drawBox=(x,cy,z,w,h,d,color)=>submit([x,cy,z],()=>{
      gl.uniform1f(u.roughness,.55);gl.uniform1f(u.metallic,0);
      bind(cubes);model([x,cy,z],[w,h,d],color);
      profileDraw(cubes.count,'triangles');gl.drawArrays(gl.TRIANGLES,0,cubes.count);
     },false,o);
     drawBox(signal.x,y+1.55,signal.z,.13,3.1,.13,[.28,.31,.32,1]);
     drawBox(signal.x,y+3.22,signal.z,.57,1.18,.38,[.10,.12,.14,1]);
     for(const [index,name] of ['red','amber','green'].entries()){
      const on=signal.color===name;
      const color=name==='red'?[on?1:.20,.035,.025,1]:name==='amber'?[.18,.14,.025,1]:[.025,on?.95:.18,.045,1];
      drawBox(signal.x,y+3.58-index*.36,signal.z+.205,.34,.24,.045,color);
     }
    }
    continue;
   }
   if(o.roadSpline&&validRoadSpline(o.roadSpline)){
    const tiles=state.entities.filter(t=>validTerrainHeightfield(t.terrainHeightfield)&&t.enabled!==false);
    const junctions=state.entities.filter(e=>e.enabled!==false&&e.roadJunction3d?.roadIds?.includes(o.id)).map(e=>e.roadJunction3d);
    const signature=JSON.stringify([o.roadSpline,o.roadStreetscape3d,tiles.map(t=>[t.id,t.terrainRevision3d||0]),junctions]);
    let cached=terrainMeshes.get(o.id);
    if(!cached||cached.signature!==signature){
     if(cached){
      for(const item of [cached.mesh,...(cached.streetMeshes||[])])if(item?.buffer)gl.deleteBuffer(item.buffer);
      if(cached.mesh?.colorBuffer)gl.deleteBuffer(cached.mesh.colorBuffer);
     }
     try{
      const road=roadSurfaceBuffers3d(o.roadSpline,tiles),mesh=makeBuffer(road.renderVertices),
       street=roadStreetscapeBuffers3d(o.roadSpline,tiles,junctions,o.roadStreetscape3d||{});
      cached={mesh,signature,streetMeshes:[
       makeBuffer(street.sidewalks.renderVertices),makeBuffer(street.curbs.renderVertices),
       makeBuffer(street.crosswalks.renderVertices)]};
      terrainMeshes.set(o.id,cached);
     }catch(error){console.warn('[WarLike Road Editor]',o.name,error.message);continue}
    }
    submit([0,0,0],()=>{
     gl.uniform1f(u.roughness,.92);gl.uniform1f(u.metallic,0);
     bind(cached.mesh);model([0,0,0],[1,1,1],[.21,.24,.28,1]);
     profileDraw(cached.mesh.count,'triangles');gl.drawArrays(gl.TRIANGLES,0,cached.mesh.count);
    },false,o);
    for(const [index,color] of [[0,[.44,.46,.47,1]],[1,[.35,.36,.38,1]],[2,[.9,.86,.68,1]]]){
     const mesh=cached.streetMeshes[index];if(!mesh?.count)continue;
     submit([0,0,0],()=>{
      gl.uniform1f(u.roughness,.86);gl.uniform1f(u.metallic,0);
      bind(mesh);model([0,0,0],[1,1,1],color);
      profileDraw(mesh.count,'triangles');gl.drawArrays(gl.TRIANGLES,0,mesh.count);
     },false,o);
    }
    continue;
   }
   if(o.terrainHeightfield&&validTerrainHeightfield(o.terrainHeightfield)){
    const terrain=o.terrainHeightfield,signature=(o.terrainRevision3d||0)+'|'+terrain.resolution+'|'+terrain.size;
    let cached=terrainMeshes.get(o.id);
    if(!cached||cached.signature!==signature){
     if(cached){gl.deleteBuffer(cached.mesh.buffer);gl.deleteBuffer(cached.mesh.colorBuffer)}
     const surface=terrainSurfaceMesh3d(terrain);
     const mesh=makeBuffer(surface.vertices);
     mesh.colorBuffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,mesh.colorBuffer);
     gl.bufferData(gl.ARRAY_BUFFER,surface.colors,gl.STATIC_DRAW);
     cached={mesh,signature};terrainMeshes.set(o.id,cached);
    }
    submit([terrain.offsetX,Number(o.elevation3d)||0,terrain.offsetZ],()=>{
     gl.uniform1f(u.roughness,Math.max(.04,Math.min(1,o.materialRoughness??.88)));
     gl.uniform1f(u.metallic,0);
     bind(cached.mesh);
     model([terrain.offsetX,Number(o.elevation3d)||0,terrain.offsetZ],[1,1,1],[1,1,1,1],0);
     profileDraw(cached.mesh.count,'triangles');
     gl.drawArrays(gl.TRIANGLES,0,cached.mesh.count);
    },false,o);
    continue;
   }
   if(o.water3d?.enabled){
    submit([b.x,Number(o.elevation3d)||0,b.z],()=>{
     const water=waterSettings(o.water3d),surface=waterSurface3d(b.w,b.d,now/1000,water);
     gl.bindBuffer(gl.ARRAY_BUFFER,waterMesh.buffer);gl.bufferData(gl.ARRAY_BUFFER,surface,gl.DYNAMIC_DRAW);waterMesh.count=surface.length/6;
     bind(waterMesh);gl.uniform1i(useTexture,0);gl.uniform1f(alphaCutoff,.01);gl.uniform1i(unlitUniform,0);gl.uniform3fv(emissiveUniform,water.style==='magic'?[.09,.18,.22]:[.015,.045,.08]);
     gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(false);
     gl.uniform1f(u.roughness,.2);gl.uniform1f(u.metallic,.08);
     model([b.x,Number(o.elevation3d)||0,b.z],[1,1,1],waterColor(water.color,water.opacity),(o.rotation||0)*Math.PI/180,o);
     profileDraw(waterMesh.count,'triangles');gl.drawArrays(gl.TRIANGLES,0,waterMesh.count);
     if(water.foam>0){
      // Pale translucent crest layer with lower wave amplitude; visible
      // on the entire surface without adding a second material/shader.
      gl.uniform3fv(emissiveUniform,[.075,.11,.13]);
      model([b.x,(Number(o.elevation3d)||0)+.015,b.z],[1,1,1],waterColor(water.foamColor,water.opacity*water.foam*.17),(o.rotation||0)*Math.PI/180,o);
      profileDraw(waterMesh.count,'triangles');gl.drawArrays(gl.TRIANGLES,0,waterMesh.count);
     }
     gl.depthMask(true);gl.disable(gl.BLEND);gl.uniform3fv(emissiveUniform,[0,0,0]);
    },true,o);
    continue;
   }
   const shape=o.model3dId?'glb':get3dAsset(o.assetId)?.shape;
   const drawShape=(mesh,p,scale,shade,{roughness=o.materialRoughness??.7,metallic=o.materialMetallic??0,vertices=null}={})=>{
    // Shared GLB buffers may belong to differently posed instances. Upload the
    // captured pose at draw time, including in the delayed transparency pass.
    submit(p,()=>{
     if(vertices){gl.bindBuffer(gl.ARRAY_BUFFER,mesh.buffer);gl.bufferSubData(gl.ARRAY_BUFFER,0,vertices)}
     gl.uniform1f(u.roughness,clamp(Number(roughness),.04,1));gl.uniform1f(u.metallic,clamp(Number(metallic),0,1));
     bind(mesh);if(o._survivalPreview){gl.uniform1f(alphaCutoff,.01);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(false)}
     model(p,scale,o._survivalPreview?[...shade.slice(0,3),.5]:shade,angle,o);profileDraw(mesh.count,'triangles');gl.drawArrays(gl.TRIANGLES,0,mesh.count);
    },mesh.alphaMode==='BLEND'||!!o._survivalPreview,o);
   };
   const cube=(p,scale,shade)=>drawShape(cubes,p,scale,shade);
   const round=(p,scale,shade)=>drawShape(sphere,p,scale,shade);
   const cyl=(p,scale,shade)=>drawShape(cylinder,p,scale,shade);
   if(shape==='glb'){
    const id=o.model3dId||o.assetId;ensureModel(id);
    const cached=realGlbBuffers.get(id);
    if(cached?.status==='ready'){
     let posed=null,socketPose=null;const rig=cached.geometry.rig;if(rig)cacheAnimationGeometry(id,cached.geometry);
     const sampleForSockets=(...args)=>{socketPose=sampleEntityRigPose(...args);return socketPose};
     if(rig&&(rig.animations.length||o.animationRig?.clips?.length)&&(state.playing||o.animationPreview||o.animatorPreview||o.animationRig?.playOnStart||hasSkeletalPreview(o))){
      if(o.animatorGraph&&o.animatorGraph.enabled!==false&&o._animatorFrame){let track=animationStates.get(o);if(!track){track={buffers:[]};animationStates.set(o,track)}track.graph=true;const options=animatorPoseOptions(o._animatorFrame,skeletalClips(o,rig),o.animationMap||{});posed=deformGlbParts(cached.geometry,sampleForSockets(o,cached.geometry,options,state.entities),{buffers:track.buffers})}else{
      if(animationStates.get(o)?.graph)animationStates.delete(o);
      const desired=o.animationAuto===false?o.animation3dClip||'idle':(o.animation==='dead'?'death':o.animation||'idle');
      const clip=animationClipForState(rig.animations,desired,o.animationMap||{},animationStates.get(o),{automatic:o.animationAuto!==false});
      if(clip){
       let track=animationStates.get(o);if(!track){track={clip,time:0,previous:null,transition:1,buffers:[],oneShot:o.animationAuto!==false&&['attack','hurt'].includes(desired)};animationStates.set(o,track)}
       if(track.clip!==clip){track.previous={clip:track.clip,time:track.time};track.clip=clip;track.time=0;track.transition=0;track.oneShot=o.animationAuto!==false&&['attack','hurt'].includes(desired)}else if(track.oneShot&&track.time>=clip.duration&&desired==='attack'){track.time=0}
       const step=state.playing&&!gameIsRunning()?0:dt*Math.max(.05,Math.min(4,Number(o.animationSpeed)||1));track.time+=step;track.transition=Math.min(1,track.transition+step/.18);
       const loop=!track.oneShot&&o.animationLoop!==false&&!/death|die|jump_start|jump_land/i.test(clip.name);
       posed=deformGlbParts(cached.geometry,sampleForSockets(o,cached.geometry,{samples:[{clip,time:track.time,weight:1,loop}],previous:track.previous,blend:track.transition},state.entities),{buffers:track.buffers});
      }
      }
     }
     if(rig&&(hasSkeletalPreview(o)||skeletalFrame(o)?.clip&&(!o.animatorGraph||o.animatorGraph.enabled===false))){let track=animationStates.get(o);if(!track){track={buffers:[]};animationStates.set(o,track)}posed=deformGlbParts(cached.geometry,sampleForSockets(o,cached.geometry,{},state.entities),{buffers:track.buffers})}
     if(rig&&(o.vehicleArticulation||o.aircraftSystems?.enabled)){
      const pose=o.aircraftSystems?.enabled?aircraftRigPose(rig,o):vehicleRigPose(rig,o);if(pose)socketPose=pose;
      if(pose){let track=animationStates.get(o);if(!track){track={buffers:[]};animationStates.set(o,track)}posed=deformGlbParts(cached.geometry,pose,{buffers:track.buffers})}
     }
     if(rig&&state.entities.some(child=>child.socket3d?.targetId===o.id)){
      socketPose??=sampleRigPose(rig,null,0);
      const normalization=cached.geometry,bounds=objectBounds3d(o),q=rotationQuaternion3d(o);
      const dims=cached.normalizedSize||[1,1,1],factor=Math.min(bounds.w/dims[0],bounds.h/dims[1],bounds.d/dims[2]);
      bounds.y=(Number(o.elevation3d)||0)+dims[1]*factor/2;
      for(const child of state.entities){
       const socket=child.socket3d;
       if(!socket||socket.enabled===false||socket.targetId!==o.id||child.id===o.id)continue;
       const index=rig.nodes.findIndex(node=>node.name===socket.bone);
       if(index<0||!socketPose.world?.[index])continue;
       try{
        const pose=boneSocketTransform3d(o,Array.from(socketPose.world[index]),normalization,bounds,q,socket.offset||[0,0,0]);
        const previous=Array.isArray(child.worldMatrix3d)?[...child.worldMatrix3d]:null,reference=Array.isArray(child.matrixReference3d)?[...child.matrixReference3d]:null;
        const pos=pose.point;
        child.x=Math.round(pos[0]*64-(Number(child.w)||64)/2);
        child.y=Math.round(pos[2]*64-(Number(child.depth3d??child.h)||64)/2);
        child.elevation3d=pos[1]-(Number(child.h)||64)/128;
        if(socket.followRotation!==false){
         // Convert sampled bone WORLD orientation into the renderer's yaw/pitch/roll convention.
         const offsetEuler=Array.isArray(socket.rotationOffset)?socket.rotationOffset:[0,0,0];
         const b=rotationQuaternion3d({rotationX3d:Number(offsetEuler[0])||0,rotation:Number(offsetEuler[1])||0,rotationZ3d:Number(offsetEuler[2])||0});
         const a=pose.quaternion;
         const worldRotation={
          x:a.w*b.x+a.x*b.w+a.y*b.z-a.z*b.y,
          y:a.w*b.y-a.x*b.z+a.y*b.w+a.z*b.x,
          z:a.w*b.z+a.x*b.y-a.y*b.x+a.z*b.w,
          w:a.w*b.w-a.x*b.x-a.y*b.y-a.z*b.z
         };
         const euler=quaternionEuler3d(worldRotation);
         child.rotation=euler.rotation;
         child.rotationX3d=euler.rotationX3d;
         child.rotationZ3d=euler.rotationZ3d;
        }
        if(previous&&reference)updateAffineEditorPose3d(child,previous,reference);
       }catch(error){if(!child._socketWarning){console.warn('[WarLike Socket]',child.name,error);child._socketWarning=true}}
      }
     }
     if(posed){animatedHitVertices.set(o,posed);meshSnapCache.delete(o)}else animatedHitVertices.delete(o);
     for(const [partIndex,part] of cached.parts.entries()){
      const vertices=posed?.[partIndex]||(rig?cached.geometry.parts[partIndex].vertices:null);
      const material=o.colorCustomized?color:part.color;
      const {position,scale}=glbVisualPlacement3d(b,Number(o.elevation3d)||0,cached.normalizedSize||[1,1,1]);
      drawShape(part.mesh,position,scale,material,{
       roughness:o.materialRoughness??part.roughness??1,metallic:o.materialMetallic??part.metallic??0,vertices
      });
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
  // Render all opaque geometry from the sun before drawing its lit version.
  // Reusing the exact draw commands ensures GLB animation, scale and affine
  // transforms cast in the same places that their meshes appear.
  const lightFrame=shadowMap&&renderQuality.shadows3d&&solar.intensity>.035&&opaqueDraws.length
   ?sunShadowFrame3d(cam,solar.direction):null;
  if(lightFrame){
   // Detach the previous frame's sampling binding before writing to this texture.
   gl.activeTexture(gl.TEXTURE5);gl.bindTexture(gl.TEXTURE_2D,null);gl.activeTexture(gl.TEXTURE0);
   gl.bindFramebuffer(gl.FRAMEBUFFER,shadowMap.framebuffer);
   gl.viewport(0,0,shadowMap.size,shadowMap.size);
   gl.depthMask(true);gl.disable(gl.BLEND);
   gl.clearColor(1,1,1,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
   gl.uniform1i(u.shadowPass,1);gl.uniform1i(u.shadowEnabled,0);
   gl.uniform3fv(u.shadowEye,lightFrame.eye);
   gl.uniform3fv(u.shadowRight,lightFrame.right);
   gl.uniform3fv(u.shadowUp,lightFrame.up);
   gl.uniform3fv(u.shadowForward,lightFrame.forward);
   gl.uniform1f(u.shadowExtent,lightFrame.extent);
   gl.uniform1f(u.shadowNear,lightFrame.near);
   gl.uniform1f(u.shadowFar,lightFrame.far);
   for(const entry of opaqueDraws)if(entry.object?.castShadows!==false)entry.draw();
   gl.bindFramebuffer(gl.FRAMEBUFFER,null);
   gl.viewport(0,0,canvas.width,canvas.height);
   gl.depthMask(true);gl.disable(gl.BLEND);
   gl.uniform1i(u.shadowPass,0);
   gl.activeTexture(gl.TEXTURE5);gl.bindTexture(gl.TEXTURE_2D,shadowMap.texture);
   gl.uniform1i(u.shadowMap,5);
   gl.uniform1f(u.shadowTexel,1/shadowMap.size);
   gl.uniform1f(u.shadowBias,.0018);
   gl.uniform1i(u.shadowEnabled,1);
   gl.activeTexture(gl.TEXTURE0);
  }
  for(const entry of opaqueDraws)entry.draw();
  transparentDraws.sort((a,b)=>b.depth-a.depth);
  for(const entry of transparentDraws)entry.draw();
  gl.depthMask(true);gl.disable(gl.BLEND);
  if(!state.playing)tickFxRuntime(state.entities.filter(o=>o.fxEmitter?.preview),dt,'3d');
  fxRenderer.draw(cam,w,h,state.playing?state.entities:[]);
  if(!state.playing){gl.useProgram(program);bind(outline);for(const o of objects.filter(o=>state.selected.includes(o.id))){const b=objectBounds3d(o);model([b.x,b.y,b.z],[b.w*1.03,b.h*1.03,b.d*1.03],[.32,1,.8,1],(o.rotation||0)*Math.PI/180,o);profileDraw(outline.count,'lines');gl.drawArrays(gl.LINES,0,outline.count)}}
  if(isFps()&&gameIsRunning()&&healthOf(playableActor(state.entities))>0){
   const actor=playableActor(state.entities),id=actor.weaponSystem?.model3dId;
   if(id){ensureModel(id);const weapon=realGlbBuffers.get(id);if(weapon?.status==='ready'){
    const recoil=(actor._attackCooldown||0)>.14?.04:0,lower=battlefieldMatch.active&&battlefieldMatch.reloading?.18:0;
    const at=V.add(cam.eye,V.add(V.mul(cam.forward,.7-recoil),V.add(V.mul(cam.right,.22),V.mul(cam.up,-.22-lower))));
    gl.clear(gl.DEPTH_BUFFER_BIT);gl.useProgram(program);gl.uniform1f(u.roughness,.65);gl.uniform1f(u.metallic,.4);
    for(const part of weapon.parts){bind(part.mesh);model(at,[.85,.85,.85],part.color);gl.uniform1i(viewModelUniform,1);gl.uniformMatrix3fv(viewBasisUniform,false,[...cam.forward,...cam.up,...cam.right]);profileDraw(part.mesh.count,'triangles');gl.drawArrays(gl.TRIANGLES,0,part.mesh.count)}
    gl.uniform1i(viewModelUniform,0);
   }}
  }
  // Render the selected Main Camera through the SAME WebGL material pipeline.
  // This is a 320x180 offscreen pass: no duplicate renderer, no editor layout change.
  // Throttled so large authored scenes remain responsive.
  if(!state.playing&&now-(view3d._cameraPreviewAt||0)>300){
   const selectedCamera=state.entities.find(o=>state.selected.includes(o.id)&&o.sceneCamera3d);
   const preview=document.querySelector('.warlike-camera-frame-preview');
   if(preview&&!preview.hidden&&selectedCamera?.sceneCamera3d?.showPreview!==false){
    const previewCam=sceneCameraView(selectedCamera,state.entities,{yaw:view3d.yaw,pitch:view3d.pitch});
    if(previewCam){
     try{
      const pw=preview.width,ph=preview.height;
      const previousCam=cam;
      let target=view3d._previewTarget;
      if(!target||target.width!==pw||target.height!==ph){
       if(target){gl.deleteFramebuffer(target.framebuffer);gl.deleteTexture(target.color);gl.deleteRenderbuffer(target.depth)}
       const framebuffer=gl.createFramebuffer(),color=gl.createTexture(),depth=gl.createRenderbuffer();
       gl.bindTexture(gl.TEXTURE_2D,color);
       gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,pw,ph,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
       gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
       gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
       gl.bindRenderbuffer(gl.RENDERBUFFER,depth);
       gl.renderbufferStorage(gl.RENDERBUFFER,gl.DEPTH_COMPONENT16,pw,ph);
       gl.bindFramebuffer(gl.FRAMEBUFFER,framebuffer);
       gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,color,0);
       gl.framebufferRenderbuffer(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.RENDERBUFFER,depth);
       if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)
        throw Error('Camera Preview framebuffer incomplete');
       target=view3d._previewTarget={framebuffer,color,depth,width:pw,height:ph};
      }
      gl.bindFramebuffer(gl.FRAMEBUFFER,target.framebuffer);
      gl.viewport(0,0,pw,ph);
      gl.depthMask(true);gl.disable(gl.BLEND);
      gl.clearColor(...solar.sky,1);
      gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
      gl.useProgram(program);
      gl.uniform1i(u.shadowPass,0);
      cam=previewCam;
      gl.uniform3fv(u.eye,cam.eye);
      gl.uniform3fv(u.forward,cam.forward);
      gl.uniform3fv(u.right,cam.right);
      gl.uniform3fv(u.up,cam.up);
      gl.uniform1f(u.aspect,pw/ph);
      gl.uniform1f(u.projectionFactor,1/Math.tan((cam.fieldOfView||60)*Math.PI/360));
      gl.uniform1f(u.nearClip,cam.nearClip||.1);
      gl.uniform1f(u.farClip,cam.farClip||300);
      gl.uniform3fv(u.flashPos,cam.eye);gl.uniform3fv(u.flashDir,cam.forward);
      // The draw closures contain GLB geometry, texture bindings, PBR settings
      // and the active material shaders. Keep the existing shadow/IBL uniforms.
      for(const entry of opaqueDraws)entry.draw();
      gl.depthMask(true);gl.disable(gl.BLEND);
      for(const entry of transparentDraws)entry.draw();
      const bytes=new Uint8Array(pw*ph*4);
      gl.readPixels(0,0,pw,ph,gl.RGBA,gl.UNSIGNED_BYTE,bytes);
      const context=preview.getContext('2d');
      const image=context.createImageData(pw,ph);
      for(let y=0;y<ph;y++)image.data.set(bytes.subarray((ph-y-1)*pw*4,(ph-y)*pw*4),y*pw*4);
      context.putImageData(image,0,0);
      context.fillStyle='rgba(12,24,31,.85)';
      context.fillRect(0,0,pw,21);
      context.fillStyle='#e1eff4';context.font='11px system-ui';
      context.fillText('CAMERA · RENDU 3D',9,15);
      preview.dataset.liveRenderer='webgl';
      view3d._cameraPreviewAt=now;
      cam=previousCam;
      gl.bindFramebuffer(gl.FRAMEBUFFER,null);
      gl.viewport(0,0,canvas.width,canvas.height);
      gl.depthMask(true);gl.disable(gl.BLEND);
      gl.useProgram(program);
      gl.uniform3fv(u.eye,cam.eye);gl.uniform3fv(u.forward,cam.forward);
      gl.uniform3fv(u.right,cam.right);gl.uniform3fv(u.up,cam.up);
      gl.uniform1f(u.aspect,w/h);
      gl.uniform1f(u.projectionFactor,1/Math.tan((cam.fieldOfView||60)*Math.PI/360));
      gl.uniform1f(u.nearClip,cam.nearClip||.1);gl.uniform1f(u.farClip,cam.farClip||300);
      gl.uniform3fv(u.flashPos,cam.eye);gl.uniform3fv(u.flashDir,cam.forward);
     }catch(error){
      cam=camera();
      gl.bindFramebuffer(gl.FRAMEBUFFER,null);
      gl.viewport(0,0,canvas.width,canvas.height);
      delete preview.dataset.liveRenderer;
      if(!view3d._previewErrorLogged){console.warn('[WarLike] Camera Preview WebGL',error);view3d._previewErrorLogged=true}
     }
    }
   }
  }
  endGpuProfile();endRenderProfile();finishProfile();
  if(captureFrame){const resolve=captureFrame;captureFrame=null;try{resolve(canvas.toDataURL('image/png'))}catch{resolve(null)}}
 }
 requestAnimationFrame(draw);
 return {setEnabled:change,focus:focusScene,syncToWorkspace:()=>{view3d.enabled=workspace.mode==='3d';focusScene();sync()}};
}
