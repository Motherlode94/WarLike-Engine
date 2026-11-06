import {variableTypes,typedValue,validEntityId} from './blueprint-types.js';
import {actionFields,targetable} from './blueprint-catalog.js';

// Data links never carry control flow. Expressions are serialized and evaluated
// just before an action, so Wait and function calls cannot capture stale values.
export const dataOperations={
 constant:'Valeur',variable:'Lire une variable',entity:'Objet',component:'Composant',property:'Lire une propriété',
 add:'Addition',subtract:'Soustraction',multiply:'Multiplication',divide:'Division',
 vector2:'Vector2',vector3:'Vector3',vectorComponent:'Coordonnée du vecteur',greater:'Supérieur à',equals:'Égal à',and:'ET',not:'NON'
};
const safeKey=key=>typeof key==='string'&&key.length>0&&key.length<=80&&!['__proto__','constructor','prototype'].includes(key);
const scalar=new Set(['add','subtract','multiply','divide','greater']);
const port=(name,type)=>({name,type});
export function dataNodePorts(node){
 const type=variableTypes.includes(node.valueType)?node.valueType:'number';
 if(node.kind==='action'){
  const action=node.action||{};
  const inputs=actionFields(action.type).filter(f=>['number','text','boolean'].includes(f.type)).map(f=>port(f.key,f.key==='value'&&['setVariable','setLocal','returnFunction'].includes(action.type)?action.valueType||'any':f.type==='text'?'string':f.type));
  if(targetable(action.type))inputs.push(port('target','object'));
  return {inputs,outputs:[]};
 }
 if(node.kind==='condition')return {inputs:[port('test','boolean')],outputs:[]};
 if(node.kind!=='data')return {inputs:[],outputs:[]};
 let inputs=[],output=type;
 if(scalar.has(node.op)){inputs=[port('a','number'),port('b','number')];output=node.op==='greater'?'boolean':'number'}
 else if(node.op==='equals'){inputs=[port('a',type),port('b',type)];output='boolean'}
 else if(node.op==='and'){inputs=[port('a','boolean'),port('b','boolean')];output='boolean'}
 else if(node.op==='not'){inputs=[port('value','boolean')];output='boolean'}
 else if(node.op==='vector2'||node.op==='vector3'){inputs=['x','y',...(node.op==='vector3'?['z']:[])].map(n=>port(n,'number'));output=node.op}
 else if(node.op==='vectorComponent'){inputs=[port('value',type==='vector2'?'vector2':'vector3')];output='number'}
 else if(node.op==='entity')output='object';
 else if(node.op==='component'){inputs=[port('object','object')];output='component'}
 else if(node.op==='property')inputs=[port('source',node.sourceType==='component'?'component':'object')];
 return {inputs,outputs:[port('value',output)]};
}
export function inspectDataGraph(graph){
 const issues=[],add=(message,nodeId)=>issues.push({message,nodeId}),nodes=new Map(graph.nodes.map(n=>[n?.id,n])),inputs=new Set(),edges=new Map();
 for(const n of graph.nodes.filter(n=>n?.kind==='data')){
  if(!Object.hasOwn(dataOperations,n.op))add('Opération de données inconnue',n.id);
  if(n.valueType!==undefined&&!variableTypes.includes(n.valueType))add('Type de donnée inconnu',n.id);
  if(n.op==='constant')try{typedValue(n.valueType||'number',n.value)}catch(e){add(e.message,n.id)}
  if(n.op==='variable'&&(!['global','local','parameter'].includes(n.scope||'global')||!safeKey(n.name)))add('Variable de données invalide',n.id);
  if(n.op==='entity'&&!['self','player'].includes(n.role)&&!validEntityId(n.entityId))add('Choisis un objet existant',n.id);
  if(n.op==='property'&&(!safeKey(n.property)||!readableProperties.has(n.property)))add('Propriété non accessible',n.id);
  if(n.op==='component'&&!safeKey(n.componentKind))add('Type de composant requis',n.id);
 }
 for(const e of graph.links.filter(e=>e?.kind==='data')){
  const from=nodes.get(e.from),to=nodes.get(e.to),out=from&&dataNodePorts(from).outputs.find(p=>p.name===e.fromPort),input=to&&dataNodePorts(to).inputs.find(p=>p.name===e.toPort),key=e.to+':'+e.toPort;
  if(!out||!input){add('Port de données absent',e.to);continue}
  if(input.type!=='any'&&input.type!==out.type)add('Connexion incompatible : '+out.type+' → '+input.type,e.to);
  if(inputs.has(key))add('Une seule source par entrée de données',e.to);inputs.add(key);
  const list=edges.get(e.from)||[];list.push(e.to);edges.set(e.from,list);
 }
 const done=new Set(),visiting=new Set();
 function visit(id){if(visiting.has(id)){add('Boucle de données détectée',id);return}if(done.has(id))return;visiting.add(id);for(const next of edges.get(id)||[])visit(next);visiting.delete(id);done.add(id)}
 for(const id of nodes.keys())visit(id);
 for(const n of graph.nodes.filter(n=>n?.kind==='data'))for(const p of dataNodePorts(n).inputs){
  if(!inputs.has(n.id+':'+p.name))try{typedValue(p.type,n.inputs?.[p.name],p.name)}catch{add('Entrée de données manquante : '+p.name,n.id)}
 }
 return issues;
}
export function canConnectData(graph,edge){return inspectDataGraph({...graph,links:[...graph.links.filter(e=>!(e.kind==='data'&&e.to===edge.to&&e.toPort===edge.toPort)),{...edge,kind:'data'}]}).filter(i=>!/Entrée de données manquante/.test(i.message)&&(i.nodeId===edge.to||/Boucle/.test(i.message))).length===0}
export function compileDataInputs(graph,node){
 const byId=new Map(graph.nodes.map(n=>[n.id,n]));let budget=0;
 const expression=(id,depth=0)=>{
  if(depth>12||++budget>512)throw Error('Expression de données trop complexe.');
  const n=byId.get(id),inputs={};
  for(const p of dataNodePorts(n).inputs){const e=graph.links.find(e=>e.kind==='data'&&e.to===id&&e.toPort===p.name);inputs[p.name]=e?expression(e.from,depth+1):structuredClone(n.inputs?.[p.name])}
  return {$expr:n.op,type:dataNodePorts(n).outputs[0].type,value:structuredClone(n.value),name:n.name,scope:n.scope,role:n.role,entityId:n.entityId,componentKind:n.componentKind,property:n.property,axis:n.axis,inputs};
 };
 const action={},conditions=[];
 for(const edge of graph.links.filter(e=>e.kind==='data'&&e.to===node.id)){
  const value=expression(edge.from);
  if(node.kind==='condition')conditions.push({type:'dataBoolean',value});
  else action[edge.toPort==='target'?'targetRef':edge.toPort]=value;
 }
 return {action,conditions};
}
export const readableProperties=new Set(['hp','maxHp','x','y','elevation3d','rotation','enabled','speed','health','regen','armor','damage','fireRate','teamId','fuel','amount','mass','maxSpeed']);
export function resolveObjectReference(reference,scope){
 typedValue('object',reference);const entity=scope.entities?.find(e=>e.id===reference.entityId);
 if(!entity)throw Error('Objet référencé absent : '+reference.entityId);return entity;
}
export function resolveComponentReference(reference,scope){
 typedValue('component',reference);const entity=resolveObjectReference({entityId:reference.entityId},scope);
 const component=entity.csharpComponents?.filter(c=>c.kind===reference.kind)[reference.index||0]||(Object.hasOwn(entity,reference.kind)?entity[reference.kind]:null);
 if(!component||typeof component!=='object')throw Error('Composant absent : '+reference.kind);return component;
}
export function evaluateDataExpression(expr,scope={},depth=0){
 if(depth>12)throw Error('Expression Blueprint trop profonde.');
 const read=(key,type)=>{const v=expr.inputs?.[key],result=v?.$expr?evaluateDataExpression(v,scope,depth+1):structuredClone(v);return type?typedValue(type,result,key):result};
 let result;
 switch(expr.$expr){
  case 'constant':result=expr.value;break;
  case 'variable':{const store={global:scope.globals,local:scope.locals,parameter:scope.parameters}[expr.scope||'global'];if(!safeKey(expr.name)||!store||!Object.hasOwn(store,expr.name))throw Error('Donnée introuvable : '+expr.name);result=store[expr.name];break}
  case 'entity':{const id=expr.role==='self'?scope.owner?.id:expr.role==='player'?scope.player?.id:expr.entityId;result={entityId:id};resolveObjectReference(result,scope);break}
  case 'component':{const object=read('object','object');result={...object,kind:expr.componentKind};resolveComponentReference(result,scope);break}
  case 'property':{if(!readableProperties.has(expr.property))throw Error('Propriété non accessible');const ref=read('source'),source=ref?.kind?resolveComponentReference(ref,scope):resolveObjectReference(ref,scope);result=['hp','health'].includes(expr.property)&&!ref?.kind?(source.stats?.health??source.hp??100):source[expr.property];break}
  case 'vector2':case 'vector3':result=['x','y',...(expr.$expr==='vector3'?['z']:[])].map(k=>read(k,'number'));break;
  case 'vectorComponent':{const v=read('value');if(!Array.isArray(v)||!v.every(Number.isFinite))throw Error('Vecteur attendu');const axis=Number(expr.axis??0);if(!Number.isInteger(axis)||axis<0||axis>=v.length)throw Error('Coordonnée invalide');result=v[axis];break}
  case 'add':result=read('a','number')+read('b','number');break;
  case 'subtract':result=read('a','number')-read('b','number');break;
  case 'multiply':result=read('a','number')*read('b','number');break;
  case 'divide':{const a=read('a','number'),b=read('b','number');if(b===0)throw Error('Division par zéro');result=a/b;break}
  case 'greater':result=read('a','number')>read('b','number');break;
  case 'equals':result=JSON.stringify(read('a'))===JSON.stringify(read('b'));break;
  case 'and':result=read('a','boolean')&&read('b','boolean');break;
  case 'not':result=!read('value','boolean');break;
  default:throw Error('Opération de données inconnue : '+expr.$expr);
 }
 return typedValue(expr.type,result,'Résultat '+expr.$expr);
}
