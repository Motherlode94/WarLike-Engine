import {compileWarScript,tokenizeWarScript} from './warscript.js';
// Explicit source conversion, NOT a C# compiler or a .NET Web runtime.
// Only the shared, bounded gameplay grammar is accepted; never eval native code.
export function convertCSharpToWarScript(source){
 try{
  const tokens=tokenizeWarScript(source),out=[];
  for(let i=0;i<tokens.length-1;i++){
   const t=tokens[i];
   if(t.kind==='id'&&t.value==='using'){
    let name='';i++;while(i<tokens.length-1&&tokens[i].value!==';')name+=tokens[i++].value;
    if(!['System','System.Numerics','WarLike.Runtime'].includes(name)||tokens[i]?.value!==';')throw Object.assign(Error('Import C# non convertible : '+name),t);
    continue;
   }
   if(t.value==='sealed'&&tokens[i+1]?.value==='class')continue;
   out.push({...t,value:t.kind==='id'&&t.value==='MathF'?'Mathf':t.value});
  }
  for(let i=0;i<out.length;i++){
   if(out[i].value==='Math'&&out[i+1]?.value==='.'&&out[i+2]?.value==='Clamp')out[i].value='Mathf';
   if(out[i].value==='transform'&&out[i+1]?.value==='.'&&['position','eulerAngles'].includes(out[i+2]?.value)){
    if(out[i+2].value==='eulerAngles')out[i+2].value='rotation';
    if(out[i+3]?.value==='.'&&['X','Y','Z'].includes(out[i+4]?.value))out[i+4].value=out[i+4].value.toLowerCase();
   }
  }
  let converted='',line=1;for(const t of out){converted+='\n'.repeat(Math.max(0,t.line-line))+(converted?' ':'')+(t.kind==='literal'&&typeof t.value==='string'?JSON.stringify(t.value):String(t.value));line=t.line;}
  const ast=compileWarScript(converted);if(!ast.ok)return {ok:false,source:'',diagnostics:ast.diagnostics};
  const fail=(node,message)=>{throw Object.assign(Error(message),node.token||{line:1,column:1})};
  if(!ast.className)fail({},'Une classe C# MonoBehaviour explicite est requise.');
  if(ast.fields.some(f=>f.type==='var'))fail({},'Déclare explicitement le type des champs C#.');
  for(const signature of Object.values(ast.methodSignatures))if(!signature.explicit)fail({},'Chaque méthode C# doit déclarer son type de retour.');
  const allowed=new Set(['Debug.Log','transform.Translate','transform.Rotate','gameObject.SetActive','Input.GetKey','Input.GetKeyDown','Mathf.Sin','Mathf.Cos','Mathf.Abs','Mathf.Min','Mathf.Max','Mathf.Clamp','Vector3']);
  const walk=node=>{if(!node||typeof node!=='object')return;if(node.kind==='call'&&!allowed.has(node.name)&&!Object.hasOwn(ast.methods,node.name))fail(node,'API C# non convertible : '+node.name);if((node.kind==='read'||node.kind==='assign')&&/^(?:health|vehicle\.|controller\.|world\.|collision\.|trigger\.|light\.|Animator\.)/.test(node.name))fail(node,'Propriété C# non convertible : '+node.name);for(const [key,value] of Object.entries(node))if(key!=='token')if(Array.isArray(value))value.forEach(walk);else if(value&&typeof value==='object')walk(value)};
  ast.fields.forEach(walk);Object.values(ast.methods).forEach(body=>body.forEach(walk));
  return {ok:true,source:'// Copie WarScript convertie du C# ; original conserve.\n'+converted,diagnostics:[],className:ast.className};
 }catch(error){return {ok:false,source:'',diagnostics:[{severity:'error',line:error.line||1,column:error.column||1,message:error.message}]}}
}
