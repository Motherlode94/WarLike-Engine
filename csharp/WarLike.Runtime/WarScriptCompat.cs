using System;
using System.Numerics;

namespace WarLike.Runtime;

/// <summary>
/// WarLike-owned compatibility helpers for the WarScript-to-C# converter.
/// These helpers modify whole Vector3 values because Transform.position and
/// Transform.eulerAngles are struct-valued properties.
/// </summary>
public static class WarScriptCompat {
    /// <summary>Bridge native vehicle settings available in both WarLike APIs.</summary>
    public static float GetVehicleValue(MonoBehaviour behaviour, string property) {
        ArgumentNullException.ThrowIfNull(behaviour);
        var vehicle=behaviour.GetComponent<VehicleControllerComponent>() ??
            throw new InvalidOperationException("VehicleControllerComponent absent.");
        return property switch {
            "maxSpeed" => vehicle.MaxSpeed,
            "acceleration" => vehicle.Acceleration,
            "brakeForce" => vehicle.BrakeForce,
            "turnRate" => vehicle.TurnRate,
            _ => throw new ArgumentException("Unsupported vehicle property.",nameof(property))
        };
    }
    public static void SetVehicleValue(MonoBehaviour behaviour, string property, float value) {
        ArgumentNullException.ThrowIfNull(behaviour);
        if(!float.IsFinite(value)) throw new ArgumentOutOfRangeException(nameof(value));
        var vehicle=behaviour.GetComponent<VehicleControllerComponent>() ??
            throw new InvalidOperationException("VehicleControllerComponent absent.");
        switch(property) {
            case "maxSpeed": vehicle.MaxSpeed=Math.Clamp(value,0,10000);break;
            case "acceleration": vehicle.Acceleration=Math.Clamp(value,0,10000);break;
            case "brakeForce": vehicle.BrakeForce=Math.Clamp(value,0,10000);break;
            case "turnRate": vehicle.TurnRate=Math.Clamp(value,0,2000);break;
            default: throw new ArgumentException("Unsupported vehicle property.",nameof(property));
        }
    }
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
