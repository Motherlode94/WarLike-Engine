export function nativeScriptEntities(entities,project){
 return entities.map(entity=>{const saved=project?.scripts?.find(s=>s.id===entity.csharpScript?.scriptId&&s.language==='csharp');return saved?{...entity,csharpScript:{...entity.csharpScript,name:saved.name.replace(/\.cs$/i,''),source:saved.source}}:entity});
}
export function nativeScriptSources(entities,project){return [...(project?.scripts||[]).filter(s=>s.language==='csharp').map(s=>({csharpScript:{name:s.name.replace(/\.cs$/i,''),source:s.source}})),...nativeScriptEntities(entities,project)].filter(e=>e.csharpScript?.source?.trim()).map(e=>({name:e.csharpScript.name,source:e.csharpScript.source}))}
