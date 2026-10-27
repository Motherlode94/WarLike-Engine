using System.Numerics;
using System.Text.Json;

namespace WarLike.Runtime;

public sealed class Actor {
    public int Id { get; set; }
    public string Name { get; set; } = "Actor";
    public Vector3 Position { get; set; }
    public Vector3 Velocity { get; set; }
    public float Health { get; set; } = 100;
    public float Rotation { get; set; }
    public float SpinSpeed { get; set; }
    public float MaxHealth { get; set; } = 100;
    public bool Enabled { get; set; } = true;
    public Dictionary<string, object> Properties { get; } = new();
    public T? Get<T>(string key) where T : class => Properties.TryGetValue(key, out var value) ? value as T : null;
    internal GameWorld? World { get; set; }
    public T? GetComponent<T>() where T : WarLikeBehaviour => World?.GetComponent<T>(this);
    public bool TryGetComponent<T>(out T? component) where T : WarLikeBehaviour { component = GetComponent<T>(); return component is not null; }
    public T AddComponent<T>(T component) where T : WarLikeBehaviour => World?.AddComponent(this, component) ?? throw new InvalidOperationException("Actor is not attached to a world.");
}

public abstract class WarLikeBehaviour {
    public Actor Actor { get; internal set; } = null!;
    public GameWorld World { get; internal set; } = null!;
    public virtual void Awake() { }
    public virtual void Start() { }
    public virtual void Update(float deltaTime) { }
    public virtual void FixedUpdate(float fixedDeltaTime) { }
    public virtual void LateUpdate(float deltaTime) { }
    public virtual void OnEnable() { }
    public virtual void OnDisable() { }
    public T? GetComponent<T>() where T : WarLikeBehaviour => Actor.GetComponent<T>();
    public T AddComponent<T>(T component) where T : WarLikeBehaviour => Actor.AddComponent(component);
    public virtual void OnDestroy() { }
}

public sealed class GameWorld {
    private readonly List<Actor> _actors = new();
    private readonly List<WarLikeBehaviour> _behaviours = new();
    private readonly Queue<Action> _pending = new();
    private float _accumulator;
    private bool _started;
    public float FixedDeltaTime { get; set; } = 1f / 60f;
    public IReadOnlyList<Actor> Actors => _actors.AsReadOnly();
    public Actor CreateActor(string name, Vector3 position) {
        var actor = new Actor { Id = _actors.Count == 0 ? 1 : _actors.Max(a => a.Id) + 1, Name = name, Position = position, World = this };
        _actors.Add(actor); return actor;
    }
    public T? GetComponent<T>(Actor actor) where T : WarLikeBehaviour => _behaviours.OfType<T>().FirstOrDefault(b => ReferenceEquals(b.Actor, actor));
    public T AddComponent<T>(Actor actor, T component) where T : WarLikeBehaviour {
        if (!_actors.Contains(actor)) throw new ArgumentException("Actor does not belong to the world.", nameof(actor));
        component.Actor = actor; component.World = this;
        _behaviours.Add(component);
        component.Awake();
        if (actor.Enabled) component.OnEnable();
        if (_started) component.Start();
        return component;
    }
    public void SetActorEnabled(Actor actor, bool enabled) {
        if (!_actors.Contains(actor)) throw new ArgumentException("Actor does not belong to the world.", nameof(actor));
        if (actor.Enabled == enabled) return;
        actor.Enabled = enabled;
        foreach (var component in _behaviours.Where(b => ReferenceEquals(b.Actor, actor)).ToArray()) {
            if (enabled) component.OnEnable(); else component.OnDisable();
        }
    }
    public void RemoveActor(Actor actor) => _pending.Enqueue(() => {
        foreach (var component in _behaviours.Where(b => b.Actor == actor).ToArray()) {
            if (actor.Enabled) component.OnDisable(); component.OnDestroy(); _behaviours.Remove(component);
        }
        _actors.Remove(actor);
    });
    public void Tick(float deltaTime) {
        if (!float.IsFinite(deltaTime) || deltaTime < 0) throw new ArgumentOutOfRangeException(nameof(deltaTime));
        if (!_started) { _started = true; foreach (var b in _behaviours.ToArray()) b.Start(); }
        float dt = MathF.Min(deltaTime, 0.25f);
        foreach (var b in _behaviours.ToArray()) if (b.Actor.Enabled) b.Update(dt);
        if (FixedDeltaTime <= 0 || !float.IsFinite(FixedDeltaTime)) throw new InvalidOperationException("Invalid fixed delta time.");
        _accumulator += dt;
        int steps = 0;
        while (_accumulator >= FixedDeltaTime && steps++ < 20) {
            foreach (var b in _behaviours.ToArray()) if (b.Actor.Enabled) b.FixedUpdate(FixedDeltaTime);
            _accumulator -= FixedDeltaTime;
        }
        foreach (var b in _behaviours.ToArray()) if (b.Actor.Enabled) b.LateUpdate(dt);
        while (_pending.TryDequeue(out var change)) change();
    }
    public static GameWorld FromWarLikeJson(string json) {
        using var doc = JsonDocument.Parse(json);
        var world = new GameWorld();
        if (!doc.RootElement.TryGetProperty("entities", out var entities) || entities.ValueKind != JsonValueKind.Array)
            throw new JsonException("Expected a WarLike scene with entities array.");
        foreach (var obj in entities.EnumerateArray()) {
            if (obj.ValueKind != JsonValueKind.Object) continue;
            string name = obj.TryGetProperty("name", out var nameElement) ? nameElement.GetString() ?? "Actor" : "Actor";
            static float Number(JsonElement e, string key) => e.TryGetProperty(key, out var n) && n.ValueKind == JsonValueKind.Number && n.TryGetSingle(out var v) && float.IsFinite(v) ? v : 0;
            // WarLike JSON x/y denote ground X/Z; elevation3d denotes world Y.
            var actor = world.CreateActor(name, new Vector3(Number(obj,"x") / 64f, Number(obj,"elevation3d"), Number(obj,"y") / 64f));
            if (obj.TryGetProperty("id", out var id) && id.TryGetInt32(out int value)) actor.Id = value;
            if (obj.TryGetProperty("rotation", out var rot) && rot.TryGetSingle(out float degrees)) actor.Rotation = degrees;
            if (obj.TryGetProperty("csharpComponent", out var component) && component.ValueKind == JsonValueKind.Object && component.TryGetProperty("kind", out var kind) && kind.GetString() == "AutoRotate") {
                actor.SpinSpeed = Number(component,"speed");
                world.AddComponent(actor, new AutoRotateBehaviour());
            }
            if (obj.TryGetProperty("csharpComponents", out var components) && components.ValueKind == JsonValueKind.Array) {
                foreach (var definition in components.EnumerateArray()) {
                    if (definition.ValueKind != JsonValueKind.Object || !definition.TryGetProperty("kind", out var type)) continue;
                    switch (type.GetString()) {
                        case "DeathmatchRules":
                            world.AddComponent(actor, new DeathmatchRulesComponent { MatchDuration = Math.Max(0,Number(definition,"matchDuration")), ScoreLimit = Math.Max(0,(int)Number(definition,"scoreLimit")), Countdown = Math.Max(0,Number(definition,"countdown")) });
                            break;
                        case "SpawnPoint":
                            world.AddComponent(actor, new SpawnPointComponent { TeamId = definition.TryGetProperty("teamId",out _) ? (int)Number(definition,"teamId") : -1, Radius = Math.Max(0,Number(definition,"radius")) });
                            break;
                        case "AmmoPickup":
                            world.AddComponent(actor, new AmmoPickupComponent { Amount = Math.Max(0,(int)Number(definition,"amount")) });
                            break;
                        case "HealthPickup":
                            world.AddComponent(actor, new HealthPickupComponent { HealAmount = Math.Max(0,Number(definition,"healAmount")) });
                            break;
                        case "KillZone":
                            world.AddComponent(actor, new KillZoneComponent { Damage = Math.Max(0,Number(definition,"damage")) });
                            break;
                        case "ObjectiveZone":
                            world.AddComponent(actor, new ObjectiveZoneComponent { TeamId = definition.TryGetProperty("teamId",out _) ? (int)Number(definition,"teamId") : -1, CaptureTime = Math.Max(0.01f,Number(definition,"captureTime")) });
                            break;
                        case "Projectile":
                            world.AddComponent(actor, new ProjectileComponent { Speed = Math.Max(0,Number(definition,"speed")), Damage = Math.Max(0,Number(definition,"damage")), Lifetime = Math.Max(0,Number(definition,"lifetime")) });
                            break;
                        case "Team":
                            world.AddComponent(actor, new TeamComponent { TeamId = (int)Number(definition,"teamId"), FriendlyFire = definition.TryGetProperty("friendlyFire",out var ff) && ff.ValueKind == JsonValueKind.True });
                            break;
                        case "Damageable":
                            world.AddComponent(actor, new DamageableComponent { Armor = Math.Max(0,Number(definition,"armor")), Invulnerable = definition.TryGetProperty("invulnerable",out var inv) && inv.ValueKind == JsonValueKind.True });
                            break;
                        case "Score":
                            world.AddComponent(actor, new ScoreComponent());
                            break;
                        case "Weapon":
                            world.AddComponent(actor, new WeaponComponent { Damage = Math.Max(0,Number(definition,"damage")), FireRate = Math.Max(0,Number(definition,"fireRate")), MagazineSize = Math.Max(0,(int)Number(definition,"magazineSize")) });
                            break;
                        case "Respawn":
                            world.AddComponent(actor, new RespawnComponent { Delay = Math.Max(0,Number(definition,"delay")) });
                            break;
                        case "AutoRotate":
                            actor.SpinSpeed = Number(definition,"speed");
                            world.AddComponent(actor, new AutoRotateBehaviour());
                            break;
                        case "Health":
                            world.AddComponent(actor, new HealthComponent { RegenerationPerSecond = Number(definition,"regen") });
                            break;
                        case "LinearMotion":
                            world.AddComponent(actor, new LinearMotionComponent { UnitsPerSecond = new Vector3(Number(definition,"vx"),Number(definition,"vy"),Number(definition,"vz")) });
                            break;
                        case "Rigidbody":
                            world.AddComponent(actor, new RigidbodyComponent {
                                Gravity = definition.TryGetProperty("gravity", out _) ? Math.Max(0, Number(definition,"gravity")) : 15f,
                                Restitution = Math.Clamp(Number(definition,"restitution"), 0, 1),
                                HorizontalDamping = definition.TryGetProperty("friction", out _) ? Math.Clamp(Number(definition,"friction"), 0, 1) : .985f
                            });
                            break;
                        case "VehicleController":
                            world.AddComponent(actor, new VehicleControllerComponent {
                                MaxSpeed = definition.TryGetProperty("maxSpeed",out _) ? Number(definition,"maxSpeed") : 300f,
                                Acceleration = definition.TryGetProperty("acceleration",out _) ? Number(definition,"acceleration") : 190f,
                                BrakeForce = definition.TryGetProperty("brakeForce",out _) ? Number(definition,"brakeForce") : 330f,
                                TurnRate = definition.TryGetProperty("turnRate",out _) ? Number(definition,"turnRate") : 135f,
                                Drag = definition.TryGetProperty("drag",out _) ? Number(definition,"drag") : 1.35f,
                                ReverseRatio = definition.TryGetProperty("reverseRatio",out _) ? Number(definition,"reverseRatio") : .45f
                            });
                            break;
                        case "FollowActor":
                            world.AddComponent(actor, new FollowActorComponent { TargetId = (int)Number(definition,"targetId"), Speed = Math.Max(0,Number(definition,"speed")), StopDistance = Math.Max(0,Number(definition,"stopDistance")) });
                            break;
                    }
                }
            }
            // Browser-authored driving presets store flat fields, and may not have
            // a csharpComponents array yet. Install native driving automatically.
            bool racing = obj.TryGetProperty("tags",out var tags) && tags.ValueKind == JsonValueKind.Array &&
                tags.EnumerateArray().Any(tag => tag.ValueKind == JsonValueKind.String && tag.GetString() == "race-vehicle");
            bool hasController = world.GetComponent<VehicleControllerComponent>(actor) is not null;
            if (racing && !hasController) {
                world.AddComponent(actor, new VehicleControllerComponent {
                    MaxSpeed = obj.TryGetProperty("maxSpeed",out _) ? Number(obj,"maxSpeed") : 310f,
                    Acceleration = obj.TryGetProperty("acceleration",out _) ? Number(obj,"acceleration") : 225f,
                    BrakeForce = obj.TryGetProperty("brakeForce",out _) ? Number(obj,"brakeForce") : 310f,
                    TurnRate = obj.TryGetProperty("turnRate",out _) ? Number(obj,"turnRate") : 145f,
                    Drag = obj.TryGetProperty("drag",out _) ? Number(obj,"drag") : 1.15f,
                    ReverseRatio = obj.TryGetProperty("reverseRatio",out _) ? Number(obj,"reverseRatio") : .45f
                });
            }
            if (obj.TryGetProperty("hp", out var hp) && hp.TryGetSingle(out float health)) actor.Health = health;
            if (obj.TryGetProperty("stats", out var stats) && stats.ValueKind == JsonValueKind.Object) {
                actor.Health = Number(stats,"health"); actor.MaxHealth = Number(stats,"maxHealth");
            }
        }
        return world;
    }
}

public sealed class AutoRotateBehaviour : WarLikeBehaviour {
    public override void Update(float deltaTime) => Actor.Rotation = (Actor.Rotation + Actor.SpinSpeed * deltaTime) % 360f;
}
