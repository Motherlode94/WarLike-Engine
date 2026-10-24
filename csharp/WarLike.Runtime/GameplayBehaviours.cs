using System.Numerics;
namespace WarLike.Runtime;

/// <summary>Composable health and regeneration behaviour for WarLike actors.</summary>
public sealed class HealthComponent : WarLikeBehaviour {
    public float RegenerationPerSecond { get; set; }
    public override void Update(float deltaTime) {
        if (!float.IsFinite(RegenerationPerSecond)) return;
        Actor.Health = Math.Clamp(Actor.Health + RegenerationPerSecond * deltaTime, 0, Math.Max(1, Actor.MaxHealth));
    }
    public float TakeDamage(float amount) {
        if (!float.IsFinite(amount) || amount < 0) throw new ArgumentOutOfRangeException(nameof(amount));
        Actor.Health = Math.Max(0, Actor.Health - amount);
        return Actor.Health;
    }
}
/// <summary>Constant-velocity native gameplay component, units are meters/second.</summary>
public sealed class LinearMotionComponent : WarLikeBehaviour {
    public Vector3 UnitsPerSecond { get; set; }
    public override void Update(float deltaTime) => Actor.Position += UnitsPerSecond * deltaTime;
}
/// <summary>Simple seek steering; keeps positions in the same unit system as scene import.</summary>
public sealed class FollowActorComponent : WarLikeBehaviour {
    public int TargetId { get; set; }
    public float Speed { get; set; } = 2f;
    public float StopDistance { get; set; } = 1f;
    public override void Update(float deltaTime) {
        var target = World.Actors.FirstOrDefault(a => a.Id == TargetId && a.Enabled);
        if (target is null || !float.IsFinite(Speed) || Speed <= 0) return;
        var vector = target.Position - Actor.Position;
        var length = vector.Length();
        if (length <= Math.Max(0, StopDistance) || length < 0.00001f) return;
        Actor.Position += Vector3.Normalize(vector) * Math.Min(Speed * deltaTime, length - Math.Max(0, StopDistance));
    }
}
