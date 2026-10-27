# WarLike Enemy Intelligence — factions et scanner

Le système utilise les états réels du composant **AI State Machine** pour présenter les menaces, leurs factions, leur niveau de danger et leur perception.

## Créer un antagoniste
1. Ajouter un PNJ 3D, lui attribuer **AI State Machine** depuis l'Inspector.
2. Configurer **Enemy Intelligence · identité / factions** : faction, relation (friendly, neutral, suspicious, hostile), classe, niveau et faiblesse.
3. Paramétrer détection, distance d'attaque, dégâts, patrouille et vision masquée par les obstacles.
4. Lancer Play puis appuyer sur **T** pour afficher le scanner des PNJ IA à proximité.

Le scanner montre uniquement les PNJ présents dans la scène avec une IA activée. La distance est en unités WarLike. Il expose l'état `idle/patrol/chase/attack/dead`, la vie, la détection et la dernière observation de la cible enregistrée par l'IA. Le score de danger est indicatif, calculé à partir du niveau, des dégâts et de l'état courant.

**Règle de faction :** un PNJ `friendly` ou `neutral` n'attaque pas le joueur via cette IA. L'état `suspicious` conserve temporairement le comportement hostile hérité, jusqu'à ajout d'une logique d'escalade explicite. Les personnages sans affiliation explicite restent hostiles pour compatibilité avec les anciennes scènes.

**Field Lab** comporte maintenant une sentinelle hostile et un technicien allié pour vérifier visuellement les différences.

## Limitations
- Ce n'est pas encore un système de diplomatie ou réputation entre factions.
- Le scanner ne calcule pas les occlusions visuelles par lui-même ; il affiche la visibilité enregistrée par l'IA.
- Les PNJ sans composant `ai.enabled` ne sont pas listés.
- L'IA C# native n'est pas encore unifiée avec cette logique JavaScript de Play navigateur.
