# Débogueur, Play et export : périmètre vérifié

Le workflow **Engine integrity and Web export** exécute un contrôle `runtime-acceptance` dans Chromium avec WebGL logiciel et un vrai processus .NET 8. Son rapport JSON et ses captures sont joints à chaque exécution GitHub Actions. Il ne remplace pas une validation sur tous les appareils et tous les jeux.

| Fonction | Vérification reproductible | Limite conservée |
| --- | --- | --- |
| Points d’arrêt et pas à pas | Arrêt avant l’effet, une action par clic, entrée dans une fonction avec paramètres typés, horloge et rotation native figées, reprise après Wait | Débogueur Blueprint ; il ne pose pas de points d’arrêt dans le code source C# |
| Play 2D / 3D | Même graphe en Web et Web + C# local ; Stop restaure les objets, scripts et points d’arrêt ; sauvegarde puis réouverture sans perte | Scénarios contrôlés sous Chromium, pas une certification multi-navigateurs ou multi-GPU |
| C# local | Compilation Roslyn d’un MonoBehaviour attaché, rotation appliquée par .NET puis observée par WarScript dans la même scène ; pont inaccessible = erreur explicite | SDK .NET 8 et bridge sur le PC de l’éditeur ; API WarLike, sans compatibilité générale avec UnityEngine |
| Export Web autonome | Vrais ZIP 2D et 3D lancés dans un contexte vierge, toutes les requêtes hors archive bloquées, score final et absence d’erreurs contrôlés | C# natif actif refusé ; autres genres, ressources et matériels à éprouver séparément |

## Points d’arrêt et jeu livré

Un point d’arrêt reste enregistré dans le projet et réapparaît lors de sa réouverture dans l’éditeur. Le jeu Web construit ignore cette métadonnée : il continue ses actions sans exiger une interface de débogage absente de l’archive. L’export ne supprime ni le graphe ni les points d’arrêt du projet source.

## C# : compilation et export sont deux chemins distincts

**Blueprint → Projet & export → Exécution de Play → Web + C# local** compile les sources attachées avec Roslyn, importe la scène et orchestre ses étapes natives avant les comportements Web. Les paramètres et champs doivent respecter les API exposées par WarLike. Les restrictions et la procédure de démarrage figurent dans le [guide C#](../csharp/README.md).

Le ZIP Web fournit le runtime navigateur. Il n’inclut pas un exécuteur .NET ; un projet dépendant d’un composant ou script C# actif est refusé avec un diagnostic. Basculer l’option vers Web sans remplacer ces comportements ne rend pas ce projet portable.

## Reproduire

```bash
npm install --no-package-lock
npx playwright install --with-deps chromium
dotnet build csharp/WarLike.Bridge --configuration Release
node scripts/test-runtime-acceptance-browser.mjs
```

Les ports locaux 8000 et 8765 doivent être libres. Le contrôle démarre puis arrête son propre bridge ; il utilise une origine déjà autorisée et ne modifie pas les permissions du pont.

Le [scénario navigateur](../scripts/test-runtime-acceptance-browser.mjs) et sa [scène de contrôle](../tests/runtime-acceptance-fixture.mjs) restent séparés des projets utilisateurs. Les tests existants de CHAMBRE 07 contrôlent en complément les collisions, fins et reprises de sauvegarde avec physique intégrée et Rapier.
