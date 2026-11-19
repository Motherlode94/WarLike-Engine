# Animation, scripts et prefabs — 19 novembre 2026

Cette livraison approfondit les fonctions intégrées par les PR #91 et #100. Elle ne revendique pas la parité avec Unity.

## Avatar et couches

Le profil `warlike.avatar.v1` conserve ses 15 os obligatoires et accepte maintenant **55 correspondances** : corps, 30 segments de doigts, orteils, yeux et mâchoire. Les nouveaux os sont facultatifs : les anciens profils ne sont ni remplacés ni complétés de force. Détection des noms Mixamo/UAL, correction manuelle et validation des chaînes optionnelles. Le véritable GLB UAL sert au test du transfert des doigts ; cela ne constitue pas un système de muscles, de contraintes articulaires ou de reconstruction automatique d’une T-pose.

Les quatre couches existantes acceptent :

- un poids multiplié par un paramètre numérique et une synchronisation sur la phase de base ;
- une pose additive de référence choisie dans les clips, à un instant normalisé ;
- un masque pondéré par transform, avec inclusion des descendants et priorité à la règle la plus proche. Une valeur nulle exclut une branche, les poids intermédiaires réduisent son influence ;
- jusqu’à 16 ressources de masques partagées dans un même graphe, sérialisées avec la scène. Modifier une ressource affecte toutes ses couches utilisatrices.

Ces masques se combinent avec les masques humanoïdes et les anciennes racines d’os. Les os absents ou ambigus sont refusés à la préparation de Play. Le renommage et la protection contre suppression tiennent compte des clips de référence additive. Le mixage opère sur les canaux TRS ; pas de courbes musculaires, de blendshapes faciales ou de machines d’états indépendantes par couche.

## WarScript v2 et passage explicite depuis C#

Ajout des fonctions typées avec huit paramètres maximum, du retour de valeur, de `for`, `break` et `continue`. Les anciens scripts sans signature explicite restent lisibles. Les callbacks du moteur restent `void` et sans paramètres. Portée locale, vérification des types à l’exécution, 4096 opérations partagées par callback et huit niveaux d’appels. Une boucle vide infinie ou une récursion ne bloque pas le navigateur.

Le convertisseur WarScript → C# émet ces nouvelles instructions ; son exemple généré est contrôlé par un test de contenu et compilé/exécuté par les tests .NET en CI.

**Convertir et utiliser WarScript Web**, dans l’Inspector du script C#, crée une copie `.wls`, conserve le source `.cs`, désactive son composant sur l’objet et choisit le backend Web. Les paramètres sont validés avant toute mutation. Le fichier généré reste éditable dans Script Studio.

Cette commande est une conversion de source restreinte, **pas un compilateur C# ni un runtime .NET/WASM**. Elle accepte la grammaire commune : classe MonoBehaviour, champs simples, méthodes typées, conditions/boucles, Translate/Rotate, temps, entrées clavier texte, mathématiques et Debug.Log. Imports et API non reconnus, génériques, coroutines, exceptions, collections et bibliothèques arbitraires sont refusés avec des diagnostics. Les nombres restent ceux de la VM JavaScript ; la précision float32, les débordements et la division entière de C# ne sont pas reproduits. Le résultat doit être revu lorsque ces différences comptent.

Le C# natif arbitraire et ses composants incompatibles continuent à bloquer l’export Web. Aucun contrôle n’a été contourné et aucun script natif n’est silencieusement retiré à l’export. Une vraie cible .NET/WASM reste à construire.

## Prefabs v3

Les nouveaux prefabs hiérarchiques possèdent une version 3 et des coordonnées `legacy-world`. Une nouvelle instance translate ses enfants du même décalage que la racine. Les anciennes définitions v1/v2 gardent leur comportement et ne sont pas réécrites à la lecture.

Une composition conserve ses enfants comme références vers leurs sources et leurs clés locales stables. Le développement de la bibliothèque résout ces sources, leurs variantes et les niveaux imbriqués. Les modifications de propriétés héritées sont recalculées ; les overrides n’enregistrent que les feuilles modifiées et les suppressions explicites. Les chaînes de source et la racine de chaque instance sont conservées dans la scène. Les joints 2D/3D sont remappés vers les IDs de leur propre instance.

L’Inspector permet d’insérer un enfant lié, enregistrer une nouvelle composition, créer/instancier une variante, appliquer les propriétés à la source et rétablir l’objet. Les instanciations depuis le Project et les outils de prefabs prennent maintenant toute la hiérarchie. La propagation compare ancienne source, nouvelle source et instance afin de préserver ses différences locales. Les variantes héritent des nouvelles valeurs non surchargées.

Un backup `warlike.prefabs.library.v1.before-v3` précède la première écriture. Les écritures refusent une bibliothèque corrompue ; les enregistrements futurs inconnus sont conservés. Cycles, sources absentes, clés orphelines, chaînes trop profondes et dépassement de 1000 objets échouent explicitement. Aucun projet, slot de jeu ou asset n’est effacé.

Limites : les changements structurels ne sont pas automatiquement réconciliés dans les instances déjà présentes. Créer une nouvelle composition puis l’instancier reste nécessaire. Les références arbitraires de scripts ne sont pas remappées comme les joints. Le stockage des définitions de prefab est encore local au navigateur ; les jeux exportés contiennent les objets matérialisés, sans dépendre de cette bibliothèque. Pas d’éditeur isolé de prefab comparable au Prefab Mode de Unity.

## Validation

- **168 tests ciblés passent** : parser, du runtime réellement exécuté après préparation de l’export, du GLB UAL, des masques, des variantes et imbrications, des joints, des anciennes sauvegardes et de l’isolation Play/édition.
- TypeScript, syntaxe des modules et fermeture des dépendances du runtime.
- La suite locale globale rencontre des assets non présents dans cette copie partielle du dépôt. Ces échecs ne sont pas remplacés par des tests factices ; la CI utilise le dépôt complet.
- **Validation des nouveaux parcours UI non effectuée** : l’aperçu existant a pu être observé, mais le navigateur a ensuite refusé son rechargement pour une restriction d’URL. Aucun contournement n’a été tenté. Les contrôles de compatibilité UI 2D/3D existants tournent dans la CI ; cela ne suffit pas à valider les nouveaux boutons.
- Le SDK .NET n’est pas présent dans l’environnement local ; la compilation du nouvel exemple C# doit réussir en CI avant approbation.
