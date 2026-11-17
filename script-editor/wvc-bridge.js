import {WVC_PROTOCOL,allowedWvcOrigin,checkIncomingFile,validSession,validRequestId} from './wvc-protocol.js';

// Called only by the standalone Script Studio window opened explicitly from
// W Visual Code. The Engine scene is never mutated by these imports.
export function setupWvcBridge({query=location.search,opener=window.opener,confirmAccess=message=>window.confirm(message),importSource,status=()=>{},log=()=>{}}={}){
 const params=new URLSearchParams(query),origin=params.get('wvcOrigin');
 if(!opener||!allowedWvcOrigin(origin))return ()=>{};
 let session=null,authorized=false,ended=false;
 const send=message=>{if(!ended)opener.postMessage({...message,protocol:WVC_PROTOCOL},origin)};
 const receive=event=>{
  if(ended||event.source!==opener||event.origin!==origin||!event.data||event.data.protocol!==WVC_PROTOCOL)return;
  const msg=event.data;
  if(msg.type==='wvc:hello'){
   if(authorized||!validSession(msg.session))return;
   const allow=confirmAccess('Autoriser W Visual Code ('+origin+') à envoyer manuellement des scripts dans cet espace Script Studio ? Aucune exécution automatique.');
   if(!allow){status('Connexion W Visual Code refusée.');return}
   session=msg.session;authorized=true;send({type:'wvc:connected',session});status('W Visual Code connecté (transferts manuels)');return;
  }
  if(msg.type==='wvc:push'&&authorized&&msg.session===session&&validRequestId(msg.requestId)){
   try{
    const item=checkIncomingFile(msg.file);
    importSource(item);
    log('W Visual Code : script importé '+item.name);
    send({type:'wvc:ack',session,requestId:msg.requestId,ok:true});
   }catch(e){send({type:'wvc:ack',session,requestId:msg.requestId,ok:false,error:String(e.message||'Import refusé').slice(0,180)})}
  }
 };
 window.addEventListener('message',receive);
 // Delayed until the Script Studio module has its listener installed.
 send({type:'wvc:ready'});
 return ()=>{if(ended)return;send({type:'wvc:disconnect',session});ended=true;window.removeEventListener('message',receive)};
}
