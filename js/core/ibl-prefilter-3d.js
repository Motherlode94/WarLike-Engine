// CPU importance sampling for WebGL1 prefiltered environment cubemaps.
// Uses Hammersley quasi-random sequence, GGX half-vector sampling, and
// cosine-hemisphere convolution for diffuse irradiance.
import {sampleEquirectHdr} from './hdr-radiance-3d.js';
import {cubeDirection3d,encodeRgbm3d} from './environment-ibl-3d.js';
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const normalize=a=>{const n=Math.hypot(...a)||1;return a.map(v=>v/n)};
export function radicalInverse2(i){
 let x=i>>>0;x=((x<<16)|(x>>>16))>>>0;
 x=(((x&0x55555555)<<1)|((x&0xaaaaaaaa)>>>1))>>>0;
 x=(((x&0x33333333)<<2)|((x&0xcccccccc)>>>2))>>>0;
 x=(((x&0x0f0f0f0f)<<4)|((x&0xf0f0f0f0)>>>4))>>>0;
 x=(((x&0x00ff00ff)<<8)|((x&0xff00ff00)>>>8))>>>0;
 return x*2.3283064365386963e-10;
}
export function ggxHalfVector3d(u,v,roughness){
 const a=Math.max(.0001,roughness*roughness),a2=a*a;
 const phi=2*Math.PI*u,cosTheta=Math.sqrt((1-v)/(1+(a2-1)*v));
 const sinTheta=Math.sqrt(Math.max(0,1-cosTheta*cosTheta));
 return [Math.cos(phi)*sinTheta,Math.sin(phi)*sinTheta,cosTheta];
}
const worldVector=(local,n)=>{
 const up=Math.abs(n[1])<.999?[0,1,0]:[1,0,0];
 const tangent=normalize(cross(up,n)),bitangent=cross(n,tangent);
 return normalize(tangent.map((v,i)=>v*local[0]+bitangent[i]*local[1]+n[i]*local[2]));
};
export function prefilterHdriFace3d(hdr,face,size,options={}){
 return prefilterRadianceFace3d(direction=>sampleEquirectHdr(hdr,direction),face,size,options);
}
export function prefilterRadianceFace3d(sampleRadiance,face,size,{roughness=.65,samples=32,diffuse=false,range=8}={}){
 if(!Number.isInteger(size)||size<1||size>128||!Number.isInteger(samples)||samples<1||samples>128)throw Error('Invalid IBL prefilter budget');
 if(typeof sampleRadiance!=='function'||!Number.isInteger(face)||face<0||face>5||!Number.isFinite(roughness)||roughness<0||roughness>1)throw Error('Invalid IBL radiance source');
 const out=new Uint8Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const n=cubeDirection3d(face,2*(x+.5)/size-1,2*(y+.5)/size-1);
  const radiance=[0,0,0];let weight=0;
  for(let j=0;j<samples;j++){
   const u=(j+.5)/samples,v=radicalInverse2(j),phi=2*Math.PI*u;
   let dir,w;
   if(diffuse){
    const r=Math.sqrt(v),z=Math.sqrt(1-v);
    dir=worldVector([Math.cos(phi)*r,Math.sin(phi)*r,z],n);w=1;
   }else{
    const h=worldVector(ggxHalfVector3d(u,v,roughness),n),ndh=dot(n,h);
    dir=normalize(h.map((t,i)=>2*ndh*t-n[i]));
    w=Math.max(0,dot(n,dir));
   }
   if(w<=0)continue;
   const light=sampleRadiance(dir);
   for(let c=0;c<3;c++)radiance[c]+=light[c]*w;
   weight+=w;
  }
  const pixel=radiance.map(c=>c/Math.max(weight,1e-6));
  out.set(encodeRgbm3d(pixel,range),(y*size+x)*4);
 }
 return out;
}
