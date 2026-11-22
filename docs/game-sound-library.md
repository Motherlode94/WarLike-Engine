# Sons de jeu — WarLike Engine

La section **Project / Assets → ♫ Sons de jeu** rend accessibles les fichiers audio réellement fournis dans Engine : les effets Kenney OGG CC0 du dossier \`assets/free/kenney/\` et les sons de synthèse natifs du moteur. Aucune piste audio de WarLike Studio ni dépendance externe ne sont nécessaires.

## Utilisation

1. Ouvrir **Project / Assets** puis **♫ Sons de jeu**.
2. Rechercher un son, sélectionner une catégorie ou filtrer « OGG » / « Synthèse WarLike ».
3. **Écouter** utilise le moteur Web Audio et requiert que le son soit activé dans l'éditeur.
4. **Utiliser** affecte le son à l'**Audio Source** actuellement sélectionné. Si aucun Audio Source n'est sélectionné, Engine crée un GameObject Audio Source dans la scène et lui affecte le son.
5. Dans **Inspector → Audio Source**, régler gain, boucle, distance, positionnement spatial et comportement en Play. Les identifiants des sons enregistrés sont sérialisés avec la scène 2D/3D et peuvent être résolus par le moteur lors de la lecture.

Catégories incluses : **Interface**, **Personnages**, **Armes et combat**, **Environnement**, **Interactions**, **Véhicules** et **Science-fiction**.

**Important :** le catalogue ne prétend pas fournir des enregistrements de véhicules, d'armes ou d'ambiances inexistants. Ces catégories emploient des effets de synthèse WarLike tant qu'un pack audio réel adapté n'est pas installé. Les OGG Kenney conservent leurs licences et attributions ; les sons de synthèse sont générés par WarLike.

Les fichiers audio locaux importés restent gérés par le composant Audio Source existant. Cette PR n'ajoute ni nouveaux échantillons propriétaires ni fausses ressources.
