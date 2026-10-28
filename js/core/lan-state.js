// No engine imports: renderers can select their local player without dependency cycles.
export const lanState={role:null,peerId:null,code:'',players:[],connected:false,status:'Hors connexion',actorId:null,lastSnapshot:0,ping:0};
export const isLanGuest=()=>lanState.connected&&lanState.role==='guest';
export const lanActor=(entities,fallback)=>isLanGuest()?entities.find(o=>o._netPeerId===lanState.peerId)||fallback:fallback;

export const lanCommands=[];
