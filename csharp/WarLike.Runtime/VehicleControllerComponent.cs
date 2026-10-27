using System.Numerics;

namespace WarLike.Runtime;

/// <summary>
/// Arcade vehicle controller executed by the WarLike .NET runtime.
/// Speed and acceleration use WarLike scene units (64 units = one world metre).
/// Rotation 0 faces world -Z. Physics is intentionally arcade, not wheel simulation.
/// </summary>
public sealed class VehicleControllerComponent : WarLikeBehaviour {
    public float MaxSpeed { get; set; } = 300;
    public float Acceleration { get; set; } = 190;
    public float BrakeForce { get; set; } = 330;
    public float TurnRate { get; set; } = 135;
    public float Drag { get; set; } = 1.35f;
    public float ReverseRatio { get; set; } = .45f;
    public float Speed { get; private set; }
    public float Steering { get; private set; }
    public float ThrottleInput { get; private set; }
    public float SteeringInput { get; private set; }
    public bool Handbrake { get; private set; }

    public void SetInput(float throttle, float steer, bool handbrake = false) {
        if (!float.IsFinite(throttle) || !float.IsFinite(steer))
            throw new ArgumentOutOfRangeException(nameof(throttle), "Vehicle controls must be finite.");
        ThrottleInput = Math.Clamp(throttle, -1f, 1f);
        SteeringInput = Math.Clamp(steer, -1f, 1f);
        Handbrake = handbrake;
    }
    private static float MoveTowards(float current, float target, float maxDelta) =>
        current < target ? MathF.Min(target, current + maxDelta) : MathF.Max(target, current - maxDelta);

    public override void FixedUpdate(float fixedDeltaTime) {
        if (!float.IsFinite(fixedDeltaTime) || fixedDeltaTime <= 0) return;
        var dt = Math.Clamp(fixedDeltaTime, 0f, .1f);
        var maxSpeed = ValidPositive(MaxSpeed, 300);
        var acceleration = ValidPositive(Acceleration, 190);
        var brake = ValidPositive(BrakeForce, 330);
        var turnRate = ValidPositive(TurnRate, 135);
        var drag = ValidPositive(Drag, 1.35f);
        var reverse = Math.Clamp(ValidPositive(ReverseRatio, .45f), .15f, .8f);
        var start = Speed;
        if (ThrottleInput != 0) {
            var braking = start * ThrottleInput < -.5f;
            Speed += ThrottleInput * (braking ? brake : acceleration) * dt;
            if (braking && MathF.Sign(Speed) != MathF.Sign(start)) Speed = 0;
        } else {
            Speed = MoveTowards(Speed, 0, (12 + MathF.Abs(Speed) * drag) * dt);
        }
        if (Handbrake)
            Speed = MoveTowards(Speed, 0, (brake * .85f + MathF.Abs(Speed) * 1.8f) * dt);
        Speed = Math.Clamp(Speed, -maxSpeed * reverse, maxSpeed);
        if (MathF.Abs(Speed) < .15f && ThrottleInput == 0) Speed = 0;
        Steering = MoveTowards(Steering, SteeringInput, dt * (Handbrake ? 7 : 5));
        var pace = MathF.Abs(Speed) / maxSpeed;
        var turnFactor = Math.Clamp(MathF.Abs(Speed) / 50, 0, 1) *
                         (1 - .5f * pace) * (Handbrake ? 1.55f : 1);
        Actor.Rotation += Steering * turnRate * turnFactor * MathF.Sign(Speed == 0 ? 1 : Speed) * dt;
        var radians = Actor.Rotation * MathF.PI / 180;
        // Bridge exports X/Z multiplied by 64, consistent with the JS controller.
        Actor.Position += new Vector3(MathF.Sin(radians) * Speed * dt / 64f, 0,
                                     -MathF.Cos(radians) * Speed * dt / 64f);
    }

    private static float ValidPositive(float value, float fallback) =>
        float.IsFinite(value) && value > 0 ? value : fallback;
}
