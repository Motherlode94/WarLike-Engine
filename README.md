# WarLike Studio — Moteur et éditeur de jeux 2D / 3D

Éditeur de jeux web expérimental, avec **WarLike Hub**, bibliothèques d'assets 2D/3D, mode Play, Inspector, séquences logiques sans code et import de modèles 3D glTF binaires.

**[Lire la documentation complète en français](./docs/index.html)** · [Démonstration en ligne](https://warlike-engine.pages.dev/) · [Guide des vrais prefabs 3D](./REAL-3D-PREFABS-BETA72.md) · [Logic Sequences](./LOGIC-SEQUENCES-BETA7.md)

## Démarrer

1. Ouvrir `index.html` depuis un serveur statique ou utiliser la version Cloudflare Pages.
2. Dans **WarLike Hub**, créer un projet nommé et choisir **2D** ou **3D**.
3. Dans **Project / Assets**, sélectionner un asset puis le glisser dans la scène.
4. Ajuster les propriétés dans **Inspector**, puis lancer **Play**.
5. Exporter la scène en JSON pour conserver une sauvegarde externe.

## Prefabs réels 3D

La Beta.7.2 référence des modèles GLB de démonstration du catalogue Khronos et permet l'import temporaire de modèles personnels `.glb` (jusqu'à 25 Mo). Les personnages, armes, véhicules et autres GLB sont affichés par leurs triangles lorsque leur format est pris en charge, mais le moteur ne gère pas encore tous les matériaux, les textures, les animations ou la physique d'un moteur professionnel. Les binaires GLB locaux **ne sont pas inclus dans l'export JSON**.

## Tests

```bash
npm install
npm test
npm run typecheck
```

La couverture est partielle : des contrôles d'intégration dans les navigateurs restent nécessaires.

## Déploiement

Le dépôt peut être hébergé sur Cloudflare Pages en site statique (framework : None, répertoire de sortie : `/`). La sauvegarde dans le Hub repose principalement sur le stockage local du navigateur.

## Licences et provenance

Le code WarLike Studio est un prototype original. Certains modèles de démonstration sont chargés à distance depuis [Khronos glTF Sample Assets](https://github.com/KhronosGroup/glTF-Sample-Assets) ; **leurs licences propres doivent être vérifiées pour tout usage ou redistribution**. L'import local exige que l'utilisateur dispose des droits sur ses modèles.
