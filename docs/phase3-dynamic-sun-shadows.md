# WarLike Engine — Ombres du soleil dynamiques (Phase 3)

## Implémentation

Le renderer WebGL1 crée désormais une **carte d'ombres directionnelle** 1024² en RGBA8, avec un tampon de profondeur attaché. Aucun prérequis `WEBGL_depth_texture` n'est nécessaire : la profondeur est encodée dans les trois canaux RGB et décodée dans le shader PBR existant.

À chaque frame 3D sous un soleil actif, le renderer :

1. Prépare les commandes opaques de la scène en conservant les buffers GLB et leurs poses animées.
2. Rejoue exactement ces commandes dans la framebuffer du soleil, avec la projection orthographique de la lumière, les mêmes Transform et corrections affines.
3. Dessine la scène normale en réutilisant la carte d'ombres pour réduire **uniquement la lumière directe du soleil** lorsqu'un pixel est occulté. Une moyenne de 2 × 2 lectures (PCF) adoucit légèrement les contours.
4. Dessine ensuite les surfaces transparentes et les effets dans leur ordre habituel.

Le panneau **✦ Rendu** de l'éditeur propose maintenant le réglage **Ombres du soleil 3D**, activé par défaut et persistant dans les réglages locaux. Désactiver ce réglage supprime entièrement la passe supplémentaire pour économiser le GPU.

Par défaut, les objets opaques projettent une ombre. Mettre `castShadows:false` sur un GameObject permet de l'exclure de la passe d'occultation. Les autres effets PBR (métallicité, rugosité, Fresnel, AO, émission, brouillard) restent dans le shader existant.

La même passe est intégrée au module de renderer partagé par Scene, Game et l'export Web autonome. Le fichier `js/core/shadow-map-3d.js` est ajouté explicitement au manifeste d'export.

## Quality Gates

- `tests/shadow-map-3d.test.mjs` : repère orthographique robuste sur plusieurs orientations solaires et projection stable.
- `scripts/test-3d-pbr-browser.mjs` + `tests/shadow-browser-fixture.mjs` : vraie carte d'ombres et shader de production dans Chromium ; un obstacle proche assombrit un receveur, l'obstacle déplacé ne l'assombrit plus.
- Tests existants `complete-3d`, `runtime-acceptance`, `core-and-export` : non-régression du rendu GLB et de l'export autonome.

## Limites du premier lot

- **Soleil seulement** : pas encore d'ombres omnidirectionnelles de point lights, de cone shadow maps pour spotlights ni de cascaded shadow maps (CSM).
- Couverture locale autour de la caméra (shadow extent ≈ 38 m) : les vastes terrains peuvent afficher des transitions à la limite de la carte.
- WebGL1 1024², profondeur RGBA8, filtrage 2×2 : aliasing, acne et peter-panning possibles sur des surfaces fortement inclinées ou à grande distance. La qualité et la résolution sont fixes pour l'instant.
- Les objets GLB transparents ne sont pas des casters dans cette première passe ; les surfaces opaques GLB, les personnages et les primitives sont les premiers cas couverts.
- Test GPU sur Chromium headless ≠ certification visuelle sur un véritable GPU : contrôle à mener en Play avec CHAMBRE 07 et une scène de GLB réels, puis après export.

Aucun asset tiers ni nouveau format de projet n'est nécessaire. La disponibilité WebGL et les performances devront être évaluées en navigateur sur des machines réelles.
