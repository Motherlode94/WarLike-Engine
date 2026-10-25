# WarLike Studio — inspirations ouvertes, architecture originale

Date : 2026-10-25. Objectif : reprendre les *principes* efficaces des moteurs existants, sans reproduire leurs marques, leurs interfaces pixel pour pixel ni du code propriétaire.

## Priorité P0 — fiabilité avant nouvelles fonctionnalités

1. Compiler C++17 + WebAssembly dans la CI et exécuter les tests natifs.
2. Valider Rapier via un vrai test navigateur et conserver le moteur intégré en fallback.
3. Diagnostiquer les chargements GLB (statut réseau, CORS, licence, géométrie, image, tailles).
4. Mettre en place un profiler CPU et rendu : temps de frame, appels GPU, draw calls, corps physiques, allocations.

## Priorité P1 — gameplay « sans code » utile

**Inspiration Game Creator** : événement → conditions → instructions. WarLike possède déjà `logic-sequences.js` avec `sequenceEvents`, `sequenceConditions`, `sequenceInstructions`, `chooseSequenceBranch` ; l'amélioration est d'ajouter un inspector de séquences réellement débogable (étape active, breakpoints, historique, temps d'exécution), pas de créer une deuxième logique concurrente.

**Inspiration Unity** : préfabs sérialisables avec identifiant stable, variantes et overrides explicites ; enregistrer les modifications par différence, permettre appliquer / annuler. Garder des composants et sérialisations compatibles avec les scènes existantes.

**Inspiration Unreal Enhanced Input** : définir des actions nommées (Move, Look, Jump, Interact, Attack), des contextes de mapping (Exploration, Vehicle, Menu), les priorités et le rebinding local, sans coder en dur chaque touche dans le contrôleur.

**Inspiration Godot** : composition d'objets, groupes, signaux typés et cycle de vie contrôlé, sans imposer de copie de SceneTree.

## Priorité P2 — personnage et 3D

1. Pipeline glTF vérifié : positions, indices, matériaux, UV, textures, peau/squelette, animations.
2. Contrôleur de personnage capsule avec collisions continues, pente, marche, saut et détection du sol.
3. Animator avec machine à états, événements d'animation et transitions.
4. Variantes 2D : Sprite Animator, atlas, états, tilemap et collisions 2D indépendantes.

## Priorité P3 — création et distribution

- Build web autonome avec assets réellement empaquetés.
- Export/import de projet réversible et vérifiable.
- Catalogue d'extensions sous licences compatibles, versions épinglées.
- Documentation du moteur, de ses formats et de ses restrictions.

## Principes de qualité

- **Pas de faux assets** : afficher le statut d'un modèle lorsque ses octets ne sont pas disponibles ; ne pas le présenter comme un personnage animé.
- **Une seule source de vérité** : ne pas simuler un même Rigidbody en JS, Rapier et C# simultanément.
- **Comparaison mesurée** : jamais d'affirmation « AAA » ou « plus rapide » sans profils et tests.
- **Licences** : bibliothèques open source sous leurs conditions, modèles avec attributions distinctes ; pas d'extraction d'assets commerciaux.
- **Intégration verticale** : fonctionnalité livrée seulement lorsqu'elle fonctionne dans l'Inspector, la scène, Play Mode, les sauvegardes et les tests.

## Documentation de référence

- https://docs.gamecreator.io/gamecreator/visual-scripting/
- https://dev.epicgames.com/documentation/unreal-engine/enhanced-input-in-unreal-engine
- https://docs.godotengine.org/en/stable/tutorials/scripting/scene_tree.html
- https://docs.unity3d.com/
