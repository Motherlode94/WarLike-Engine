import {setAnimatorParameter,setAnimatorTrigger,resetAnimatorTrigger,playAnimatorState} from './animator-graph.js';
import {compileGDScript,compileWarScript,createWarScriptInstance,warScriptBuiltin,warScriptValue} from '../../script-editor/warscript.js';
import {ScriptLifecycle} from './script-lifecycle.js';
import {resolveInputKeys} from './input-actions.js';
import {damage,ensureStats,setHealth} from './gameplay-components.js';
import {adventureTarget} from './adventure-runtime.js';
import {queueSequenceInteraction} from './logic-sequences.js';
import {setVehicleEngine,setVehicleGear,repairVehicle,refuelVehicle} from './vehicle-components.js';
import {castHeroPower,ensureHeroState} from './superhero-runtime.js';
import {moveBody2d} from './physics-2d.js';
import {moveBody3d} from './collision-3d.js';
export const warScriptSource=(component,project)=>project?.scripts?.find(s=>s.id===component.scriptId&&['warscript','gdscript'].includes(s.language))?.source??component.source;
export const compileAttachedScript=(component,project)=>{const record=project?.scripts?.find(s=>s.id===component.scriptId);const gd=record?record.language==='gdscript':/\.gd$/i.test(component.name||'');return (gd?compileGDScript:compileWarScript)(warScriptSource(component,project));};
export function inspectWarScripts(entities,project){
 const issues=[];let total=0;
 for(const entity of entities||[]){if(!Array.isArray(entity.warScripts)&&entity.warScripts!=null){issues.push({severity:'error',entityId:entity.id,message:'Liste WarScript invalide.'});continue}
  const ids=new Set();for(const component of entity.warScripts||[]){
   if(component?.enabled===false)continue;total++;
   const add=message=>issues.push({severity:'error',entityId:entity.id,message:(entity.name||'#'+entity.id)+' · '+(component?.name||'WarScript')+' : '+message});
   if(!component||typeof component.scriptId!=='string'||ids.has(component.scriptId)){add('Référence de script absente ou dupliquée.');continue}ids.add(component.scriptId);
   const program=compileAttachedScript(component,project);
   if(!program.ok){for(const d of program.diagnostics)add(d.line+':'+d.column+' · '+d.message);continue}
   try{createWarScriptInstance(program,{read(){throw Error('Valeur initiale inconnue.');},call:warScriptBuiltin},{values:component.values||{}})}catch(error){add(error.message)}
  }
 }
 if(total>64)issues.push({severity:'error',entityId:null,message:'64 composants WarScript actifs maximum par scène.'});return issues;
}
const numeric=value=>{if(typeof value!=='number'||!Number.isFinite(value)||Math.abs(value)>1e8)throw Error('Nombre fini entre −100 000 000 et 100 000 000 attendu.');return value};
const key=value=>{if(typeof value!=='string'||!value||value.length>80||['constructor','prototype','__proto__'].includes(value))throw Error('Nom de variable ou de signal invalide.');return value};
const bounded=(value,min,max)=>Math.min(max,Math.max(min,numeric(value)));
export function createScriptApi(entity,ctx,clock,component){
 const three=ctx.mode==='3d',position=()=>({x:entity.x/64,y:three?Number(entity.elevation3d||0):entity.y/64,z:three?entity.y/64:0});
 const config={
  'vehicle.maxSpeed':['maxSpeed',0,10000],'vehicle.acceleration':['acceleration',0,10000],'vehicle.brakeForce':['brakeForce',0,10000],'vehicle.turnRate':['turnRate',0,2000],
  'controller.walkSpeed':[three?'controller3d':'controller2d','walkSpeed',0,three?100:10000],'controller.sprintSpeed':[three?'controller3d':'controller2d','sprintSpeed',0,three?100:10000],'controller.jumpForce':['controller3d','jumpForce',0,100],'controller.gravity':['controller3d','gravity',0,200],'controller.jumpSpeed':['controller2d','jumpSpeed',0,10000],
  'world.timeScale':['survivalWorld','timeScale',0,3600]
 };
 const read=name=>{
  if(name==='collision.otherId'||name==='trigger.otherId')return component?.runtime?.physicsContact?.kind===name.split('.')[0]?component.runtime.physicsContact.otherId:0;
  if(name==='collision.otherName'||name==='trigger.otherName')return component?.runtime?.physicsContact?.kind===name.split('.')[0]?component.runtime.physicsContact.otherName:'';
  if(name==='Time.deltaTime')return clock.delta;if(name==='Time.fixedDeltaTime')return .02;if(name==='Time.time')return clock.elapsed;
  if(name==='transform.position')return position();if(name.startsWith('transform.position.'))return position()[name.at(-1)];
  if(name.startsWith('transform.rotation.'))return Number(entity[{x:'rotationX3d',y:three?'rotation':'rotationY3d',z:three?'rotationZ3d':'rotation'}[name.at(-1)]]||0);
  if(name==='enabled')return component?.enabled!==false;if(name==='isActiveAndEnabled')return component?.enabled!==false&&entity.enabled!==false;
  if(name==='gameObject.activeSelf')return entity.enabled!==false;
  if(name==='gameObject.name')return String(entity.name||'');if(name==='gameObject.active')return entity.enabled!==false;
  if(name==='health.max')return Number(entity.stats?.maxHealth??entity.maxHp??100);
  if(name==='health.isDead')return Number(entity.stats?.health??entity.hp??100)<=0;
  if(name==='health')return Number(entity.stats?.health??entity.hp??100);
  if(name==='light.intensity')return Number(entity.lightIntensity??1);if(name==='light.enabled')return entity.lightEnabled!==false;
  if(name==='controller.isGrounded')return (three?entity.grounded3d:entity.grounded2d)===true;
  if(name==='vehicle.fuel')return Number(entity.vehicleSystems?.fuel?.amount??0);
  if(name==='vehicle.health')return Number(entity.vehicleSystems?.engine?.health??0);
  if(name==='vehicle.hasDriver')return entity.vehicleSystems?.seats?.driverId!=null;
  if(name==='flight.active')return entity.heroState?.flight===true;
  if(name==='flight.speed')return Number(entity.superhero?.flightSpeed??0);
  if(name==='flight.altitude')return three?Number(entity.elevation3d??0):0;
  if(name==='camera.collision')return entity.cameraRig?.collision!==false;
  if(name==='camera.sensitivity')return Number(entity.cameraRig?.sensitivity??.0026);
  if(name==='camera.followSharpness')return Number(entity.cameraRig?.followSharpness??10);
  if(name==='camera.mode')return String(entity.cameraRig?.mode||'thirdPerson');
  if(name==='camera.distance'||name==='camera.height')return Number(entity.cameraRig?.[name.slice(7)]??(name==='camera.distance'?4:.75));
  const cfg=config[name];if(cfg)return Number((cfg.length===3?entity[cfg[0]]:entity[cfg[0]]?.[cfg[1]])??0);
  throw Error('Propriété inconnue : '+name);
 };
 const write=(name,value)=>{
  if(name==='transform.position'){warScriptValue('Vector3',value);const x=numeric(value.x),y=numeric(value.y),z=numeric(value.z);entity.x=x*64;if(three){entity.elevation3d=y;entity.y=z*64}else entity.y=y*64;return}
  if(name.startsWith('transform.position.')){const p=position();p[name.at(-1)]=numeric(value);write('transform.position',p);return}
  if(name.startsWith('transform.rotation.')){entity[{x:'rotationX3d',y:three?'rotation':'rotationY3d',z:three?'rotationZ3d':'rotation'}[name.at(-1)]]=numeric(value);return}
  if(name==='enabled'){warScriptValue('bool',value);if(!component)throw Error('Composant de script absent.');component.enabled=value;return}
  if(name==='gameObject.active'||name==='gameObject.activeSelf'){warScriptValue('bool',value);entity.enabled=value;return}
  if(name==='health'){const hp=bounded(value,0,Number(entity.stats?.maxHealth??100));entity.hp=hp;if(entity.stats)entity.stats.health=hp;return}
  if(name==='light.intensity'){entity.lightIntensity=bounded(value,0,50);return}
  if(name==='light.enabled'){warScriptValue('bool',value);entity.lightEnabled=value;return}
  if(name==='flight.speed'){if(!entity.superhero||entity.superhero.enabled===false)throw Error('Composant de vol absent.');entity.superhero.flightSpeed=bounded(value,.5,30);return}
  if(['camera.collision','camera.sensitivity','camera.followSharpness'].includes(name)){if(!three||!entity.cameraRig)throw Error('Camera Rig 3D absent.');if(name==='camera.collision'){warScriptValue('bool',value);entity.cameraRig.collision=value}else entity.cameraRig[name.slice(7)]=name==='camera.sensitivity'?bounded(value,.0005,.02):bounded(value,1,30);return}
  if(name.startsWith('camera.')){if(!three||!entity.cameraRig)throw Error('Camera Rig 3D absent.');if(name==='camera.mode'){if(!['firstPerson','thirdPerson'].includes(value))throw Error('Mode caméra invalide.');entity.cameraRig.mode=value;return}if(name==='camera.distance'||name==='camera.height'){entity.cameraRig[name.slice(7)]=bounded(value,name==='camera.height'?-10:.1,100);return}}
  if(name==='controller.isGrounded')throw Error('État du sol en lecture seule.');
  if(three&&name==='controller.jumpSpeed'||!three&&['controller.jumpForce','controller.gravity'].includes(name))throw Error('Propriété incompatible avec la dimension.');
  const cfg=config[name];if(cfg){if(cfg.length===3)entity[cfg[0]]=bounded(value,cfg[1],cfg[2]);else{if(!entity[cfg[0]])throw Error('Composant absent : '+cfg[0]);entity[cfg[0]][cfg[1]]=bounded(value,cfg[2],cfg[3])}return}
  throw Error('Propriété non modifiable : '+name);
 };
 const call=(name,args)=>{
  if(name==='Interaction.FindTarget'||name==='Interaction.Use'){if(args.length)throw Error('Interaction attend zéro argument.');const target=adventureTarget(entity,ctx.entities,{mode:ctx.mode});return name==='Interaction.FindTarget'?target?.id??0:!!target&&queueSequenceInteraction(entity.id,target.id)}
  if(['Vehicle.SetEngine','Vehicle.SetGear','Vehicle.Repair','Vehicle.Refuel'].includes(name)){if(args.length!==1||!entity.vehicleSystems)throw Error('Vehicle Systems et un argument requis.');if(name==='Vehicle.SetEngine'){warScriptValue('bool',args[0]);return setVehicleEngine(entity,args[0])}const amount=numeric(args[0]);if(name==='Vehicle.SetGear')return setVehicleGear(entity,amount);return (name==='Vehicle.Repair'?repairVehicle:refuelVehicle)(entity,Math.max(0,amount))}
  if(name==='Vehicle.Drive'||name==='Aircraft.Pilot'||name==='Vehicle.ReleaseControls'){
   if(name==='Vehicle.ReleaseControls'){if(args.length)throw Error('ReleaseControls attend zéro argument.');delete entity._warDrive;delete entity._warAircraft;return true}
   if(!three||entity.vehicleSystems?.seats?.driverId==null)return false;
   if(name==='Vehicle.Drive'){if(args.length!==3||!entity.groundVehiclePhysics?.enabled||entity.aircraftPhysics?.enabled)throw Error('Vehicle.Drive attend throttle, steer, brake sur un véhicule terrestre physique.');entity._warDrive={throttle:bounded(args[0],-1,1),steer:bounded(args[1],-1,1),brake:bounded(args[2],0,1)};return true}
   if(args.length!==5||!entity.aircraftPhysics?.enabled)throw Error('Aircraft.Pilot attend throttle, pitch, roll, yaw, collective.');entity._warAircraft={throttle:bounded(args[0],0,1),pitch:bounded(args[1],-1,1),roll:bounded(args[2],-1,1),yaw:bounded(args[3],-1,1),collective:bounded(args[4],0,1)};return true
  }
  if(name==='Flight.SetActive'){if(args.length!==1||!entity.superhero||entity.superhero.enabled===false)throw Error('Composant de vol et booléen requis.');warScriptValue('bool',args[0]);if(ensureHeroState(entity).flight===args[0])return true;return castHeroPower(entity,'flight',{...ctx,player:entity}).ok===true}
  if(name.startsWith('Animator.')){const method=name.slice(9);if(!entity.animatorGraph)throw Error('Composant Animator absent.');if(method==='Play'){if(args.length<1||args.length>2||typeof args[0]!=='string'||args.length===2&&!Number.isFinite(args[1]))throw Error('Animator.Play attend un état et une durée facultative.');if(!playAnimatorState(entity,args[0],args[1]))throw Error('État Animator absent : '+args[0]);return null;}if(['SetTrigger','ResetTrigger'].includes(method)){if(args.length!==1)throw Error(method+' attend un nom de paramètre.');const accepted=(method==='SetTrigger'?setAnimatorTrigger:resetAnimatorTrigger)(entity,key(args[0]));if(!accepted)throw Error('Trigger Animator invalide.');return null;}const valid=method==='SetBool'?typeof args[1]==='boolean':method==='SetInteger'?Number.isInteger(args[1]):method==='SetFloat'&&typeof args[1]==='number'&&Number.isFinite(args[1]);if(args.length!==2||!valid||!setAnimatorParameter(entity,key(args[0]),args[1]))throw Error('Paramètre Animator ou type incompatible.');return null;}
  if(name==='gameObject.SetActive'){if(args.length!==1)throw Error('SetActive attend un booléen.');write('gameObject.active',args[0]);return null}
  if(name==='Log'||name==='Debug.Log'){if(args.length!==1)throw Error('Log attend une valeur.');ctx.log?.(String(args[0]),'info',entity);return null}
  if(name==='Get'){if(args.length!==1)throw Error('Get attend un nom.');return ctx.globals[key(args[0])]??0}
  if(name==='Set'){if(args.length!==2||!['number','string','boolean'].includes(typeof args[1]))throw Error('Set attend un nom et une valeur simple.');ctx.globals[key(args[0])]=args[1];return null}
  if(name==='Signal'){if(args.length!==1)throw Error('Signal attend un nom.');ctx.signal?.(key(args[0]),entity.id);return null}
  if(name==='Input.GetAxis'){if(args.length!==1||!['Horizontal','Vertical'].includes(args[0]))throw Error('Axe Horizontal ou Vertical attendu.');const keys=resolveInputKeys(entity,ctx.keys||new Set());const has=(...names)=>names.some(k=>keys.has(k));return args[0]==='Horizontal'?Number(has('d','arrowright'))-Number(has('a','q','arrowleft')):Number(has('w','z','arrowup'))-Number(has('s','arrowdown'))}
  if(name==='Input.GetMouseButton'||name==='Input.GetMouseButtonDown'){if(args.length!==1||!Number.isInteger(args[0])||args[0]<0||args[0]>2)throw Error('Bouton souris 0 (gauche), 1 (droit), 2 (milieu) attendu.');return (name==='Input.GetMouseButton'?ctx.mouseHeld:ctx.mousePressed)?.has(args[0])===true}
  if(name==='Input.GetKey'||name==='Input.GetKeyDown'){if(args.length!==1||typeof args[0]!=='string')throw Error('Input attend une touche entre guillemets.');return (name==='Input.GetKey'?ctx.keys:ctx.pressedKeys)?.has(args[0].toLowerCase())||false}
  if(name==='Move'||name==='transform.Translate'){if(args.length!==3)throw Error('Move attend x, y, z en mètres.');const [x,y,z]=args.map(numeric);if(three)moveBody3d(entity,x*64,z*64,y*64,ctx.entities);else moveBody2d(entity,x*64,y*64,ctx.entities);return null}
  if(name==='Rotate'||name==='transform.Rotate'){if(args.length===1){entity.rotation=Number(entity.rotation||0)+numeric(args[0]);return null}if(args.length!==3)throw Error('Rotate attend un angle, ou x, y, z.');for(const [i,axis] of ['x','y','z'].entries())write('transform.rotation.'+axis,read('transform.rotation.'+axis)+numeric(args[i]));return null}
  if(name==='SetVisible'){if(args.length!==1)throw Error('SetVisible attend un booléen.');warScriptValue('bool',args[0]);entity.visible=args[0];return null}
  if(['Health.TakeDamage','Health.Heal','Health.SetMax'].includes(name)){if(args.length!==1)throw Error('Health attend une valeur.');const amount=bounded(args[0],0,1e8);if(name==='Health.TakeDamage')return damage(entity,amount);if(name==='Health.Heal')return setHealth(entity,read('health')+amount);const stats=ensureStats(entity);stats.maxHealth=Math.max(1,amount);return setHealth(entity,stats.health);}
  if(name==='SetLight'||name==='SetHealth'){if(args.length!==1)throw Error(name+' attend une valeur.');write(name==='SetLight'?'light.enabled':'health',args[0]);return null}
  return warScriptBuiltin(name,args);
 };
 return {read,write,call};
}
export class WarScriptRuntime {
 constructor(){this.instances=new Map();this.elapsed=0;this.fixed=0;this.context=null;this.errors=[]}
 report(entry,error){entry.failed=true;entry.component.runtime.error=(entry.component.name||'WarScript')+':'+(error.line||1)+':'+(error.column||1)+' · '+error.message;this.errors.push(entry.component.runtime.error);if(this.errors.length>64)this.errors.shift();this.context?.log?.(entry.component.runtime.error,'error',entry.entity)}
 invoke(entry,method,cleanup=false){if(entry.failed&&!cleanup)return;try{entry.instance.run(method);entry.component.runtime.fields=structuredClone(entry.instance.fields)}catch(error){this.report(entry,error)}}
 phase(entry,method){try{if(method==='activation')entry.lifecycle.refresh();else if(method)entry.lifecycle.run(method);else entry.lifecycle.start()}catch(error){this.report(entry,error)}}
 sync(ctx){
  this.context=ctx;const live=new Set();let total=0;
  for(const entity of ctx.entities)for(const component of entity.warScripts||[]){live.add(component);let entry=this.instances.get(component);if(component.enabled!==false&&++total>64)break;if(entry){Object.assign(entry.context,ctx);continue;}
   const clock={delta:0,elapsed:this.elapsed};entry={entity,component,clock,context:{...ctx},failed:false};entry.attached=()=>entry.context.entities.includes(entity)&&entity.warScripts?.includes(component);component.runtime??={started:false,fields:{},error:''};component.runtime.error='';
   try{const program=compileAttachedScript(component,ctx.project);if(!program.ok)throw Error('WarScript invalide : '+program.diagnostics.map(d=>d.line+':'+d.column+' '+d.message).join(' ; '));entry.instance=createWarScriptInstance(program,createScriptApi(entity,entry.context,clock,component),{values:component.values||{},saved:component.runtime.started||component.runtime.awakened?component.runtime.fields:null});entry.lifecycle=new ScriptLifecycle(entry,(hook,cleanup)=>this.invoke(entry,hook,cleanup));this.instances.set(component,entry);
   }catch(error){this.instances.set(component,entry);this.report(entry,error)}
  }
  for(const [component,entry] of this.instances)if(!live.has(component)){Object.assign(entry.context,ctx);entry.lifecycle?.dispose();this.instances.delete(component)}
 }
 update(dt,ctx){
  const delta=Math.min(.1,Math.max(0,Number(dt)||0));this.elapsed+=delta;this.sync(ctx);this.fixed+=delta;
  for(const entry of this.instances.values())if(entry.lifecycle){entry.clock.elapsed=this.elapsed;entry.clock.delta=delta;this.phase(entry,'activation')}
  for(const entry of this.instances.values())if(entry.lifecycle)this.phase(entry);
  while(this.fixed>=.02-1e-8){this.fixed-=.02;for(const entry of this.instances.values())if(entry.lifecycle){entry.clock.delta=.02;this.phase(entry,'FixedUpdate')}}
  for(const entry of this.instances.values())if(entry.lifecycle){entry.clock.delta=delta;this.phase(entry,'Update')}
 }
 contact(event){
  const hooks={trigger:{enter:'OnTriggerEnter2D',stay:'OnTriggerStay2D',exit:'OnTriggerExit2D'},collision:{enter:'OnCollisionEnter2D',stay:'OnCollisionStay2D',exit:'OnCollisionExit2D'}};
  const method=hooks[event.kind]?.[event.stage];if(!method)return;
  for(const entry of this.instances.values()){
   if(entry.entity.id!==event.ownerId||!entry.lifecycle||entry.failed)continue;
   entry.lifecycle.refresh();if(!entry.lifecycle.active)continue;
   entry.component.runtime.physicsContact={kind:event.kind,otherId:event.otherId,otherName:event.otherName};
   try{this.invoke(entry,method)}finally{delete entry.component.runtime.physicsContact}
  }
 }
 late(){for(const entry of this.instances.values())if(entry.lifecycle)this.phase(entry,'LateUpdate')}
 stop(){for(const entry of this.instances.values())entry.lifecycle?.dispose();this.instances.clear();this.elapsed=0;this.fixed=0;this.context=null;this.errors=[]}
}
export const warScriptRuntime=new WarScriptRuntime();
