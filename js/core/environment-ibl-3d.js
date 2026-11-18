// Procedural HDR environment cubemaps for the WebGL1 GLB renderer.
// RGBM stores linear radiance up to 8.0 in RGBA8 without float texture extensions.
const clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v));
const normalize=v=>{const length=Math.hypot(...v);return length>1e-7?v.map(x=>x/length):[0,1,0]};
export function encodeRgbm3d(rgb,range=8){
 const max=Math.max(0,...rgb);
 const m=clamp(Math.ceil(clamp(max/range,0,1)*255)/255,1/255,1);
 return [...rgb.map(v=>Math.round(clamp(v/(m*range))*255)),Math.round(m*255)];
}
export function decodeRgbm3d(rgba,range=8){
 return rgba.slice(0,3).map(v=>v/255*(rgba[3]/255)*range);
}
export function cubeDirection3d(face,u,v){
 const sides=[[1,-v,-u],[-1,-v,u],[u,1,v],[u,-1,-v],[u,-v,1],[-u,-v,-1]];
 return normalize(sides[face]||sides[0]);
}
const luminance=c=>c[0]*.2126+c[1]*.7152+c[2]*.0722;
export function proceduralRadiance3d(direction,{sunDirection=[.3,.9,.1],sunColor=[1,.95,.85],sunIntensity=1,soft=false}={}){
 const n=normalize(direction),sun=normalize(sunDirection);
 const horizon=clamp(n[1]*.5+.5),blue=[.12,.23,.45],ground=[.065,.07,.08],upper=[.45,.68,1.2];
 const base=ground.map((v,i)=>v*(1-horizon)+upper[i]*horizon);
 const sunlight=Math.max(0,n.reduce((sum,v,i)=>sum+v*sun[i],0));
 const angularHighlight=Math.pow(sunlight,soft?5:320)*(soft?.16:5)*clamp(sunIntensity,0,4);
 return base.map((v,i)=>v+blue[i]*Math.pow(1-Math.abs(n[1]),4)*.12+sunColor[i]*angularHighlight);
}
export function buildEnvironmentFace3d(face,size,options={}){
 if(!Number.isInteger(size)||size<2||size>256)throw Error('Invalid cube face dimension');
 const pixels=new Uint8Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const dir=cubeDirection3d(face,2*(x+.5)/size-1,2*(y+.5)/size-1);
  pixels.set(encodeRgbm3d(proceduralRadiance3d(dir,options)),(y*size+x)*4);
 }
 return pixels;
}
export function createEnvironmentIbl3d(gl,{sharpSize=32,diffuseSize=16}={}){
 if(!gl||!Number.isInteger(sharpSize)||!Number.isInteger(diffuseSize)||sharpSize<2||diffuseSize<2)throw Error('Invalid IBL context or cubemap size');
 const sharp=gl.createTexture(),diffuse=gl.createTexture();
 if(!sharp||!diffuse)throw Error('Unable to allocate environment cubemap');
 const upload=(texture,size,options)=>{
  gl.bindTexture(gl.TEXTURE_CUBE_MAP,texture);
  for(let face=0;face<6;face++)gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_X+face,0,gl.RGBA,size,size,0,gl.RGBA,gl.UNSIGNED_BYTE,buildEnvironmentFace3d(face,size,options));
  gl.texParameteri(gl.TEXTURE_CUBE_MAP,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_CUBE_MAP,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_CUBE_MAP,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_CUBE_MAP,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
 };
 const update=({sunDirection,sunColor,sunIntensity}={})=>{
  const options={sunDirection,sunColor,sunIntensity};
  upload(sharp,sharpSize,options);
  upload(diffuse,diffuseSize,{...options,soft:true});
  gl.bindTexture(gl.TEXTURE_CUBE_MAP,null);
 };
 update();
 return {sharp,diffuse,update,destroy(){gl.deleteTexture(sharp);gl.deleteTexture(diffuse)}};
}
