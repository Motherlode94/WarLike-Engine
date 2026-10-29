using System.Numerics;

namespace WarLike.Runtime;

public enum SquadOrder { Hold, Move, Follow }

/// <summary>Fixed-step formation steering. Does not replace navigation or a collision solver.</summary>
public sealed class TacticalSquadComponent : WarLikeBehaviour {
    private int[] _memberIds = [];
    private Vector3 _destination;
    private int _followId;
    [InspectorField("Vitesse (m/s)", SceneKeys = "speed", Min = .1, Max = 30)]
    public float Speed { get; set; } = 3;
    [InspectorField("Espacement (m)", SceneKeys = "spacing", Min = .25, Max = 20)]
    public float Spacing { get; set; } = 1.5f;
    [InspectorField("Distance de suivi (m)", SceneKeys = "followDistance", Min = 0, Max = 100)]
    public float FollowDistance { get; set; } = 4;
    [InspectorField("Membres inscrits")]
    public int MemberCount => _memberIds.Length;
    public IReadOnlyList<int> MemberIds => Array.AsReadOnly(_memberIds);
    public SquadOrder Order { get; private set; } = SquadOrder.Hold;
    public Vector3 Destination => _destination;
    public void SetMembers(IEnumerable<int> ids) {
        var members = ids.ToArray();
        if (members.Length > 64 || members.Any(id => id <= 0) || members.Distinct().Count() != members.Length)
            throw new ArgumentException("Expected at most 64 unique positive member IDs.");
        if (Actor is not null && members.Contains(Actor.Id)) throw new ArgumentException("The squad controller cannot be its own member.");
        World?.ValidateSquadMembers(this, members);
        _memberIds = members;
    }
    public void MoveTo(Vector3 destination) {
        if (!float.IsFinite(destination.X) || !float.IsFinite(destination.Y) || !float.IsFinite(destination.Z) ||
            Math.Abs(destination.X) > 1_000_000 || Math.Abs(destination.Z) > 1_000_000)
            throw new ArgumentException("Destination must be finite and within one million metres.");
        _destination = new(destination.X, Actor.Position.Y, destination.Z); _followId = 0; Order = SquadOrder.Move;
    }
    public void Hold() { Order = SquadOrder.Hold; _followId = 0; }
    public void Follow(int actorId) {
        var target = World.Actors.FirstOrDefault(a => a.Id == actorId && a.Enabled && a.Health > 0);
        if (target is null || actorId == Actor.Id || _memberIds.Contains(actorId))
            throw new ArgumentException("Follow target must be a live actor outside the squad.");
        _followId = actorId; Order = SquadOrder.Follow;
    }
    public override void FixedUpdate(float dt) {
        if (Order == SquadOrder.Hold || Actor.Health <= 0 || !float.IsFinite(Speed) || Speed <= 0 || !float.IsFinite(Spacing) || Spacing <= 0) return;
        var actors = World.Actors.ToDictionary(a => a.Id);
        if (Order == SquadOrder.Follow) {
            if (!actors.TryGetValue(_followId, out var target) || !target.Enabled || target.Health <= 0) { Hold(); return; }
            var delta = target.Position - Actor.Position; delta.Y = 0;
            float distance = delta.Length();
            if (distance > Math.Max(0, FollowDistance) && distance > .001f)
                _destination = new Vector3(target.Position.X, Actor.Position.Y, target.Position.Z) - delta / distance * Math.Max(0, FollowDistance);
            else _destination = Actor.Position;
        }
        var heading = _destination - Actor.Position; heading.Y = 0;
        if (heading.LengthSquared() > .000001f) Actor.Rotation = MathF.Atan2(heading.X, -heading.Z) * 180 / MathF.PI;
        Actor.Position = Approach(Actor.Position, _destination, Speed * dt);
        float angle = Actor.Rotation * MathF.PI / 180;
        var right = new Vector3(MathF.Cos(angle), 0, MathF.Sin(angle));
        var back = new Vector3(-MathF.Sin(angle), 0, MathF.Cos(angle));
        bool arrived = Vector3.DistanceSquared(Actor.Position, _destination) < .0001f;
        for (int slot = 0; slot < _memberIds.Length; slot++) {
            if (!actors.TryGetValue(_memberIds[slot], out var member) || !member.Enabled || member.Health <= 0) continue;
            var offset = right * ((slot % 2 - .5f) * Spacing) + back * ((slot / 2 + 1) * Spacing);
            var goal = Actor.Position + offset; goal.Y = member.Position.Y;
            member.Position = Approach(member.Position, goal, Speed * 1.25f * dt);
            member.Rotation = Actor.Rotation;
            arrived &= Vector3.DistanceSquared(member.Position, goal) < .0001f;
        }
        if (arrived && Order == SquadOrder.Move) Hold();
    }
    private static Vector3 Approach(Vector3 from, Vector3 to, float step) {
        // Ground-plane steering preserves each actor's elevation.
        to.Y = from.Y;
        var delta = to - from; float distance = delta.Length();
        return distance <= step || distance < .00001f ? to : from + delta / distance * step;
    }
}
