# Exécution commune et ports de données

## Utilisation

Dans Blueprint Studio → Projet & export, **Exécution de Play** propose :

- **Web** : composants navigateur et blueprints ; mêmes comportements dans le ZIP Web.
- **Web + C# local** : mêmes objets navigateur, avec une étape .NET avant les composants et les blueprints. Démarrer `dotnet run --project csharp/WarLike.Bridge` sur le PC utilisé pour l’éditeur. Le pont doit annoncer le protocole 3.

Dans Bibliothèque → Données & calculs, **Santé − dégâts · ports typés** crée un graphe complet : objet → lecture de santé → soustraction de 25 → application de la santé. `＋ Donnée` ajoute un nœud ; son Inspector choisit l’opération et le type. Cliquer une sortie colorée puis une entrée compatible. Double-cliquer un câble pour le retirer. Les ports d’exécution et de données sont distincts.

Types : nombre, booléen, texte, Vector2, Vector3, référence d’objet et référence de composant. Les références sérialisées sont `{entityId}` et `{entityId, kind, index?}`. Les valeurs sont lues à l’exécution de chaque action, y compris après Wait et dans les appels de fonction. Les sorties de fonctions existantes restent accessibles par leur variable locale de résultat.

## Autorité et ordre d’une image

`state.entities` reste l’état vivant commun, sans copie indépendante pour les blueprints. `runtime-session.js` orchestre les boucles 2D et 3D :

1. En mode natif, envoyer positions, santé et activation au monde .NET existant ; conserver les instances de composants et leurs cycles de vie.
2. Exécuter le pas natif et appliquer la réponse uniquement à la même session, scène et image.
3. Mettre à jour les composants navigateur une seule fois, puis le gameplay et les séquences Blueprint.

Un seul appel natif peut être en vol. Stop invalide la génération avant restauration de la copie éditable. Une réponse périmée ne peut modifier cette copie. Une réponse reçue pendant une pause attend la reprise ; les propriétés modifiées par le pas à pas restent prioritaires. Un pont absent ou incompatible interrompt la simulation et affiche l’erreur.

Les composants Web historiques (Health, Weapon, Team, etc.) sont exclus du pas .NET pour éviter la double exécution. Les modèles de genres et véhicules déclarent leurs équivalents avec `runtime: "web"`. Leurs paramètres de véhicule alimentent le contrôleur navigateur ; leurs données de genre partagent les variables globales du Blueprint. Ils ne sont pas des instances C# dans ce mode.

Le cycle natif exécute les pas FixedUpdate avant Update, puis LateUpdate. Awake, Start, activation et destruction restent gérés par GameWorld.

## Format de scène

`scene-contract.js` échange le schéma `warlike.scene.v2` avec l’éditeur V2 et le pont .NET. Transform emploie des mètres, des degrés et les axes X/Y/Z. Les anciennes coordonnées x/y correspondent au sol X/Z, avec 64 unités par mètre ; elevation3d correspond à Y.

`sourceEntityId` conserve les IDs numériques et les références. Les composants Web et natifs sont explicites ; LegacyEntity préserve les données personnalisées des projets existants. Les exports de scènes gardent aussi leur représentation historique pour les anciens outils. Les positions suivent le fonctionnement actuel des éditeurs : coordonnées absolues ; le parentage conservé n’ajoute pas une nouvelle résolution de transformations locales.

## Contrôles avant livraison

Play et l’export consultent la même table de capacités. L’export contrôle toutes les scènes, signale les composants natifs et bloque un ZIP qui perdrait leur comportement. Les données et calculs des nouveaux graphes sont inclus dans le manifest du runtime.

Les scripts C# libres ne sont pas compilés automatiquement. Il faut les compiler et enregistrer leur composant dans le pont avant leur prise en charge ; un simple fichier source attaché déclenche un diagnostic. Le ZIP Web ne contient pas d’exécuteur .NET.

Le protocole de frames natif accepte une structure d’acteurs stable. Une création ou suppression d’acteur effectuée côté navigateur pendant ce Play nécessite actuellement de redémarrer la session ; le pont refuse la structure incohérente au lieu de continuer avec deux mondes divergents. Les suppressions effectuées par le monde natif sont répercutées au navigateur.

## Vérification

- `npm test` : tests de régression et nouveaux cas de calcul, typage, références, conversions de scènes, compatibilité et protection des frames.
- `npm run typecheck` : types TypeScript du dépôt, sans prétendre contrôler tout le JavaScript.
- `npm run test:native` et `dotnet build csharp/WarLike.Bridge` : compilation et tests .NET, également exécutés en CI.
