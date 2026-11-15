// Editor debugger state is intentionally separate from the game's pause/win state.
export const blueprintDebugger={paused:false,step:false,current:null,skip:null,reason:'',revision:0};
export function resetBlueprintDebugger(){Object.assign(blueprintDebugger,{paused:false,step:false,current:null,skip:null,reason:'',revision:blueprintDebugger.revision+1})}
export function pauseBlueprint(){blueprintDebugger.paused=true;blueprintDebugger.reason='Pause manuelle';blueprintDebugger.revision++}
export function resumeBlueprint(){const d=blueprintDebugger;d.skip=d.current?{job:d.current.job,index:d.current.index}:null;d.paused=false;d.step=false;d.reason='';d.revision++}
export function stepBlueprint(){if(!blueprintDebugger.paused)return;resumeBlueprint();blueprintDebugger.paused=true;blueprintDebugger.step=true}
export function blueprintLocation(job,action,owner){return {job,index:job.index,objectId:job.objectId,sequenceKey:job.sequenceKey,nodeId:action?._nodeId||null,type:action?.type||'fin',functionId:job.frames?.at(-1)?.id||null,stack:(job.frames||[]).map(f=>({id:f.id,parameters:structuredClone(f.parameters),locals:structuredClone(f.locals)})),locals:structuredClone(job.frames?.at(-1)?.locals||owner?.sequenceLocal||{})}}
export function beforeBlueprintAction(job,action,owner,{graph}={}){
 // Breakpoints are authoring metadata, never a reason to suspend a shipped game.
 // Keep them in the project so reopening it in the editor retains debugging.
 if(globalThis.__WARLIKE_BUILD__===true)return false;
 const d=blueprintDebugger,location=blueprintLocation(job,action,owner),skip=d.skip?.job===job&&d.skip.index===job.index;
 if(skip)d.skip=null;
 if(d.paused&&!d.step)return true;
 // Pending jobs hold compiled copies. Read live graph metadata so adding or
 // removing a breakpoint during Play also affects those already queued jobs.
 const node=action?._nodeId&&graph?.nodes?.find(n=>n.id===action._nodeId);
 const breakpoint=node?node.breakpoint===true:action?.breakpoint;
 if(breakpoint&&!skip&&!d.step){d.paused=true;d.reason='Point d’arrêt';d.current=location;d.revision++;return true}
 d.current=location;return false;
}
export function afterBlueprintAction(job,owner){
 if(globalThis.__WARLIKE_BUILD__===true)return false;
 const d=blueprintDebugger;if(!d.step)return false;d.step=false;d.paused=true;d.reason='Pas à pas';d.current=blueprintLocation(job,job.steps[job.index],owner);d.revision++;return true;
}
