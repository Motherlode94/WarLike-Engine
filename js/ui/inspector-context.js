import {InspectorSelection} from '../core/inspector-model.js';
import {state} from '../core/state.js';
import {workspace} from '../core/workspaces.js';
import {gameProject} from '../core/game-project.js';
export const inspectorSelection=new InspectorSelection();
export const inspectorContext=()=>[gameProject.id,gameProject.activeSceneId,workspace.mode].join(':');
export const inspectedObjects=()=>inspectorSelection.resolve(state.entities,state.selected,inspectorContext());
