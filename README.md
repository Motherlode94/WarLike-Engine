# WarLike Studio

**Moteur et éditeur de jeux 2D / 3D développé par Hardi Victor MBANVU — HardieBay.**

[Ouvrir le moteur](https://warlike-engine.pages.dev/) · [Documentation française](https://warlike-engine.pages.dev/docs/) · [Créer un jeu de A à Z](docs/blueprint-game-builder.md) · [Sources et licences](SOURCES.md)

WarLike réunit un Hub de projets, une scène, une hiérarchie d’objets, un Inspecteur de composants, Blueprint Studio et un export de jeu Web. Le Hub et l’espace de travail reprennent l’organisation visuelle d’Unity, avec des thèmes personnalisables : graphite, clair, science-fiction, fantastique, nature et six autres palettes.

## Commencer un jeu

1. Dans le Hub, cliquer sur **Nouveau projet**, choisir 2D ou 3D, puis un **type de jeu compatible**. La fiche précise les systèmes présents et si la scène est jouable ou constitue une base à compléter. **Plateforme** est disponible en 2D.
2. Parcourir **Project / Assets** : dossiers Scènes, Scripts, Prefabs et Imports, puis ressources classées par auteur et par pack. Les modèles et leurs aperçus sont livrés dans le dépôt.
3. Cliquer sur une ressource ou la glisser dans la scène. Sélectionner l’objet dans la Hiérarchie, puis régler ses composants dans l’Inspecteur. **Ajouter un composant** se trouve en bas ; le menu `⋮` de chaque composant propose ses commandes.
4. En 3D, **Scène test 3D** installe un terrain et des décors Kenney, un soldat animé, des véhicules, deux monstres et six armes Quaternius Ultimate Guns. La scène précédente reste récupérable avec Annuler.
5. Ouvrir **Blueprint Studio** pour construire les événements, conditions, dialogues, inventaires, objectifs, checkpoints et changements de scène. **Projet & export** permet de créer un exemple de jeu complet.
6. Tester avec **Play**, puis **Exporter le jeu**. Décompresser le ZIP et le servir en HTTP. Sauvegarder aussi le projet en JSON : le Hub conserve ses projets dans le navigateur utilisé.

Le type de jeu est conservé dans le projet et l’export Web. Dans la liste des projets, **⋮ → Type de jeu** change son classement et son HUD en conservant ses scènes. [Types compatibles, fonctionnalités et limites](docs/genre-templates.md).

Les fenêtres flottantes se déplacent par leur en-tête et se redimensionnent par leurs huit bords et coins. Les dimensions sont mémorisées. Les panneaux conservent leur défilement, même à 140 % de zoom.

## Hero Forge : super-héros, action, RPG, simulation et RTS

Dans le Hub, choisir le template **Hero Forge · Super-héros** en 2D ou 3D. Dans un projet existant, **Game → Hero Forge · Scène super-héros** installe une mission avec modèles et sprites Kenney / Quaternius déjà intégrés ; Annuler restaure la scène précédente.

Les six pouvoirs sont réellement jouables : **1** trait d’énergie, **2** onde de choc, **3** ruée, **4** bouclier, **5** vol, **6** ralliement. Ils utilisent énergie et temps de recharge. Les quatre archétypes — Gardien, Vélociste, Arcaniste et Technologue — se règlent dans l’Inspecteur. **E** secourt un civil ou répare un équipement proche ; **U** dépense un point dans la spécialité RPG choisie.

Les composants restent utilisables séparément dans les autres genres : progression avec niveaux et compétences, émetteurs FX prévisualisables, décors destructibles, réseau de générateurs et consommateurs, escouades avec déplacement, suivi, défense et attaque. Les effets incluent énergie, feu, électricité, fumée, soin et portail, avec trois budgets de qualité. Le HUD affiche les recharges, l’énergie, les matériaux et les commandes RTS ; il se replie sur un petit viewport.

[Guide Hero Forge, contrôles et nœuds Blueprint](docs/hero-forge.md).

## Animator, FX Studio et coop privée

Le menu **Animation** ouvre un graphe Animator avec états déplaçables, transitions conditionnelles, mélange repos/marche/course, couches par os et événements FX, son ou Blueprint. Le graphe utilise les véritables clips du modèle ; son aperçu permet de régler les transitions avant Play. **FX Studio** ajoute des courbes de taille et d’opacité, des couleurs évolutives, une émission directionnelle, des traînées et des collisions de particules. Les effets peuvent être liés aux pouvoirs et aux états d’animation.

La **coop locale accueille jusqu’à quatre joueurs**, en 2D ou 3D. Dans le dossier du moteur ou d’un jeu exporté, lancer **start-warlike-multi.cmd** sous Windows, ou `python3 python/warlike.py multiplayer` avec Python 3.10+. Ouvrir l’adresse affichée dans le terminal, puis **Game → Multijoueur local · Coop privée**. L’hôte saisit la clé du terminal ; les invités ouvrent l’adresse réseau de l’hôte et saisissent le code du salon. Le navigateur hôte calcule les déplacements, collisions, pouvoirs et progression ; le serveur Python relaie les commandes et états, sans service extérieur. Les sauvegardes et escouades restent gérées par l’hôte.

Sur le site public, le panneau explique le lancement local. Pour jouer, tous utilisent l’adresse servie par votre Python. La coop est également accessible depuis le menu de démarrage des exports Web. [Guide Animator, FX Studio, LAN et limites](docs/creative-studios-and-lan.md).

## Survival : construire un camp et passer la nuit

Le template **Survival · Survie**, en 2D et 3D, propose satiété, hydratation, fatigue, froid, récolte de ressources limitées, recettes sur inventaire, feu alimenté en bois et abri pour se reposer. Les rôdeurs deviennent plus dangereux la nuit. **E** récolte ; le HUD permet de boire, manger, fabriquer, construire et entretenir le camp. Les vrais modèles Kenney et Quaternius sont intégrés ; sept sprites isométriques transparents sont rendus depuis les modèles Kenney pour la 2D.

**Première aube** fournit une expédition complète : récolter, placer le camp avec aperçu et rotation, cuisiner, survivre à la nuit et revenir au camp. Les objectifs sont partagés et une défaite attend que toute l’équipe soit à terre ; deux fibres permettent de relever un allié. **F5 / F9** sauvegarde et recharge la partie. En coop LAN, chacun possède ses besoins et provisions ; stocks, constructions et horloge sont partagés. Les invités retrouvent leurs provisions sauvegardées chez l’hôte en gardant leur nom ; un nouveau joueur commence avec ses propres provisions de départ. Les composants et nœuds Blueprint sont réutilisables dans les autres genres. [Guide Survival, recettes, contrôles et limites](docs/survival.md).

## Souris et navigation de logiciel

Le clic droit ouvre un menu adapté à la Hiérarchie, à la scène, aux ressources ou aux composants. Les commandes de copie, collage, duplication, suppression et cadrage agissent sur la sélection. Les champs de texte conservent leur édition et leur presse-papiers natifs.

| Geste dans l’éditeur | Effet |
| --- | --- |
| Clic / Ctrl ou Maj + clic | Sélection simple / multiple |
| Glisser dans le vide | Rectangle de sélection |
| Molette centrale maintenue | Déplacer la vue 2D / 3D |
| Alt + clic gauche en 3D | Orbiter autour du point de vue |
| Alt + clic droit en 3D | Rapprocher / éloigner la caméra |
| Clic droit maintenu en 3D | Regarder ; déplacement avec les touches physiques WASD, Q/E verticalement, Maj pour accélérer |
| F / double clic dans la Hiérarchie | Cadrer la sélection |
| Q, W, E, R, T | Main, déplacement, rotation, échelle, rectangle |
| Ctrl/Cmd+S | Enregistrer le projet dans le Hub |
| Ctrl/Cmd+Maj+S | Exporter la scène JSON |
| Ctrl/Cmd+P | Play / Stop |
| Ctrl + molette | Taille de l’interface, sans zoom de page |

**Window → Plein écran** agrandit l’espace de travail. Les gestes de navigation déplacent la caméra de l’éditeur sans modifier les objets. En Play, le joueur utilise son propre contrôleur et sa caméra.

## Physique, caméra et contrôles en Play

Le contrôleur 3D, le vol, les véhicules et les corps physiques partagent un balayage de collision qui arrête les mouvements rapides devant les parois fines. Les objets désactivés ou détruits cessent de bloquer. Le personnage peut monter une petite marche avec suffisamment de hauteur libre et suivre une plateforme mobile ; la tolérance après un rebord et la mémorisation d’un appui de saut se règlent dans l’Inspecteur.

La caméra se rapproche immédiatement devant un obstacle et reprend progressivement sa distance lorsqu’il disparaît. Un changement de scène ou une grande téléportation recadre le suivi. Le tir FPS est arrêté par les murs et les combats 3D prennent l’altitude en compte. Les dialogues, l’inventaire et le journal bloquent les commandes de déplacement et de combat. [Détails, paramètres et limites](docs/runtime-foundation.md).

Blueprint Studio indique les nœuds en erreur et permet de les sélectionner depuis le diagnostic, au clic ou au clavier. Les commandes et conditions ont leurs libellés français ; la validation avertit des clés manquantes et des signaux écoutés sans émetteur explicite dans la scène.

## Physique 2D et obstacles

Les terrains Kenney 2D bloquent réellement le déplacement. **Box Collider 2D** permet d’activer un volume solide ou un trigger et de régler ses dimensions et décalages. **Rigidbody 2D** ajoute gravité, vitesse, rebond et friction, avec corps dynamique, cinématique ou statique.

Le **Contrôleur de personnage 2D** propose vue du dessus et plateforme. Son mode automatique reconnaît les personnages et les terrains Kenney Platformer, y compris dans les scènes existantes. Le mode plateforme applique la gravité, permet de sauter et empêche de traverser sols, plafonds et obstacles. Une collision balayée empêche de passer à travers un mur fin à grande vitesse.

Le bouton **Scène test 2D** construit une scène Kenney avec plateformes, obstacles solides et caisses physiques. Les paramètres sont conservés par les sauvegardes, le copier-coller et l’export Web. [Guide de la physique 2D](docs/physics-2d.md).

## Contrôles et presse-papiers

- **ZQSD / WASD / flèches** : déplacement ; **Maj** : sprint.
- **2D** : le personnage reste droit et se retourne vers la gauche ou la droite selon son déplacement. Son dernier regard horizontal est conservé pendant un déplacement vertical ou à l’arrêt.
- **3D** : le clic droit fait tourner la caméra et le personnage ; les déplacements restent relatifs à la caméra. Reculer ou se déplacer latéralement conserve cette orientation. Le mode première personne utilise le verrouillage de la souris.
- **3D** : E pour entrer/sortir d’un véhicule, F pour attaquer, espace pour sauter, Ctrl pour esquiver.
- Dans la scène : **Ctrl/Cmd+C**, **X**, **V** pour copier, couper et coller les objets sélectionnés. Les composants et références internes de la sélection sont conservés avec de nouveaux identifiants. Dans un champ de texte ou un éditeur de scripts, les raccourcis restent ceux du texte.

## Bibliothèque livrée avec le moteur

**7 626 modèles 3D dans 105 packs CC0**, avec géométrie réelle, textures locales et animations originales lorsqu’elles sont présentes :

| Auteur | Modèles | Packs | Exemples |
| --- | ---: | ---: | --- |
| [Kenney](https://kenney.nl/) | 4 716 | 50 | Personnages, véhicules, armes, ville, nature, bâtiments, mobilier, espace |
| [Quaternius](https://quaternius.com/) | 2 910 | 55 | Ultimate Guns **55 armes**, Ultimate Monsters **50 monstres**, personnages, dinosaures, animaux et bibliothèques d’animations Standard |

Les sprites PNG 2D, sons enregistrés et éléments UI Kenney sont également intégrés. Ils disposent de leurs propres dossiers et aperçus. Les couleurs des menus du jeu peuvent utiliser les habillages du UI Pack.

Les crédits détaillés sont dans **Hub → À propos / Sources**, dans l’Inspecteur de la ressource et dans [l’inventaire des packs](docs/complete-model-library.md). Chaque entrée indique l’auteur, la licence et le lien du pack. Les sources exactes, SHA-256 et notices d’origine sont conservés dans `scripts/assets/` et `assets/free/`.

Le dépôt inclut les fichiers utilisables ; les liens officiels servent à l’attribution et à la provenance. Les anciens catalogues externes restent optionnels. L’export Web emporte les modèles et textures effectivement référencés, sans copier toute la bibliothèque.

**Périmètre :** les 50 packs 3D Kenney recensés sont intégrés. 27 autres anciens packs Quaternius n’ont pas pu être récupérés à cause des quotas de leurs hébergements ; ils sont recensés dans l’inventaire. Les packs soumis à une licence interdisant la redistribution d’assets, dont certaines éditions récentes QAL, ne sont pas inclus.

## Python, C++ et C# : rôles réels

| Langage | Utilisation |
| --- | --- |
| JavaScript / TypeScript | Interface, Blueprint, simulation et rendu principal dans le navigateur ; contrats TypeScript pour les systèmes |
| Python | Serveur et relais LAN privé, validation des scènes, inventaire, import de sources 3D, contrôle des archives et orchestration des builds |
| C++17 / WebAssembly | Navigation A*, intégration de gravité par lots et intersections 3D ; compilation automatique et binaire livré au navigateur, avec repli JavaScript si le module est indisponible |
| C# / .NET 8 | Monde à composants et comportements natifs, simulation, véhicules et règles de jeu ; bridge local avec étapes manuelles ou aperçu continu, restauration de la scène et export des scripts |

```bash
# Serveur et outils Python sans dépendances supplémentaires
python3 python/warlike.py serve
python3 python/warlike.py multiplayer
python3 python/warlike.py validate mon-projet.json
python3 python/warlike.py assets

# Compiler le runtime C++ avec Emscripten activé
python3 python/warlike.py build-native

# Lancer le bridge avec le SDK .NET 8 installé
python3 python/warlike.py csharp
```

Dans **Window → C# Runtime**, connecter le bridge, synchroniser la scène puis lancer une étape ou **Aperçu C# continu**. L’aperçu effectue au maximum 30 étapes par seconde sans empiler les requêtes. Il s’arrête à la fermeture du panneau ou au démarrage du Play Web. Les scripts C# enregistrés doivent être intégrés et compilés dans le projet .NET pour être exécutés ; ils ne sont pas compilés par le navigateur.

[Runtime C#](csharp/README.md) · [Systèmes C++](native/README.md) · [Pipeline des modèles](docs/complete-model-library.md)

## Organisation du dépôt

```text
js/core/             Scènes, Blueprint, gameplay, sauvegardes et export
js/ui/               Hub, Inspecteur, Hiérarchie, dossiers et fenêtres
js/assets/           Catalogues, chargement GLB et animations
css/                 Thèmes et présentation de l’éditeur
assets/free/         Modèles, textures, sprites, audio, UI et licences
python/              Commandes de développement Python
native/              Sources C++ et runtime compilé dans dist/
csharp/              Runtime .NET, bridge local et démonstration
scripts/assets/      Import reproductible et inventaire des packs
tests/               Tests des systèmes et des ressources
docs/                Guides et références
```

## Développer et vérifier

```bash
npm install
npm test
npm run typecheck
npm run build:runtime
sh native/tests/run-smoke.sh
dotnet run --project csharp/WarLike.Demo
```

Le site est statique, déployable sur Cloudflare Pages depuis `main` avec le dépôt comme répertoire de sortie. Les workflows vérifient JavaScript, TypeScript et .NET ; des workflows distincts reconstruisent les assets et le module WASM.

## Limites actuelles

WarLike reste un moteur expérimental. L’IA utilise A* sur grille avec lissage des trajets, sans NavMesh. Le rendu principal prend en charge une partie de glTF, avec animations squelettiques et textures, mais pas tous ses matériaux et extensions. L’Animator ne propose pas encore d’IK ou de retargeting entre squelettes. La coop LAN est limitée à quatre joueurs et 256 objets, avec simulation dans le navigateur hôte ; elle n’est pas un serveur dédié ni un multijoueur Internet. La physique et les interactions demandent des tests dans le jeu construit. Les imports GLB temporaires doivent être rendus durables avant l’export ; les modèles externes non intégrés nécessitent Internet. C# s’exécute dans le processus .NET, indépendamment du Play Web.

Les références Unity, Game Creator, Emerald AI ou Opsive décrivent des inspirations d’ergonomie et de fonctionnalités. Leurs plugins commerciaux ne sont pas inclus dans WarLike.
