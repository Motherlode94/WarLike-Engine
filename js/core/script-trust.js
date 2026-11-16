// Trust belongs to this tab and exact executable sources, never to project JSON.
const grants=new Set();
export async function scriptFingerprint(sources){
 const bytes=new TextEncoder().encode(JSON.stringify(sources));
 if(!globalThis.crypto?.subtle)throw Error('La confiance des scripts nécessite HTTPS ou localhost.');
 return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),x=>x.toString(16).padStart(2,'0')).join('');
}
export function revokeScriptTrust(){grants.clear()}
export async function authorizeScripts(sources,{ask=askTrust}={}){
 if(!sources.length)return;
 const fingerprint=await scriptFingerprint(sources);
 if(grants.has(fingerprint))return;
 if(await ask(sources.length)!==true)throw Error('Scripts non autorisés. Le projet est conservé ; autorise ses scripts pour les exécuter.');
 grants.add(fingerprint);
}
function askTrust(count){
 if(!globalThis.document?.createElement)return Promise.resolve(false);
 return new Promise(resolve=>{
  const dialog=document.createElement('dialog');dialog.id='scriptTrustDialog';
  const title=document.createElement('h2');title.textContent='Autoriser les scripts de ce projet ?';
  const text=document.createElement('p');text.textContent=count+' source(s) exécutable(s). Vérifie leur origine avant de continuer. Une modification du code demandera une nouvelle autorisation. Les scripts JS/TS sont isolés du stockage de l’éditeur.';
  const deny=document.createElement('button');deny.textContent='Garder les scripts bloqués';deny.id='scriptTrustDeny';
  const allow=document.createElement('button');allow.textContent='Autoriser ces scripts';allow.id='scriptTrustAllow';
  const finish=value=>{dialog.close();dialog.remove();resolve(value)};
  deny.onclick=()=>finish(false);allow.onclick=()=>finish(true);dialog.addEventListener('cancel',event=>{event.preventDefault();finish(false)});
  dialog.append(title,text,deny,allow);document.body.append(dialog);dialog.showModal();deny.focus();
 });
}
