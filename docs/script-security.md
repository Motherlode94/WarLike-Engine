# Sécurité des scripts

## JavaScript et TypeScript

Les modules désactivés, ainsi que ceux d’un GameObject inactif, ne sont pas importés : aucun code de niveau module ni `Awake` ne s’exécute avant activation. Leur code et leurs champs restent dans le projet. L’activation pendant Play charge le module après autorisation.

La confiance est mémorisée **en mémoire de l’onglet**, par SHA-256 des sources exécutables et de leur projet. Un attribut `trusted` dans un JSON importé ne donne aucun droit. Un changement de code, l’ajout d’un script actif ou une nouvelle session demande une autorisation. Le refus bloque Play avec un diagnostic ; il ne supprime aucune donnée.

Les scripts s’exécutent dans un Worker dédié, créé par un iframe `sandbox="allow-scripts"` sans `allow-same-origin`. Son origine opaque bloque les stockages de l’éditeur, y compris IndexedDB. Sa CSP interdit les connexions réseau et les imports distants. Le Worker ne reçoit ni projet complet, ni assets, ni jeton local/cloud. Un MessagePort privé relie le document isolé à l’éditeur ; aucune référence d’objet de l’éditeur ne traverse cette frontière.

L’API conserve `Time`, `Input`, `Move`, `Rotate`, `Log`, `Get`, `Set`, `Signal`, `transform`, `gameObject`, `enabled`, `fields` et les commandes Animator. Les positions et propriétés d’entités reçues par le Worker sont des **instantanés**. L’éditeur applique les commandes de mouvement à sa physique, notamment Rapier ; la position obtenue après résolution des collisions est visible à l’image suivante.

Les écritures directes via `ctx.entity` sont limitées à `x`, `y`, `elevation3d`, `rotation`, `rotationX3d`, `rotationY3d`, `rotationZ3d`, `hp`, `lightIntensity`, `enabled`, `visible`, `lightEnabled`, avec validation des types et des nombres finis. Les autres écritures échouent explicitement. `ctx.entities` et `GetComponent` fournissent des données de lecture, pas des références modifiables aux composants de l’éditeur. Les scripts qui utilisaient `document`, le stockage, le réseau ou des composants arbitraires doivent être adaptés ; leurs sources sont conservées.

Limites : 64 composants actifs, source ≤ 1 Mo, champs ≤ 16 Ko, 1024 commandes par phase, messages bornés. Initialisation/module : 5 s maximum ; phase : 2 s maximum. Le Worker est détruit en cas de dépassement ou de Stop et les réponses périmées sont ignorées. Les réponses arrivant pendant une pause sont retenues et ne sont appliquées qu’à la reprise. Stop est une terminaison ferme : les effets de `OnDestroy` ne sont pas appliqués après l’arrêt de la scène. Pour un objet détaché pendant Play, les callbacks de nettoyage restent exécutés dans le Worker.

L’ancien chargeur injectable reste un outil de tests Node explicite. Le runtime navigateur par défaut ne comporte aucun repli vers l’import de code utilisateur dans l’éditeur. Les exports emportent le même runtime isolé et demandent la confiance à leur propre lancement.

## C#, Python et C++ locaux

L’exécution nécessite **Linux, Python 3, bubblewrap ≥ 0.8 et prlimit** ; C# nécessite aussi .NET 8, C++ un compilateur C++17. Les espaces de noms utilisateur doivent être autorisés par le système. Aucun repli sans isolation n’est disponible. Windows/macOS : backend d’isolation système restant à développer ; les sources restent éditables et exportables en JSON.

Le pont C# démarre un superviseur Python HTTP sur `127.0.0.1:8765`. Il génère un secret aléatoire de session affiché dans le terminal. Toutes les mutations exigent `X-WarLike-Token`, y compris compilation, synchronisation, simulation, Inspector et Stop. `GET /health` et les prévols CORS ne révèlent jamais le jeton. Le client refuse les anciens ponts sans authentification/isolation. Dans Window → C# Runtime et Script Studio, coller la clé dans le champ de session ; elle n’est pas enregistrée dans les stockages ni les projets.

Le superviseur démarre le runtime .NET par des pipes privés, dans un espace de noms réseau/PID/montage/utilisateur séparé : pas de socket HTTP dans le processus utilisateur. Le jeton et l’environnement du superviseur ne lui sont pas transmis. Les montages du système/runtime/assemblies sont en lecture seule, le dossier personnel et le `/tmp` de l’hôte sont absents. `/tmp` privé est limité à 64 Mo. Les descendants sont enfermés dans le même espace PID, détruit à la terminaison du sandbox. La création de nouveaux espaces utilisateur est interdite et les capacités Linux sont retirées.

Python/C++ utilisent le même lanceur. Seule la phase du compilateur C++ dispose d’un dossier de travail inscriptible ; l’exécution lit les sources/binaire en lecture seule et écrit dans son `/tmp` privé. Aucun secret d’environnement hérité. Un seul travail natif à la fois ; au plus 16 connexions HTTP et délai de lecture de 5 s. Hôtes et origines HTTP sont contrôlés et le contenu doit être JSON.

Limites par processus : mémoire virtuelle 512 Mo pour Python/C++, 4 Go pour .NET avec heap GC plafonné à 256 Mo ; CPU 15 s pour les outils et 300 s cumulées pour une session .NET ; 64 processus/threads (RLIMIT_NPROC), 128 descripteurs, fichiers ≤ 16 Mo, aucun core dump. Pour le démarrage du CLR, le plafond de fichier autorise temporairement son memfd W^X creux de 2 To ; le bootstrap abaisse ensuite irréversiblement le plafond dur à 16 Mo avant de lire une requête ou de charger un script utilisateur. W^X reste activé. Le budget .NET est cumulatif : redémarrer le pont après épuisement. Ce sont des limites OS par processus, pas un quota mémoire agrégé de cgroup.

Le superviseur borne les échanges .NET à 8 Mo, stderr à 48 Ko ; compilation 30 s, autre requête 3 s. Un dépassement détruit le monde natif et exige un redémarrage explicite ; l’éditeur conserve sa scène. Python/C++ : compilation 12 s, exécution 4 s et sortie 48 Ko par flux, lue progressivement ; dépassement = arrêt du groupe et du namespace, pas simple troncature après capture illimitée.

## Vérification

- `npm test`, `npm run typecheck`, `npm run test:export`.
- `python3 -m unittest discover -s tests -p '*_test.py' -v` ; en CI, `WARLIKE_REQUIRE_SANDBOX=1` interdit de masquer une isolation défaillante par un test ignoré.
- `node scripts/test-script-security-browser.mjs` : refus/confiance, scripts désactivés, stockage et réseau inaccessibles, commandes de jeu 2D/3D, boucle infinie et réponse après Stop.
- Tests réels du bridge .NET et de l’éditeur/export sur les jobs CI habituels. Les tests Python d’accès HTTP n’ont pas besoin de .NET et vérifient le refus des mutations avant lecture du corps.
