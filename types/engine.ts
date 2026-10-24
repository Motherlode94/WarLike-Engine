/** WarLike Studio: canonical typed scene contracts and gameplay component data. */
export type EntityKind = 'player'|'object'|'character'|'prefab';
export type AssetCategory = 'Characters'|'Monsters'|'Vehicles'|'Weapons'|'Props'|'VFX';
export type AnimationClip = 'idle'|'walk'|'run'|'attack'|'hurt'|'death'|'move'|'pulse'|'loop';
export type Behavior = 'none'|'patrol'|'chase'|'guard'|'wander'|'flee'|'follow';
export type TriggerEvent = 'onStart'|'onInteract'|'onEnter'|'onExit'|'onUpdate';
export type ConditionName = 'always'|'variableEquals'|'variableAtLeast'|'hasItem'|'healthBelow'|'questActive'|'questCompleted';
export type InstructionName = 'message'|'setVariable'|'addVariable'|'heal'|'damage'|'teleport'|'destroy'|'changeColor'|'giveItem'|'removeItem'|'startQuest'|'progressQuest'|'completeQuest'|'startDialogue';
export interface Vector2D { x:number; y:number }
export interface Camera2D extends Vector2D { zoom:number }
export interface VehiclePhysics { maxSpeed:number; acceleration:number; brakeForce:number; turnRate:number; drag:number; collisionRadius:number }
export interface LogicCondition { type:ConditionName; key?:string; value?:string|number }
export interface LogicAction { type:InstructionName; key?:string; value?:string|number; x?:number; y?:number; goal?:number; description?:string }
export interface VisualLogic { event:TriggerEvent; radius:number; once:boolean; prompt:string; local:Record<string,string|number|boolean>; conditions:LogicCondition[]; actions:LogicAction[] }
export interface DialogueChoice { text:string; next:number|null; item?:string; quest?:string; questTitle?:string; goal?:number; progress?:string }
export interface DialogueNode { text:string; choices:DialogueChoice[] }
export interface DialogueTree { title:string; nodes:DialogueNode[] }
export interface GameEntity extends Vector2D { id:number; name:string; type:EntityKind; w:number; h:number; color:string; rotation?:number; assetId?:string; skin?:string; animation?:AnimationClip; animationSpeed?:number; animationPreview?:boolean; hp?:number; behavior?:Behavior; aiSpeed?:number; detectionRadius?:number; logic?:VisualLogic; dialogue?:DialogueTree; maxSpeed?:number; acceleration?:number; brakeForce?:number; turnRate?:number; drag?:number; collisionRadius?:number }
export interface SceneFile { version:number; entities:GameEntity[]; camera:Camera2D }
export interface HistoryEntry { label:string; snapshot:string }
export interface AssetDefinition { id:string; name:string; category:AssetCategory; kind:'actor'|'vehicle'|'weapon'|'prop'|'effect'; index:number; width:number; height:number; hp:number; animation:AnimationClip }
