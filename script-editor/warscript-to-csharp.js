import {compileWarScript} from './warscript.js';

// WarLike-owned, strict AST-to-C# converter. Untranslatable WarScript APIs
// are errors, never silently rewritten to no-ops.
const csharpKeywords=new Set(('abstract as base bool break byte case catch char checked class const continue decimal default delegate do double else enum event explicit extern false finally fixed float for foreach goto if implicit in int interface internal is lock long namespace new null object operator out override params private protected public readonly ref return sbyte sealed short sizeof stackalloc static string struct switch this throw true try typeof uint ulong unchecked unsafe ushort using virtual void volatile while var').split(' '));
const primitiveTypes=new Set(['float','int','bool','string','Vector3']);
const warnUnsupported=new Set(['world.timeScale','vehicle.maxSpeed','vehicle.acceleration','vehicle.brakeForce','vehicle.turnRate','controller.walkSpeed','controller.sprintSpeed','controller.jumpSpeed','light.intensity','light.enabled']);
const readProperties={
 'Time.deltaTime':'Time.deltaTime','Time.fixedDeltaTime':'Time.fixedDeltaTime','Time.time':'Time.time',
 'transform.position':'transform.position','transform.position.x':'transform.position.X','transform.position.y':'transform.position.Y','transform.position.z':'transform.position.Z',
 'transform.rotation.x':'transform.eulerAngles.X','transform.rotation.y':'transform.eulerAngles.Y','transform.rotation.z':'transform.eulerAngles.Z',
 'enabled':'enabled','isActiveAndEnabled':'isActiveAndEnabled','gameObject.activeSelf':'gameObject.activeSelf','gameObject.active':'gameObject.activeSelf','gameObject.name':'gameObject.name','health':'Actor.Health'
};
const propertyWrites={
 'transform.position':'transform.position','enabled':'enabled','gameObject.active':'gameObject.SetActive','gameObject.activeSelf':'gameObject.SetActive','health':'Actor.Health'
};
const mathCalls={
 'Mathf.Sin':'MathF.Sin','Mathf.Cos':'MathF.Cos','Mathf.Abs':'MathF.Abs',
 'Mathf.Min':'MathF.Min','Mathf.Max':'MathF.Max','Mathf.Clamp':'Math.Clamp'
};
const validIdent=(name)=>/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)&&!csharpKeywords.has(name)&&!['MonoBehaviour','Actor','World','transform','gameObject','name','enabled','Time','Debug','Input','Animator','Vector3','MathF','Math'].includes(name);
const escapeString=s=>JSON.stringify(s).replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
const typeName=t=>t==='Vector3'?'Vector3':t;
const diagnostic=(node,message)=>({severity:'error',line:node?.token?.line||1,column:node?.token?.column||1,message});
export function convertWarScriptToCSharp(source,{className='ConvertedWarScript'}={}){
 const ast=compileWarScript(source);
 if(!ast.ok)return {ok:false,source:'',className:null,diagnostics:ast.diagnostics};
 const errors=[];
 const fail=(node,message)=>{errors.push(diagnostic(node,message));return '/* conversion impossible */'};
 if(!validIdent(className))return {ok:false,source:'',className:null,diagnostics:[{severity:'error',line:1,column:1,message:'Nom de classe C# invalide : '+className}]};
 const fields=new Map(ast.fields.map(f=>[f.name,f.type]));
 const methods=new Set(Object.keys(ast.methods));
 for(const name of [...fields.keys(),...methods]){
  if(!validIdent(name))errors.push({severity:'error',line:1,column:1,message:'Identifiant non compatible C# : '+name});
 }
 const read=(node,scope)=>{
  if(scope.has(node.name)||fields.has(node.name))return node.name;
  if(warnUnsupported.has(node.name))return fail(node,'API WarScript sans équivalent C# natif garanti : '+node.name);
  return readProperties[node.name]||fail(node,'Propriété WarScript non convertible : '+node.name);
 };
 const expr=(node,scope,context='value')=>{
  if(!node)return '';
  switch(node.kind){
   case 'literal':{
    if(typeof node.value==='string')return escapeString(node.value);
    if(typeof node.value==='boolean')return String(node.value);
    if(typeof node.value==='number')return Number.isInteger(node.value)?String(node.value):String(node.value)+'f';
    return fail(node,'Littéral inconnu');
   }
   case 'read':return read(node,scope);
   case 'unary':return '('+node.op+expr(node.value,scope)+')';
   case 'binary':return '('+expr(node.left,scope)+' '+node.op+' '+expr(node.right,scope)+')';
   case 'call':{
    const a=node.args.map(n=>expr(n,scope));
    if(node.name==='Vector3'){
     if(a.length!==3)return fail(node,'Vector3 nécessite trois arguments');
     return 'new Vector3('+a.join(', ')+')';
    }
    if(Object.hasOwn(mathCalls,node.name))return mathCalls[node.name]+'('+a.join(', ')+')';
    if(node.name==='Input.GetKey'||node.name==='Input.GetKeyDown')return node.name+'('+a.join(', ')+')';
    if(methods.has(node.name)){
     if(context!=='statement')return fail(node,'Une méthode WarScript personnalisée ne retourne pas de valeur : '+node.name);
     return node.name+'('+a.join(', ')+')';
    }
    if(node.name==='Log'||node.name==='Debug.Log')return 'Debug.Log('+a.join(', ')+')';
    if(node.name==='Move'||node.name==='transform.Translate'){
     if(a.length!==3)return fail(node,'Move attend trois arguments');
     return 'transform.Translate('+a.join(', ')+')';
    }
    if(node.name==='Rotate'||node.name==='transform.Rotate'){
     if(a.length===1)return 'transform.Rotate(0, '+a[0]+', 0)';
     if(a.length===3)return 'transform.Rotate('+a.join(', ')+')';
     return fail(node,'Rotate attend un ou trois arguments');
    }
    if(node.name==='SetHealth'){
     if(a.length!==1)return fail(node,'SetHealth attend une valeur');
     return 'Actor.Health = Math.Clamp('+a[0]+', 0f, Actor.MaxHealth)';
    }
    if(node.name==='gameObject.SetActive')return 'gameObject.SetActive('+a.join(', ')+')';
    if(node.name==='Animator.Play'){
     if(a.length!==1)return fail(node,'Animator.Play avec deuxième argument n’est pas équivalent au runtime C#');
     return 'GetComponent<Animator>()?.Play('+a.join(', ')+')';
    }
    if(/^Animator\.(SetFloat|SetInteger|SetBool|SetTrigger|ResetTrigger)$/.test(node.name))
     return 'GetComponent<Animator>()?.'+node.name.slice(9)+'('+a.join(', ')+')';
    return fail(node,'Appel WarScript non pris en charge par le C# natif : '+node.name);
   }
   default:return fail(node,'Expression WarScript inconnue');
  }
 };
 const write=(node,scope)=>{
  const name=node.name;
  if(scope.has(name)||fields.has(name))return {target:name};
  if(warnUnsupported.has(name))return {target:fail(node,'Écriture sans équivalent natif : '+name)};
  if(name.startsWith('transform.position.')||name.startsWith('transform.rotation.')){
   const axis=name.at(-1).toUpperCase(),field=name.startsWith('transform.position.')?'position':'eulerAngles';
   return {vector:field,axis};
  }
  const mapped=propertyWrites[name];
  if(!mapped)return {target:fail(node,'Propriété non modifiable en C# : '+name)};
  return {target:mapped,method:mapped==='gameObject.SetActive'};
 };
 const statement=(node,scope,indent=2)=>{
  const pad='    '.repeat(indent);
  if(node.kind==='declare'){
   if(!validIdent(node.name))fail(node,'Variable locale C# invalide : '+node.name);
   const value=expr(node.value,scope);
   scope.add(node.name);return pad+typeName(node.type)+' '+node.name+' = '+value+';';
  }
  if(node.kind==='assign'){
   const w=write(node,scope),value=expr(node.value,scope);
   const op=node.op==='++'?'+=':node.op==='--'?'-=':node.op;
   if(w.vector){
    // System.Numerics.Vector3 is a struct and transform.position is a property;
    // a direct transform.position.X = ... would not compile.
    const which=w.vector==='position'?'SetPositionAxis':'SetRotationAxis';
    if(op==='=')return pad+'WarScriptCompat.'+which+'(this, \''+w.axis+'\', '+value+');';
    const current=w.vector==='position'?'transform.position':'transform.eulerAngles';
    const opChar=op.slice(0,-1);
    return pad+'WarScriptCompat.'+which+'(this, \''+w.axis+'\', '+current+'.'+w.axis+' '+opChar+' '+value+');';
   }
   if(w.method){
    if(op!=='=')fail(node,'SetActive nécessite une affectation directe');
    return pad+w.target+'('+value+');';
   }
   return pad+w.target+' '+op+' '+value+';';
  }
  if(node.kind==='expression')return pad+expr(node.value,scope,'statement')+';';
  if(node.kind==='return'){
   if(node.value)fail(node,'Les méthodes WarScript sont void ; return avec valeur non convertible');
   return pad+'return;';
  }
  if(node.kind==='if'){
   const thenScope=new Set(scope),elseScope=new Set(scope);
   const yes=node.yes.map(n=>statement(n,thenScope,indent+1)).join('\n');
   const no=node.no?.length?'\n'+pad+'else {\n'+node.no.map(n=>statement(n,elseScope,indent+1)).join('\n')+'\n'+pad+'}':'';
   return pad+'if ('+expr(node.condition,scope)+') {\n'+yes+'\n'+pad+'}'+no;
  }
  return pad+fail(node,'Instruction inconnue')+';';
 };
 const out=['// Generated by WarLike WarScript → C# converter. Review before native compilation.',
  'using System;','using System.Numerics;','using WarLike.Runtime;','',
  'public sealed class '+className+' : MonoBehaviour','{'];
 for(const f of ast.fields){
  if(f.type==='var'){fail(f,'Les champs var WarScript ne disposent pas de type C# statique. Utilise float/int/bool/string/Vector3.');continue}
  out.push('    '+(f.public?'public':'private')+' '+typeName(f.type)+' '+f.name+' = '+expr(f.value,new Set(fields.keys()))+';');
 }
 if(ast.fields.length)out.push('');
 for(const [name,body] of Object.entries(ast.methods)){
  out.push('    '+(['Awake','Start','Update','FixedUpdate','LateUpdate','OnEnable','OnDisable','OnDestroy'].includes(name)?'private':'public')+' void '+name+'()','    {');
  const scope=new Set(fields.keys());
  for(const n of body)out.push(statement(n,scope));
  out.push('    }','');
 }
 out.push('}');
 return {ok:errors.length===0,source:errors.length?'':out.join('\n'),className,diagnostics:errors};
}
