using System.Numerics;

namespace WarLike.Runtime;

// Reusable match systems for the standalone .NET runtime.
public enum MatchPhase { Waiting, Countdown, Playing, Finished }
public sealed class DeathmatchRulesComponent : WarLikeBehaviour {
    public float MatchDuration { get; set; } = 600;
    public int ScoreLimit { get; set; } = 25;
    public float Countdown { get; set; } = 3;
    public MatchPhase Phase { get; private set; } = MatchPhase.Waiting;
    public float Remaining { get; private set; }
    public event Action<MatchPhase>? PhaseChanged;
    public void Begin() { Remaining = MathF.Max(0, Countdown); SetPhase(MatchPhase.Countdown); }
    private void SetPhase(MatchPhase phase) { if (Phase == phase) return; Phase = phase; PhaseChanged?.Invoke(phase); }
    public override void Update(float dt) {
        if (Phase != MatchPhase.Countdown && Phase != MatchPhase.Playing) return;
        Remaining = MathF.Max(0, Remaining - dt);
        if (Remaining > 0) return;
        if (Phase == MatchPhase.Countdown) { Remaining = MathF.Max(0, MatchDuration); SetPhase(MatchPhase.Playing); }
        else SetPhase(MatchPhase.Finished);
    }
    public void EvaluateScore(IEnumerable<Actor> players) {
        if (Phase != MatchPhase.Playing || ScoreLimit <= 0) return;
        if (players.Any(p => (p.GetComponent<ScoreComponent>()?.Kills ?? 0) >= ScoreLimit)) SetPhase(MatchPhase.Finished);
    }
}
public sealed class SpawnPointComponent : WarLikeBehaviour {
    public int TeamId { get; set; } = -1;
    public float Radius { get; set; } = 1;
    public bool AllowsTeam(int team) => TeamId < 0 || TeamId == team;
}
public sealed class AmmoPickupComponent : WarLikeBehaviour {
    public int Amount { get; set; } = 30;
    public bool Consumed { get; private set; }
    public bool Collect(Actor player) {
        if (Consumed || Amount <= 0) return false;
        var weapon = player.GetComponent<WeaponComponent>();
        if (weapon is null) return false;
        weapon.Reload(); Consumed = true; return true;
    }
}
public sealed class HealthPickupComponent : WarLikeBehaviour {
    public float HealAmount { get; set; } = 35;
    public bool Consumed { get; private set; }
    public bool Collect(Actor player) {
        if (Consumed || HealAmount <= 0 || player.Health <= 0 || player.Health >= player.MaxHealth) return false;
        player.Health = MathF.Min(player.MaxHealth, player.Health + HealAmount); Consumed = true; return true;
    }
}
public sealed class KillZoneComponent : WarLikeBehaviour {
    public float Damage { get; set; } = 10000;
    public void OnActorEntered(Actor target) => target.GetComponent<DamageableComponent>()?.ApplyDamage(MathF.Max(0, Damage));
}
public sealed class ObjectiveZoneComponent : WarLikeBehaviour {
    public int TeamId { get; set; } = -1;
    public float CaptureTime { get; set; } = 10;
    public float Progress { get; private set; }
    public bool Captured => Progress >= MathF.Max(0.01f, CaptureTime);
    public void Capture(float dt, int teamId) {
        if (!float.IsFinite(dt) || dt < 0) throw new ArgumentOutOfRangeException(nameof(dt));
        if (TeamId >= 0 && TeamId != teamId) return;
        Progress = MathF.Min(MathF.Max(0.01f, CaptureTime), Progress + dt);
    }
    public void ResetCapture() => Progress = 0;
}
public sealed class ProjectileComponent : WarLikeBehaviour {
    public Vector3 Direction { get; set; } = Vector3.UnitZ;
    public float Speed { get; set; } = 30;
    public float Lifetime { get; set; } = 5;
    public float Damage { get; set; } = 20;
    public override void Update(float dt) {
        if (Lifetime <= 0) { World.RemoveActor(Actor); return; }
        Actor.Position += Vector3.Normalize(Direction == Vector3.Zero ? Vector3.UnitZ : Direction) * MathF.Max(0, Speed) * dt;
        Lifetime -= dt;
    }
    public void Hit(Actor target, Actor? owner = null) {
        target.GetComponent<DamageableComponent>()?.ApplyDamage(MathF.Max(0, Damage), owner);
        World.RemoveActor(Actor);
    }
}
