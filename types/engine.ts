/** Types de données pour la future migration TypeScript (aucune compilation requise en V0.3). */
export interface Entity2D { id:number; name:string; type:'player'|'object'; x:number; y:number; w:number; h:number; color:string }
export interface Camera2D { x:number; y:number; zoom:number }
export interface SceneFile { version:number; entities:Entity2D[]; camera:Camera2D }
export interface HistoryEntry { label:string; snapshot:string }
