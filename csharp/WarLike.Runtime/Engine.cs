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
}

public abstract class WarLikeBehaviour {
    public Actor Actor { get; internal set; } = null!;
    public GameWorld World { get; internal set; } = null!;
    public virtual void Awake() { }
    public virtual void Start() { }
    public virtual void Update(float deltaTime) { }
    public virtual void FixedUpdate(float fixedDeltaTime) { }
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
        var actor = new Actor { Id = _actors.Count == 0 ? 1 : _actors.Max(a => a.Id) + 1, Name = name, Position = position };
        _actors.Add(actor); return actor;
    }
    public T AddComponent<T>(Actor actor, T component) where T : WarLikeBehaviour {
        if (!_actors.Contains(actor)) throw new ArgumentException("Actor does not belong to the world.", nameof(actor));
        component.Actor = actor; component.World = this;
        _behaviours.Add(component);
        component.Awake();
        if (_started) component.Start();
        return component;
    }
    public void RemoveActor(Actor actor) => _pending.Enqueue(() => {
        foreach (var component in _behaviours.Where(b => b.Actor == actor).ToArray()) {
            component.OnDestroy(); _behaviours.Remove(component);
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
                        case "FollowActor":
                            world.AddComponent(actor, new FollowActorComponent { TargetId = (int)Number(definition,"targetId"), Speed = Math.Max(0,Number(definition,"speed")), StopDistance = Math.Max(0,Number(definition,"stopDistance")) });
                            break;
                    }
                }
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
