// CPU measurements use performance.now; frame intervals are NOT simulation dt.
// The bounded ring and all UI state are transient, separate from project data.
const quantile=(values,q)=>{if(!values.length)return null;const sorted=[...values].sort((a,b)=>a-b);return sorted[Math.min(sorted.length-1,Math.ceil(q*sorted.length)-1)]};
export function createRuntimeProfiler({now=()=>performance.now(),capacity=600}={}){
 let enabled=false,samples=[],previous=null,generation=0,serial=0,pending={},stack=[],current=null;
 const api={get enabled(){return enabled},gpuStatus:'not-requested',
  start(){generation++;enabled=true;samples=[];previous=null;pending={};stack=[];current=null;serial=0},
  stop(){enabled=false;previous=null;generation++;pending={};stack=[];current=null},
  scope(name){if(!enabled)return ()=>{};const item={name,start:now(),children:0,generation};stack.push(item);return ()=>{if(item.generation!==generation)return;const elapsed=Math.max(0,now()-item.start);stack.pop();if(stack.length)stack.at(-1).children+=elapsed;const row=pending[name]??={calls:0,inclusiveMs:0,exclusiveMs:0};row.calls++;row.inclusiveMs+=elapsed;row.exclusiveMs+=Math.max(0,elapsed-item.children)}},
  frame(timestamp,context={}){if(!enabled||!Number.isFinite(timestamp))return ()=>{};const frame={id:++serial,timestamp,frameMs:previous==null?null:Math.max(0,timestamp-previous),mode:context.mode||'2d',phase:context.phase||'playing',entities:context.entities||0,drawCalls:0,triangles:0,points:0,gpuMs:null,heapBytes:null};previous=timestamp;current=frame;const version=generation;
   return ()=>{if(version!==generation)return;frame.stages=pending;pending={};frame.cpuMeasuredMs=Object.values(frame.stages).reduce((n,s)=>n+s.exclusiveMs,0);const memory=globalThis.performance?.memory;if(Number.isFinite(memory?.usedJSHeapSize))frame.heapBytes=memory.usedJSHeapSize;samples.push(frame);if(samples.length>capacity)samples.shift();current=null};
  },
  draw(vertices,kind='triangles'){if(!enabled||!current)return;current.drawCalls++;if(kind==='triangles')current.triangles+=Math.floor(Math.max(0,vertices)/3);else if(kind==='points')current.points+=Math.max(0,vertices)},
  get currentFrame(){return current},
  report(){const frames=samples.filter(s=>s.phase==='playing'),intervals=frames.map(s=>s.frameMs).filter(v=>v>0),stages={};for(const frame of frames)for(const [name,data] of Object.entries(frame.stages)){const stat=stages[name]??={calls:0,inclusiveMs:0,exclusiveMs:0,samples:[]};stat.calls+=data.calls;stat.inclusiveMs+=data.inclusiveMs;stat.exclusiveMs+=data.exclusiveMs;stat.samples.push(data.inclusiveMs)}for(const stat of Object.values(stages)){stat.p95Ms=quantile(stat.samples,.95);delete stat.samples}
   const duration=intervals.reduce((a,b)=>a+b,0),gpu=frames.map(s=>s.gpuMs).filter(Number.isFinite);return {schema:'warlike.profiler.v1',units:'milliseconds',enabled,capacity,frames:frames.length,windowSeconds:duration/1000,averageFps:duration>0?intervals.length*1000/duration:null,frameMs:{p50:quantile(intervals,.5),p95:quantile(intervals,.95),max:intervals.length?Math.max(...intervals):null},cpuMeasuredMs:{p50:quantile(frames.map(s=>s.cpuMeasuredMs),.5),p95:quantile(frames.map(s=>s.cpuMeasuredMs),.95)},gpu:{status:api.gpuStatus,samples:gpu.length,p50Ms:quantile(gpu,.5),p95Ms:quantile(gpu,.95)},last:frames.at(-1)?structuredClone(frames.at(-1)):null,stages,notes:['CPU instrumenté uniquement ; temps exclusifs additionnables, inclusifs imbriqués.','Draw calls et triangles soumis incluent les passes ombres ; ce ne sont pas des objets uniques.','Heap JS facultatif/non standard ; aucune estimation de VRAM.'],samples:structuredClone(samples)};
  }
 };return api;
}
export const runtimeProfiler=createRuntimeProfiler();
export const profileScope=(name,callback)=>{const end=runtimeProfiler.scope(name);try{return callback()}finally{end()}};
export const profileStart=name=>runtimeProfiler.scope(name);
export const profileDraw=(vertices,kind)=>runtimeProfiler.draw(vertices,kind);
export function createGpuProfiler(gl){
 const ext=gl.getExtension('EXT_disjoint_timer_query')||gl.getExtension('EXT_disjoint_timer_query_webgl2');
 if(!ext){runtimeProfiler.gpuStatus='unsupported';return {begin(){return ()=>{}}}}
 const v1=typeof ext.createQueryEXT==='function',create=()=>v1?ext.createQueryEXT():gl.createQuery(),remove=q=>v1?ext.deleteQueryEXT(q):gl.deleteQuery(q),get=(q,p)=>v1?ext.getQueryObjectEXT(q,p):gl.getQueryParameter(q,p),pending=[];
 runtimeProfiler.gpuStatus='available';
 return {begin(){
  if(gl.getParameter(ext.GPU_DISJOINT_EXT)){for(const item of pending)remove(item.q);pending.length=0;runtimeProfiler.gpuStatus='disjoint';return ()=>{}}
  for(let i=pending.length-1;i>=0;i--){const item=pending[i];if(!get(item.q,v1?ext.QUERY_RESULT_AVAILABLE_EXT:gl.QUERY_RESULT_AVAILABLE))continue;const ns=get(item.q,v1?ext.QUERY_RESULT_EXT:gl.QUERY_RESULT);if(Number.isFinite(ns)&&item.generation===generationOfCapture){item.frame.gpuMs=ns/1e6;runtimeProfiler.gpuStatus='sampled'}remove(item.q);pending.splice(i,1)}
  if(!runtimeProfiler.enabled||!runtimeProfiler.currentFrame||pending.length>=4)return ()=>{};
  const q=create(),frame=runtimeProfiler.currentFrame,capture=generationOfCapture;v1?ext.beginQueryEXT(ext.TIME_ELAPSED_EXT,q):gl.beginQuery(ext.TIME_ELAPSED_EXT,q);
  return ()=>{v1?ext.endQueryEXT(ext.TIME_ELAPSED_EXT):gl.endQuery(ext.TIME_ELAPSED_EXT);pending.push({q,frame,generation:capture});if(runtimeProfiler.gpuStatus!=='sampled')runtimeProfiler.gpuStatus='pending'};
 }};
}
let generationOfCapture=0;
export function startProfiler(){generationOfCapture++;runtimeProfiler.start()}
export function stopProfiler(){runtimeProfiler.stop()}
