// Runs ONLY inside a Worker created by the opaque-origin sandbox document.
// No editor objects, credentials, storage or network capabilities cross this boundary.
export function scriptWorkerMain(){
 const send=postMessage.bind(self),listen=addEventListener.bind(self),clone=structuredClone.bind(self),importCode=async source=>{const url=URL.createObjectURL(new Blob([source],{type:'text/javascript'}));try{return await import(url)}finally{URL.revokeObjectURL(url)}};
 const readonly=value=>{if(value&&typeof value==='object'){for(const item of Object.values(value))readonly(item);Object.freeze(value)}return value};
 const callbacks={Awake:['Awake','awake'],Start:['Start','start'],OnEnable:['OnEnable','onEnable'],OnDisable:['OnDisable','onDisable'],FixedUpdate:['FixedUpdate','fixedUpdate'],Update:['Update','update'],LateUpdate:['LateUpdate','lateUpdate'],OnDestroy:['OnDestroy','onDestroy']};
 let entries=[],elapsed=0,fixed=0,commands=[],ctx,readonlyEntities;
 const safe=value=>{const text=JSON.stringify(value);if(text?.length>16384)throw Error('Champs limités à 16 Ko.');return JSON.parse(text)};
 const command=(entry,op,name,args)=>{if(commands.length>=1024)throw Error('1024 commandes maximum par image.');commands.push({index:entry.index,op,name,args:safe(args)})};
 const invoke=(entry,hook,cleanup=false)=>{
  if(entry.failed&&!cleanup)return;
  try{const method=callbacks[hook].map(k=>entry.module[k]).find(f=>typeof f==='function');if(method){const result=method(entry.binding);if(result?.then)throw Error('Callbacks synchrones requis.');}entry.fields=safe(entry.binding.fields)}
  catch(error){entry.failed=true;entry.error=String(error.message||error).slice(0,1000)}
 };
 const activation=entry=>{
  if(entry.destroyed)return;
  const e=entry.entity,c=entry.component;
  if(!entry.awakened&&!entry.failed&&e.enabled!==false&&c.enabled!==false){entry.awakened=true;invoke(entry,'Awake')}
  for(let i=0;i<8;i++){const active=entry.awakened&&!entry.failed&&e.enabled!==false&&c.enabled!==false;if(active===entry.active)return;entry.active=active;invoke(entry,active?'OnEnable':'OnDisable',!active)}
  entry.failed=true;entry.error='OnEnable/OnDisable changent l’activation en boucle.';
 };
 const start=entry=>{activation(entry);if(entry.active&&!entry.started){entry.started=true;invoke(entry,'Start');activation(entry)}};
 const run=(entry,hook)=>{start(entry);if(entry.active){invoke(entry,hook);activation(entry)}};
 const dispose=entry=>{if(entry.destroyed)return;entry.destroyed=true;if(entry.active){entry.active=false;invoke(entry,'OnDisable',true)}if(entry.awakened)invoke(entry,'OnDestroy',true)};
 function bind(entry){
  const e=entry.entity,c=entry.component,three=ctx.mode==='3d';
  const position=()=>({x:(e.x||0)/64,y:three?e.elevation3d||0:(e.y||0)/64,z:three?(e.y||0)/64:0});
  const writePosition=value=>{if(!value||!['x','y','z'].every(k=>Number.isFinite(value[k])))throw Error('Position finie requise.');e.x=value.x*64;if(three){e.elevation3d=value.y;e.y=value.z*64}else e.y=value.y*64;command(entry,'write','transform.position',[value])};
  const b={entity:new Proxy(e,{set(target,key,value){command(entry,'entity',String(key),[value]);target[key]=value;return true},deleteProperty(){throw Error('Suppression de propriété interdite.')},defineProperty(){throw Error('Définition de propriété interdite.')}}),entities:readonlyEntities,fields:entry.fields,Time:{get deltaTime(){return entry.delta},get time(){return elapsed},fixedDeltaTime:.02},
   Input:{GetKey:key=>ctx.keys.includes(String(key).toLowerCase()),GetKeyDown:key=>ctx.pressedKeys.includes(String(key).toLowerCase())},
   Move:(x,y,z)=>{command(entry,'call','Move',[x,y,z]);e.x+=x*64;if(three){e.y+=z*64;e.elevation3d=(e.elevation3d||0)+y}else e.y+=y*64},
   Rotate:(...args)=>{command(entry,'call','Rotate',args);if(args.length===1)e.rotation=(e.rotation||0)+args[0];else{e.rotationX3d=(e.rotationX3d||0)+args[0];e[three?'rotation':'rotationY3d']=(e[three?'rotation':'rotationY3d']||0)+args[1];e[three?'rotationZ3d':'rotation']=(e[three?'rotationZ3d':'rotation']||0)+args[2]}},
   Log:value=>command(entry,'call','Log',[String(value).slice(0,4096)]),Get:key=>ctx.globals[key]??0,Set:(key,value)=>{ctx.globals[key]=value;command(entry,'call','Set',[key,value])},Signal:key=>command(entry,'call','Signal',[key]),
   GetComponent:key=>e[key]===undefined?undefined:readonly(clone(e[key])),get enabled(){return c.enabled!==false},set enabled(value){c.enabled=value;command(entry,'write','enabled',[value])},get isActiveAndEnabled(){return c.enabled!==false&&e.enabled!==false}};
  b.Animator=Object.fromEntries(['Play','SetFloat','SetInteger','SetBool','SetTrigger','ResetTrigger'].map(method=>[method,(...args)=>command(entry,'call','Animator.'+method,args)]));
  b.gameObject={get name(){return String(e.name||'')},get activeSelf(){return e.enabled!==false},SetActive:value=>{e.enabled=value;command(entry,'call','gameObject.SetActive',[value])}};
  b.transform={get position(){return position()},set position(value){writePosition(value)},Translate:b.Move,Rotate:b.Rotate};
  entry.binding=b;
 }
 listen('message',async event=>{
  const {id,type,payload}=event.data;
  try{
   commands=[];
   if(type==='prepare'){
    ctx=payload;readonlyEntities=readonly(clone(ctx.entities));entries=[];elapsed=0;fixed=0;const modules=new Map();
    for(const item of ctx.scripts){
     if(!modules.has(item.source))modules.set(item.source,importCode(item.source));const module=await modules.get(item.source);
     if(!Object.values(callbacks).flat().some(k=>typeof module[k]==='function'))throw Error('Exporte au moins un callback du cycle de vie.');
     for(const names of Object.values(callbacks))for(const k of names)if(module[k]!=null&&(typeof module[k]!=='function'||module[k].constructor.name==='AsyncFunction'))throw Error(k+' doit être une fonction synchrone.');
     const entry={...item,module,entity:ctx.entities[item.entityIndex],component:{enabled:item.enabled},fields:safe(item.awakened||item.started?item.fields:{...(module.fields||{}),...item.values}),active:false,failed:false,delta:0};bind(entry);entries.push(entry);
    }
   }else{
    ctx=payload;readonlyEntities=readonly(clone(ctx.entities));elapsed+=type==='update'?payload.dt:0;fixed+=type==='update'?payload.dt:0;
    for(const entry of entries){const incoming=ctx.entities.find(e=>e.id===entry.entity.id);if(!incoming||incoming.id!==entry.entity.id||!ctx.enabled[entry.index]){dispose(entry);continue}entry.entity=incoming;entry.component.enabled=ctx.enabled[entry.index].enabled;entry.delta=payload.dt;bind(entry)}
    const live=entries.filter(e=>!e.destroyed);
    if(type==='stop')for(const e of live)dispose(e);
    else if(type==='late')for(const e of live)run(e,'LateUpdate');
    else{
     for(const e of live)activation(e);for(const e of live)start(e);
     while(fixed>=.02-1e-8){fixed-=.02;for(const e of live){e.delta=.02;run(e,'FixedUpdate')}}
     for(const e of live){e.delta=payload.dt;run(e,'Update')}
    }
   }
   send({id,ok:true,commands,states:entries.map(e=>({index:e.index,fields:safe(e.fields),started:!!e.started,awakened:!!e.awakened,error:e.error||''}))});
  }catch(error){send({id,ok:false,error:String(error.message||error).slice(0,1000)})}
 });
 send({ready:true});
}
