// Render a real caster into the production shadow framebuffer and compare
// actual WebGL pixels on a receiver using the production PBR shader.
import {program3d} from '../js/core/viewport-3d.js';
import {createSunShadowMap3d} from '../js/core/shadow-map-3d.js';
export function checkSunShadowPixels(){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=64;
 const gl=canvas.getContext('webgl',{antialias:false,preserveDrawingBuffer:true});
 if(!gl)throw Error('WebGL unavailable for shadow test');
 const program=program3d(gl),map=createSunShadowMap3d(gl,{size:128});
 gl.useProgram(program);gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);
 const loc=n=>gl.getUniformLocation(program,n);
 const u1=(n,x)=>gl.uniform1f(loc(n),x),i1=(n,x)=>gl.uniform1i(loc(n),x);
 const v3=(n,x)=>gl.uniform3fv(loc(n),x),v4=(n,x)=>gl.uniform4fv(loc(n),x);
 v3('uEye',[0,0,3]);v3('uRight',[1,0,0]);v3('uUp',[0,1,0]);v3('uForward',[0,0,-1]);
 v3('uScale',[1,1,1]);v4('uRotation',[0,0,0,1]);
 u1('uAspect',1);u1('uProjectionFactor',1.73);u1('uNearClip',.1);u1('uFarClip',30);
 v4('uColor',[.7,.7,.7,1]);u1('uMetallic',0);u1('uRoughness',.8);
 u1('uExposure',1);u1('uFogDensity',0);u1('uAmbient',0);
 v3('uSunDir',[0,0,1]);v3('uSunColor',[1,1,1]);u1('uSunIntensity',1);
 v3('uFlashDir',[0,0,-1]);v3('uFlashPos',[0,0,3]);u1('uFlashPower',0);
 v3('uEmissive',[0,0,0]);i1('uLightCount',0);i1('uUseTexture',0);
 i1('uHasNormalMap',0);i1('uHasMetallicRoughnessMap',0);i1('uHasOcclusionMap',0);i1('uHasEmissiveMap',0);
 i1('uViewModel',0);i1('uUseAffine',0);i1('uUnlit',0);u1('uAlphaCutoff',-1);
 v3('uShadowEye',[0,0,4]);v3('uShadowRight',[1,0,0]);v3('uShadowUp',[0,1,0]);v3('uShadowForward',[0,0,-1]);
 u1('uShadowExtent',2);u1('uShadowNear',.1);u1('uShadowFar',10);
 u1('uShadowBias',.0018);u1('uShadowTexelSize',1/map.size);
 const triangles=new Float32Array([-2,-2,0,2,-2,0,0,2,0]);
 const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
 gl.bufferData(gl.ARRAY_BUFFER,triangles,gl.STATIC_DRAW);
 const a=gl.getAttribLocation(program,'aPosition');gl.enableVertexAttribArray(a);
 gl.vertexAttribPointer(a,3,gl.FLOAT,false,0,0);
 const normal=gl.getAttribLocation(program,'aNormal');gl.disableVertexAttribArray(normal);gl.vertexAttrib3f(normal,0,0,1);
 for(const [name,v] of [['aTexcoord',[0,0]],['aMaterialUV0',[0,0,0,0]],['aMaterialUV1',[0,0,0,0]],['aVertexColor',[1,1,1,1]]]){
  const at=gl.getAttribLocation(program,name);
  if(at>=0){gl.disableVertexAttribArray(at);gl['vertexAttrib'+v.length+'fv'](at,v);}
 }
 const caster=position=>{
  // A texture cannot remain bound for sampling when writing to its framebuffer.
  gl.activeTexture(gl.TEXTURE5);gl.bindTexture(gl.TEXTURE_2D,null);gl.activeTexture(gl.TEXTURE0);
  gl.bindFramebuffer(gl.FRAMEBUFFER,map.framebuffer);gl.viewport(0,0,map.size,map.size);
  gl.clearColor(1,1,1,1);gl.depthMask(true);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
  i1('uShadowPass',1);i1('uShadowsEnabled',0);v3('uPosition',position);
  gl.drawArrays(gl.TRIANGLES,0,3);
 };
 const receiver=enabled=>{
  gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,64,64);
  gl.clearColor(0,0,0,1);gl.depthMask(true);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
  i1('uShadowPass',0);i1('uShadowsEnabled',enabled?1:0);
  gl.activeTexture(gl.TEXTURE5);gl.bindTexture(gl.TEXTURE_2D,map.texture);i1('uShadowMap',5);
  gl.activeTexture(gl.TEXTURE0);v3('uPosition',[0,0,0]);
  gl.drawArrays(gl.TRIANGLES,0,3);
  const p=new Uint8Array(4);gl.readPixels(32,32,1,1,gl.RGBA,gl.UNSIGNED_BYTE,p);
  return Array.from(p);
 };
 caster([0,0,1]);const shadowed=receiver(true),sunlit=receiver(false);
 caster([5,0,1]);const unobstructed=receiver(true);
 const red=arr=>arr[0];
 if(red(shadowed)+35>=red(sunlit)||Math.abs(red(unobstructed)-red(sunlit))>4)
  throw Error('Dynamic sun shadow mismatch '+JSON.stringify({shadowed,sunlit,unobstructed}));
 const glError=gl.getError();if(glError!==gl.NO_ERROR)throw Error('WebGL error in shadow pass: '+glError);
 gl.deleteBuffer(buffer);map.destroy();gl.deleteProgram(program);
 gl.getExtension('WEBGL_lose_context')?.loseContext();
 return {shadowed,sunlit,unobstructed};
}
