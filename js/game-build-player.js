import {registerBuildModels} from './core/portable-models.js';
const data=JSON.parse(document.getElementById('warlikeGameData').textContent);
if(data.format!=='warlike.game.v1')throw Error('Format de jeu inconnu.');
registerBuildModels(data.importedModels);
const {startPlayer}=await import('./runtime/bootstrap.js');
startPlayer(data);
