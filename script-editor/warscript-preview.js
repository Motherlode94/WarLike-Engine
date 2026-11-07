import {compileWarScript,createWarScriptInstance,warScriptBuiltin} from './warscript.js';

/**
 * Deterministic WarScript preview for Script Studio, NOT an Engine scene.
 * It uses only the existing bounded WarScript VM, never eval or JS transpilation.
 * Calls affecting actual scene actors are recorded as simulated operations.
 */
export function runWarScriptPreview(source,{frames=60,fps=60,maxLogs=120}={}){
 const compiled=compileWarScript(source);
 if(!compiled.ok)return {ok:false,diagnostics:compiled.diagnostics,logs:[],state:null,simulated:true};
 if(!Number.isSafeInteger(frames)||frames<0||frames>300||!Number.isFinite(fps)||fps<1||fps>120)throw Error('Cadence ou nombre de frames invalide.');
 const state={position:{x:0,y:0,z:0},rotation:{x:0,y:0,z:0},visible:true,active:true,health:100,time:0};
 const logs=[];let overflow=false,deltaTime=1/fps;
 const emit=(name,args)=>{
  if(logs.length<maxLogs)logs.push({frame:Math.round(state.time*fps),method:name,args:structuredClone(args)});
  else overflow=true;
 };
 const isVector=v=>v&&typeof v==='object'&&['x','y','z'].every(k=>typeof v[k]==='number'&&Number.isFinite(v[k]));
 const number=v=>{if(typeof v!=='number'||!Number.isFinite(v))throw Error('Nombre requis.');return v;};
 const positionFor=(name)=>({
  'transform.position':state.position,
  'transform.position.x':state.position.x,
  'transform.position.y':state.position.y,
  'transform.position.z':state.position.z,
  'transform.rotation.x':state.rotation.x,
  'transform.rotation.y':state.rotation.y,
  'transform.rotation.z':state.rotation.z,
  'Time.deltaTime':deltaTime,
  'Time.fixedDeltaTime':deltaTime,
  'Time.time':state.time,
  'enabled':true,
  'isActiveAndEnabled':state.active,
  'gameObject.activeSelf':state.active,
  'gameObject.active':state.active,
  'gameObject.name':'PreviewObject',
  'health':state.health
 })[name];
 const api={
  read(name){const value=positionFor(name);if(value===undefined)throw Error('Propriété indisponible en aperçu : '+name);return structuredClone(value);},
  write(name,value){
   if(name==='health'){state.health=number(value);return;}
   if(name==='gameObject.activeSelf'||name==='gameObject.active'){state.active=Boolean(value);return;}
   if(name==='transform.position'){if(!isVector(value))throw Error('Vector3 attendu.');state.position={...value};return;}
   for(const [prefix,target] of [['transform.position.',state.position],['transform.rotation.',state.rotation]]){
    if(name.startsWith(prefix)){const axis=name.slice(prefix.length);if(!['x','y','z'].includes(axis))break;target[axis]=number(value);return;}
   }
   emit('write:'+name,[value]);
  },
  call(name,args){
   if(name==='Vector3'||name.startsWith('Mathf.'))return warScriptBuiltin(name,args);
   if(name==='Log'||name==='Debug.Log'){emit('Log',args);return null;}
   if(name==='Move'||name==='transform.Translate'){
    const v=args.length===1&&isVector(args[0])?args[0]:args.length===3?{x:number(args[0]),y:number(args[1]),z:number(args[2])}:null;
    if(v){for(const axis of ['x','y','z'])state.position[axis]+=v[axis];emit(name,args);return null;}
    if(args.length===1&&typeof args[0]==='number'){state.position.x+=args[0];emit(name,args);return null;}
   }
   if(name==='Rotate'||name==='transform.Rotate'){
    const v=args.length===1?{x:0,y:number(args[0]),z:0}:args.length===3?{x:number(args[0]),y:number(args[1]),z:number(args[2])}:null;
    if(v){for(const axis of ['x','y','z'])state.rotation[axis]+=v[axis];emit(name,args);return null;}
   }
   if(name==='SetVisible'){state.visible=Boolean(args[0]);emit(name,args);return null;}
   if(name==='SetHealth'){state.health=number(args[0]);emit(name,args);return null;}
   if(name==='gameObject.SetActive'){state.active=Boolean(args[0]);emit(name,args);return null;}
   if(name==='Get'||name==='Input.GetKey'||name==='Input.GetKeyDown')return name==='Get'?0:false;
   if(name==='Signal'||name==='Set'||name.startsWith('Animator.')||name==='SetLight'){emit('simulated:'+name,args);return null;}
   throw Error('API WarScript non simulée : '+name);
  }
 };
 try{
  const instance=createWarScriptInstance(compiled,api);
  if(Object.hasOwn(compiled.methods,'Awake'))instance.run('Awake');
  if(Object.hasOwn(compiled.methods,'Start'))instance.run('Start');
  for(let i=0;i<frames;i++){
   state.time=i*deltaTime;
   if(Object.hasOwn(compiled.methods,'FixedUpdate'))instance.run('FixedUpdate');
   if(Object.hasOwn(compiled.methods,'Update'))instance.run('Update');
   if(Object.hasOwn(compiled.methods,'LateUpdate'))instance.run('LateUpdate');
  }
  state.time=frames*deltaTime;
  return {ok:true,diagnostics:[],logs,fields:structuredClone(instance.fields),state,frames,overflow,simulated:true};
 }catch(error){return {ok:false,diagnostics:[{severity:'error',line:error.line||1,column:error.column||1,message:error.message}],logs,state,simulated:true};}
}
