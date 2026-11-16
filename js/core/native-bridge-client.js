// Session credential stays in module memory. Never serialize into a project or storage.
let token='';
export function setNativeBridgeToken(value){if(typeof value!=='string'||value.length>128)throw Error('Clé C# invalide.');token=value.trim()}
export function clearNativeBridgeToken(){token=''}
export async function nativeBridgeRequest(path,payload){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),path==='/scripts/compile'?30000:4500);
 try{
  const response=await fetch('http://127.0.0.1:8765'+path,{method:payload===undefined?'GET':'POST',mode:'cors',headers:payload===undefined?{}:{'Content-Type':'application/json','X-WarLike-Token':token},...(payload===undefined?{}:{body:JSON.stringify(payload)}),signal:controller.signal,cache:'no-store'});
  const data=await response.json();if(!response.ok||data.ok===false)throw Error(data.error||'HTTP '+response.status);return data;
 }finally{clearTimeout(timer)}
}
