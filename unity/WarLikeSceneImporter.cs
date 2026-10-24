using System;
using UnityEngine;

namespace WarLike.UnityBridge
{
    // JSON schema compatible with WarLike Studio scene exports. Unity JsonUtility
    // intentionally reads known fields and ignores unsupported future properties.
    [Serializable]
    public sealed class WarLikeSceneData
    {
        public int version;
        public WarLikeSceneEntity[] entities;
        public WarLikeSceneCamera camera;
    }

    [Serializable]
    public sealed class WarLikeSceneCamera { public float x; public float y; public float zoom = 1f; }

    [Serializable]
    public sealed class WarLikeSceneEntity
    {
        public int id;
        public string name;
        public string type;
        public string assetId;
        public string color;
        public float x, y, w, h, rotation;
        public float maxSpeed = 250f, acceleration = 210f, brakeForce = 310f, turnRate = 140f, drag = 1.4f;
    }

    /// <summary>
    /// Drag a WarLike Studio exported JSON into Source Scene, then use Import Scene
    /// from the component context menu. Native Unity scene objects are generated.
    /// Placeholder colored sprites are created; external sprite atlas import is separate.
    /// </summary>
    public sealed class WarLikeSceneImporter : MonoBehaviour
    {
        public TextAsset sourceScene;
        [Min(.001f)] public float pixelsPerUnit = 64f;
        public bool createColliders = true;
        public bool addVehiclePhysics = true;

        [ContextMenu("Import WarLike Scene")]
        public void Import()
        {
            if (sourceScene == null)
            {
                Debug.LogError("WarLike: assign an exported JSON TextAsset first.", this);
                return;
            }
            WarLikeSceneData scene;
            try { scene = JsonUtility.FromJson<WarLikeSceneData>(sourceScene.text); }
            catch (Exception ex) { Debug.LogError("Invalid WarLike scene: " + ex.Message, this); return; }
            if (scene?.entities == null || scene.entities.Length > 10000)
            {
                Debug.LogError("WarLike: invalid scene or too many entities.", this);
                return;
            }
            GameObject root = new GameObject("WarLike Imported Scene");
            root.transform.SetParent(transform, false);
            foreach (WarLikeSceneEntity data in scene.entities)
            {
                if (data == null || float.IsNaN(data.x) || float.IsInfinity(data.x) || float.IsNaN(data.y) || float.IsInfinity(data.y) ||
                    float.IsNaN(data.w) || float.IsInfinity(data.w) || float.IsNaN(data.h) || float.IsInfinity(data.h) || data.w <= 0 || data.h <= 0)
                    continue;
                GameObject go = new GameObject(string.IsNullOrWhiteSpace(data.name) ? "Entity" : data.name);
                go.transform.SetParent(root.transform, false);
                go.transform.localPosition = new Vector3((data.x + data.w * .5f) / pixelsPerUnit,
                    -(data.y + data.h * .5f) / pixelsPerUnit, 0f);
                go.transform.localEulerAngles = new Vector3(0, 0, -data.rotation);
                go.transform.localScale = new Vector3(data.w / pixelsPerUnit, data.h / pixelsPerUnit, 1f);
                var spriteRenderer = go.AddComponent<SpriteRenderer>();
                spriteRenderer.sprite = WhiteSprite;
                if (ColorUtility.TryParseHtmlString(data.color, out Color color))
                    spriteRenderer.color = color;
                if (createColliders) go.AddComponent<BoxCollider2D>();
                if (addVehiclePhysics && IsVehicle(data.assetId))
                {
                    var body = go.AddComponent<Rigidbody2D>();
                    body.gravityScale = 0f;
                    var motor = go.AddComponent<WarLikeVehicle2D>();
                    // Web speed is in pixels/sec, Unity in units/sec.
                    motor.SetPhysics(data.maxSpeed / pixelsPerUnit,
                        data.acceleration / pixelsPerUnit,
                        data.brakeForce / pixelsPerUnit,
                        data.turnRate, data.drag);
                }
            }
            Debug.Log($"WarLike: imported {scene.entities.Length} objects. Sprites are placeholders.", root);
        }

        private static bool IsVehicle(string id)
        {
            switch (id)
            {
                case "jeep": case "buggy": case "tank": case "bike": case "apc":
                case "pickup": case "van": case "truck": case "police-car":
                case "ambulance": case "helicopter": case "hovercraft": case "quad": return true;
                default: return false;
            }
        }

        private static Sprite whiteSprite;
        private static Sprite WhiteSprite
        {
            get
            {
                if (whiteSprite != null) return whiteSprite;
                var texture = new Texture2D(1, 1, TextureFormat.RGBA32, false);
                texture.SetPixel(0, 0, Color.white);
                texture.Apply();
                whiteSprite = Sprite.Create(texture, new Rect(0, 0, 1, 1),
                    new Vector2(.5f, .5f), 1f);
                return whiteSprite;
            }
        }
    }
}
