import {defaultStats,defaultController,defaultInventory} from './gameplay-components.js';
import {prefab3d} from '../assets/catalog-3d.js';
import {newSequence} from './logic-sequences.js';
export function createBlueprintGameStarter(mode='2d'){
 const entities=[],threeD=mode==='3d';
 const add=(name,asset,x,y,extra={})=>{const id=entities.length+1;const base=threeD?prefab3d(asset,id,x,y):{id,name,type:'prefab',assetId:asset,x,y,w:44,h:60,color:'#60c8ad'};const o={...base,name,...extra};entities.push(o);return o};
 const sequence=(event,instructions,extra={})=>({...newSequence(),event,instructions,...extra});
 const p=add('Explorateur',threeD?'real-cesium-man':'scout',120,150,{playable3d:threeD,stats:defaultStats(),inventory:defaultInventory(),...(threeD?{controller3d:defaultController()}:{}),
  sequence:sequence('start',[{type:'setObjective',key:'lanterns',value:'Récupérer les trois lanternes',total:3},{type:'startTimer',key:'mission',value:180},{type:'showDialogue',speaker:'Mission',value:'Trois lanternes ont été égarées. Récupère-les avec E puis rejoins le terminal d’extraction. Échap : pause · F5 : sauvegarder · F9 : charger.'}],{once:true}),
  sequences:[sequence('keyDown',[{type:'saveGame',key:'quick'}],{name:'Sauvegarde rapide',key:'f5'}),sequence('keyDown',[{type:'loadGame',key:'quick'}],{name:'Charger la partie',key:'f9'}),sequence('timerExpired',[{type:'loseGame',value:'Le temps est écoulé.'}],{name:'Temps écoulé',signal:'mission',once:true}),sequence('death',[{type:'loseGame',value:'Ton personnage est hors combat.'}],{name:'Défaite',once:true})]});
 if(!threeD){p.type='character';p.skin='scout';p.w=42;p.h=64}
 for(const [i,[x,y]] of [[390,150],[600,320],[280,450]].entries())add('Lanterne '+(i+1),threeD?'real-lantern':'lamp',x,y,{collision3d:false,w:threeD?44:38,h:threeD?60:50,depth3d:44,
  sequence:sequence('interact',[{type:'giveItem',targetRole:'player',key:'lantern',value:1},{type:'addObjectiveProgress',key:'lanterns',value:1},{type:'addScore',value:100},{type:'message',value:'Lanterne récupérée'},{type:'enableObject',value:false}],{once:true,radius:105})});
 add('Terminal d’extraction',threeD?'real-boombox':'terminal',740,150,{collision3d:false,sequence:sequence('interact',[{type:'branch',conditions:[{type:'objectiveComplete',key:'lanterns'}],thenInstructions:[{type:'winGame',value:'Mission accomplie : les trois lanternes sont récupérées.'}],elseInstructions:[{type:'message',value:'Récupère les trois lanternes avant de partir.'}]}],{radius:130})});
 return {entities,nextId:entities.length+1,selected:[1],camera:{x:40,y:40,zoom:1}};
}
