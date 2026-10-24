# WarLike Studio — Lighting & Spatial Audio (3.0.0-beta.3)

New rendering/scene components implemented in the existing WebGL 3D Beta, without deleting 2D mode.

## Lighting
- Per-fragment shading: sun directional contribution, adjustable daylight / nighttime ambient, colored point lights and conical spotlights (maximum **eight** nearby per frame).
- Lighting calculations are performed in the WebGL fragment shader; objects still use simplified primitive meshes, not imported 3D models.
- Toolbar provides local scene hour slider and **Jour/Nuit** automatic clock cycling when Play is running.
- Add light sources via **☀ Point Light** or **🔦 Spot** in toolbar.
- Inspector -> **Lighting 3D Beta** configures type, enabled, color, intensity, range and spot angle. Use Transform rotation for horizontal spotlight direction and Height 3D for elevation.
- Scene JSON exports lighting environment and per-object components (format v4); imported scenes from earlier versions remain supported.
- The renderer has **no shadow maps, global illumination, PBR, IES profiles or physically-based exposure** in this beta.

## Audio
- Add **♫ Audio Source** in the toolbar. Inspector -> Audio Source Beta configures built-in generated cue, clip, volume, range, repeat interval, looping, stereo spatial panning and enable switch.
- Audio sources follow objects dynamically while playing; the first character/player is the simplified 2D listener.
- Can choose and decode local WAV/MP3/OGG clips in the Inspector. Browser support varies by codec.
- Local imported sound bytes are session-only; JSON stores the filename/reference but **not the actual audio bytes**. Reimport after page reload. Maximum upload: 18 MiB.
- Native Web Audio API: oscillator cues, decoded buffer clips, gain controls, stereo panning and distance attenuation.
- Preview via **▶ Écouter** button after browser audio has been unlocked by clicking.
- No server upload, no cloud audio storage, no reflections/reverb simulation or 3D HRTF in this beta.

## Sample scene and tests
- Game -> Démo 3D Beta now includes a warm streetlamp, cool security spotlight, and a procedural generator Audio Source.
- New `tests/lighting-audio-beta3.test.mjs`: solar position, light coordinates, local light selection, day-night progression, sound distance falloff.
- Syntax checked, and CPU calculations smoke-tested. **No end-to-end browser WebGL rendering/audio listening test was run and live Cloudflare Pages deployment was not verified.**

See `WARLIKE-3D-BETA.md` and `AUDIO-3D-BETA2.md` for earlier Beta capabilities.
