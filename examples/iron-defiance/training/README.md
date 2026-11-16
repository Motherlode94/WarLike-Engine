# Iron Defiance Academy — manipuler WarLike Engine, WarScript et WarNode/Blueprint

**Deux parcours distincts :**
- `examples/iron-defiance/index.html` : RTS Three.js CENDRE-01 indépendant, **non éditable** dans Hierarchy/Inspector.
- `Game → Scènes démo jouables → Iron Defiance · Academy native` : scène native **éditable**, avec 12 soldats de démonstration en Alpha (5), Beta (4), Delta (3), et trois terminaux interactifs Blueprint. Ce laboratoire ne simule pas encore la bataille RTS complète.

## 1. Apprendre l'éditeur

1. Créer ou ouvrir un projet **3D**. Sauvegarder le projet courant avant de charger la démo.
2. Charger **Iron Defiance · Academy native** depuis le menu **Game → Scènes démo jouables…**.
3. Dans **Hierarchy**, inspecter `Escouade 01 / Alpha`, `Beta`, `Delta` : les 12 soldats sont de vrais objets de scène, pas des clones rendus uniquement par Three.js.
4. Sélectionner `Terminal · Alpha` puis ouvrir **Inspector → Blueprint / WarNode**. Modifier son texte de message ou sa logique en conservant les actions et conditions.
5. Lancer **Play** : ZQSD/WASD, souris, **E** près de chaque terminal Alpha, Beta et Delta. Terminer au terminal **Synthèse**.
6. Arrêter Play, enregistrer le projet et vérifier que les objets et leurs comportements sont conservés.

Les personnages de ce laboratoire utilisent des **prefabs 3D de démonstration**, pas les GLB militaires Meshy importés. Ne pas confondre avec une validation des assets, des animations ou de l'IA de bataille.

## 2. WarScript : exercice basé sur la vraie API

Le fichier `training/SignalEquipe.wls` utilise uniquement `Start`, `Update`, `Input.GetKeyDown`, `Set`, `Signal` et `Log` documentés.

1. Sur un GameObject, ajouter **Jeu Web → WarScript · C# simplifié**.
2. Ouvrir **Modifier le WarScript** dans Script Studio.
3. Copier le code de `SignalEquipe.wls`, puis **Vérifier / compiler** et enregistrer.
4. Dans WarNode/Blueprint, ajouter à un objet un comportement **Événement : signal** avec le signal exact `iron:academy:manual`, puis une action **Afficher un message**.
5. Relancer Play, appuyer sur **P** ; WarScript émet le signal et Blueprint réagit.

`Set("iron_manual_signal_count", ...)` illustre la variable partagée. Les syntaxes C# avancées (.NET, classes héritées, tableaux, boucles) ne sont pas toutes prises en charge dans WarScript v1.

## 3. WarNode : un graphe réellement éditable

Les terminaux Alpha/Beta/Delta utilisent `createGraph(sequence)` du runtime **Blueprint**. Chaque graphe possède un événement `interact`, puis trois actions : définir une variable, afficher un message, émettre un signal. WarNode ouvre l'espace de travail Blueprint existant, il ne s'agit pas d'une seconde simulation fictive.

- Event : `interact`
- Action : `setVariable iron_alpha = 1`
- Action : `message`
- Action : `emitSignal iron:team:alpha`
- Terminal final : vérifie `iron_alpha`, `iron_beta`, `iron_delta` avant la victoire

À expérimenter : modifier le message, connecter une condition, poser un point d'arrêt et tester en Play. Les cycles Blueprint sont refusés.

## 4. Ce que cette étape **ne** réalise pas encore

L'IA militaire 11 règles, les vraies formations et ordres RTS, les 22 GLB, le pilotage d'un soldat sélectionné en passant RTS→FPS, les équipages et l'export Web autonome complet de la scène native doivent être raccordés et validés séparément. Cette Academy établit un **chemin concret de manipulation** de l'éditeur, et un support de tests, pas une conversion complète de CENDRE-01.

## Vérification locale

```bash
node --test tests/iron-defiance-training.test.mjs
cd examples/iron-defiance && npm test && npm run build
```
Puis ouvrir la scène dans un vrai navigateur. La compatibilité des anciennes sauvegardes et l'export doivent encore être contrôlés selon `AGENTS.md`.
