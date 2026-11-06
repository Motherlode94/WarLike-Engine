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
    public float RotationX { get; set; }
    public float RotationZ { get; set; }
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
    private Transform? _transform;
    private GameObject? _gameObject;
    internal Transform Transform => _transform ??= new(this);
    internal GameObject GameObject => _gameObject ??= new(this);
    public T? GetComponent<T>() where T : class => World?.GetComponent<T>(this);
    public bool TryGetComponent<T>(out T? component) where T : class { component = GetComponent<T>(); return component is not null; }
    public T AddComponent<T>(T component) where T : MonoBehaviour => World?.AddComponent(this, component) ?? throw new InvalidOperationException("Actor is not attached to a world.");
}

public sealed class GameWorld : IDisposable {
    internal float ElapsedSeconds { get; private set; }
    internal float FixedElapsedSeconds { get; private set; }
    internal List<string> Messages { get; } = new();
    internal HashSet<string> Keys { get; } = new();
    internal HashSet<string> PressedKeys { get; } = new();
    public void SetInput(IEnumerable<string> keys, IEnumerable<string> pressedKeys) {
        var down=keys.ToArray();var pressed=pressedKeys.ToArray();
        if(down.Length>64||pressed.Length>64||down.Concat(pressed).Any(k=>k.Length>32))throw new ArgumentException("Invalid input frame.");
        Keys.Clear();PressedKeys.Clear();Keys.UnionWith(down.Select(k=>k.ToLowerInvariant()));PressedKeys.UnionWith(pressed.Select(k=>k.ToLowerInvariant()));
    }
    private readonly List<Actor> _actors = new();
    private readonly List<MonoBehaviour> _behaviours = new();
    private readonly Queue<Action> _pending = new();
    private float _accumulator;
    private bool _importing;
    public float FixedDeltaTime { get; set; } = 1f / 60f;
    public IReadOnlyList<Actor> Actors => _actors.AsReadOnly();
    public Actor CreateActor(string name, Vector3 position) {
        var actor = new Actor { Id = _actors.Count == 0 ? 1 : _actors.Max(a => a.Id) + 1, Name = name, Position = position, World = this };
        _actors.Add(actor); return actor;
    }
    public T? GetComponent<T>(Actor actor) where T : class => typeof(T) == typeof(Transform) ? actor.Transform as T : _behaviours.Where(b=>ReferenceEquals(b.Actor,actor)&&!b.Destroyed).OfType<T>().FirstOrDefault();
    public IReadOnlyList<MonoBehaviour> GetComponents(Actor actor) => _behaviours.Where(b => ReferenceEquals(b.Actor, actor)).ToArray();
    public T AddComponent<T>(Actor actor, T component) where T : MonoBehaviour {
        ArgumentNullException.ThrowIfNull(component);
        if (!_actors.Contains(actor)) throw new ArgumentException("Actor does not belong to the world.", nameof(actor));
        if (component.World is not null || component.Destroyed) throw new ArgumentException("Component is already attached or destroyed.", nameof(component));
        if (component is TacticalSquadComponent && GetComponent<TacticalSquadComponent>(actor) is not null)
            throw new ArgumentException("An actor can have only one TacticalSquad.");
        component.Actor = actor; component.World = this;
        _behaviours.Add(component);
        EnsureAwake(component);
        RefreshActivation(component);
        return component;
    }
    private void EnsureAwake(MonoBehaviour component) {
        if (component.Awakened || component.Awakening || component.Destroyed ||
            (component is not WarLikeBehaviour && (_importing || !component.Actor.Enabled))) return;
        component.Awakening = true;
        try { using var time = Time.Enter(this, 0); component.InvokeAwake(); component.Awakened = true; }
        finally { component.Awakening = false; }
    }
    internal void RefreshActivation(MonoBehaviour component) {
        if (_importing || component.Destroyed || component.Awakening) return;
        EnsureAwake(component);
        if (!component.Awakened) return;
        bool active = component.Enabled && component.Actor.Enabled;
        if (active == component.Active) return;
        component.Active = active;
        using var time = Time.Enter(this, ReferenceEquals(Time.CurrentWorld, this) ? Time.deltaTime : 0);
        if (active) component.InvokeOnEnable(); else component.InvokeOnDisable();
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
            DestroyComponent(component);
        }
        _actors.Remove(actor); actor.World = null;
        });
    }
    public void RemoveComponent(MonoBehaviour component) {
        if (!ReferenceEquals(component.World, this)) throw new ArgumentException("Component does not belong to this world.");
        _pending.Enqueue(() => DestroyComponent(component));
    }
    private void DestroyComponent(MonoBehaviour component) {
        if (component.Destroyed) return;
        bool wasActive = component.Active; component.Active = false; component.Destroyed = true;
        if (wasActive) component.InvokeOnDisable();
        if (component.Awakened) component.InvokeOnDestroy();
        _behaviours.Remove(component);
    }
    public void Dispose() {
        using var time = Time.Enter(this, 0);
        foreach (var component in _behaviours.ToArray()) DestroyComponent(component);
        foreach (var actor in _actors) actor.World = null;
        _actors.Clear(); _pending.Clear();
    }
    public string[] DrainMessages() { var result = Messages.ToArray(); Messages.Clear(); return result; }
    private static bool Ready(MonoBehaviour component) {
        if (!component.Active || component.Destroyed) return false;
        if (!component.HasStarted) { component.HasStarted = true; component.InvokeStart(); }
        return component.Active && !component.Destroyed;
    }
    public void Tick(float deltaTime) {
        if (!float.IsFinite(deltaTime) || deltaTime < 0) throw new ArgumentOutOfRangeException(nameof(deltaTime));
        if (FixedDeltaTime <= 0 || !float.IsFinite(FixedDeltaTime)) throw new InvalidOperationException("Invalid fixed delta time.");
        // A component added by a callback joins on the next tick, always after Start.
        var frame = _behaviours.ToArray();
        float dt = MathF.Min(deltaTime, 0.25f);
        ElapsedSeconds += dt;
        using var time = Time.Enter(this, dt);
        foreach (var b in frame) Ready(b);
        _accumulator += dt;
        int steps = 0;
        while (_accumulator >= FixedDeltaTime && steps++ < 20) {
            FixedElapsedSeconds += FixedDeltaTime;
            using var fixedTime = Time.Enter(this, FixedDeltaTime, true);
            foreach (var b in frame) if (Ready(b)) b.InvokeFixedUpdate(FixedDeltaTime);
            _accumulator -= FixedDeltaTime;
        }
        foreach (var b in frame) if (Ready(b)) b.InvokeUpdate(dt);
        foreach (var b in frame) if (Ready(b)) b.InvokeLateUpdate(dt);
        while (_pending.TryDequeue(out var change)) change();
        PressedKeys.Clear();
    }
    public void ApplySharedFrame(JsonElement actors) {
        if (actors.ValueKind != JsonValueKind.Array || actors.GetArrayLength() != _actors.Count)
            throw new ArgumentException("Scene structure changed. Restart Play to synchronize native components.");
        var seen=new HashSet<int>();
        var changes=new List<(Actor actor,Vector3 position,float rotation,float health,bool enabled)>();
        foreach(var item in actors.EnumerateArray()) {
            int id=item.GetProperty("id").GetInt32();
            var actor=_actors.FirstOrDefault(a=>a.Id==id);
            if(actor is null || !seen.Add(id))throw new ArgumentException("Unknown or duplicate actor ID.");
            float Number(string key) { float value=item.GetProperty(key).GetSingle();if(!float.IsFinite(value))throw new ArgumentException("Non-finite actor field.");return value; }
            changes.Add((actor,new Vector3(Number("x")/64f,Number("elevation3d"),Number("y")/64f),Number("rotation"),Number("hp"),item.GetProperty("enabled").GetBoolean()));
        }
        // Validate the entire frame before mutating any actor or invoking callbacks.
        foreach(var c in changes){c.actor.Position=c.position;c.actor.Rotation=c.rotation;c.actor.Health=c.health;c.actor.Enabled=c.enabled;}
    }
    public static GameWorld FromWarLikeJson(string json, IReadOnlyDictionary<string, Type>? scriptTypes = null) {
        using var doc = JsonDocument.Parse(SceneContract.RuntimeJson(json));
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
            if (obj.TryGetProperty("csharpScript", out var script) && script.ValueKind == JsonValueKind.Object &&
                script.TryGetProperty("source", out var source) && !string.IsNullOrWhiteSpace(source.GetString())) {
                string scriptName = script.GetProperty("name").GetString() ?? "";
                if (scriptTypes is null || !scriptTypes.TryGetValue(scriptName, out var scriptType))
                    throw new ArgumentException($"Native script {scriptName} must be compiled before loading the scene.");
                var behaviour = (MonoBehaviour)(Activator.CreateInstance(scriptType) ?? throw new ArgumentException("Script must have a public parameterless constructor."));
                NativeScriptFields.Apply(behaviour, script.TryGetProperty("values", out var values) ? values : default);
                behaviour.SourceIndex = -1;
                behaviour.Enabled = !script.TryGetProperty("enabled", out var scriptEnabled) || scriptEnabled.ValueKind != JsonValueKind.False;
                world.AddComponent(actor, behaviour);
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
