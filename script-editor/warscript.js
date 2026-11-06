// WarScript v1: a bounded C#-inspired language. No JavaScript code generation.
const types=new Set(['float','int','bool','string','var','Vector3']);
const blocked=new Set(['__proto__','constructor','prototype']);
export const warScriptCalls=['Log','Debug.Log','Move','transform.Translate','Rotate','transform.Rotate','SetVisible','SetLight','SetHealth','Get','Set','Signal','gameObject.SetActive','Input.GetKey','Input.GetKeyDown','Mathf.Sin','Mathf.Cos','Mathf.Abs','Mathf.Min','Mathf.Max','Mathf.Clamp','Vector3'];
const readable=new Set(['Time.deltaTime','Time.fixedDeltaTime','Time.time','transform.position','transform.position.x','transform.position.y','transform.position.z','transform.rotation.x','transform.rotation.y','transform.rotation.z','enabled','isActiveAndEnabled','gameObject.name','gameObject.activeSelf','gameObject.active','health','light.intensity','light.enabled','vehicle.maxSpeed','vehicle.acceleration','vehicle.brakeForce','vehicle.turnRate','controller.walkSpeed','controller.sprintSpeed','controller.jumpSpeed','world.timeScale']);
const writable=new Set([...readable].filter(p=>!p.startsWith('Time.')&&p!=='gameObject.name'&&p!=='isActiveAndEnabled'));
const failure=(token,message)=>Object.assign(Error(message),{line:token?.line||1,column:token?.column||1});
function tokenize(source){
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
  else if((match=/^(?:==|!=|<=|>=|&&|\|\||\+=|-=|\*=|\/=|\+\+|--|[{}();,.=+*/%!<>-])/.exec(rest))){token.kind='symbol';token.value=match[0];advance(match[0])}
  else throw failure(token,'Caractère ou chaîne non reconnu : '+rest[0]);
  tokens.push(token);if(tokens.length>12000)throw failure(token,'Trop de symboles dans ce script.');
 }
 tokens.push({kind:'eof',value:'<fin>',line,column});return tokens;
}
const defaultValue=type=>type==='bool'?false:type==='string'?'':type==='Vector3'?{x:0,y:0,z:0}:0;
export function compileWarScript(source){
 try{
  const tokens=tokenize(source);let cursor=0,depth=0;const fields=[],methods=Object.create(null),peek=()=>tokens[cursor],at=v=>peek().value===v,take=()=>tokens[cursor++];
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
   const token=peek();if(at('if')){take();expect('(');const condition=expression();expect(')');const yes=at('{')?block():[statement()];let no=[];if(at('else')){take();no=at('{')?block():[statement()]}return {kind:'if',condition,yes,no,token}}
   if(at('return')){take();const value=at(';')||at('}')||peek().line>token.line?null:expression();end();return {kind:'return',value,token}}
   if(types.has(peek().value)){const decl=declaration();end();return decl}
   const left=expression();if(['=','+=','-=','*=','/=','++','--'].includes(peek().value)){if(left.kind!=='read')throw failure(token,'Une affectation attend une variable ou une propriété.');const op=take().value,value=['++','--'].includes(op)?{kind:'literal',value:1,token}:expression();end();return {kind:'assign',name:left.name,op,value,token}}
   if(left.kind!=='call')throw failure(token,'Appel de méthode ou affectation attendu.');end();return {kind:'expression',value:left,token};
  }
  let wrapped=false;if(at('class')){take();id();if(at(':'))throw failure(peek(),'Une classe WarScript ne nécessite pas d’héritage.');expect('{');wrapped=true}
  while(peek().kind!=='eof'&&!(wrapped&&at('}'))){
   let exposed=true;while(['public','private','void'].includes(peek().value)){if(take().value==='private')exposed=false}
   if(types.has(peek().value)){const field=declaration();field.public=exposed;fields.push(field);end()}
   else {const name=id();expect('(');expect(')');if(Object.hasOwn(methods,name.value))throw failure(name,'Méthode déjà définie.');methods[name.value]=block()}
  }
  if(wrapped)expect('}');if(peek().kind!=='eof')throw failure(peek(),'Fin du script attendue.');
  if(fields.length>64||Object.keys(methods).length>32)throw failure(peek(),'64 variables et 32 méthodes maximum.');
  const names=new Set();for(const field of fields){if(names.has(field.name)||readable.has(field.name)||Object.hasOwn(methods,field.name))throw failure(field.token,'Variable déjà définie ou réservée : '+field.name);names.add(field.name)}
  function checkExpr(node,scope){if(!node)return;if(node.kind==='read'&&!scope.has(node.name)&&!readable.has(node.name))throw failure(node.token,'Variable ou propriété inconnue : '+node.name);if(node.kind==='call'){if(!warScriptCalls.includes(node.name)&&!Object.hasOwn(methods,node.name))throw failure(node.token,'Méthode inconnue : '+node.name);node.args.forEach(n=>checkExpr(n,scope))}if(node.kind==='binary'){checkExpr(node.left,scope);checkExpr(node.right,scope)}if(node.kind==='unary')checkExpr(node.value,scope)}
  for(const field of fields){checkExpr(field.value,names);const constant=n=>{if(n.kind==='call'&&n.name!=='Vector3')throw failure(n.token,'Une valeur initiale doit être une constante ou un Vector3.');for(const child of [n.left,n.right,n.value,...(n.args||[])])if(child&&typeof child==='object'&&child.kind)constant(child)};constant(field.value);}
  function checkBody(body,scope){for(const node of body){if(node.kind==='declare'){checkExpr(node.value,scope);if(scope.has(node.name)||readable.has(node.name))throw failure(node.token,'Variable déjà définie : '+node.name);scope.add(node.name)}else if(node.kind==='assign'){if(!scope.has(node.name)&&!writable.has(node.name))throw failure(node.token,'Propriété non modifiable ou variable inconnue : '+node.name);checkExpr(node.value,scope)}else if(node.kind==='if'){checkExpr(node.condition,scope);checkBody(node.yes,new Set(scope));checkBody(node.no,new Set(scope))}else checkExpr(node.value,scope)}}
  for(const body of Object.values(methods))checkBody(body,new Set(names));
  const program={ok:true,fields,methods,diagnostics:[]};createWarScriptInstance(program,{read(){throw Error('Variable initialisée avant sa déclaration.');},call:warScriptBuiltin});return program;
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
  if(node.kind==='call'){const args=node.args.map(arg=>evaluate(arg,locals));if(Object.hasOwn(program.methods,node.name)){if(args.length)throw Error('Les méthodes WarScript v1 n’acceptent pas de paramètres.');return invoke(node.name)}return clean(api.call(node.name,args))}
 }catch(error){throw error.line?error:failure(node.token,error.message)}}
 function execute(body,locals){for(const node of body){spend(node.token);try{
  if(node.kind==='declare')locals[node.name]={type:node.type,value:warScriptValue(node.type,evaluate(node.value,locals))};
  else if(node.kind==='assign'){const old=Object.hasOwn(locals,node.name)?locals[node.name].value:Object.hasOwn(fields,node.name)?fields[node.name]:api.read(node.name),v=evaluate(node.value,locals),value=clean(node.op==='='?v:binary(node.op[0],old,v));if(Object.hasOwn(locals,node.name))locals[node.name].value=warScriptValue(locals[node.name].type,value);else if(Object.hasOwn(fields,node.name))fields[node.name]=warScriptValue(fieldTypes[node.name],value);else api.write(node.name,value)}
  else if(node.kind==='if'){const result=execute(evaluate(node.condition,locals)?node.yes:node.no,Object.assign(Object.create(null),locals));if(result)return result}
  else if(node.kind==='return')return {value:node.value?evaluate(node.value,locals):null};
  else evaluate(node.value,locals);
 }catch(error){throw error.line?error:failure(node.token,error.message)}}return null}
 function invoke(name){if(++callDepth>8){callDepth--;throw Error('Profondeur de méthodes dépassée (8 appels).');}try{return execute(program.methods[name]||[],Object.create(null))?.value??null}finally{callDepth--}}
 for(const field of program.fields){const value=saved&&Object.hasOwn(saved,field.name)?saved[field.name]:field.public&&Object.hasOwn(values,field.name)?values[field.name]:evaluate(field.value,Object.create(null));fields[field.name]=warScriptValue(field.type,structuredClone(value))}
 return {fields,run(name){budget=4096;return invoke(name)}};
}
export const warScriptTemplate='// WarScript · C# simplifié · rotation en degrés/seconde\npublic float speed = 45;\n\nStart() {\n    Log("WarScript prêt !");\n}\n\nUpdate() {\n    Rotate(speed * Time.deltaTime);\n}\n';

export function warScriptBuiltin(name,args){
 const arities={'Vector3':3,'Mathf.Sin':1,'Mathf.Cos':1,'Mathf.Abs':1,'Mathf.Min':2,'Mathf.Max':2,'Mathf.Clamp':3};
 if(args.length!==arities[name])throw Error('Arguments invalides pour '+name+'.');args.forEach(number);
 switch(name){case 'Vector3':return {x:args[0],y:args[1],z:args[2]};case 'Mathf.Sin':return Math.sin(args[0]);case 'Mathf.Cos':return Math.cos(args[0]);case 'Mathf.Abs':return Math.abs(args[0]);case 'Mathf.Min':return Math.min(...args);case 'Mathf.Max':return Math.max(...args);case 'Mathf.Clamp':return Math.min(args[2],Math.max(args[1],args[0]));default:throw Error('Méthode inconnue : '+name)}
}
