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
 const tick=document.getElementById('csharpRuntimeTick'),template=document.getElementById('csharpRuntimeTemplate');
 if(!dialog||!button||!close||!status||!connect||!sync||!tick||!template)return;
 const announce=(message,ok=false)=>{status.textContent=message;status.dataset.ok=String(ok)};
 const buttons=()=>{sync.disabled=!ui.connected||state.playing;tick.disabled=!ui.connected||!ui.ready||state.playing};
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
 tick.addEventListener('click',async()=>{
  if(state.playing||!ui.ready)return;
  announce('Simulation d’une étape C#…');
  try{
   const result=await request('/tick','POST',{dt:1/60});
   if(!result.ok||!Array.isArray(result.actors))throw Error('Réponse invalide du runtime');
   if(state.playing)throw Error('Play activé entre-temps. Arrête Play pour appliquer le résultat C#.');
   let applied=0;
   for(const a of result.actors){
    const target=state.entities.find(o=>o.id===a.id);
    if(!target||![a.x,a.y,a.elevation3d,a.rotation].every(Number.isFinite))continue;
    target.x=a.x;target.y=a.y;target.elevation3d=a.elevation3d;target.rotation=a.rotation;
    if(Number.isFinite(a.hp)){target.hp=a.hp;if(target.stats)target.stats.health=a.hp}
    applied++;
   }
   if(applied)record('C# Runtime : étape 1/60 s');
   notify();announce('Étape C# exécutée : '+applied+' acteurs mis à jour.',true);
  }catch(error){announce('Erreur C# : '+error.message)}
 });
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
 buttons();
}
