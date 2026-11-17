// Allowlisted opt-in cross-origin link from W Visual Code only.
// No code execution. A user-visible approval is mandatory in Script Studio.
export const WVC_PROTOCOL=1;
export const WVC_MAIN_ORIGIN='https://w-visual-code.pages.dev';
export const WVC_MAX_SOURCE=262144;
export function allowedWvcOrigin(value){
 try{
  const url=new URL(value);
  if(url.origin!==value||url.username||url.password)return false;
  if(url.origin===WVC_MAIN_ORIGIN)return true;
  return url.protocol==='http:'&&['localhost','127.0.0.1'].includes(url.hostname);
 }catch{return false}
}
export function checkIncomingFile(file){
 if(!file||typeof file!=='object'||typeof file.path!=='string'||typeof file.source!=='string')throw Error('Fichier WVC invalide.');
 if(file.source.length>WVC_MAX_SOURCE)throw Error('Source trop volumineuse (256 Ko).');
 const path=file.path;
 if(path.length>180||!/^[-A-Za-z0-9_À-ÿ.\/ ]+$/.test(path)||path.startsWith('/')||path.split('/').some(p=>!p||p==='.'||p==='..'))throw Error('Chemin de script invalide.');
 const extension=path.split('.').at(-1).toLowerCase();
 const language={wls:'warscript',cs:'csharp',js:'javascript',ts:'typescript'}[extension];
 if(!language||language!==file.language)throw Error('Langage non pris en charge pour le transfert vers Engine.');
 const name=path.split('/').at(-1);
 if(name.length>100)throw Error('Nom de script trop long pour Engine.');
 return {name,path,source:file.source,language};
}
export function validSession(value){return typeof value==='string'&&/^[a-f0-9-]{36}$/i.test(value)}
export function validRequestId(value){return validSession(value)}
