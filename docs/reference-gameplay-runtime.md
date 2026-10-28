# Perception IA et Blueprints cohérents

Cette amélioration prolonge le moteur existant et ses références Game Creator 2,
Emerald AI et Opsive. Elle adapte leurs principes de composition ; aucun package
Unity ni code propriétaire n'est importé.

## Configurer un garde

1. Sélectionner un personnage de la scène et appliquer **Enemy Guard**, ou le
   Blueprint **IA · Garde et détection**.
2. Dans **Gameplay Components → AI State Machine**, régler le rayon de détection,
   le champ de vision, la mémoire et le temps de recherche. Cocher **Vision bloquée
   par les obstacles** pour un comportement de furtivité.
3. Lancer Play. Une cible observée provoque `chase` ou `attack`. Une cible perdue
   provoque `investigate` vers sa dernière position connue, puis `search` et
   `return` vers le point de départ. Le garde reprend ensuite sa patrouille.

Le champ de vision utilise la rotation au sol : 0° vers +X, 90° vers +Y en 2D
(+Z au sol en 3D). Les anciens composants sans réglage gardent une vision à 360°
et leur détection de proximité. Le preset de garde utilise une vision de 160°
avec obstacles, une mémoire de 4 secondes et une recherche de 2 secondes.

Les états et les booléens `visible` / `detected` sont issus de l'observation.
La dernière position connue ne suit pas la cible à travers les murs.

## Cibles et factions

- `setAiTarget` désigne un ID existant. La valeur 0 désigne le joueur actuel.
  La cible doit toujours être détectée ; cet ordre ne donne pas de vision à
  travers les obstacles. Un ID supprimé ne redirige pas l'attaque sur le joueur.
- `clearAiTarget` efface la mémoire et rétablit la sélection automatique du joueur.
- Deux acteurs d'une même faction explicite ne se blessent pas via ces systèmes.
  Une relation `friendly` ou `neutral` protège le joueur.
- La faction personnalisée `aiFaction` prend priorité sur `team`, puis sur
  l'identité `threatIntel.faction`. Un champ personnalisé vide utilise les autres
  valeurs. Le scanner utilise cette même priorité.

## Composer une interaction

Les conditions et instructions de santé, d'inventaire et d'IA proposent **Objet
cible / Objet à vérifier** : l'objet porteur, le joueur ou un ID précis.
Une cible explicite absente n'applique pas l'action au porteur par défaut.

Nouvelles instructions : `setAiEnabled`, `setAiLineOfSight`, `setAiFieldOfView`,
`setAiMemory`, `setAiSearchDuration`. Nouvelles conditions : `aiCanSeeTarget`,
`aiHasTarget`. Les champs de valeur de `aiStateIs` et `aiAwarenessAbove` sont
éditables dans l'Inspector.

La porte **Inventaire · Porte à clé réelle** vérifie un objet `key`, ouvre sa
collision et change sa couleur. Le pickup **Ramasser un objet** fournit cette
clé. **Stats · Alerte vie basse** lit la santé du joueur. Les presets
**IA · Suspendre le comportement** et **IA · Reprendre le comportement** réagissent
aux signaux `ai:stop` et `ai:resume` ; une séquence peut viser un autre garde par ID.

`setHealth`, `addHealth`, dégâts et soins partagent Stats et `hp`. Les anciens
objets conservent leurs dégâts quand Stats est créé. Retirer le dernier objet
équipé vide le slot correspondant. Les attentes reçoivent leur durée complète
et les tâches suspendues sont annulées si leur objet est désactivé ou supprimé.

Les imports JSON conservent les factions, identités, cibles, tags, rotations,
collisions et paramètres d'arme. La duplication crée des composants indépendants.

## Validation et limites

`npm test` couvre les transitions de perception, cibles, factions, collisions,
santé, inventaire, attentes, import et duplication. `npm run typecheck` vérifie
les définitions TypeScript ; le runtime JavaScript n'est pas entièrement typé.

La perception et les collisions IA utilisent les empreintes rectangulaires au
sol. Ce système reste expérimental : pas de NavMesh, de perception auditive,
d'animation squelettique de combat ni de géométrie de visibilité 3D complète.
Les scripts de gameplay historiques peuvent avoir leurs propres règles.

Sources de conception : [Game Creator — Actions](https://docs.gamecreator.io/gamecreator/visual-scripting/actions/),
[Emerald AI — documentation officielle](https://black-horizon-studios.gitbook.io/emerald-ai-wiki/),
[Opsive — Abilities](https://opsive.com/support/documentation/ultimate-character-controller/character/abilities/).

Validation de cette livraison : 266 tests Node passent, ainsi que le contrôle
TypeScript. Huit vérifications sous Chromium couvrent création 3D, édition de
l'Inspector, perception derrière un obstacle, restauration Stop, sauvegarde et
réouverture du Hub, santé en Play 2D, ramassage/porte et absence d'erreur JavaScript
non interceptée. La compatibilité sur plusieurs navigateurs/GPU reste à vérifier.
