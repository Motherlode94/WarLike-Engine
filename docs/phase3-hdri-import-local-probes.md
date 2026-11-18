# WarLike Engine — Import HDRI Radiance, préfiltrage GGX et zones d'influence (phase 3)

## Importer un vrai environnement HDR

Dans **✦ Rendu → HDRI (.hdr Radiance)**, sélectionner un fichier Radiance RGBE/RLE (`.hdr`, `.pic`). Le décodeur `hdr-radiance-3d.js` vérifie le format, les dimensions (4 Mpx maximum), le RLE et la taille du fichier (64 Mio maximum). Le panorama équirectangulaire est échantillonné et converti en deux cubemaps RGBM WebGL1.

- Cubemap de réflexion nette : préfiltrage directionnel GGX avec séquence Hammersley.
- Cubemap ambiante : convolution cosinus pour l'irradiance diffuse.
- Le shader glTF intègre métallicité, Fresnel, normales, rugosité, AO et utilise les cubemaps sous la même exécution Scene/Game. Les ombres solaires restent actives.
- Un bouton **Retirer le HDRI** restaure le ciel procédural.
- L'import est **limité à la session navigateur actuelle** : persistance du binaire, dépendances de projet et intégration des octets dans l'archive exportée restent à développer. L'export contient le moteur de décodage, **pas** automatiquement les fichiers HDRI choisis par l'utilisateur.

## Zones de réflexion locales

Le composant **Zone de réflexion HDR 3D** (`environmentProbe3d`) possède `enabled`, `radius`, `strength` et `tint`. Le moteur évalue jusqu'à quatre volumes d'influence, avec attenuation radiale, pour moduler la radiance HDRI reçue selon la position réelle du fragment 3D. La configuration du composant est sérialisée dans les scènes V2.

**Limite :** ce composant ne capture pas encore la scène depuis six directions et n'associe pas de cubemap différente à chaque volume. Il constitue un premier système de **blending spatial local**, pas des *Reflection Probes* physiquement complètes comme dans Unity. La capture, l'actualisation par zone, les frontières box et la parallaxe restent au programme.

## Qualité et limites du préfiltrage

Les séquences Hammersley + GGX et la convolution cosinus sont présentes dans `ibl-prefilter-3d.js`. Le shader WebGL1 conserve cependant **deux niveaux de texture** (net et large) plutôt qu'une pyramide de mipmaps GGX et une LUT BRDF intégrée : la transition de rugosité reste approximative.

Tests : `tests/hdr-radiance-ibl-prefilter.test.mjs`, `tests/environment-probes-3d.test.mjs`, puis compilation WebGL Chromium et les contrôles Play/export du moteur. Un essai sur de véritables intérieurs GLB reste obligatoire avant une déclaration de parité visuelle.
