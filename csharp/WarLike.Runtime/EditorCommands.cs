using System;
using System.Collections.Generic;

namespace WarLike.Runtime;

/// <summary>Typed command contract for a future desktop/WASM editor bridge.</summary>
public enum EditorCommandKind {
    CreateActor, DeleteActor, RenameActor, SetPosition, StartPlay, StopPlay
}

public sealed record EditorCommand(
    EditorCommandKind Kind,
    int? ActorId = null,
    string? Name = null,
    float? X = null,
    float? Y = null,
    float? Z = null);

public sealed record EditorCommandResult(bool Success, string Message, int? ActorId = null);

/// <summary>
/// UI-independent command dispatcher. No browser APIs are used.
/// Commands are validated before touching the runtime.
/// </summary>
public sealed class EditorCommandDispatcher {
    private readonly GameWorld _world;
    private readonly Func<IReadOnlyList<Actor>> _actors;
    private readonly Func<Actor, bool> _remove;
    private readonly Func<string, Actor> _create;

    public EditorCommandDispatcher(
        GameWorld world,
        Func<IReadOnlyList<Actor>> actors,
        Func<string, Actor> create,
        Func<Actor, bool> remove) {
        _world = world ?? throw new ArgumentNullException(nameof(world));
        _actors = actors ?? throw new ArgumentNullException(nameof(actors));
        _create = create ?? throw new ArgumentNullException(nameof(create));
        _remove = remove ?? throw new ArgumentNullException(nameof(remove));
    }

    public EditorCommandResult Execute(EditorCommand command) {
        if (command is null) throw new ArgumentNullException(nameof(command));
        if (command.Kind == EditorCommandKind.CreateActor) {
            var createdActor = _create(string.IsNullOrWhiteSpace(command.Name) ? "GameObject" : command.Name.Trim());
            return new(true, "Actor created", createdActor.Id);
        }
        Actor? actor = null;
        if (command.Kind is EditorCommandKind.DeleteActor or EditorCommandKind.RenameActor or EditorCommandKind.SetPosition) {
            if (!command.ActorId.HasValue) return new(false, "ActorId is required");
            foreach (var candidate in _actors()) {
                if (candidate.Id == command.ActorId.Value) { actor = candidate; break; }
            }
            if (actor is null) return new(false, "Actor not found");
        }
        switch (command.Kind) {
            case EditorCommandKind.DeleteActor:
                return new(_remove(actor!), "Actor removal requested", actor!.Id);
            case EditorCommandKind.RenameActor:
                if (string.IsNullOrWhiteSpace(command.Name)) return new(false, "Name is required");
                actor!.Name = command.Name.Trim();
                return new(true, "Actor renamed", actor.Id);
            case EditorCommandKind.SetPosition:
                if (command.X is null || command.Y is null || command.Z is null) return new(false, "X, Y and Z are required");
                if (!float.IsFinite(command.X.Value) || !float.IsFinite(command.Y.Value) || !float.IsFinite(command.Z.Value)) return new(false, "Position must be finite");
                actor!.Position = new(command.X.Value, command.Y.Value, command.Z.Value);
                return new(true, "Position updated", actor.Id);
            case EditorCommandKind.StartPlay:
            case EditorCommandKind.StopPlay:
                return new(false, "Play control requires a runtime host");
            default:
                return new(false, "Unsupported command");
        }
    }
}
