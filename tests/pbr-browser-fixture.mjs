// Exercise the production shader on a real WebGL context, not a CPU BRDF copy.
import {program3d} from '../js/core/viewport-3d.js';
import {createEnvironmentIbl3d} from '../js/core/environment-ibl-3d.js';
export function checkPbrPixels(){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=64;
 const gl=canvas.getContext('webgl',{antialias:false,preserveDrawingBuffer:true});
 if(!gl)throw Error('WebGL unavailable');
 const program=program3d(gl);gl.useProgram(program);gl.viewport(0,0,64,64);
 const uniform=(name,kind,...values)=>gl[kind](gl.getUniformLocation(program,name),...values);
 const vector=(name,v)=>uniform(name,'uniform3fv',v);
 vector('uEye',[0,0,2]);vector('uRight',[1,0,0]);vector('uUp',[0,1,0]);vector('uForward',[0,0,-1]);
 vector('uPosition',[0,0,0]);vector('uScale',[1,1,1]);uniform('uRotation','uniform4fv',[0,0,0,1]);
 uniform('uAspect','uniform1f',1);uniform('uProjectionFactor','uniform1f',1/Math.tan(Math.PI/6));uniform('uNearClip','uniform1f',.1);uniform('uFarClip','uniform1f',300);uniform('uAlphaCutoff','uniform1f',-1);uniform('uExposure','uniform1f',1);
 vector('uFlashDir',[0,0,-1]);vector('uEmissive',[0,0,0]);
 // Large front-facing triangle, flat normal. The centre pixel samples a
 // nearly aligned view/light half-vector and isolates material response.
 const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
 gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-2,-2,0, 2,-2,0, 0,2,0]),gl.STATIC_DRAW);
 const a=gl.getAttribLocation(program,'aPosition');gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,3,gl.FLOAT,false,0,0);
 const constant=(name,value)=>{const at=gl.getAttribLocation(program,name);if(at>=0){gl.disableVertexAttribArray(at);gl['vertexAttrib'+value.length+'fv'](at,value)}};
 constant('aNormal',[0,0,1]);constant('aVertexColor',[1,1,1,1]);constant('aTexcoord',[0,0]);constant('aMaterialUV0',[0,0,0,0]);constant('aMaterialUV1',[0,0,0,0]);
 const environment=createEnvironmentIbl3d(gl,{sharpSize:32,diffuseSize:16});
 environment.update({sunDirection:[0,0,1],sunColor:[1,.4,.2],sunIntensity:2});
 gl.activeTexture(gl.TEXTURE6);gl.bindTexture(gl.TEXTURE_CUBE_MAP,environment.sharp);
 gl.activeTexture(gl.TEXTURE7);gl.bindTexture(gl.TEXTURE_CUBE_MAP,environment.diffuse);
 uniform('uEnvironmentSharp','uniform1i',6);
 uniform('uEnvironmentDiffuse','uniform1i',7);
 gl.activeTexture(gl.TEXTURE0);
 const sample=({metal=0,rough=.5,sun=[1,1,1],direction=[0,0,1],unlit=false,point=false,spot=false,flash=false,ambient=0,eye=[0,0,2],ibl=false}={})=>{
  vector('uEye',eye);uniform('uAmbient','uniform1f',ambient);
  uniform('uEnvironmentEnabled','uniform1i',ibl?1:0);
  uniform('uColor','uniform4fv',[.7,.2,.05,1]);uniform('uMetallic','uniform1f',metal);uniform('uRoughness','uniform1f',rough);
  vector('uSunColor',sun);vector('uSunDir',direction);uniform('uSunIntensity','uniform1f',point||flash?0:1);
  uniform('uUnlit','uniform1i',unlit?1:0);uniform('uLightCount','uniform1i',point?1:0);
  vector('uLightPos[0]',[0,0,2]);vector('uLightColor[0]',sun);vector('uLightDir[0]',[0,0,-1]);
  uniform('uLightPower[0]','uniform1f',2);uniform('uLightRange[0]','uniform1f',10);uniform('uLightCone[0]','uniform1f',.9);uniform('uLightSpot[0]','uniform1f',spot?1:0);
  vector('uFlashPos',[0,0,2]);uniform('uFlashPower','uniform1f',flash?2:0);
  gl.clear(gl.COLOR_BUFFER_BIT);gl.drawArrays(gl.TRIANGLES,0,3);
  const pixel=new Uint8Array(4);gl.readPixels(32,32,1,1,gl.RGBA,gl.UNSIGNED_BYTE,pixel);return Array.from(pixel);
 };
 const pixels={rough:sample({rough:.85,metal:1}),smooth:sample({rough:.15,metal:1}),redSun:sample({rough:.5,metal:1,sun:[1,0,0]}),back:sample({direction:[0,0,-1]}),dielectric:sample(),point:sample({point:true,metal:1,sun:[0,1,0]}),spot:sample({point:true,spot:true,metal:1,sun:[0,0,1]}),flash:sample({flash:true,metal:1}),unlitBright:sample({unlit:true}),unlitDark:sample({unlit:true,sun:[0,0,0]}),ambientSmooth:sample({metal:1,rough:.08,ambient:1,sun:[0,0,0],direction:[0,0,-1]}),ambientRough:sample({metal:1,rough:.95,ambient:1,sun:[0,0,0],direction:[0,0,-1]}),ambientDielectric:sample({metal:0,rough:.5,ambient:1,sun:[0,0,0],direction:[0,0,-1]}),iblSmooth:sample({metal:1,rough:.05,ambient:1,ibl:true,sun:[0,0,0],direction:[0,0,-1]}),iblRough:sample({metal:1,rough:.96,ambient:1,ibl:true,sun:[0,0,0],direction:[0,0,-1]}),iblUnlit:sample({unlit:true,ibl:true,ambient:1,sun:[0,0,0]}),iblDisabledUnlit:sample({unlit:true,ibl:false,ambient:1,sun:[0,0,0]})};
 const require=(ok,message)=>{if(!ok)throw Error(message+': '+JSON.stringify(pixels))};
 require(pixels.smooth[0]>pixels.rough[0]+30,'Roughness must broaden and dim the aligned metal highlight');
 require(pixels.redSun[0]>40&&pixels.redSun[1]===0&&pixels.redSun[2]===0,'Sun colour must tint specular as well as diffuse');
 require(pixels.back.slice(0,3).every(v=>v===0),'A back light must not illuminate the front face');
 require(pixels.dielectric.slice(0,3).every(v=>v>0),'Dielectric diffuse and specular must remain visible');
 require(pixels.point[1]>20&&pixels.point[0]===0&&pixels.point[2]===0,'Point sources must use the same coloured metal BRDF');
 require(pixels.spot[2]>20&&pixels.spot[0]===0&&pixels.spot[1]===0,'Spot sources must use the same coloured metal BRDF');
 require(pixels.flash[0]>20,'Flashlight must illuminate metallic materials');
 require(JSON.stringify(pixels.unlitBright)===JSON.stringify(pixels.unlitDark),'Unlit colours must be independent of lighting');
 require(pixels.ambientSmooth[0]>pixels.ambientRough[0]+4,'Ambient metallic reflection must respond to roughness');
 require(pixels.ambientDielectric[0]>pixels.ambientRough[0],'Dielectric must retain indirect diffuse under ambient lighting');
 require(pixels.iblSmooth[0]>pixels.iblRough[0]+3,'HDR IBL metallic highlight must react to roughness');
 require(JSON.stringify(pixels.iblUnlit)===JSON.stringify(pixels.iblDisabledUnlit),'Unlit PBR must ignore IBL');
 require(gl.getError()===gl.NO_ERROR,'No WebGL errors');
 environment.destroy();gl.deleteBuffer(buffer);gl.deleteProgram(program);gl.getExtension('WEBGL_lose_context')?.loseContext();
 return pixels;
}
