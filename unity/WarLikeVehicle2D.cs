using System;
using UnityEngine;

namespace WarLike.UnityBridge
{
    /// <summary>Unity 2D driving bridge. Uses Rigidbody2D FixedUpdate and legacy Input axes.
    /// Attach to a GameObject with Rigidbody2D and Collider2D.
    /// Requires legacy input manager or Both in Active Input Handling.
    /// </summary>
    [RequireComponent(typeof(Rigidbody2D))]
    public sealed class WarLikeVehicle2D : MonoBehaviour
    {
        [Header("Drive configuration")]
        [Min(0)] public float maxSpeed = 12f;
        [Min(0)] public float acceleration = 18f;
        [Min(0)] public float brakeForce = 24f;
        [Min(0)] public float turnRate = 140f;
        [Min(0)] public float drag = 1.4f;
        public bool playerDriving;
        [Header("Input")]
        public string steerAxis = "Horizontal";
        public string throttleAxis = "Vertical";
        public KeyCode handbrakeKey = KeyCode.Space;
        private Rigidbody2D body;
        private float forwardSpeed;

        private void Awake()
        {
            body = GetComponent<Rigidbody2D>();
            body.gravityScale = 0;
        }

        private void FixedUpdate()
        {
            if (!playerDriving)
            {
                forwardSpeed = Mathf.MoveTowards(forwardSpeed, 0f, drag * Time.fixedDeltaTime);
                ApplyVelocity();
                return;
            }

            float throttle = Input.GetAxisRaw(throttleAxis);
            float steer = Input.GetAxisRaw(steerAxis);
            float targetSpeed = throttle * (throttle < 0 ? maxSpeed * 0.48f : maxSpeed);
            float rate = Mathf.Abs(throttle) < 0.01f ? drag : Mathf.Sign(targetSpeed) != Mathf.Sign(forwardSpeed) ? brakeForce : acceleration;
            forwardSpeed = Mathf.MoveTowards(forwardSpeed, targetSpeed, rate * Time.fixedDeltaTime);
            if (Input.GetKey(handbrakeKey))
                forwardSpeed = Mathf.MoveTowards(forwardSpeed, 0f, brakeForce * 2 * Time.fixedDeltaTime);
            float speedFactor = Mathf.Clamp01(Mathf.Abs(forwardSpeed) / Mathf.Max(0.1f, maxSpeed * 0.3f));
            body.MoveRotation(body.rotation - steer * turnRate * speedFactor * Mathf.Sign(forwardSpeed) * Time.fixedDeltaTime);
            ApplyVelocity();
        }

        private void ApplyVelocity()
        {
            body.linearVelocity = transform.up * forwardSpeed;
        }

        public void Enter() => playerDriving = true;
        public void Exit() => playerDriving = false;
        public void SetPhysics(float speed, float accel, float brake, float turn, float resistance)
        {
            maxSpeed = Mathf.Max(0, speed);
            acceleration = Mathf.Max(0, accel);
            brakeForce = Mathf.Max(0, brake);
            turnRate = Mathf.Max(0, turn);
            drag = Mathf.Max(0, resistance);
        }
    }
}
