# WarLike Studio 3D Beta.2 — Audio

Audio system implemented using native browser Web Audio (procedural synthesizer, not downloadable samples). No external assets or third-party audio libraries.

- **16 synthesized cues:** shot, laser, impact, hurt, pickup, heal, door, switch, vehicle, brake, step, checkpoint, teleport, explosion, victory and click.
- Wired to **combat, footsteps, house doors and lights, entering and exiting vehicles, interactive elements, health, traps and teleports**.
- Toolbar controls: **🔊 Son / 🔇 Muet** and volume slider 0–100%. Settings persist in localStorage (`warlike.audio.v1`).
- Browser autoplay limitations: first click or key gesture unlocks AudioContext. Some browsers/devices may not support Web Audio; game continues silently in that case.
- Individual effects use oscillator sweeps rather than WAV/MP3 sounds. Realistic engine loops, spatial audio, music buses, audio file importing and advanced mixer are not yet implemented.
- Automated tests: `tests/audio-beta.test.mjs`. JS syntax checks done; browser/device listening test and deployment verification still pending.

Repo version: 3.0.0-beta.2. Both 2D gameplay and experimental WebGL 3D view use the same sound events because the gameplay simulator remains 2D under the 3D preview.
