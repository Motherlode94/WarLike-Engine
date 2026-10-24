# WarLike Studio 3.0 Beta.7 — Logic Sequences

An original no-code event sequencer influenced by the architecture of Game Creator 2; **not** a copy of Game Creator's code or Unity components.

## Where to find it
Select any 2D or 3D object. In **Inspector**, expand **Logic Sequences** and choose **Add Logic Sequence** or one of the example presets (Locked Door, Switch, Timed Event).

## Triggers
Start, Interact (player within radius + key press), Enter, Exit, Key Down, Interval, Signal Receive. Optional Run Once.

## Conditions and branches
Boolean AND condition lists, comparative global/local variables, distance threshold, object enabled, inversion, and ordered IF / ELSE IF / ELSE branches. Only the first matching branch executes; the fallback runs when no branch matches.

## Instructions
- Display message in 2D HUD or 3D status area
- Set/Add a global variable, set object-local variable
- Wait (nonblocking continuation)
- Move object, set color, enable/disable target, remove source
- Emit named signal to other sequences in subsequent simulation ticks
- Reorder/disable/remove individual instructions in the Inspector

## Play/Stop and persistence
Sequences are executed by the **2D Play update** or the **independent 3D Play update**. Runtime globals, cooldowns and scheduled jobs are reset on Play/Stop. The authored `sequence` property is included in scene JSON import/export; named Hub project snapshots save the object data. All logic executes locally, without a multiplayer server.

## Limits
The runtime currently supports one primary sequence component per object, up to 256 actions per update, 100 pending jobs and 64 queued signals. No visual wire-based node graph, debugger breakpoints, persistent game-save variables, sophisticated 3D physics events, or network replication yet. Legacy 2D Visual Logic remains available alongside the new sequencer.

## Verification
Standalone JS syntax validation and a targeted runtime smoke check passed (start -> wait -> add variable). Added regression tests for triggers, branch selection, ELSE fallback, timed continuation, signals and keyboard edge detection. The complete repo test suite and browser/WebGL validation are not yet confirmed.
