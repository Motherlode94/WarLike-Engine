import {rpg} from './rpg-systems.js';
import {gameSession} from './game-session.js';
// Menus keep their own keyboard handling; gameplay receives an empty key set.
export const gameplayInputBlocked=()=>!!(rpg.dialogue||rpg.showInventory||rpg.showJournal||gameSession.dialogue);
export const gameplayKeys=keys=>gameplayInputBlocked()?new Set():keys;
