import {prefab3d} from '../assets/catalog-3d.js';

// Uses existing bundled Kenney GLBs. Appends to the user's scene; no primitive stand-ins.
export function createCsharpSquadDemo(firstId) {
 if(!Number.isSafeInteger(firstId)||firstId<1)throw Error('ID de départ invalide.');
 const leader={...prefab3d('character-soldier',firstId,250,250),name:'Escouade C# · Chef',playable3d:false,
  csharpComponents:[{kind:'TacticalSquad',memberIds:[firstId+1,firstId+2,firstId+3,firstId+4],speed:3,spacing:1.5,followDistance:4}]};
 const members=Array.from({length:4},(_,i)=>({...prefab3d('character-soldier',firstId+i+1,250+(i%2-.5)*96,250+(Math.floor(i/2)+1)*96),
  name:'Escouade C# · Soldat '+(i+1),playable3d:false}));
 const vehicle={...prefab3d('free-car-kit-truck',firstId+5,850,250),name:'Véhicule de suivi C#',playable3d:false,
  csharpComponents:[{kind:'VehicleController',maxSpeed:200,acceleration:120,brakeForce:250,turnRate:100,drag:1.35,reverseRatio:.45}]};
 return [leader,...members,vehicle];
}
