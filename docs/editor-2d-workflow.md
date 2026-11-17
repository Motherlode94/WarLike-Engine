# WarLike 2D — création, Camera2D et composants natifs

> **Mise à jour : novembre 2026 — PR #63 (à valider).** Le mode 2D et le mode 3D utilisent les mêmes projets WarLike Engine et le même WarLike Editor, mais leurs contrôleurs et physiques restent spécialisés.

## Créer une scène 2D

Dans **WarLike Editor → 2D → + Créer → Objets 2D** :

| Action | Ce qui est effectivement créé |
| --- | --- |
| **Main Camera 2D** | GameObject portant `camera2d`, repère visible et sélectionnable en Scene View |
| **Joueur 2D** | `type: player`, `controller2d` top-down et `collider2d` |
| **Sprite / Rectangle** | Rectangle 2D avec composant **SpriteRenderer2D** (ordre de dessin et opacité) ; la prise en charge complète des matériaux/sprite sheets reste à développer |
| **Plateforme solide** | Rectangle large + `collider2d` |
| **Zone Trigger 2D** | Collider 2D `isTrigger: true` pour les interactions futures |
| **Corps physique 2D** | Objet avec `rigidbody2d` et `collider2d` |

La création est enregistrée dans la scène existante, avec sélection et Undo/Redo. Les primitives 3D sont réservées au mode 3D : WarLike ne remplace pas silencieusement une demande 3D par un carré 2D.

## Camera2D — la caméra du joueur, séparée du viewport d'édition

Un GameObject portant le composant `camera2d` configure **la vue Play 2D**. La vue de travail de l'éditeur reste libre.

- **Mode Follow** : suit le joueur ou `targetId`. Sa position tient compte de `offsetX` et `offsetY`.
- **Mode Fixed** : reste à la position du GameObject caméra, sans suivre le joueur.
- **Zoom** : `0.2–5`, indépendant du zoom du viewport d'édition et conservé en Play.
- **Smooth Follow** : `followSharpness` règle la rapidité du suivi et `pixelPerfect` arrondit la translation en pixels.
- **Plusieurs caméras** : la plus haute `priority` parmi les caméras activées est utilisée.
- **Compatibilité** : sans Camera2D dans la scène, le suivi du joueur préexistant reste en service.

Les paramètres de la Camera2D sont éditables par les contrôles génériques de l'Inspector ; un menu déroulant empêche d'entrer un mode invalide. Un pictogramme Camera apparaît en mode Scene 2D, mais pas dans le jeu.

## Physics / contrôleur

WarLike dispose déjà de `collider2d`, `rigidbody2d`, `controller2d`, avec modes `topDown` et `platformer`. Les presets du catalogue utilisent ces composants existants. Le déplacement top-down accepte ZQSD/WASD. Les triggers exigent encore une validation de leurs événements de gameplay et leur raccordement aux comportements WarNode.

## À compléter pour atteindre Unity 2D

1. Compléter **SpriteRenderer2D** : le composant expose désormais ordre de dessin et opacité ; il manque les références d'assets, flip typé, tint et matériaux.
2. Un véritable **Tilemap Editor** (palette, pinceau, effaceur, grille, collisions, calques, Undo et export).
3. **Camera2D dédiée dans l'Inspector** : choix de cible par nom/Hierarchy, limites de suivi, viewport preview, parallax et zoom cinématique.
4. Animation de sprites : Sprite Sheet slicer, clips, frame events, Animator 2D et transitions.
5. Physics2D : validation continue collisions, triggers, Rigidbody2D, plateformes traversables et articulations.
6. Des démos natives 2D jouables (plateforme, top-down, RPG, stratégie) modifiables dans WarLike Editor puis exportables sans différences.

Les modèles et fonctions manquantes ne sont pas annoncés comme déjà opérationnels.

## Tests

`tests/scene-camera-2d.test.mjs` couvre priorité de Camera2D, activation, choix de la cible, suivi, zoom et interpolation. Compléter par des tests en navigateur pour les vues d'édition, Play/Stop, Inspector, export et collisions.

### Renderer 2D : ordre de dessin

Le composant `spriteRenderer2d` expose `sortingOrder` (nombre ; valeurs faibles derrière, élevées devant), `opacity` entre `0` et `1` et `enabled`. Le Canvas2D respecte cet ordre de dessin sur les entités de la scène tout en conservant l'ordre d'insertion lorsque les valeurs sont identiques. La valeur de l'Inspector n'est pas encore une couche Unity `SortingLayer` complète.
