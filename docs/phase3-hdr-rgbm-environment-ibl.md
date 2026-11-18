# WarLike Engine — Premier environnement HDR/IBL WebGL1 (Phase 3)

## Objectif et portée

Cette étape remplace, lorsque WebGL1 dispose d'au moins huit unités de textures fragment, l'approximation spéculaire hémisphérique du shader PBR par des **cubemaps d'environnement réellement échantillonnées**. La radiance du ciel est produite de manière procédurale à partir de la direction, de la couleur et de l'intensité du soleil.

Le module `js/core/environment-ibl-3d.js` génère deux ensembles de six faces RGBM en textures RGBA8 : une représentation directionnelle 32 × 32 pour les surfaces plutôt lisses et une représentation plus large 16 × 16 pour les reflets diffus/rugueux. RGBM représente des valeurs linéaires HDR dans un intervalle allant jusqu'à environ 8, sans texture float obligatoire sur WebGL1.

Le shader de production `js/core/viewport-3d.js` :

1. Lit la radiance d'environnement selon la normale pour la contribution diffuse.
2. Lit les cubemaps selon le reflet de l'œil pour la contribution spéculaire.
3. Combine ces contributions selon métallicité, Fresnel, rugosité et occlusion ambiante GLB.
4. Préserve la BRDF GGX directe, les ombres solaires de la PR #79, les cartes GLB et les matériaux Unlit.
5. Réutilise le même renderer dans Scene, Game et l'export Web. Le module est ajouté à `runtime-files.json`.

Les cubemaps sont mises à jour seulement lorsque l'orientation/couleur/intensité solaire change suffisamment, pour éviter un recalcul à chaque frame. En l'absence d'unités de textures ou si l'allocation échoue, le shader conserve son approximation hémisphérique précédente.

## Vérifications

- `tests/environment-ibl-3d.test.mjs` : encodage/décodage RGBM, orientations cubemap et source HDR.
- `tests/pbr-browser-fixture.mjs` : lecture de vrais pixels du shader GLB en Chromium, comparaison des métaux lisses/rugueux sous IBL et stabilité du mode Unlit.
- Les Quality Gates, l'export autonome et `complete-3d` doivent être réussis avant toute fusion.

## Limites explicites

Ce jalon ajoute un environnement HDR **procédural**, pas encore l'import de panoramas `.hdr`/`.exr`, la capture de sondes dans la scène, ni un environnement local par pièce. Les deux cubemaps ne sont **pas des mips préfiltrés GGX selon l'intégrale glTF**, et le diffuse n'est pas une convolution irradiance physiquement complète : il s'agit d'une approximation visuelle intermédiaire. Il n'y a pas encore de réflexions écran SSR, de réfraction, de probe par zone ni de corrections de parallaxe.

Il faut continuer les tests réels de matériaux GLB, d'éclairage intérieur et de performance sur GPU physique avant de considérer le rendu comparable à URP/HDRP.
