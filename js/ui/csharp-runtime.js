// WarLike C# local bridge controls. C# executes only in a separately started .NET process.
import {state,notify} from '../core/state.js';
import {record} from '../core/history.js';
const base='http://127.0.0.1:8765';
const timeout=4500;
const ui={connected:false,ready:false};
async function request(path,method='GET',payload){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeout);
 try{
  const response=await fetch(base+path,{method,mode:'cors',cache:'no-store',signal:controller.signal,
   ...(payload===undefined?{}:{headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)})});
  const data=await response.json();
  if(!response.ok)throw Error(data.error||'HTTP '+response.status);
  return data;
 }finally{clearTimeout(timer)}
}
const currentScene=()=>({version:5,entities:state.entities.map(o=>structuredClone(o))});
export function initCSharpBridge(){
 const dialog=document.getElementById('csharpRuntimePanel'),button=document.getElementById('openCsharpRuntime');
 const close=document.getElementById('csharpRuntimeClose'),status=document.getElementById('csharpRuntimeStatus');
 const connect=document.getElementById('csharpRuntimeConnect'),sync=document.getElementById('csharpRuntimeSync');
 const tick=document.getElementById('csharpRuntimeTick'),second=document.getElementById('csharpRuntimeSecond'),template=document.getElementById('csharpRuntimeTemplate');
 if(!dialog||!button||!close||!status||!connect||!sync||!tick||!second||!template)return;
 const announce=(message,ok=false)=>{status.textContent=message;status.dataset.ok=String(ok)};
 let busy=false;
 const buttons=()=>{connect.disabled=busy;sync.disabled=busy||!ui.connected||state.playing;tick.disabled=busy||!ui.connected||!ui.ready||state.playing;second.disabled=tick.disabled};
 const show=()=>{button.closest('details')?.removeAttribute('open');dialog.hidden=false;buttons()};
 button.addEventListener('click',show);
 close.addEventListener('click',()=>{dialog.hidden=true;button.focus()});
 connect.addEventListener('click',async()=>{
  announce('Recherche du runtime C# local…');
  try{const health=await request('/health');ui.connected=health.ready===true;ui.ready=false;announce(ui.connected?'Connecté : '+(health.engine||'.NET 8'):'Runtime non prêt',ui.connected)}
  catch(error){ui.connected=false;ui.ready=false;announce('Runtime inaccessible. Démarre : dotnet run --project csharp/WarLike.Bridge — '+error.message)}
  buttons();
 });
 sync.addEventListener('click',async()=>{
  if(state.playing)return;
  announce('Chargement de la scène dans .NET…');
  try{
   const response=await request('/scene','POST',currentScene());
   ui.ready=response.ok===true;
   announce(ui.ready?'Scène synchronisée : '+response.count+' acteurs. Le runtime C# est prêt.':'Import C# refusé',ui.ready);
  }catch(error){ui.ready=false;announce('Import C# : '+error.message)}
  buttons();
 });
 const simulate=async(duration)=>{
  if(busy||state.playing||!ui.ready)return;
  busy=true;buttons();announce('Simulation C# : '+duration+' seconde(s)…');
  try{
   let result;
   const count=duration===1?4:1,dt=duration===1?.25:1/60;
   for(let i=0;i<count;i++)result=await request('/tick','POST',{dt});
   if(!result?.ok||!Array.isArray(result.actors))throw Error('Réponse invalide du runtime');
   if(state.playing)throw Error('Play activé entre-temps. Arrête Play pour appliquer les résultats C#.');
   let applied=0;
   for(const a of result.actors){
    const target=state.entities.find(o=>o.id===a.id);
    if(!target||![a.x,a.y,a.elevation3d,a.rotation].every(Number.isFinite))continue;
    target.x=a.x;target.y=a.y;target.elevation3d=a.elevation3d;target.rotation=a.rotation;
    if(Number.isFinite(a.hp)){target.hp=a.hp;if(target.stats)target.stats.health=a.hp}
    applied++;
   }
   if(applied)record('C# Runtime : '+duration+' s');
   notify();announce('C# .NET : '+applied+' acteurs mis à jour après '+duration+' s.',true);
  }catch(error){announce('Erreur C# : '+error.message)}
  finally{busy=false;buttons()}
 };
 tick.addEventListener('click',()=>simulate(1/60));
 second.addEventListener('click',()=>simulate(1));
 template.addEventListener('click',()=>{
  const text=`using WarLike.Runtime;
using System.Numerics;

// Exemple : ajouter ce composant dans un projet .NET qui référence WarLike.Runtime.
public sealed class MyMovement : WarLikeBehaviour
{
    public float Speed { get; set; } = 2.5f;
    public override void Update(float deltaTime)
    {
        Actor.Position += new Vector3(Speed * deltaTime, 0, 0);
    }
}
`;
  const url=URL.createObjectURL(new Blob([text],{type:'text/plain;charset=utf-8'}));
  const a=document.createElement('a');a.href=url;a.download='MyMovement.cs';a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
 });
 const scriptName=document.getElementById('csharpScriptName');
 const scriptSource=document.getElementById('csharpScriptSource');
 const scriptLoad=document.getElementById('csharpScriptLoad');
 const scriptSave=document.getElementById('csharpScriptSave');
 const scriptExport=document.getElementById('csharpScriptExport');
 const selectedObject=()=>state.entities.find(o=>o.id===state.selected.at(-1));
 const defaultScript=name=>`using WarLike.Runtime;
using System.Numerics;

public sealed class ${name} : WarLikeBehaviour
{
    public float Speed { get; set; } = 2.5f;

    public override void Update(float deltaTime)
    {
        // World units are meters; X and Z are the ground plane.
        Actor.Position += new Vector3(Speed * deltaTime, 0, 0);
    }
}
`;
 const safeName=value=>{
  const trimmed=String(value||'MyBehaviour').replace(/[^a-zA-Z0-9_]/g,'').slice(0,64);
  return /^[a-zA-Z_]/.test(trimmed)?trimmed:'MyBehaviour';
 };
 const loadScript=()=>{
  const object=selectedObject();
  if(!object){announce('Sélectionne d’abord un GameObject.');return}
  const name=safeName(object.csharpScript?.name||object.name+'Behaviour');
  scriptName.value=name;
  scriptSource.value=object.csharpScript?.source||defaultScript(name);
  announce('Script prêt pour '+object.name+'.',true);
 };
 scriptLoad?.addEventListener('click',loadScript);
 scriptSave?.addEventListener('click',()=>{
  const object=selectedObject();
  if(!object||state.playing){announce('Sélectionne un objet et arrête Play avant de modifier un script.');return}
  if(scriptSource.value.length>30000){announce('Script limité à 30 000 caractères.');return}
  object.csharpScript={name:safeName(scriptName.value),source:scriptSource.value};
  record('C# : enregistrer script '+object.csharpScript.name);notify();
  ui.ready=false;buttons();
  announce('Code C# enregistré dans '+object.name+'. Le runtime doit être recompilé pour l’exécuter.',true);
 });
 scriptExport?.addEventListener('click',()=>{
  const source=scriptSource.value;
  if(!source.trim()){announce('Aucun code C# à exporter.');return}
  const url=URL.createObjectURL(new Blob([source],{type:'text/plain;charset=utf-8'}));
  const anchor=document.createElement('a');anchor.href=url;anchor.download=safeName(scriptName.value)+'.cs';anchor.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
 });
 document.addEventListener('warlike:change',()=>{if(dialog.hidden)return;const exists=!!selectedObject();if(scriptSave)scriptSave.disabled=!exists||state.playing});
 buttons();
}
