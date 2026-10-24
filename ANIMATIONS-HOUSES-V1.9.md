# WarLike Studio V1.9 — Animations des personnages, véhicules et maisons

## Joueur
- Idle / marche / course / sprint, avec sélection automatique par le contrôleur de déplacement.
- Entrée / sortie véhicule, transition animée avant prise de contrôle.
- Entrée / sortie maison et séquences courtes.
- Les humanoïdes vectoriels Ninja et Zombie disposent de poses procédurales ; les autres sprites utilisent des effets de déplacement plus simples.

## Véhicules
- Idle, Drive, Reverse, Brake, Turn Left et Turn Right, automatiquement activés selon l'accélération, le freinage et la direction.
- E pour entrer / sortir, ZQSD ou WASD pour la conduite, Espace frein à main.
- Système de collision avec obstacles et bâtiments, caméra de suivi avec C.

## Maisons interactives
Types : Family House, Apartments, Safehouse, Cabin, Fantasy Inn.

1. Ajouter une maison depuis Project → Buildings, puis lancer Play.
2. Se placer près de la façade avant, appuyer sur E pour entrer.
3. L'intérieur stylisé est accessible : ZQSD/WASD pour marcher.
4. L pour allumer/éteindre la lumière, synchronisée avec les fenêtres.
5. E pour sortir ; les portes sont animées et se referment automatiquement après quelques secondes.
6. Inspector → House / Interior règle l'état de la porte et les lumières.

Une maison a été ajoutée dans la démo Roleplay.

## Limites
Interiors are prototype 2D overlay rooms, not fully modeled architectural scenes with individual floorplans; props within these rooms are currently drawn elements and not separate editable entities. Animation clips are procedural, not motion capture. No networking or multiplayer synchronization. Syntax validation passed, browser and deployment not yet verified.
