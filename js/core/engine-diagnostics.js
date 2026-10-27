// WarLike Diagnostics — bounded, runtime-only telemetry. No persistent projects are mutated.
// The reporter consumes real simulation updates and Blueprint events, not guessed success.
export const engineDiagnostics={
 active:false,mode:'2d',frames:0,elapsed:0,averageFps:0,slowFrames:0,
 collisions:0,vehicleEntries:0,vehicleExits:0,blueprintActions:0,
 events:[],warnings:[]
};
const MAX_EVENTS=80,MAX_WARNINGS=30;
const finite=n=>Number.isFinite(Number(n))?Number(n):0;
export function resetEngineDiagnostics(mode='2d'){
 Object.assign(engineDiagnostics,{active:true,mode,frames:0,elapsed:0,averageFps:0,
 slowFrames:0,collisions:0,vehicleEntries:0,vehicleExits:0,blueprintActions:0,events:[],warnings:[]});
}
export function stopEngineDiagnostics(){engineDiagnostics.active=false}
export function tickEngineDiagnostics(dt){
 if(!engineDiagnostics.active)return;
 const step=Math.max(0,Math.min(.25,finite(dt)));
 if(!step)return;
 engineDiagnostics.frames++;
 engineDiagnostics.elapsed+=step;
 if(step>1/30)engineDiagnostics.slowFrames++;
 // Smoothed observed frame rate, not simulated physics tick frequency.
 const fps=1/step;
 engineDiagnostics.averageFps=engineDiagnostics.frames===1?fps:engineDiagnostics.averageFps*.92+fps*.08;
}
export function recordEngineEvent(type,detail=''){
 if(!engineDiagnostics.active)return;
 const kind=String(type||'event').slice(0,45);
 const note=String(detail??'').slice(0,120);
 const entry={time:Math.round(engineDiagnostics.elapsed*100)/100,type:kind,detail:note};
 engineDiagnostics.events.push(entry);
 if(engineDiagnostics.events.length>MAX_EVENTS)engineDiagnostics.events.shift();
 if(kind==='collision')engineDiagnostics.collisions++;
 if(kind==='vehicle-enter')engineDiagnostics.vehicleEntries++;
 if(kind==='vehicle-exit')engineDiagnostics.vehicleExits++;
 if(kind==='blueprint')engineDiagnostics.blueprintActions++;
}
export function recordEngineWarning(message){
 if(!engineDiagnostics.active)return;
 const value=String(message||'Erreur non spécifiée').slice(0,200);
 engineDiagnostics.warnings.push({time:Math.round(engineDiagnostics.elapsed*100)/100,message:value});
 if(engineDiagnostics.warnings.length>MAX_WARNINGS)engineDiagnostics.warnings.shift();
}
export function engineDiagnosticReport({genre='sandbox',entityCount=0,blueprintGlobals={}}={}){
 const globals={};
 for(const [key,value] of Object.entries(blueprintGlobals||{}).slice(0,100)){
  if(['string','number','boolean'].includes(typeof value))globals[key]=value;
 }
 return {
  schema:'warlike.diagnostics.v1',mode:engineDiagnostics.mode,genre,
  durationSeconds:Math.round(engineDiagnostics.elapsed*100)/100,frames:engineDiagnostics.frames,
  averageFps:Math.round(engineDiagnostics.averageFps*10)/10,slowFrames:engineDiagnostics.slowFrames,
  entities:Math.max(0,Math.floor(finite(entityCount))),collisions:engineDiagnostics.collisions,
  vehicleEntries:engineDiagnostics.vehicleEntries,vehicleExits:engineDiagnostics.vehicleExits,
  blueprintActions:engineDiagnostics.blueprintActions,
  fieldLab:genre==='fieldlab'?{
   walk:globals.labWalk===1,interaction:globals.labInteract===1,driving:globals.labDrive===1,
   // Never imply the physical collision test is auto-validated.
   collisionsVerified:false,complete:globals.labCompleted===1
  }:null,globals,events:engineDiagnostics.events.map(e=>({...e})),
  warnings:engineDiagnostics.warnings.map(w=>({...w}))
 };
}
