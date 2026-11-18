// Phase 4: upload six real scene-rendered RGBA faces as a WebGL1 cubemap.
// This module never generates placeholder scene captures or modifies the editor's global HDRI.
export function uploadReflectionCubemap3d(gl,capture,{texture=null}={}){
 if(!gl||typeof gl.createTexture!=='function')throw Error('WebGL context required');
 const size=capture?.size;
 if(!Number.isInteger(size)||size<16||size>256||(size&(size-1)))throw Error('Invalid reflection cubemap dimension');
 if(!Array.isArray(capture.faces)||capture.faces.length!==6)throw Error('Six captured scene faces are required');
 for(const face of capture.faces)if(!(face instanceof Uint8Array)||face.length!==size*size*4)throw Error('Invalid captured RGBA face');
 const previous=gl.getParameter(gl.TEXTURE_BINDING_CUBE_MAP);
 const owned=!texture;
 const cube=texture||gl.createTexture();if(!cube)throw Error('Unable to allocate reflection cubemap');
 try{
  gl.bindTexture(gl.TEXTURE_CUBE_MAP,cube);
  for(let i=0;i<6;i++)gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_X+i,0,gl.RGBA,size,size,0,gl.RGBA,gl.UNSIGNED_BYTE,capture.faces[i]);
  gl.texParameteri(gl.TEXTURE_CUBE_MAP,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_CUBE_MAP,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_CUBE_MAP,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  // GPU-generated levels are a storage/quality fallback, not a GGX convolution.
  gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
  gl.texParameteri(gl.TEXTURE_CUBE_MAP,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);
  const error=gl.getError();if(error!==gl.NO_ERROR)throw Error('WebGL reflection upload failed: '+error);
  return cube;
 }catch(error){if(owned)gl.deleteTexture(cube);throw error}
 finally{gl.bindTexture(gl.TEXTURE_CUBE_MAP,previous)}
}
export function reflectionRoughnessLod3d(roughness,size){
 if(!Number.isInteger(size)||size<1||(size&(size-1)))throw Error('Invalid cubemap size');
 const r=Math.max(0,Math.min(1,Number.isFinite(roughness)?roughness:1));
 return r*Math.log2(size);
}
