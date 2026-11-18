// Spatial influence volumes for the global HDRI cubemap. These are local
// tint/strength zones, NOT local scene captures; future probes can supply
// distinct scene-captured cubemaps without changing the component contract.
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
const rgb=text=>{
 if(!/^#[0-9a-f]{6}$/i.test(String(text||'')))return [1,1,1];
 return [1,3,5].map(i=>parseInt(text.slice(i,i+2),16)/255);
};
export const defaultEnvironmentProbe3d=()=>({enabled:true,radius:8,strength:1,tint:'#ffffff'});
export function environmentProbeUniforms3d(entities,{limit=4}={}){
 const probes=Array.isArray(entities)?entities.filter(o=>o?.environmentProbe3d?.enabled!==false&&o?.environmentProbe3d&&o.enabled!==false&&o.visible!==false):[];
 const count=Math.min(clamp(Number.isFinite(limit)?Math.floor(limit):4,0,4),probes.length);
 const positions=new Float32Array(12),tints=new Float32Array(12),radius=new Float32Array(4),strength=new Float32Array(4);
 for(let i=0;i<count;i++){
  const o=probes[i],config=o.environmentProbe3d;
  positions.set([(Number(o.x)||0)/64+(Number(o.w)||64)/128,(Number(o.elevation3d)||0)+(Number(o.h)||64)/128,(Number(o.y)||0)+(Number(o.depth3d??o.h)||64)/128],i*3);
  tints.set(rgb(config.tint),i*3);
  radius[i]=clamp(Number(config.radius)||8,.25,250);
  strength[i]=clamp(Number(config.strength)||0,0,4);
 }
 return {count,positions,tints,radius,strength};
}
