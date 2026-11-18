// WebGL1 directional shadow-map support. RGBA8 depth packing avoids requiring
// depth-texture extensions and is compatible with isolated Web exports.
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const length=v=>Math.hypot(...v);
const normal=v=>{const n=length(v);return n>1e-6?v.map(x=>x/n):null;};
const add=(a,b)=>a.map((x,i)=>x+b[i]);
const scale=(v,n)=>v.map(x=>x*n);
export function sunShadowFrame3d(camera,sun,{focusDistance=16,distance=65,extent=38,near=.1,far=145}={}){
 if(!Array.isArray(camera?.eye)||!Array.isArray(camera?.forward))return null;
 const light=normal(sun),look=normal(camera.forward);
 if(!light||!look||![...camera.eye,...sun,...camera.forward,focusDistance,distance,extent,near,far].every(Number.isFinite)||extent<=0||near<=0||far<=near)return null;
 const target=add(camera.eye,scale(look,focusDistance));
 const eye=add(target,scale(light,distance));
 const forward=scale(light,-1),upGuide=Math.abs(forward[1])>.97?[0,0,1]:[0,1,0];
 const right=normal(cross(forward,upGuide));
 if(!right)return null;
 const up=normal(cross(right,forward));
 return {eye,right,up,forward,extent,near,far,target};
}
export function createSunShadowMap3d(gl,{size=1024}={}){
 if(!gl||!Number.isInteger(size)||size<64||size>4096)throw Error('Shadow map invalide');
 const texture=gl.createTexture(),depth=gl.createRenderbuffer(),framebuffer=gl.createFramebuffer();
 if(!texture||!depth||!framebuffer)throw Error('Allocation shadow map impossible');
 gl.bindTexture(gl.TEXTURE_2D,texture);
 gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,size,size,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
 gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);
 gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
 gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
 gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
 gl.bindRenderbuffer(gl.RENDERBUFFER,depth);
 gl.renderbufferStorage(gl.RENDERBUFFER,gl.DEPTH_COMPONENT16,size,size);
 gl.bindFramebuffer(gl.FRAMEBUFFER,framebuffer);
 gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,texture,0);
 gl.framebufferRenderbuffer(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.RENDERBUFFER,depth);
 const valid=gl.checkFramebufferStatus(gl.FRAMEBUFFER)===gl.FRAMEBUFFER_COMPLETE;
 gl.bindFramebuffer(gl.FRAMEBUFFER,null);
 gl.bindRenderbuffer(gl.RENDERBUFFER,null);
 gl.bindTexture(gl.TEXTURE_2D,null);
 if(!valid){
  gl.deleteFramebuffer(framebuffer);gl.deleteRenderbuffer(depth);gl.deleteTexture(texture);
  throw Error('Shadow framebuffer incomplet');
 }
 return {texture,framebuffer,depth,size,destroy(){
  gl.deleteFramebuffer(framebuffer);gl.deleteRenderbuffer(depth);gl.deleteTexture(texture);
 }};
}
