# WarLike 2D — Tilemap Editor et animation de sprites

> Extension de la PR #63 fusionnée : même WarLike Engine, même WarLike Editor, **aucun moteur 2D séparé**.

## Peindre un niveau Tilemap 2D

1. Ouvrir un projet **2D**, hors mode Play.
2. Cliquer sur **＋ Tilemap** dans la barre flottante de la Scene View, ou sur **＋ Créer → Objets 2D → Tilemap 2D**.
3. Sélectionner le GameObject `Tilemap 2D` dans la Hierarchy.
4. Activer **Peindre** dans la barre du viewport et sélectionner un type de tuile : **Herbe**, **Terre**, **Mur**, **Pierre**, **Eau**, ou **Effacer**.
5. Peindre en cliquant/glissant sur le Canvas de scène ; la grille utilise une taille de cellule de 32 pixels par défaut, configurable dans `tilemap2d.tileSize`.
6. Lâcher la souris : le geste est ajouté à l'historique **Undo/Redo**, et ses cellules sont conservées dans les entités enregistrées/exportées. Décocher **Peindre** pour retrouver les Gizmos normaux.
7. Tester en **Play** ; les tuiles Mur/Pierre bloquent le personnage en utilisant les collisions 2D natives, les autres sont non solides.

### Format et contraintes

Le Tilemap est un **GameObject de scène**, avec les données `tilemap2d: {tileSize,columns,rows,cells,visible}`. Les cellules sont stockées en dictionnaire parcimonieux `"col,row": "grass" | "earth" | "wall" | "stone" | "water"` ; leur conversion en rectangles de collision se fait à l'exécution sans multiplier les GameObjects enfants. Le rendu est assuré par le moteur Canvas2D existant, **également dans le jeu Web exporté** à condition que les tests d'export soient validés.

L'éditeur actuel peint des tuiles de couleur natives, pas encore des motifs provenant d'un atlas PNG. C'est une première Tile Palette fonctionnelle, pas encore un équivalent du Tilemap Editor Unity complet. Il manque notamment palettes multi-atlas, pinceaux personnalisés, RuleTiles, couches, détection de voisinage, découpage de Tilemap par chunks et collision polygonale optimisée.

## SpriteAnimation2D

Un Sprite 2D peut porter `spriteAnimation2d` avec les propriétés :

| Propriété | Effet |
| --- | --- |
| `enabled` | Active l'animation d'une sprite sheet |
| `frames` | Nombre de frames horizontales de même taille |
| `fps` | Nombre de frames par seconde |
| `loop` | Recommencer ou arrêter sur la dernière frame |
| `preview` | Autoriser une prévisualisation dans l'éditeur |

Dans le projet, affecter au GameObject un `spriteDataUrl` correspondant à une image PNG **horizontale** contenant les frames successives ; le Renderer extrait ensuite la frame active sans créer de nouvelles images. La sprite sheet doit être chargée avec le pipeline d'assets disponible. Le bouton **＋ Créer → Sprite / Rectangle** ajoute les composants `spriteRenderer2d` et `spriteAnimation2d` (initialement désactivé).

### Limites et suite

- Il n'y a pas encore d'éditeur de courbes, timeline d'événements d'animation, state machine Animator2D ni retargeting 2D.
- Le contrôleur d'animation de sprite travaille sur une ligne horizontale unique ; les grilles multidirectionnelles et les spritesheets irrégulières restent à développer.
- Tester en navigateur réel la peinture après sélection d'un Tilemap, la détection de collision, Stop/Play, la persistance après recharge et l'export.
- Les tests unitaires du noyau sont dans `tests/tilemap-sprite-animation-2d.test.mjs`.

### Architecture

**WarLike Editor** fournit la palette et le pinceau ; **WarLike Engine** assure le rendu, les collisions et le calcul des frames. Le jeu exporté n'emporte pas l'interface d'édition et conserve les données `tilemap2d` et `spriteAnimation2d` dans la scène.
