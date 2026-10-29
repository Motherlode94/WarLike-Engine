using System.Collections.Concurrent;
using System.Numerics;
using System.Reflection;
using System.Text.Json;

namespace WarLike.Runtime;

/// <summary>Explicit opt-in for properties exposed by the local editor bridge.</summary>
[AttributeUsage(AttributeTargets.Property, Inherited = true)]
public sealed class InspectorFieldAttribute(string label) : Attribute {
    public string Label { get; } = label;
    public string SceneKeys { get; set; } = "";
    public double Min { get; set; } = -1_000_000;
    public double Max { get; set; } = 1_000_000;
    public double Step { get; set; } = .1;
}

public sealed record InspectorProperty(string Name, string Label, string Type, object? Value,
    bool ReadOnly, double Min, double Max, double Step, string[] SceneKeys);
public sealed record InspectorComponent(int Index, string Type, int? SourceIndex, bool Enabled,
    bool Active, bool Started, IReadOnlyList<InspectorProperty> Properties);
public sealed record InspectorActor(int Id, string Name, bool Enabled, IReadOnlyList<InspectorComponent> Components);

/// <summary>No dynamic code loading: only annotated properties on already compiled behaviours.</summary>
public static class RuntimeInspector {
    private sealed record Field(PropertyInfo Property, InspectorFieldAttribute Attribute, string Type);
    private static readonly ConcurrentDictionary<Type, Field[]> Cache = new();
    private static Field[] Fields(Type type) => Cache.GetOrAdd(type, t => t
        .GetProperties(BindingFlags.Instance | BindingFlags.Public)
        .Select(p => (Property: p, Attribute: p.GetCustomAttribute<InspectorFieldAttribute>()))
        .Where(p => p.Attribute is not null && p.Property.GetMethod?.IsPublic == true && p.Property.GetIndexParameters().Length == 0)
        .Select(p => new Field(p.Property, p.Attribute!, Kind(p.Property.PropertyType)))
        .Where(p => p.Type != "").OrderBy(p => p.Property.Name, StringComparer.Ordinal).ToArray());
    private static string Kind(Type type) => type == typeof(float) ? "float" : type == typeof(int) ? "int" :
        type == typeof(bool) ? "bool" : type == typeof(Vector3) ? "vector3" : "";
    private static object? Value(Field field, WarLikeBehaviour component) {
        var value = field.Property.GetValue(component);
        return value is Vector3 vector ? new { x = vector.X, y = vector.Y, z = vector.Z } : value;
    }
    public static InspectorActor Inspect(GameWorld world, int actorId) {
        var actor = world.Actors.FirstOrDefault(a => a.Id == actorId) ?? throw new KeyNotFoundException("Actor not found.");
        return new(actor.Id, actor.Name, actor.Enabled, world.GetComponents(actor).Select((component, index) =>
            new InspectorComponent(index, component.GetType().Name, component.SourceIndex, component.Enabled,
                component.IsActiveAndEnabled, component.HasStarted, Fields(component.GetType()).Select(field =>
                    new InspectorProperty(field.Property.Name, field.Attribute.Label, field.Type, Value(field, component),
                        field.Property.SetMethod?.IsPublic != true, field.Attribute.Min, field.Attribute.Max,
                        field.Type == "int" ? 1 : field.Attribute.Step,
                        field.Attribute.SceneKeys.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))).ToArray())).ToArray());
    }
    public static InspectorActor Set(GameWorld world, int actorId, int componentIndex, string propertyName, JsonElement value) {
        var actor = world.Actors.FirstOrDefault(a => a.Id == actorId) ?? throw new KeyNotFoundException("Actor not found.");
        var components = world.GetComponents(actor);
        if (componentIndex < 0 || componentIndex >= components.Count) throw new ArgumentOutOfRangeException(nameof(componentIndex));
        var component = components[componentIndex];
        var field = Fields(component.GetType()).FirstOrDefault(f => f.Property.Name == propertyName)
            ?? throw new ArgumentException("Property is not exposed to the Inspector.");
        if (field.Property.SetMethod?.IsPublic != true) throw new ArgumentException("Property is read-only.");
        object parsed;
        if (field.Type == "bool") {
            if (value.ValueKind is not (JsonValueKind.True or JsonValueKind.False)) throw new ArgumentException("Expected a boolean.");
            parsed = value.GetBoolean();
        } else if (field.Type == "int") {
            if (value.ValueKind != JsonValueKind.Number || !value.TryGetInt32(out var number)) throw new ArgumentException("Expected an integer.");
            Validate(number, field.Attribute); parsed = number;
        } else if (field.Type == "float") parsed = Number(value, field.Attribute);
        else {
            if (value.ValueKind != JsonValueKind.Object || !value.TryGetProperty("x", out var x) ||
                !value.TryGetProperty("y", out var y) || !value.TryGetProperty("z", out var z)) throw new ArgumentException("Expected a Vector3 with x, y, z.");
            parsed = new Vector3(Number(x, field.Attribute), Number(y, field.Attribute), Number(z, field.Attribute));
        }
        // Parse and validate the complete value before invoking any setter.
        field.Property.SetValue(component, parsed);
        return Inspect(world, actorId);
    }
    private static float Number(JsonElement value, InspectorFieldAttribute attribute) {
        if (value.ValueKind != JsonValueKind.Number || !value.TryGetSingle(out var number) || !float.IsFinite(number))
            throw new ArgumentException("Expected a finite number.");
        Validate(number, attribute); return number;
    }
    private static void Validate(double number, InspectorFieldAttribute attribute) {
        if (number < attribute.Min || number > attribute.Max) throw new ArgumentOutOfRangeException(nameof(number), $"Expected {attribute.Min} <= value <= {attribute.Max}.");
    }
}
