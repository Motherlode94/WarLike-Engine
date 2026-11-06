using System.Text.Json;
using System.Text.Json.Nodes;

namespace WarLike.Runtime;

/// <summary>The browser/V2/.NET interchange: metres, degrees, stable actor IDs.</summary>
public static class SceneContract {
    public static string RuntimeJson(string json) {
        var root = JsonNode.Parse(json) as JsonObject ?? throw new JsonException("Expected scene object.");
        if (root["schema"]?.GetValue<string>() != "warlike.scene.v2") return json;
        var objects = root["objects"] as JsonArray ?? throw new JsonException("Expected canonical objects.");
        var ids = new Dictionary<string,int>(); var used = new HashSet<int>(); int next = 1;
        foreach (var item in objects) {
            var obj = item as JsonObject ?? throw new JsonException("Invalid GameObject.");
            string key = obj["id"]?.GetValue<string>() ?? throw new JsonException("Object ID is required.");
            if (ids.ContainsKey(key)) throw new JsonException("Duplicate object ID.");
            var components = obj["components"] as JsonArray ?? throw new JsonException("Components are required.");
            var legacy = components.FirstOrDefault(c => c?["type"]?.GetValue<string>() == "LegacyEntity")?["data"];
            int id = obj["sourceEntityId"]?.GetValue<int>() ?? legacy?["id"]?.GetValue<int>() ?? 0;
            if (id != 0 && (id < 0 || !used.Add(id))) throw new JsonException("Duplicate or invalid actor ID.");
            ids.Add(key,id);
        }
        foreach (string key in ids.Keys.ToArray()) if (ids[key] == 0) { while (used.Contains(next)) next++; ids[key]=next; used.Add(next++); }
        var entities = new JsonArray();
        foreach (var item in objects) {
            var obj = item!.AsObject(); var components = obj["components"]!.AsArray();
            var transform = components.Where(c => c?["type"]?.GetValue<string>() == "Transform").ToArray();
            if (transform.Length != 1) throw new JsonException("A unique Transform is required.");
            float[] Vector(string key) {
                var values = transform[0]?[key] as JsonArray;
                if (values is null || values.Count != 3) throw new JsonException("Invalid " + key);
                var result = values.Select(v=>v!.GetValue<float>()).ToArray();
                if (result.Any(v=>!float.IsFinite(v))) throw new JsonException("Non-finite Transform.");
                return result;
            }
            var p=Vector("position"); var r=Vector("rotation"); var s=Vector("scale");
            if (s.Any(v=>v==0)) throw new JsonException("Zero scale.");
            var legacy=components.FirstOrDefault(c=>c?["type"]?.GetValue<string>()=="LegacyEntity")?["data"];
            var entity=legacy?.DeepClone() as JsonObject ?? new JsonObject { ["type"]="object",["w"]=64,["h"]=64 };
            string key=obj["id"]!.GetValue<string>();
            entity["id"]=ids[key]; entity["name"]=obj["name"]?.DeepClone() ?? JsonValue.Create("GameObject");
            entity["x"]=p[0]*64;entity["y"]=p[2]*64;entity["elevation3d"]=p[1];entity["rotation"]=r[1];
            entity["enabled"]=obj["active"]?.GetValue<bool>() ?? true;
            entity["w"]=(entity["w"]?.GetValue<float>()??64)*Math.Abs(s[0]);
            entity["h"]=(entity["h"]?.GetValue<float>()??64)*Math.Abs(s[1]);
            if (obj["parentId"] is JsonValue parent) {
                if(!ids.TryGetValue(parent.GetValue<string>(),out int parentId))throw new JsonException("Missing parent.");
                entity["parentId"]=parentId;
            }
            var native=new JsonArray();
            foreach(var component in components) {
                string? type=component?["type"]?.GetValue<string>();
                if(type=="NativeBehaviour")native.Add(component?["data"]?.DeepClone());
                else if(type is not null && type is not "Transform" and not "LegacyEntity" && component?["data"] is JsonObject data)entity[type]=data.DeepClone();
            }
            if(native.Count>0)entity["csharpComponents"]=native;
            entities.Add(entity);
        }
        return new JsonObject{["version"]=6,["entities"]=entities}.ToJsonString();
    }
}
