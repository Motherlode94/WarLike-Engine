import {convertCSharpToWarScript} from '../../script-editor/csharp-to-warscript.js';
import {compileWarScript,createWarScriptInstance,warScriptBuiltin} from '../../script-editor/warscript.js';
export function createCSharpWebCopy(entity,project,entities=[entity]){
 const component=entity?.csharpScript;if(!component)throw Error('Script C# absent.');
 const saved=project?.scripts?.find(s=>s.id===component.scriptId&&s.language==='csharp'),source=saved?.source??component.source;
 const result=convertCSharpToWarScript(source);if(!result.ok)throw Error(result.diagnostics.map(d=>d.line+':'+d.column+' · '+d.message).join('\n'));
 if((entity.warScripts||[]).length>=8||entities.reduce((n,e)=>n+(e.warScripts||[]).filter(c=>c.enabled!==false).length,0)>=64)throw Error('Limite de composants WarScript atteinte.');
 // Validate values before changing the scene or allocating a project asset.
 const compiled=compileWarScript(result.source);createWarScriptInstance(compiled,{call:warScriptBuiltin,read(){throw Error('Valeur initiale inconnue.')}},{values:component.values||{}});
 const scriptId='web-copy-'+entity.id+'-'+Date.now().toString(36),name=(component.name||result.className).replace(/\.cs$/i,'')+' · Web';
 const nextEntity=structuredClone(entity),nextProject=structuredClone(project);
 nextProject.scripts??=[];if(nextProject.scripts.length>=64)throw Error('Limite de scripts du projet atteinte.');
 nextProject.scripts.push({id:scriptId,name:name+'.wls',language:'warscript',source:result.source,revision:1,convertedFrom:{language:'csharp',scriptId:component.scriptId||null,source}});
 nextEntity.scripts=[...new Set([...(nextEntity.scripts||[]),scriptId])];nextEntity.warScripts??=[];nextEntity.warScripts.push({scriptId,name,source:result.source,enabled:true,values:structuredClone(component.values||{})});
 nextEntity.csharpScript.enabled=false;nextProject.runtimeBackend='web';
 return {entity:nextEntity,project:nextProject};
}
