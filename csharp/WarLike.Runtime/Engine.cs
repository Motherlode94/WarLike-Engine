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
    private bool _enabled = true;
    public bool Enabled {
        get => _enabled;
        set { if (World is null) _enabled = value; else World.SetActorEnabled(this, value); }
    }
    internal void SetEnabled(bool value) => _enabled = value;
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
    private bool _enabled = true;
    [InspectorField("Actif", SceneKeys = "enabled")]
    public bool Enabled {
        get => _enabled;
        set { _enabled = value; World?.RefreshActivation(this); }
    }
    public bool IsActiveAndEnabled => Active;
    internal bool Active { get; set; }
    internal bool HasStarted { get; set; }
    internal bool Destroyed { get; set; }
    internal bool Awakened { get; set; }
    internal int? SourceIndex { get; set; }
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
    private bool _importing;
    public float FixedDeltaTime { get; set; } = 1f / 60f;
    public IReadOnlyList<Actor> Actors => _actors.AsReadOnly();
    public Actor CreateActor(string name, Vector3 position) {
        var actor = new Actor { Id = _actors.Count == 0 ? 1 : _actors.Max(a => a.Id) + 1, Name = name, Position = position, World = this };
        _actors.Add(actor); return actor;
    }
    public T? GetComponent<T>(Actor actor) where T : WarLikeBehaviour => _behaviours.OfType<T>().FirstOrDefault(b => ReferenceEquals(b.Actor, actor));
    public IReadOnlyList<WarLikeBehaviour> GetComponents(Actor actor) => _behaviours.Where(b => ReferenceEquals(b.Actor, actor)).ToArray();
    public T AddComponent<T>(Actor actor, T component) where T : WarLikeBehaviour {
        ArgumentNullException.ThrowIfNull(component);
        if (!_actors.Contains(actor)) throw new ArgumentException("Actor does not belong to the world.", nameof(actor));
        if (component.World is not null || component.Destroyed) throw new ArgumentException("Component is already attached or destroyed.", nameof(component));
        if (component is TacticalSquadComponent && GetComponent<TacticalSquadComponent>(actor) is not null)
            throw new ArgumentException("An actor can have only one TacticalSquad.");
        component.Actor = actor; component.World = this;
        _behaviours.Add(component);
        component.Awake();
        component.Awakened = true;
        RefreshActivation(component);
        return component;
    }
    internal void RefreshActivation(WarLikeBehaviour component) {
        if (_importing || !component.Awakened || component.Destroyed) return;
        bool active = component.Enabled && component.Actor.Enabled;
        if (active == component.Active) return;
        component.Active = active;
        if (active) component.OnEnable(); else component.OnDisable();
    }
    internal void ValidateSquadMembers(TacticalSquadComponent squad, int[] members) {
        if (_importing) return; // Forward references are validated after the complete scene is loaded.
        foreach (int id in members) {
            var actor = _actors.FirstOrDefault(a => a.Id == id);
            if (actor is null || actor.GetComponent<TacticalSquadComponent>() is not null)
                throw new ArgumentException("Squad members must exist and cannot be squad controllers.");
            if (_behaviours.OfType<TacticalSquadComponent>().Any(other => other != squad && other.MemberIds.Contains(id)))
                throw new ArgumentException("A member already belongs to another squad.");
        }
    }
    public void SetActorEnabled(Actor actor, bool enabled) {
        if (!_actors.Contains(actor)) throw new ArgumentException("Actor does not belong to the world.", nameof(actor));
        if (actor.Enabled == enabled) return;
        actor.SetEnabled(enabled);
        foreach (var component in _behaviours.Where(b => ReferenceEquals(b.Actor, actor)).ToArray()) {
            RefreshActivation(component);
        }
    }
    public void RemoveActor(Actor actor) {
        if (!_actors.Contains(actor)) throw new ArgumentException("Actor does not belong to the world.", nameof(actor));
        _pending.Enqueue(() => {
        if (!_actors.Contains(actor)) return;
        foreach (var component in _behaviours.Where(b => b.Actor == actor).ToArray()) {
            bool wasActive = component.Active;
            component.Active = false; component.Destroyed = true;
            if (wasActive) component.OnDisable();
            component.OnDestroy(); _behaviours.Remove(component);
        }
        _actors.Remove(actor); actor.World = null;
        });
    }
    private static bool Ready(WarLikeBehaviour component) {
        if (!component.Active || component.Destroyed) return false;
        if (!component.HasStarted) { component.HasStarted = true; component.Start(); }
        return component.Active && !component.Destroyed;
    }
    public void Tick(float deltaTime) {
        if (!float.IsFinite(deltaTime) || deltaTime < 0) throw new ArgumentOutOfRangeException(nameof(deltaTime));
        if (FixedDeltaTime <= 0 || !float.IsFinite(FixedDeltaTime)) throw new InvalidOperationException("Invalid fixed delta time.");
        // A component added by a callback joins on the next tick, always after Start.
        var frame = _behaviours.ToArray();
        float dt = MathF.Min(deltaTime, 0.25f);
        foreach (var b in frame) Ready(b);
        foreach (var b in frame) if (Ready(b)) b.Update(dt);
        _accumulator += dt;
        int steps = 0;
        while (_accumulator >= FixedDeltaTime && steps++ < 20) {
            foreach (var b in frame) if (Ready(b)) b.FixedUpdate(FixedDeltaTime);
            _accumulator -= FixedDeltaTime;
        }
        foreach (var b in frame) if (Ready(b)) b.LateUpdate(dt);
        while (_pending.TryDequeue(out var change)) change();
    }
    public static GameWorld FromWarLikeJson(string json) {
        using var doc = JsonDocument.Parse(json);
        var world = new GameWorld { _importing = true };
        if (!doc.RootElement.TryGetProperty("entities", out var entities) || entities.ValueKind != JsonValueKind.Array)
            throw new JsonException("Expected a WarLike scene with entities array.");
        foreach (var obj in entities.EnumerateArray()) {
            if (obj.ValueKind != JsonValueKind.Object) continue;
            string name = obj.TryGetProperty("name", out var nameElement) ? nameElement.GetString() ?? "Actor" : "Actor";
            static float Number(JsonElement e, string key) => e.TryGetProperty(key, out var n) && n.ValueKind == JsonValueKind.Number && n.TryGetSingle(out var v) && float.IsFinite(v) ? v : 0;
            // WarLike JSON x/y denote ground X/Z; elevation3d denotes world Y.
            var actor = world.CreateActor(name, new Vector3(Number(obj,"x") / 64f, Number(obj,"elevation3d"), Number(obj,"y") / 64f));
            actor.Enabled = !obj.TryGetProperty("enabled", out var enabled) || enabled.ValueKind != JsonValueKind.False;
            if (obj.TryGetProperty("id", out var id)) {
                if (!id.TryGetInt32(out int value) || value <= 0 || world._actors.Any(a => a != actor && a.Id == value))
                    throw new JsonException("Actor IDs must be unique positive integers.");
                actor.Id = value;
            }
            if (obj.TryGetProperty("rotation", out var rot) && rot.TryGetSingle(out float degrees)) actor.Rotation = degrees;
            if (obj.TryGetProperty("csharpComponent", out var component) && component.ValueKind == JsonValueKind.Object && component.TryGetProperty("kind", out var kind) && kind.GetString() == "AutoRotate") {
                actor.SpinSpeed = Number(component,"speed");
                world.AddComponent(actor, new AutoRotateBehaviour());
            }
            if (obj.TryGetProperty("csharpComponents", out var components) && components.ValueKind == JsonValueKind.Array) {
                int sourceIndex = -1;
                foreach (var definition in components.EnumerateArray()) {
                    sourceIndex++;
                    if (definition.ValueKind != JsonValueKind.Object || !definition.TryGetProperty("kind", out var type)) continue;
                    int before = world._behaviours.Count;
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
                                GroundHeight = Number(definition,"groundHeight"),
                                Restitution = Math.Clamp(Number(definition,"restitution"), 0, 1),
                                HorizontalDamping = definition.TryGetProperty("friction", out _) ? Math.Clamp(Number(definition,"friction"), 0, 1) : .985f
                            });
                            break;
                        case "Roleplay":
                            world.AddComponent(actor, new RoleplayComponent {
                                Money = definition.TryGetProperty("money",out _) ? (int)Number(definition,"money") : 50,
                                Reputation = (int)Number(definition,"reputation")
                            });break;
                        case "RacingRules":
                            world.AddComponent(actor, new RacingRulesComponent());break;
                        case "SimulationEconomy":
                            world.AddComponent(actor, new SimulationEconomyComponent {
                                Money = definition.TryGetProperty("money",out _) ? (int)Number(definition,"money") : 100,
                                Materials = definition.TryGetProperty("materials",out _) ? (int)Number(definition,"materials") : 5
                            });break;
                        case "RpgProgression":
                            world.AddComponent(actor, new RpgProgressionComponent {
                                Gold = definition.TryGetProperty("gold",out _) ? (int)Number(definition,"gold") : 100
                            });break;
                        case "FourXEmpire":
                            world.AddComponent(actor, new FourXEmpireComponent());break;
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
                        case "TacticalSquad":
                            var squad = new TacticalSquadComponent {
                                Speed = definition.TryGetProperty("speed", out _) ? Number(definition,"speed") : 3,
                                Spacing = definition.TryGetProperty("spacing", out _) ? Number(definition,"spacing") : 1.5f,
                                FollowDistance = definition.TryGetProperty("followDistance", out _) ? Number(definition,"followDistance") : 4
                            };
                            world.AddComponent(actor, squad);
                            if (definition.TryGetProperty("memberIds", out var memberIds) && memberIds.ValueKind == JsonValueKind.Array)
                                squad.SetMembers(memberIds.EnumerateArray().Select(member => member.GetInt32()));
                            break;
                    }
                    if (world._behaviours.Count > before) {
                        var added = world._behaviours[^1];
                        added.SourceIndex = sourceIndex;
                        added.Enabled = !definition.TryGetProperty("enabled", out var componentEnabled) || componentEnabled.ValueKind != JsonValueKind.False;
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
        world._importing = false;
        foreach (var squad in world._behaviours.OfType<TacticalSquadComponent>())
            world.ValidateSquadMembers(squad, squad.MemberIds.ToArray());
        foreach (var behaviour in world._behaviours.ToArray()) world.RefreshActivation(behaviour);
        return world;
    }
}

public sealed class AutoRotateBehaviour : WarLikeBehaviour {
    [InspectorField("Rotation / seconde", SceneKeys = "speed", Min = -10000, Max = 10000)]
    public float Speed { get => Actor.SpinSpeed; set => Actor.SpinSpeed = value; }
    public override void Update(float deltaTime) => Actor.Rotation = (Actor.Rotation + Actor.SpinSpeed * deltaTime) % 360f;
}
