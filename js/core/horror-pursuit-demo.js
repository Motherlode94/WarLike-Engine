import {state,notify} from './state.js';
import {workspace} from './workspaces.js';
import {record} from './history.js';
import {horror} from './horror-survival.js';

// Original, editable WarLike horror pursuit test scene, currently 2D.
export function loadHorrorPursuitDemo(){
 if(state.playing)throw new Error('Arrêter Play avant de charger la démo');
 if(workspace.mode!=='2d')throw new Error('La scène de poursuite est actuellement disponible pour les projets 2D.');
 const items=[];let id=1;
 const add=(name,type,x,y,w,h,color,rest={})=>items.push({id:id++,name,type,x,y,w,h,color,...rest});
 add('Survivor','player',90,300,38,38,'#55c8ba');
 for(const [x,y,w,h] of [[240,80,42,280],[420,320,48,260],[605,65,48,280],[785,285,42,300],[1000,90,42,300]])add('Wall','object',x,y,w,h,'#48515a');
 add('Stalker','prefab',680,430,52,76,'#8d5e67',{assetId:'zombie',hp:180,behavior:'none',horrorAiConfig:{enabled:true,visionRange:260,hearingRange:250,memorySeconds:7},horrorAI:{awareness:0,searchTimer:0,lastKnown:null},aiSpeed:75});
 add('Wardrobe · hide while crouched','object',335,180,58,58,'#826447',{horrorHideConfig:{enabled:true,radius:85}});
 add('Storage · hide while crouched','object',900,505,60,55,'#826447',{horrorHideConfig:{enabled:true,radius:85}});
 add('Fear zone','object',1090,510,38,38,'#844855',{horrorFearConfig:{enabled:true,radius:180,strength:18}});
 state.entities=items;state.nextId=id;state.selected=[1];
 horror.enabled=true;horror.fear=0;horror.threat=0;horror.jumpscare=0;
 const toggle=document.getElementById('horrorSurvivalToggle');if(toggle)toggle.checked=true;
 record('Charger Horror Pursuit Demo');notify();
}
