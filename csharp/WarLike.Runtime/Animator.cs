using System.Text.Json;

namespace WarLike.Runtime;

public sealed record AnimatorCommand(string Method, string Name, object? Value = null, float? Duration = null);
public readonly record struct AnimatorStateInfo(string Name, float normalizedTime) {
    public bool IsName(string value) => Name == value;
}

// Native scripts issue commands; the browser evaluates the shared visual graph
// after the accepted native frame. Getters reflect the latest submitted frame.
public sealed class Animator : MonoBehaviour {
    private readonly Dictionary<string, string> _types = new();
    private readonly Dictionary<string, object> _values = new();
    private readonly HashSet<string> _states = new();
    private readonly List<AnimatorCommand> _commands = new();
    private AnimatorStateInfo _state;
    private bool _transition;
    public Animator() { }
    public Animator(JsonElement graph) {
        if (graph.TryGetProperty("states", out var states)) foreach (var state in states.EnumerateArray()) _states.Add(state.GetProperty("id").GetString()!);
        if (graph.TryGetProperty("parameters", out var parameters)) foreach (var parameter in parameters.EnumerateArray()) {
            var name = parameter.GetProperty("name").GetString()!; var type = parameter.GetProperty("type").GetString()!;
            _types[name] = type;
            if (parameter.TryGetProperty("default", out var initial)) _values[name] = Value(initial);
        }
    }
    private static object Value(JsonElement value) => value.ValueKind switch {
        JsonValueKind.True => true, JsonValueKind.False => false, JsonValueKind.String => value.GetString()!,
        JsonValueKind.Number when value.TryGetSingle(out var number) && float.IsFinite(number) => number,
        _ => throw new ArgumentException("Invalid Animator value.")
    };
    private static void Name(string name) { if (string.IsNullOrWhiteSpace(name) || name.Length > 160 || name is "__proto__" or "constructor" or "prototype") throw new ArgumentException("Invalid Animator name."); }
    private void Enqueue(AnimatorCommand command) { if (_commands.Count >= 64) throw new InvalidOperationException("64 Animator commands per frame maximum."); _commands.Add(command); }
    private void Set(string method, string name, object value, string type) {
        Name(name); if (_types.TryGetValue(name, out var declared) && declared != type && !(type == "bool" && declared == "trigger")) throw new ArgumentException("Animator parameter type mismatch.");
        Enqueue(new(method, name, value)); _values[name] = value;
    }
    public void SetFloat(string name, float value) { if (!float.IsFinite(value)) throw new ArgumentException("Animator float must be finite."); Set("SetFloat", name, value, "float"); }
    public float GetFloat(string name) => _values.TryGetValue(name, out var value) ? Convert.ToSingle(value) : 0;
    public void SetInteger(string name, int value) => Set("SetInteger", name, value, "int");
    public int GetInteger(string name) => _values.TryGetValue(name, out var value) ? Convert.ToInt32(value) : 0;
    public void SetBool(string name, bool value) => Set("SetBool", name, value, "bool");
    public bool GetBool(string name) => _values.TryGetValue(name, out var value) && value is true;
    public void SetTrigger(string name) { Set("SetTrigger", name, true, "trigger"); }
    public void ResetTrigger(string name) { Set("ResetTrigger", name, false, "trigger"); }
    public void Play(string stateName, int layer = 0, float normalizedTime = 0) {
        Name(stateName); if (layer != 0 || !float.IsFinite(normalizedTime) || normalizedTime < 0 || normalizedTime > 1 || _states.Count > 0 && !_states.Contains(stateName)) throw new ArgumentException("Animator state, layer or offset invalid.");
        Enqueue(new("Play", stateName, normalizedTime));
    }
    public void CrossFade(string stateName, float normalizedTransitionDuration) {
        Name(stateName); if (!float.IsFinite(normalizedTransitionDuration) || normalizedTransitionDuration < 0 || normalizedTransitionDuration > 3 || _states.Count > 0 && !_states.Contains(stateName)) throw new ArgumentException("Animator fade invalid.");
        Enqueue(new("CrossFade", stateName, null, normalizedTransitionDuration));
    }
    public AnimatorStateInfo GetCurrentAnimatorStateInfo(int layerIndex = 0) { if (layerIndex != 0) throw new ArgumentException("Only the base graph has native state information."); return _state; }
    public bool IsInTransition(int layerIndex = 0) { if (layerIndex != 0) throw new ArgumentException("Only the base graph has native state information."); return _transition; }
    public AnimatorCommand[] DrainCommands() { var commands = _commands.ToArray(); _commands.Clear(); return commands; }
    public void ApplySnapshot(JsonElement snapshot) {
        if (snapshot.ValueKind != JsonValueKind.Object) throw new ArgumentException("Animator snapshot must be an object.");
        var changes = new Dictionary<string, object>();
        if (snapshot.TryGetProperty("parameters", out var parameters)) {
            if (parameters.ValueKind != JsonValueKind.Object || parameters.EnumerateObject().Count() > 64) throw new ArgumentException("Invalid Animator parameters.");
            foreach (var parameter in parameters.EnumerateObject()) { Name(parameter.Name); changes[parameter.Name] = Value(parameter.Value); }
        }
        var state = snapshot.TryGetProperty("stateId", out var id) ? id.GetString() ?? "" : "";
        var time = snapshot.TryGetProperty("normalizedTime", out var at) ? at.GetSingle() : 0;
        if (!float.IsFinite(time)) throw new ArgumentException("Invalid Animator time.");
        foreach (var change in changes) _values[change.Key] = change.Value;
        _state = new(state, time); _transition = snapshot.TryGetProperty("transition", out var transition) && transition.ValueKind == JsonValueKind.True;
    }
}
