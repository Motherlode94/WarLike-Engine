# WarLike Narrative Director — cinéma interactif pour tous les jeux

## Vision
Chaque genre peut présenter une histoire structurée en actes, épisodes, scènes et **beats** (événements dramatiques), sans obliger tous les jeux à devenir des films linéaires. Le joueur reste le moteur causal. Les films et séries sont une référence de rythme, cadrage, interprétation et continuité, et non un prétexte pour lui retirer le contrôle.

### Pipeline
**Gameplay events → narrative conditions → deterministic director → validated cues → Camera / Dialogue / Animator / Audio / WarNode**.

Le module `js/core/narrative-director.js` est une **première bibliothèque pure** d'arbitrage : il ne déclenche pas encore des cinématiques dans les jeux, et n'est pas branché au runtime. Ses décisions peuvent être sauvegardées sous la forme de `state`, mais l'intégration avec les sauvegardes WarLike reste à faire.

### Rôles des systèmes
- **WarLike Director** : gestion de la tension, rythme, transitions d'actes, retombées émotionnelles et scènes réactives.
- **Actor AI** : personnages persistants avec buts, mémoire des événements, liens sociaux, émotions simulées, peur/confiance/loyauté ; ni intelligence réelle ni promesse de dialogue génératif autonome sans modèle connecté.
- **WarLike Cinematics** : timeline, découpage caméra, profondeur de champ, transitions, lumières, sous-titres et skip/reprise.
- **WarNode/WarScript** : déclencheurs, conditions, conséquence des décisions et permissions explicites.
- **Animator** : gestes, expressions et synchronisation labiale si les assets et clips sont disponibles.
- **WarLike Server** : métadonnées des épisodes/versions, ressources et partage de projets ; gameplay temps réel géré par le client local.
- **D1 / R2** : index, textes et relations dans D1 ; médias et modèles sous R2, par référence.

### Variantes par genre
| Genre | Mise en scène | Décisions et réactivité |
| --- | --- | --- |
| Horror | tension, silence, cadrage menaçant, révélations | traque, faux indices loyaux, mémoire des choix |
| RTS / militaire | briefing, radio, pertes, évacuation, conséquences | chef IA, morale, pertes persistantes, objectifs évolutifs |
| RPG | rencontres, arcs compagnons, retournements | relations, réputation, embranchements, épilogues |
| Simulation | scènes de métier, clients, accidents, routine | continuité des personnages, réputation, événements |
| Action / FPS | séquences d'action, entrées en scène | réaction à la tactique, conséquences et transitions |
| Sports / course | présentation, rivalités, commentaires | saison, statistiques et trajectoires d'équipe |

### Contrat narratif
Un beat possède `id`, `priority`, `genres`, `episode`, `once`, `conditions`, `tensionDelta`, `cooldown`, `flags`, `relationships`, et `cues`. Conditions admises : `flag`, `relationship`, `context`, `tensionAtLeast`. Cues déclaratifs admis : `dialogue`, `camera`, `animation`, `music`, `sound`, `objective`, `signal`, `subtitle`. Aucune exécution arbitraire de scripts depuis les fichiers de projet.

### Travaux non encore réalisés
1. Brancher les événements natifs au Director et les cues à des composants (sans perdre le Play/Stop).
2. Sauvegarder état dramatique, relations et événements dans les slots du moteur.
3. Ajouter un éditeur de timeline cinématique WarNode avec preview.
4. Construire une bibliothèque d'expressions, gestes, voix et synchronisation sous-titres/labiale.
5. Tester les cinématiques skippables, sauvegarde/reprise, accessibilité et export Web.
6. Relier la base d'horror creatures à une IA tactique dédiée ; elle reste indépendante de la narration générique.

**Statut :** socle de décision initial seulement. Pas de cinématiques ou de dialogues autonomes livrés en production.
