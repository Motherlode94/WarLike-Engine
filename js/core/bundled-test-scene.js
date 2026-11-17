import {ensureDemoGameCamera} from './demo-native-camera.js';
import {createTownDemo,createGarageDemo,createNatureDemo} from './authored-demo-scenes.js';
// Existing scene-menu entry points now load authored playable scenarios.
export function createBundledTestScene(kind='town'){
 const build={town:createTownDemo,nature:createNatureDemo,garage:createGarageDemo}[kind];
 if(!build)throw Error('Scène démo inconnue : '+kind);
 return ensureDemoGameCamera(build('3d'),'3d',{genre:'adventure'});
}
