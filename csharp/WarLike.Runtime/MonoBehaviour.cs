using System.Numerics;
using System.Reflection;
using System.Runtime.CompilerServices;

namespace WarLike.Runtime;

// Unity-style message methods have no inherited Awake/Update signatures to hide.
// Existing WarLikeBehaviour classes keep their virtual delta-time callbacks below.
public class MonoBehaviour {
    public Actor Actor { get; internal set; } = null!;
    public GameWorld World { get; internal set; } = null!;
    public GameObject gameObject => Actor.GameObject;
    public Transform transform => Actor.Transform;
    public string name { get => Actor.Name; set => Actor.Name = value; }
    private bool _enabled = true;
    [InspectorField("Actif", SceneKeys = "enabled")]
    public bool Enabled { get => _enabled; set { _enabled = value; World?.RefreshActivation(this); } }
    public bool enabled { get => Enabled; set => Enabled = value; }
    public bool IsActiveAndEnabled => Active;
    public bool isActiveAndEnabled => Active;
    internal bool Active { get; set; }
    internal bool HasStarted { get; set; }
    internal bool Destroyed { get; set; }
    internal bool Awakened { get; set; }
    internal bool Awakening { get; set; }
    internal int? SourceIndex { get; set; }
    public T? GetComponent<T>() where T : class => Actor.GetComponent<T>();
    public T[] GetComponents<T>() where T : class => gameObject.GetComponents<T>();
    public bool TryGetComponent<T>(out T? component) where T : class => Actor.TryGetComponent(out component);
    public T AddComponent<T>() where T : MonoBehaviour, new() => Actor.AddComponent(new T());
    public T AddComponent<T>(T component) where T : MonoBehaviour => Actor.AddComponent(component);
    protected static void Destroy(MonoBehaviour component) => component.World.RemoveComponent(component);
    protected static void Destroy(GameObject target) => target.Actor.World?.RemoveActor(target.Actor);
    private readonly Dictionary<string, Action?> _messages = new();
    private void Message(string name) {
        if (!_messages.TryGetValue(name, out var callback)) {
            MethodInfo? method = null;
            for (var type = GetType(); type is not null && type != typeof(MonoBehaviour); type = type.BaseType) {
                method = type.GetMethod(name, BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.DeclaredOnly, null, Type.EmptyTypes, null);
                if (method is not null) break;
            }
            if (method is not null && method.ReturnType != typeof(void)) throw new InvalidOperationException($"{name} must return void; coroutines are not supported.");
            if (method?.GetCustomAttribute<AsyncStateMachineAttribute>() is not null) throw new InvalidOperationException($"{name} must be synchronous.");
            callback = method?.CreateDelegate<Action>(this); _messages[name] = callback;
        }
        callback?.Invoke();
    }
    internal virtual void InvokeAwake() => Message("Awake");
    internal virtual void InvokeStart() => Message("Start");
    internal virtual void InvokeUpdate(float dt) => Message("Update");
    internal virtual void InvokeFixedUpdate(float dt) => Message("FixedUpdate");
    internal virtual void InvokeLateUpdate(float dt) => Message("LateUpdate");
    internal virtual void InvokeOnEnable() => Message("OnEnable");
    internal virtual void InvokeOnDisable() => Message("OnDisable");
    internal virtual void InvokeOnDestroy() => Message("OnDestroy");
}

public abstract class WarLikeBehaviour : MonoBehaviour {
    public virtual void Awake() { }
    public virtual void Start() { }
    public virtual void Update(float deltaTime) { }
    public virtual void FixedUpdate(float fixedDeltaTime) { }
    public virtual void LateUpdate(float deltaTime) { }
    public virtual void OnEnable() { }
    public virtual void OnDisable() { }
    public virtual void OnDestroy() { }
    internal override void InvokeAwake() => Awake();
    internal override void InvokeStart() => Start();
    internal override void InvokeUpdate(float dt) => Update(dt);
    internal override void InvokeFixedUpdate(float dt) => FixedUpdate(dt);
    internal override void InvokeLateUpdate(float dt) => LateUpdate(dt);
    internal override void InvokeOnEnable() => OnEnable();
    internal override void InvokeOnDisable() => OnDisable();
    internal override void InvokeOnDestroy() => OnDestroy();
}

public sealed class GameObject {
    internal Actor Actor { get; }
    internal GameObject(Actor actor) => Actor = actor;
    public string name { get => Actor.Name; set => Actor.Name = value; }
    public Transform transform => Actor.Transform;
    public bool activeSelf => Actor.Enabled;
    // Native actors currently have no parent hierarchy.
    public bool activeInHierarchy => Actor.Enabled;
    public void SetActive(bool value) => Actor.Enabled = value;
    public T? GetComponent<T>() where T : class => Actor.GetComponent<T>();
    public T[] GetComponents<T>() where T : class => typeof(T) == typeof(Transform) ? [((T)(object)transform)] : Actor.World?.GetComponents(Actor).OfType<T>().ToArray() ?? [];
    public bool TryGetComponent<T>(out T? component) where T : class => Actor.TryGetComponent(out component);
    public T AddComponent<T>() where T : MonoBehaviour, new() => Actor.AddComponent(new T());
}

public sealed class Transform(Actor actor) {
    public Vector3 position { get => actor.Position; set => actor.Position = value; }
    public Vector3 eulerAngles { get => new(actor.RotationX, actor.Rotation, actor.RotationZ); set { actor.RotationX = value.X; actor.Rotation = value.Y; actor.RotationZ = value.Z; } }
    public void Translate(Vector3 displacement) => actor.Position += displacement;
    public void Translate(float x, float y, float z) => Translate(new Vector3(x, y, z));
    public void Rotate(Vector3 degrees) => eulerAngles += degrees;
    public void Rotate(float x, float y, float z) => Rotate(new Vector3(x, y, z));
}

public static class Time {
    [ThreadStatic] private static Clock? _clock;
    private sealed record Clock(GameWorld World, float Delta, bool Fixed);
    public static float deltaTime => _clock?.Delta ?? 0;
    public static float fixedDeltaTime => _clock?.World.FixedDeltaTime ?? 1f / 60f;
    public static float time => _clock is null ? 0 : _clock.Fixed ? _clock.World.FixedElapsedSeconds : _clock.World.ElapsedSeconds;
    internal static GameWorld? CurrentWorld => _clock?.World;
    internal static IDisposable Enter(GameWorld world, float delta, bool fixedStep = false) { var previous = _clock; _clock = new(world, delta, fixedStep); return new Scope(() => _clock = previous); }
    private sealed class Scope(Action restore) : IDisposable { public void Dispose() => restore(); }
}

public static class Debug {
    public static void Log(object? message) {
        var text = (message?.ToString() ?? "null"); if (text.Length > 4096) text = text[..4096];
        var messages = Time.CurrentWorld?.Messages;
        if (messages is not null && messages.Count < 64) messages.Add(text);
        Console.WriteLine("[WarLike C#] " + text);
    }
}

[AttributeUsage(AttributeTargets.Field)]
public sealed class SerializeField : Attribute { }

// A shared field schema is used before Awake and by the native Inspector.
public static class NativeScriptFields {
    private static readonly ConditionalWeakTable<Type, FieldInfo[]> Cache = new();
    internal static FieldInfo[] Fields(Type type) => Cache.GetValue(type, t => t.GetFields(BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic)
        .Where(f => !f.IsStatic && !f.IsInitOnly && !f.IsDefined(typeof(NonSerializedAttribute), false) && (f.IsPublic || f.GetCustomAttribute<SerializeField>() is not null))
        .Where(f => f.FieldType == typeof(float) || f.FieldType == typeof(int) || f.FieldType == typeof(bool) || f.FieldType == typeof(string) || f.FieldType == typeof(Vector3)).ToArray());
    internal static object Parse(Type type, System.Text.Json.JsonElement value) {
        var kind = value.ValueKind;
        if (type == typeof(bool) && kind is System.Text.Json.JsonValueKind.True or System.Text.Json.JsonValueKind.False) return value.GetBoolean();
        if (type == typeof(string) && kind == System.Text.Json.JsonValueKind.String && (value.GetString()?.Length ?? 0) <= 4096) return value.GetString()!;
        if (type == typeof(int) && kind == System.Text.Json.JsonValueKind.Number && value.TryGetInt32(out var integer)) return integer;
        if (type == typeof(float) && kind == System.Text.Json.JsonValueKind.Number && value.TryGetSingle(out var number) && float.IsFinite(number)) return number;
        if (type == typeof(Vector3) && kind == System.Text.Json.JsonValueKind.Object && value.TryGetProperty("x", out var x) && value.TryGetProperty("y", out var y) && value.TryGetProperty("z", out var z))
            return new Vector3((float)Parse(typeof(float), x), (float)Parse(typeof(float), y), (float)Parse(typeof(float), z));
        throw new ArgumentException("Invalid serialized script field value.");
    }
    public static void Apply(MonoBehaviour script, System.Text.Json.JsonElement values) {
        if (values.ValueKind is System.Text.Json.JsonValueKind.Undefined or System.Text.Json.JsonValueKind.Null) return;
        if (values.ValueKind != System.Text.Json.JsonValueKind.Object) throw new ArgumentException("Script values must be an object.");
        var changes = new List<(FieldInfo Field, object Value)>();
        foreach (var value in values.EnumerateObject()) {
            var field = Fields(script.GetType()).FirstOrDefault(f => f.Name == value.Name);
            if (field is null) continue; // Removed fields keep old scenes loadable.
            changes.Add((field, Parse(field.FieldType, value.Value)));
        }
        foreach (var change in changes) change.Field.SetValue(script, change.Value);
    }
}

public enum KeyCode { W, A, S, D, Q, Z, E, F, R, C, Space, LeftShift, RightShift, UpArrow, DownArrow, LeftArrow, RightArrow, Escape }
public static class Input {
    public static bool GetKey(string key) => Time.CurrentWorld?.Keys.Contains(key.ToLowerInvariant()) == true;
    public static bool GetKeyDown(string key) => Time.CurrentWorld?.PressedKeys.Contains(key.ToLowerInvariant()) == true;
    public static bool GetKey(KeyCode key) => GetKey(Key(key));
    public static bool GetKeyDown(KeyCode key) => GetKeyDown(Key(key));
    private static string Key(KeyCode key) => key switch { KeyCode.Space => " ", KeyCode.LeftShift or KeyCode.RightShift => "shift", KeyCode.UpArrow => "arrowup", KeyCode.DownArrow => "arrowdown", KeyCode.LeftArrow => "arrowleft", KeyCode.RightArrow => "arrowright", _ => key.ToString().ToLowerInvariant() };
}
