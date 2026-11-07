using System;
using System.Numerics;

namespace WarLike.Runtime;

/// <summary>
/// WarLike-owned compatibility helpers for the WarScript-to-C# converter.
/// These helpers modify whole Vector3 values because Transform.position and
/// Transform.eulerAngles are struct-valued properties.
/// </summary>
public static class WarScriptCompat {
    public static void SetPositionAxis(MonoBehaviour behaviour, char axis, float value) {
        ArgumentNullException.ThrowIfNull(behaviour);
        if(!float.IsFinite(value)) throw new ArgumentOutOfRangeException(nameof(value));
        var position = behaviour.transform.position;
        position = char.ToUpperInvariant(axis) switch {
            'X' => new Vector3(value, position.Y, position.Z),
            'Y' => new Vector3(position.X, value, position.Z),
            'Z' => new Vector3(position.X, position.Y, value),
            _ => throw new ArgumentException("Axis must be X, Y or Z.", nameof(axis))
        };
        behaviour.transform.position = position;
    }
    public static void SetRotationAxis(MonoBehaviour behaviour, char axis, float degrees) {
        ArgumentNullException.ThrowIfNull(behaviour);
        if(!float.IsFinite(degrees)) throw new ArgumentOutOfRangeException(nameof(degrees));
        var euler = behaviour.transform.eulerAngles;
        euler = char.ToUpperInvariant(axis) switch {
            'X' => new Vector3(degrees, euler.Y, euler.Z),
            'Y' => new Vector3(euler.X, degrees, euler.Z),
            'Z' => new Vector3(euler.X, euler.Y, degrees),
            _ => throw new ArgumentException("Axis must be X, Y or Z.", nameof(axis))
        };
        behaviour.transform.eulerAngles = euler;
    }
}
