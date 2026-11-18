// Phase 4 reflection-probe capture contract. The renderer supplies six real scene views;
// this module does not substitute HDRI or procedural sky for captured geometry.
export const REFLECTION_CUBE_FACES_3D=Object.freeze([
 {name:'+X',direction:[1,0,0],up:[0,-1,0]},
 {name:'-X',direction:[-1,0,0],up:[0,-1,0]},
 {name:'+Y',direction:[0,1,0],up:[0,0,1]},
 {name:'-Y',direction:[0,-1,0],up:[0,0,-1]},
 {name:'+Z',direction:[0,0,1],up:[0,-1,0]},
 {name:'-Z',direction:[0,0,-1],up:[0,-1,0]}
]);
const finite3=p=>Array.isArray(p)&&p.length===3&&p.every(Number.isFinite);
export function reflectionProbeCaptureOptions3d({position,size=64,near=.1,far=150,excludeEntityId=null}={}){
 if(!finite3(position))throw Error('Reflection capture requires a finite position');
 if(!Number.isInteger(size)||size<16||size>256||(size&(size-1)))throw Error('Reflection capture resolution must be power of two (16–256)');
 if(!Number.isFinite(near)||!Number.isFinite(far)||near<=0||far<=near)throw Error('Invalid reflection capture clipping planes');
 return {position:[...position],size,near,far,excludeEntityId};
}
export async function captureReflectionProbe3d({renderFace,signal,...options}={}){
 if(typeof renderFace!=='function')throw Error('Scene renderer is required to capture reflection probes');
 const config=reflectionProbeCaptureOptions3d(options),faces=[];
 for(let face=0;face<6;face++){
  if(signal?.aborted)throw Error('Reflection capture aborted');
  const camera=REFLECTION_CUBE_FACES_3D[face];
  const pixels=await renderFace({face,...camera,...config,fieldOfView:90,aspect:1});
  if(!(pixels instanceof Uint8Array)||pixels.byteLength!==config.size*config.size*4)throw Error('Reflection capture returned an invalid RGBA face: '+camera.name);
  faces.push(new Uint8Array(pixels)); // own pixel storage, not a reused GL readback buffer
 }
 return {position:config.position,size:config.size,faces,encoding:'rgba8',capturedAt:Date.now()};
}
