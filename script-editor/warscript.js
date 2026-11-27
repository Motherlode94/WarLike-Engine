// WarScript v1: a bounded C#-inspired language. No JavaScript code generation.
const types=new Set(['float','int','bool','string','var','Vector3']);
const blocked=new Set(['__proto__','constructor','prototype']);
export const warScriptCalls=['Log','Debug.Log','Move','transform.Translate','Rotate','transform.Rotate','SetVisible','SetLight','SetHealth','Get','Set','Signal','gameObject.SetActive','Animator.Play','Animator.SetFloat','Animator.SetInteger','Animator.SetBool','Animator.SetTrigger','Animator.ResetTrigger','Input.GetKey','Input.GetKeyDown','Mathf.Sin','Mathf.Cos','Mathf.Abs','Mathf.Min','Mathf.Max','Mathf.Clamp','Vector3'];
const readable=new Set(['Time.deltaTime','Time.fixedDeltaTime','Time.time','transform.position','transform.position.x','transform.position.y','transform.position.z','transform.rotation.x','transform.rotation.y','transform.rotation.z','enabled','isActiveAndEnabled','gameObject.name','gameObject.activeSelf','gameObject.active','health','light.intensity','light.enabled','vehicle.maxSpeed','vehicle.acceleration','vehicle.brakeForce','vehicle.turnRate','controller.walkSpeed','controller.sprintSpeed','controller.jumpSpeed','world.timeScale','collision.otherId','collision.otherName','trigger.otherId','trigger.otherName']);
const writable=new Set([...readable].filter(p=>!p.startsWith('Time.')&&!p.startsWith('collision.')&&!p.startsWith('trigger.')&&p!=='gameObject.name'&&p!=='isActiveAndEnabled'));
const failure=(token,message)=>Object.assign(Error(message),{line:token?.line||1,column:token?.column||1});
export function tokenizeWarScript(source){
 if(typeof source!=='string'||source.length>65536)throw failure(null,'WarScript est limité à 64 Ko.');
 const tokens=[];let i=0,line=1,column=1;
 const advance=s=>{for(const c of s){if(c==='\n'){line++;column=1}else column++}i+=s.length};
 while(i<source.length){
  const rest=source.slice(i),token={line,column};let match;
  if((match=/^\s+|^\/\/[^\n]*|^\/\*[\s\S]*?\*\//.exec(rest))){advance(match[0]);continue}
  if(rest.startsWith('/*'))throw failure(token,'Commentaire non terminé.');
  if((match=/^"(?:[^"\\\r\n]|\\["\\nrt])*"/.exec(rest))){token.kind='literal';token.value=JSON.parse(match[0]);advance(match[0])}
  else if((match=/^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?f?/.exec(rest))){token.kind='literal';token.value=Number(match[0].replace(/f$/,''));if(!Number.isFinite(token.value))throw failure(token,'Nombre non fini.');advance(match[0])}
  else if((match=/^[A-Za-z_][A-Za-z_0-9]*/.exec(rest))){token.kind='id';token.value=match[0];if(blocked.has(token.value))throw failure(token,'Identifiant réservé.');advance(match[0])}
  else if((match=/^(?:==|!=|<=|>=|&&|\|\||\+=|-=|\*=|\/=|\+\+|--|[\[\]{}();,:.=+*/%!<>-])/.exec(rest))){token.kind='symbol';token.value=match[0];advance(match[0])}
  else throw failure(token,'Caractère ou chaîne non reconnu : '+rest[0]);
  tokens.push(token);if(tokens.length>12000)throw failure(token,'Trop de symboles dans ce script.');
 }
 tokens.push({kind:'eof',value:'<fin>',line,column});return tokens;
}
const defaultValue=type=>type==='bool'?false:type==='string'?'':type==='Vector3'?{x:0,y:0,z:0}:0;
export function compileWarScript(source){
 try{
  const tokens=tokenizeWarScript(source);let cursor=0,depth=0;const fields=[],methods=Object.create(null),methodSignatures=Object.create(null),peek=()=>tokens[cursor],at=v=>peek().value===v,take=()=>tokens[cursor++];
  const expect=v=>{const token=take();if(token.value!==v)throw failure(token,'« '+v+' » attendu.');return token};
  const id=()=>{const token=take();if(token.kind!=='id'||blocked.has(token.value))throw failure(token,'Identifiant attendu.');return token};
  const path=()=>{const first=id();let name=first.value;while(at('.')){take();name+='.'+id().value}return {...first,name}};
  const end=()=>{if(at(';'))take();else if(!at('}')&&peek().kind!=='eof'&&peek().line===tokens[cursor-1]?.line)throw failure(peek(),'Point-virgule ou nouvelle ligne attendu.');};
  const precedence={'||':1,'&&':2,'==':3,'!=':3,'<':4,'>':4,'<=':4,'>=':4,'+':5,'-':5,'*':6,'/':6,'%':6};
  function expression(min=0){
   if(++depth>40)throw failure(peek(),'Expressions trop imbriquées.');let node,token=peek();
   if(['!','-','+'].includes(token.value)){take();node={kind:'unary',op:token.value,value:expression(7),token}}
   else if(at('(')){take();node=expression();expect(')')}
   else if(token.kind==='literal'){take();node={kind:'literal',value:token.value,token}}
   else if(['true','false'].includes(token.value)){take();node={kind:'literal',value:token.value==='true',token}}
   else {if(at('new'))take();const p=path();node={kind:'read',name:p.name,token:p};if(at('(')){take();const args=[];if(!at(')'))do{if(args.length>=8)throw failure(peek(),'8 arguments maximum.');args.push(expression());if(!at(','))break;take()}while(true);expect(')');node={kind:'call',name:p.name,args,token:p}}}
   while(precedence[peek().value]!==undefined&&precedence[peek().value]>=min){const op=take();node={kind:'binary',op:op.value,left:node,right:expression(precedence[op.value]+1),token:op}}
   depth--;return node;
  }
  function declaration(){const token=take(),name=id().value;return {kind:'declare',type:token.value,name,value:at('=')?(take(),expression()):{kind:'literal',value:defaultValue(token.value),token},token}}
  function block(){if(++depth>40)throw failure(peek(),'Blocs trop imbriqués.');expect('{');const body=[];while(!at('}')){if(peek().kind==='eof')throw failure(peek(),'Bloc non terminé.');body.push(statement())}expect('}');depth--;return body}
  function statement(){
   const token=peek();
   if(at('for')){take();expect('(');let init=null,condition=null,update=null;
    if(!at(';'))init=statement();else take();
    if(!at(';'))condition=expression();expect(';');
    if(!at(')')){const left=path(),op=take();if(!['=','+=','-=','*=','/=','++','--'].includes(op.value))throw failure(op,'Affectation attendue dans for.');update={kind:'assign',name:left.name,op:op.value,value:['++','--'].includes(op.value)?{kind:'literal',value:1,token:op}:expression(),token:left}}expect(')');
    if(init&&!['declare','assign','expression'].includes(init.kind))throw failure(token,'Initialisation for invalide.');
    return {kind:'for',init,condition,update,body:at('{')?block():[statement()],token};
   }
   if(at('break')||at('continue')){take();end();return {kind:token.value,token}}
if(at('while')){take();expect('(');const condition=expression();expect(')');const body=at('{')?block():[statement()];return {kind:'while',condition,body,token}}
   if(at('if')){take();expect('(');const condition=expression();expect(')');const yes=at('{')?block():[statement()];let no=[];if(at('else')){take();no=at('{')?block():[statement()]}return {kind:'if',condition,yes,no,token}}
   if(at('return')){take();const value=at(';')||at('}')||peek().line>token.line?null:expression();end();return {kind:'return',value,token}}
   if(types.has(peek().value)){const decl=declaration();end();return decl}
   const left=expression();if(['=','+=','-=','*=','/=','++','--'].includes(peek().value)){if(left.kind!=='read')throw failure(token,'Une affectation attend une variable ou une propriété.');const op=take().value,value=['++','--'].includes(op)?{kind:'literal',value:1,token}:expression();end();return {kind:'assign',name:left.name,op,value,token}}
   if(left.kind!=='call')throw failure(token,'Appel de méthode ou affectation attendu.');end();return {kind:'expression',value:left,token};
  }
  let wrapped=false,className=null;if(at('public')&&tokens[cursor+1]?.value==='class')take();if(at('class')){take();className=id().value;if(at(':')){take();const parent=path();if(parent.name!=='MonoBehaviour')throw failure(parent,'WarScript accepte uniquement l’héritage MonoBehaviour (API Unity simplifiée).');}expect('{');wrapped=true}else if(className)throw failure(peek(),'Déclaration de classe attendue.');
  while(peek().kind!=='eof'&&!(wrapped&&at('}'))){
   let exposed=true,serialized=false;
   if(at('[')){take();const annotation=id();if(annotation.value!=='SerializeField')throw failure(annotation,'Seul [SerializeField] est pris en charge.');expect(']');serialized=true;}
   while(['public','private'].includes(peek().value)){if(take().value==='private')exposed=false}
   const typed=(types.has(peek().value)||at('void'))&&tokens[cursor+2]?.value==='(';
   if(types.has(peek().value)&&!typed){const field=declaration();field.public=exposed;field.serialized=serialized;fields.push(field);end()}
   else if(serialized)throw failure(peek(),'[SerializeField] est réservé aux champs.');
   else {const returnType=typed?take().value:'void',name=id(),parameters=[];
    if(returnType==='var')throw failure(name,'Le retour de méthode doit avoir un type explicite.');
    expect('(');if(!at(')'))do{const type=take();if(!types.has(type.value)||type.value==='var')throw failure(type,'Type de paramètre explicite attendu.');const param=id();if(parameters.some(p=>p.name===param.value)||parameters.length>=8)throw failure(param,'Paramètre dupliqué ou limite de 8 paramètres.');parameters.push({name:param.value,type:type.value,token:param});if(!at(','))break;take()}while(true);expect(')');
    if(Object.hasOwn(methods,name.value))throw failure(name,'Méthode déjà définie.');
    if(['Awake','Start','Update','FixedUpdate','LateUpdate','OnEnable','OnDisable','OnDestroy','OnCollisionEnter2D','OnCollisionStay2D','OnCollisionExit2D','OnTriggerEnter2D','OnTriggerStay2D','OnTriggerExit2D'].includes(name.value)&&(parameters.length||returnType!=='void'))throw failure(name,'Une méthode de cycle de vie doit être void et sans paramètres.');
    methodSignatures[name.value]={returnType,parameters,explicit:typed};methods[name.value]=block();
   }
  }
  if(wrapped)expect('}');if(peek().kind!=='eof')throw failure(peek(),'Fin du script attendue.');
  if(fields.length>64||Object.keys(methods).length>32)throw failure(peek(),'64 variables et 32 méthodes maximum.');
  const names=new Set();for(const field of fields){if(names.has(field.name)||readable.has(field.name)||Object.hasOwn(methods,field.name))throw failure(field.token,'Variable déjà définie ou réservée : '+field.name);names.add(field.name)}
  function checkExpr(node,scope){if(!node)return;if(node.kind==='read'&&!scope.has(node.name)&&!readable.has(node.name))throw failure(node.token,'Variable ou propriété inconnue : '+node.name);if(node.kind==='call'){if(!warScriptCalls.includes(node.name)&&!Object.hasOwn(methods,node.name))throw failure(node.token,'Méthode inconnue : '+node.name);if(Object.hasOwn(methods,node.name)&&node.args.length!==methodSignatures[node.name].parameters.length)throw failure(node.token,'Nombre de paramètres incorrect : '+node.name);node.args.forEach(n=>checkExpr(n,scope))}if(node.kind==='binary'){checkExpr(node.left,scope);checkExpr(node.right,scope)}if(node.kind==='unary')checkExpr(node.value,scope)}
  for(const field of fields){checkExpr(field.value,names);const constant=n=>{if(n.kind==='call'&&n.name!=='Vector3')throw failure(n.token,'Une valeur initiale doit être une constante ou un Vector3.');for(const child of [n.left,n.right,n.value,...(n.args||[])])if(child&&typeof child==='object'&&child.kind)constant(child)};constant(field.value);}
  function checkBody(body,scope,{loop=false,signature=null}={}){for(const node of body){
   if(node.kind==='declare'){checkExpr(node.value,scope);if(scope.has(node.name)||readable.has(node.name)||Object.hasOwn(methods,node.name))throw failure(node.token,'Variable déjà définie : '+node.name);scope.add(node.name)}
   else if(node.kind==='assign'){if(!scope.has(node.name)&&!writable.has(node.name))throw failure(node.token,'Propriété non modifiable ou variable inconnue : '+node.name);checkExpr(node.value,scope)}
   else if(node.kind==='if'){checkExpr(node.condition,scope);checkBody(node.yes,new Set(scope),{loop,signature});checkBody(node.no,new Set(scope),{loop,signature})}
   else if(node.kind==='while'||node.kind==='for'){const local=new Set(scope);if(node.init)checkBody([node.init],local,{loop,signature});checkExpr(node.condition,local);checkBody(node.body,new Set(local),{loop:true,signature});if(node.update)checkBody([node.update],local,{loop:true,signature})}
   else if(node.kind==='break'||node.kind==='continue'){if(!loop)throw failure(node.token,node.kind+' nécessite une boucle.')}
   else {if(node.kind==='return'&&signature?.explicit&&(signature.returnType==='void'?!!node.value:!node.value))throw failure(node.token,'Retour incompatible avec '+signature.returnType+'.');checkExpr(node.value,scope)}
  }}
  const returns=body=>body.some(n=>n.kind==='return'||n.kind==='if'&&returns(n.yes)&&returns(n.no));
  for(const [name,body] of Object.entries(methods)){const signature=methodSignatures[name],scope=new Set(names);for(const p of signature.parameters){if(scope.has(p.name)||readable.has(p.name)||Object.hasOwn(methods,p.name))throw failure(p.token,'Paramètre réservé ou déjà défini : '+p.name);scope.add(p.name)}checkBody(body,scope,{signature});if(signature.returnType!=='void'&&!returns(body))throw failure(body[0]?.token,'Toutes les branches doivent retourner une valeur : '+name);}
  const program={ok:true,version:2,className,fields,methods,methodSignatures,diagnostics:[]};createWarScriptInstance(program,{read(){throw Error('Variable initialisée avant sa déclaration.');},call:warScriptBuiltin});return program;
 }catch(error){return {ok:false,fields:[],methods:{},diagnostics:[{severity:'error',line:error.line||1,column:error.column||1,message:error.message}]}}
}
function clean(value){if(typeof value==='number'&&!Number.isFinite(value))throw Error('Le résultat numérique doit être fini.');if(typeof value==='string'&&value.length>4096)throw Error('Chaîne limitée à 4096 caractères.');if(value&&typeof value==='object'){if(!['x','y','z'].every(k=>Number.isFinite(value[k])))throw Error('Vector3 invalide.');return {x:value.x,y:value.y,z:value.z}}return value}
export function warScriptValue(type,value){
 clean(value);if(type==='var')return value;
 if(type==='float'&&typeof value==='number'||type==='int'&&Number.isSafeInteger(value)||type==='bool'&&typeof value==='boolean'||type==='string'&&typeof value==='string'||type==='Vector3'&&value&&typeof value==='object')return value;
 throw Error('Valeur incompatible avec '+type+'.');
}
const binary=(op,a,b)=>{const vector=v=>v&&typeof v==='object'&&['x','y','z'].every(k=>Number.isFinite(v[k]));if(['+','-'].includes(op)&&vector(a)&&vector(b))return Object.fromEntries(['x','y','z'].map(k=>[k,binary(op,a[k],b[k])]));if(op==='*'&&vector(b)&&typeof a==='number')[a,b]=[b,a];if(['*','/'].includes(op)&&vector(a)&&typeof b==='number')return Object.fromEntries(['x','y','z'].map(k=>[k,binary(op,a[k],b)]));switch(op){case '+':return clean(typeof a==='string'||typeof b==='string'?String(a)+String(b):number(a)+number(b));case '-':return number(a)-number(b);case '*':return number(a)*number(b);case '/':if(number(b)===0)throw Error('Division par zéro.');return number(a)/b;case '%':if(number(b)===0)throw Error('Modulo par zéro.');return number(a)%b;case '==':return a===b;case '!=':return a!==b;case '<':return number(a)<number(b);case '>':return number(a)>number(b);case '<=':return number(a)<=number(b);case '>=':return number(a)>=number(b)}};
const number=value=>{if(typeof value!=='number'||!Number.isFinite(value))throw Error('Nombre fini attendu.');return value};
export function createWarScriptInstance(program,api,{values={},saved=null}={}){
 if(!program.ok)throw Error(program.diagnostics[0]?.message||'Script invalide.');
 const fields=Object.create(null),fieldTypes=Object.fromEntries(program.fields.map(f=>[f.name,f.type]));let budget=4096,callDepth=0;
 const spend=token=>{if(--budget<0)throw failure(token,'Budget d’exécution dépassé (4096 opérations).')};
 function evaluate(node,locals){spend(node.token);try{
  if(node.kind==='literal')return structuredClone(node.value);
  if(node.kind==='read')return Object.hasOwn(locals,node.name)?locals[node.name].value:Object.hasOwn(fields,node.name)?fields[node.name]:api.read(node.name);
  if(node.kind==='unary'){const v=evaluate(node.value,locals);return node.op==='!'?!v:node.op==='-'?-number(v):number(v)}
  if(node.kind==='binary'){const a=evaluate(node.left,locals);if(node.op==='&&')return !!a&&!!evaluate(node.right,locals);if(node.op==='||')return !!a||!!evaluate(node.right,locals);return clean(binary(node.op,a,evaluate(node.right,locals)))}
  if(node.kind==='call'){const args=node.args.map(arg=>evaluate(arg,locals));if(Object.hasOwn(program.methods,node.name)){return invoke(node.name,args)}return clean(api.call(node.name,args))}
 }catch(error){throw error.line?error:failure(node.token,error.message)}}
 function execute(body,locals){for(const node of body){spend(node.token);try{
  if(node.kind==='declare')locals[node.name]={type:node.type,value:warScriptValue(node.type,evaluate(node.value,locals))};
  else if(node.kind==='assign'){const old=Object.hasOwn(locals,node.name)?locals[node.name].value:Object.hasOwn(fields,node.name)?fields[node.name]:api.read(node.name),v=evaluate(node.value,locals),value=clean(node.op==='='?v:binary(node.op[0],old,v));if(Object.hasOwn(locals,node.name))locals[node.name].value=warScriptValue(locals[node.name].type,value);else if(Object.hasOwn(fields,node.name))fields[node.name]=warScriptValue(fieldTypes[node.name],value);else api.write(node.name,value)}
  else if(node.kind==='if'){const result=execute(evaluate(node.condition,locals)?node.yes:node.no,Object.assign(Object.create(null),locals));if(result)return result}
  else if(node.kind==='while'||node.kind==='for'){const scoped=Object.assign(Object.create(null),locals);if(node.init)execute([node.init],scoped);while(!node.condition||evaluate(node.condition,scoped)){spend(node.token);const result=execute(node.body,Object.assign(Object.create(null),scoped));if(result?.control==='break')break;if(result&&!result.control)return result;if(node.update)execute([node.update],scoped)}}
  else if(node.kind==='break'||node.kind==='continue')return {control:node.kind};
  else if(node.kind==='return')return {value:node.value?evaluate(node.value,locals):null};
  else evaluate(node.value,locals);
 }catch(error){throw error.line?error:failure(node.token,error.message)}}return null}
 function invoke(name,args=[]){if(++callDepth>8){callDepth--;throw Error('Profondeur de méthodes dépassée (8 appels).');}try{
  const signature=program.methodSignatures?.[name],parameters=signature?.parameters||[],locals=Object.create(null);if(args.length!==parameters.length)throw Error('Nombre de paramètres incorrect : '+name);
  parameters.forEach((p,i)=>locals[p.name]={type:p.type,value:warScriptValue(p.type,structuredClone(args[i]))});
  const result=execute(program.methods[name]||[],locals)?.value??null;return signature&&signature.returnType!=='void'?warScriptValue(signature.returnType,result):result;
 }finally{callDepth--}}
 for(const field of program.fields){const value=saved&&Object.hasOwn(saved,field.name)?saved[field.name]:(field.public||field.serialized)&&Object.hasOwn(values,field.name)?values[field.name]:evaluate(field.value,Object.create(null));fields[field.name]=warScriptValue(field.type,structuredClone(value))}
 return {fields,run(name){budget=4096;return invoke(name)}};
}
export const warScriptTemplate='// WarScript · C# simplifié · rotation en degrés/seconde\npublic float speed = 45;\n\nStart() {\n    Log("WarScript prêt !");\n}\n\nUpdate() {\n    Rotate(speed * Time.deltaTime);\n}\n';

export function warScriptBuiltin(name,args){
 const arities={'Vector3':3,'Mathf.Sin':1,'Mathf.Cos':1,'Mathf.Abs':1,'Mathf.Min':2,'Mathf.Max':2,'Mathf.Clamp':3};
 if(args.length!==arities[name])throw Error('Arguments invalides pour '+name+'.');args.forEach(number);
 switch(name){case 'Vector3':return {x:args[0],y:args[1],z:args[2]};case 'Mathf.Sin':return Math.sin(args[0]);case 'Mathf.Cos':return Math.cos(args[0]);case 'Mathf.Abs':return Math.abs(args[0]);case 'Mathf.Min':return Math.min(...args);case 'Mathf.Max':return Math.max(...args);case 'Mathf.Clamp':return Math.min(args[2],Math.max(args[1],args[0]));default:throw Error('Méthode inconnue : '+name)}
}


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


// GDScript compatibility frontend v0.1. The existing bounded interpreter is
// the only execution engine; never evaluate generated JavaScript.
export function compileGDScript(source){
 const fail=(line,message)=>({ok:false,diagnostics:[{severity:'error',line,column:1,message}]});
 if(typeof source!=='string'||source.length>65536)return fail(1,'GDScript limité à 64 Ko.');
 const lines=source.replace(/\r\n?/g,'\n').split('\n'),out=[],map=[],stack=[];let base=null,delta=null,extendsSeen=false;
 const emit=(s,line)=>{out.push(s);map.push(line)};
 const error=(line,message)=>{throw Object.assign(Error(message),{line})};
 const expr=(s,line)=>{
  // Preserve quoted strings; only transform tokens outside strings.
  const parts=s.match(/"(?:[^"\\]|\\.)*"|[^"]+/g)||[];
  if(parts.join('')!==s)error(line,'Chaîne non terminée.');
  return parts.map(p=>p.startsWith('"')?p:p.replace(/\b(and|or|not)\b/g,x=>({and:'&&',or:'||',not:'!'})[x]).replace(/\bPI\b/g,'3.141592653589793').replace(/\bdeg_to_rad\s*\(/g,'WLGdDegToRad(').replace(/\brad_to_deg\s*\(/g,'WLGdRadToDeg(').replace(/\bposition(?=\.|\b)/g,'transform.position').replace(/\bprint\s*\(/g,'Log(').replace(/\b(sin|cos|abs|min|max|clamp)\s*\(/g,x=>'Mathf.'+x.trim().slice(0,x.trim().indexOf('(')).trim().replace(/^./,c=>c.toUpperCase())+'(')).replace(delta?new RegExp('\\b'+delta+'\\b','g'):/\b(?!)\b/g,'Time.deltaTime')).join('');
 };
 const close=(indent,line)=>{while(stack.length&&indent<=stack.at(-1).indent){const b=stack.pop();emit('}',line);if(b.kind==='func'){delta=null;base=null}}};
 try{
 for(let i=0;i<lines.length;i++){const line=i+1,raw=lines[i];if(/^\s*$/.test(raw)||/^\s*#/.test(raw))continue;
  const prefix=raw.match(/^[ \t]*/)[0];if(prefix.includes(' ')&&prefix.includes('\t'))error(line,'Indentation mixte non prise en charge.');
  const indent=prefix.replace(/\t/g,'    ').length;
  let s=raw.slice(prefix.length).replace(/("(?:[^"\\]|\\.)*")|#.*$/g,(m,q)=>q||'').trim();if(!s)continue;
  const previous=stack.at(-1);if(previous&&!previous.body&&indent<=previous.indent)error(line,'Bloc indenté attendu.');
  close(indent,line);
  if(stack.length){const top=stack.at(-1);if(!top.body){top.body=true;top.child=indent}else if(indent!==top.child)error(line,'Indentation inattendue.');}
  if(indent===0){
   if(/^extends\s+(Node|Node2D|Node3D)$/.test(s)){if(extendsSeen||out.length)error(line,'extends doit précéder les déclarations.');extendsSeen=true;continue;}
   let m=/^(@export\s+)?var\s+([A-Za-z_]\w*)\s*(?::\s*(float|int|bool|String|Vector3))?\s*=\s*(.+)$/.exec(s);
   if(m){const [,ex,name,type,value]=m;const inferred=type||(/^(true|false)$/.test(value)?'bool':/^"/.test(value)?'String':/^Vector3\s*\(/.test(value)?'Vector3':/^-?\d+$/.test(value)?'int':'float');emit((ex?'public ':'private ')+(inferred==='String'?'string':inferred)+' '+name+' = '+expr(value,line)+';',line);continue;}
   m=/^func\s+(_ready|_process|_physics_process|_enter_tree|_exit_tree)\s*\(\s*([A-Za-z_]\w*)?\s*(?::\s*float)?\s*\)\s*(?:->\s*void)?\s*:$/.exec(s);
   if(m){const [,name,arg]=m,frame=['_process','_physics_process'].includes(name);if(frame!==!!arg)error(line,'Paramètres du callback incompatibles.');delta=arg||null;emit('void '+({_ready:'Start',_process:'Update',_physics_process:'FixedUpdate',_enter_tree:'Awake',_exit_tree:'OnDestroy'})[name]+'() {',line);stack.push({indent,kind:'func',body:false});continue;}
   error(line,'Déclaration GDScript non prise en charge (extends, var, @export ou callback).');
  }
  if(!stack.length)error(line,'Instruction hors fonction.');
  let m=/^if\s+(.+):$/.exec(s);if(m){emit('if ('+expr(m[1],line)+') {',line);stack.push({indent,kind:'if',body:false});continue;}
  if(s==='pass'){emit('// pass',line);continue;}
  if(s==='return'){emit('return;',line);continue;}
  m=/^rotate_y\s*\((.+)\)$/.exec(s);if(m){emit('Rotate(0, ('+expr(m[1],line)+') * 57.29577951308232, 0);',line);continue;}
  m=/^rotate\s*\((.+)\)$/.exec(s);if(m){emit('Rotate(('+expr(m[1],line)+') * 57.29577951308232);',line);continue;}
  m=/^var\s+([A-Za-z_]\w*)\s*=\s*(.+)$/.exec(s);if(m){emit('var '+m[1]+' = '+expr(m[2],line)+';',line);continue;}
  if(!/^(?:[A-Za-z_]\w*(?:\.[A-Za-z_]\w*)*\s*(?:=|\+=|-=|\*=|\/=)|print\s*\(|Set\s*\(|Signal\s*\(|Move\s*\()/.test(s))error(line,'Instruction non prise en charge dans le profil GDScript v0.1.');
  emit(expr(s,line)+';',line);
 }
 if(stack.some(b=>!b.body))error(lines.length,'Bloc indenté attendu.');close(0,lines.length);
 if(!extendsSeen)return fail(1,'extends Node, Node2D ou Node3D requis.');
 emit('float WLGdDegToRad(float v) { return v * 0.017453292519943295; }',lines.length);
 emit('float WLGdRadToDeg(float v) { return v * 57.29577951308232; }',lines.length);
 const result=compileWarScript(out.join('\n'));
 return {...result,diagnostics:result.diagnostics.map(d=>({...d,line:map[d.line-1]||lines.length}))};
 }catch(e){return fail(e.line||1,e.message);}
}
