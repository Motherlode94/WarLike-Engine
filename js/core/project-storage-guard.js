// Unity 1-era design lesson: project authoring must survive failed writes.
// This module never inspects or alters gameplay data, UI layout or asset stores.
export const projectBackupKey=key=>key+'.backup.v1';

const isWorkspaceSnapshot=value=>value&&typeof value==='object'&&
 value.workspaces&&typeof value.workspaces==='object'&&
 ['2d','3d'].every(mode=>{
  const slot=value.workspaces[mode];
  return slot&&Array.isArray(slot.entities)&&Array.isArray(slot.selected);
 });

export function saveProjectSafely(storage,key,data,writeIndex){
 const original=storage.getItem(key);
 // Do not replace a known-good backup with malformed or partial JSON.
 if(original!==null){
  try{
   if(isWorkspaceSnapshot(JSON.parse(original))){
    storage.setItem(projectBackupKey(key),original);
   }
  }catch{ /* A full localStorage quota must not block an otherwise valid save. */ }
 }
 try{
  storage.setItem(key,JSON.stringify(data));
  writeIndex();
  return true;
 }catch(error){
  // Atomicity at the application level: undo a partial project write if the
  // metadata write failed. If quota prevents rollback, preserve the backup.
  try{
   if(original===null)storage.removeItem(key);
   else storage.setItem(key,original);
  }catch{}
  return false;
 }
}
export function restoreProjectSafely(storage,key,restore){
 for(const [source,location] of [['principal',key],['sauvegarde de secours',projectBackupKey(key)]]){
  try{
   const raw=storage.getItem(location);
   if(raw===null)continue;
   const data=JSON.parse(raw);
   if(isWorkspaceSnapshot(data)&&restore(data))return {data,source};
  }catch{ /* Malformed original never destroys the backup or current editor. */ }
 }
 return null;
}
