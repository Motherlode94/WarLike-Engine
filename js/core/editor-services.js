// Optional authoring adapters. The exported player never installs these.
const unavailable=()=>{throw Error('Cette commande nécessite WarLike Editor.');};
export const editorServices={enabled:false,record(){},renderHistory(){},drawOverlay2d(){},initSceneGizmo3d:()=>()=>{},makeWindowResizable(){},loadAdventureCampaign:unavailable,loadSurvivalScene:unavailable,createHeroForgeScene:unavailable};
export function installEditorServices(services){Object.assign(editorServices,services,{enabled:true});}
