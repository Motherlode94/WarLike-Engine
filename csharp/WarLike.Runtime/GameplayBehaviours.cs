using System.Numerics;
namespace WarLike.Runtime;

/// <summary>Composable health and regeneration behaviour for WarLike actors.</summary>
public sealed class HealthComponent : WarLikeBehaviour {
    [InspectorField("Régénération / seconde", SceneKeys = "regen", Min = 0, Max = 10000)]
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
    [InspectorField("Vitesse (m/s)", SceneKeys = "vx,vy,vz", Min = -1000, Max = 1000)]
    public Vector3 UnitsPerSecond { get; set; }
    public override void Update(float deltaTime) => Actor.Position += UnitsPerSecond * deltaTime;
}
/// <summary>Simple seek steering; keeps positions in the same unit system as scene import.</summary>
public sealed class FollowActorComponent : WarLikeBehaviour {
    [InspectorField("ID de la cible", SceneKeys = "targetId", Min = 0, Max = int.MaxValue)]
    public int TargetId { get; set; }
    [InspectorField("Vitesse (m/s)", SceneKeys = "speed", Min = 0, Max = 1000)]
    public float Speed { get; set; } = 2f;
    [InspectorField("Distance d'arrêt (m)", SceneKeys = "stopDistance", Min = 0, Max = 1000)]
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

/// <summary>Fixed-timestep gravity and ground collision. World Y is vertical.</summary>
public sealed class RigidbodyComponent : WarLikeBehaviour {
    [InspectorField("Gravité (m/s²)", SceneKeys = "gravity", Min = 0, Max = 1000)]
    public float Gravity { get; set; } = 15f;
    [InspectorField("Rebond", SceneKeys = "restitution", Min = 0, Max = 1, Step = .05)]
    public float Restitution { get; set; } = 0.15f;
    [InspectorField("Sol (m)", SceneKeys = "groundHeight", Min = -10000, Max = 10000)]
    public float GroundHeight { get; set; } = 0f;
    [InspectorField("Amortissement horizontal", SceneKeys = "friction", Min = 0, Max = 1, Step = .005)]
    public float HorizontalDamping { get; set; } = 0.985f;
    public override void FixedUpdate(float fixedDeltaTime) {
        if (!float.IsFinite(fixedDeltaTime) || fixedDeltaTime <= 0) return;
        var velocity = Actor.Velocity;
        velocity.Y -= Math.Clamp(Gravity, 0, 1000) * fixedDeltaTime;
        var position = Actor.Position + velocity * fixedDeltaTime;
        if (position.Y < GroundHeight) {
            position.Y = GroundHeight;
            velocity.Y = MathF.Abs(velocity.Y) > 0.5f
                ? -velocity.Y * Math.Clamp(Restitution, 0, 1) : 0;
            var damping = MathF.Pow(Math.Clamp(HorizontalDamping, 0, 1), fixedDeltaTime * 60f);
            velocity.X *= damping;
            velocity.Z *= damping;
        }
        Actor.Position = position;
        Actor.Velocity = velocity;
    }
}
