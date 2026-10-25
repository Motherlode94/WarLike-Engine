import {newSequence} from './logic-sequences.js';

// Both workspace types store the same sequence data; geometry is expressed
// in editor-plane coordinates (X/Y in 2D, ground X/Z in the 3D workspace).
export const blueprintPresets=[
 {id:'interact',label:'Interagir',modes:['2d','3d'],description:'Touche E près de l’objet',create:()=>({...newSequence(),event:'interact',radius:110,instructions:[{type:'message',value:'Interaction WarLike !'}]})},
 {id:'trigger',label:'Zone de détection',modes:['2d','3d'],description:'Déclenché à l’entrée dans une zone',create:()=>({...newSequence(),event:'enter',radius:140,instructions:[{type:'message',value:'Zone détectée !'},{type:'setColor',value:'#e0af55'}]})},
 {id:'timer',label:'Événement temporisé',modes:['2d','3d'],description:'Attendre puis envoyer un signal',create:()=>({...newSequence(),event:'start',once:true,instructions:[{type:'wait',value:2},{type:'emitSignal',value:'warlike:ready'}]})},
 {id:'door',label:'Porte à condition',modes:['2d','3d'],description:'IF variable hasKey, ELSE message',create:()=>({...newSequence(),event:'interact',once:false,conditions:[],branches:[{conditions:[{type:'variable',key:'hasKey',operator:'==',value:1}],instructions:[{type:'message',value:'Porte ouverte !'},{type:'enableObject',value:false}]}],elseInstructions:[{type:'message',value:'Porte verrouillée'}]})},
 {id:'moving2d',label:'Déplacement 2D',modes:['2d'],description:'Déplacer l’objet horizontalement',create:()=>({...newSequence(),event:'interval',interval:.5,instructions:[{type:'moveObject',x:12,y:0}]})},
 {id:'moving3d',label:'Déplacement au sol 3D',modes:['3d'],description:'Déplacer l’objet sur X/Z',create:()=>({...newSequence(),event:'interval',interval:.5,instructions:[{type:'moveObject',x:12,y:0}]})}
];
export function presetsForWorkspace(mode){return blueprintPresets.filter(p=>p.modes.includes(mode))}
export function createBlueprintPreset(id,mode){const preset=blueprintPresets.find(p=>p.id===id&&p.modes.includes(mode));if(!preset)throw Error('Blueprint indisponible pour ce projet');return structuredClone(preset.create())}
