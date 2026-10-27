using System.Numerics;

namespace WarLike.Runtime;

// Standalone .NET gameplay components. Network replication is not implemented.
public sealed class TeamComponent : WarLikeBehaviour {
    public int TeamId { get; set; }
    public bool FriendlyFire { get; set; }
    public bool IsFriendly(Actor other) {
        var team = other.GetComponent<TeamComponent>();
        return team is not null && team.TeamId == TeamId;
    }
}
public sealed class DamageableComponent : WarLikeBehaviour {
    public float Armor { get; set; }
    public bool Invulnerable { get; set; }
    public bool IsDead => Actor.Health <= 0;
    public float ApplyDamage(float damage, Actor? source = null) {
        if (!float.IsFinite(damage) || damage < 0) throw new ArgumentOutOfRangeException(nameof(damage));
        if (Invulnerable || IsDead) return 0;
        var team = GetComponent<TeamComponent>();
        if (source is not null && source != Actor && team is not null && team.IsFriendly(source) && !team.FriendlyFire) return 0;
        var dealt = MathF.Min(Actor.Health, damage * (100f / (100f + MathF.Max(0, Armor))));
        Actor.Health -= dealt;
        if (Actor.Health <= 0) GetComponent<ScoreComponent>()?.RegisterDeath();
        return dealt;
    }
}
public sealed class ScoreComponent : WarLikeBehaviour {
    public int Kills { get; private set; }
    public int Deaths { get; private set; }
    public int Assists { get; private set; }
    public void RegisterKill() => Kills++;
    public void RegisterDeath() => Deaths++;
    public void RegisterAssist() => Assists++;
}
public sealed class WeaponComponent : WarLikeBehaviour {
    public float Damage { get; set; } = 25;
    public float FireRate { get; set; } = 8;
    public int MagazineSize { get; set; } = 30;
    public int Ammo { get; private set; } = 30;
    private float _cooldown;
    public override void Update(float dt) => _cooldown = MathF.Max(0, _cooldown - dt);
    public bool TryFire(Actor target) {
        if (Ammo <= 0 || _cooldown > 0 || FireRate <= 0 || !float.IsFinite(FireRate)) return false;
        var damageable = target.GetComponent<DamageableComponent>();
        if (damageable is null) return false;
        Ammo--; _cooldown = 1f / FireRate;
        var wasAlive = !damageable.IsDead;
        damageable.ApplyDamage(MathF.Max(0, Damage), Actor);
        if (wasAlive && damageable.IsDead) GetComponent<ScoreComponent>()?.RegisterKill();
        return true;
    }
    public void Reload() => Ammo = Math.Max(0, MagazineSize);
}
public sealed class RespawnComponent : WarLikeBehaviour {
    public float Delay { get; set; } = 5;
    public Vector3 SpawnPosition { get; set; }
    private float _remaining = -1;
    public override void Start() => SpawnPosition = Actor.Position;
    public override void Update(float dt) {
        if (Actor.Health > 0) { _remaining = -1; return; }
        if (_remaining < 0) _remaining = MathF.Max(0, Delay);
        _remaining -= dt;
        if (_remaining <= 0) { Actor.Position = SpawnPosition; Actor.Health = MathF.Max(1, Actor.MaxHealth); _remaining = -1; }
    }
}
