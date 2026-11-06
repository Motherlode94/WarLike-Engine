using System.Numerics;
using System.Text.Json;
using WarLike.Runtime;

int passed = 0;
void Check(bool value, string message) { if (!value) throw new Exception(message); }
void Reject(Action action) { try { action(); } catch (ArgumentException) { return; } throw new Exception("Invalid mutation was accepted."); }
JsonElement Json(string text) { using var doc = JsonDocument.Parse(text); return doc.RootElement.Clone(); }
void Test(string name, Action action) { action(); passed++; Console.WriteLine($"PASS {name}"); }

Test("lifecycle order and repeated activation", () => {
    var world = new GameWorld(); var actor = world.CreateActor("Actor", Vector3.Zero);
    var events = new List<string>(); var behaviour = world.AddComponent(actor, new Probe(events));
    world.Tick(1f / 60);
    Check(string.Join(',', events) == "Awake,Enable,Start,Fixed,Update,Late", "Incorrect lifecycle order.");
    actor.Enabled = false; world.Tick(1f / 60); actor.Enabled = true; actor.Enabled = true; world.Tick(1f / 60);
    Check(events.Count(e => e == "Start") == 1 && events.Count(e => e == "Enable") == 2, "Start or OnEnable repeated.");
    behaviour.Enabled = false; int count = events.Count; world.Tick(1f / 60);
    Check(events.Count == count && !behaviour.IsActiveAndEnabled, "Disabled component still executes.");
    behaviour.Enabled = true; world.Tick(1f / 60);
    Check(events.Count(e => e == "Start") == 1, "Re-enabled component restarted.");
});
Test("inactive actors defer Start; Awake may disable a component", () => {
    var world = new GameWorld(); var actor = world.CreateActor("Disabled", Vector3.Zero); actor.Enabled = false;
    var events = new List<string>(); world.AddComponent(actor, new Probe(events)); world.Tick(.1f);
    Check(string.Join(',', events) == "Awake", "Inactive actor started.");
    actor.Enabled = true; world.Tick(0);
    Check(string.Join(',', events) == "Awake,Enable,Start,Update,Late", "Deferred Start failed.");
    var disabled = world.AddComponent(actor, new DisableInAwake());
    world.Tick(.1f); Check(disabled.Enables == 0 && !disabled.IsActiveAndEnabled, "Awake disable was ignored.");
});
Test("components created during Update start on next tick", () => {
    var world = new GameWorld(); var actor = world.CreateActor("Spawner", Vector3.Zero);
    var events = new List<string>(); world.AddComponent(actor, new SpawnProbe(events));
    world.Tick(1f / 60); Check(string.Join(',', events) == "Awake,Enable", "New component executed in the current frame.");
    world.Tick(1f / 60); Check(events.Count(e => e == "Start") == 1 && events.Contains("Fixed"), "New component did not start correctly.");
});
Test("destruction is once and components cannot be shared", () => {
    var world = new GameWorld(); var actor = world.CreateActor("Removed", Vector3.Zero);
    var events = new List<string>(); var probe = world.AddComponent(actor, new Probe(events));
    Reject(() => world.AddComponent(actor, probe));
    world.RemoveActor(actor); world.RemoveActor(actor); world.Tick(0);
    probe.Enabled = false; probe.Enabled = true;
    Check(events.Count(e => e == "Destroy") == 1 && !probe.IsActiveAndEnabled && world.Actors.Count == 0, "Destruction repeated or actor stayed active.");
    Check(actor.GetComponent<Probe>() is null, "Removed actor kept its world.");
});
Test("typed Inspector validates before writing and protects private setters", () => {
    var world = new GameWorld(); var actor = world.CreateActor("Inspector", Vector3.Zero);
    var motion = world.AddComponent(actor, new LinearMotionComponent());
    var weapon = world.AddComponent(actor, new WeaponComponent());
    RuntimeInspector.Set(world, actor.Id, 0, "UnitsPerSecond", Json("{\"x\":3,\"y\":1,\"z\":-2}"));
    Check(motion.UnitsPerSecond == new Vector3(3, 1, -2), "Vector3 not set.");
    Reject(() => RuntimeInspector.Set(world, actor.Id, 0, "UnitsPerSecond", Json("{\"x\":7,\"y\":100000,\"z\":0}")));
    Check(motion.UnitsPerSecond.X == 3, "Partial vector write.");
    Reject(() => RuntimeInspector.Set(world, actor.Id, 1, "Ammo", Json("999")));
    Reject(() => RuntimeInspector.Set(world, actor.Id, 1, "MagazineSize", Json("2.5")));
    Reject(() => RuntimeInspector.Set(world, actor.Id, 1, "FireRate", Json("1e100")));
    Reject(() => RuntimeInspector.Set(world, actor.Id, 1, "World", Json("0")));
    Reject(() => RuntimeInspector.Set(world, actor.Id, 0, "Enabled", Json("1")));
    Check(weapon.Ammo == 30, "Private setter was mutated.");
    RuntimeInspector.Set(world, actor.Id, 0, "Enabled", Json("false")); world.Tick(.1f);
    Check(actor.Position == Vector3.Zero, "Inspector disable did not stop movement.");
});
Test("scene import preserves definition indexes and disabled state", () => {
    var world = GameWorld.FromWarLikeJson("""
    {"entities":[{"id":10,"name":"Imported","x":64,"y":128,"csharpComponents":[
      {"kind":"Unknown"},{"kind":"LinearMotion","vx":3,"enabled":false},{"kind":"Health","regen":2}]}]}
    """);
    var actor = world.Actors.Single(); var snapshot = RuntimeInspector.Inspect(world, 10);
    Check(snapshot.Components[0].SourceIndex == 1 && !snapshot.Components[0].Enabled, "Source index or enabled state lost.");
    world.Tick(.1f); Check(actor.Position == new Vector3(1, 0, 2), "Disabled imported component moved.");
    RuntimeInspector.Set(world, 10, 0, "Enabled", Json("true")); world.Tick(.1f);
    Check(Math.Abs(actor.Position.X - 1.3f) < .0001f, "Imported component did not resume.");
    try { GameWorld.FromWarLikeJson("{\"entities\":[{\"id\":1},{\"id\":1}]}"); throw new Exception("Duplicate IDs accepted."); } catch (JsonException) { }
});
Test("squad reaches a spaced formation, preserves height and holds", () => {
    var world = new GameWorld(); var root = world.CreateActor("Squad", Vector3.Zero);
    var a = world.CreateActor("A", new Vector3(0, 2, 0)); var b = world.CreateActor("B", Vector3.Zero);
    var squad = world.AddComponent(root, new TacticalSquadComponent()); squad.SetMembers([a.Id, b.Id]);
    squad.MoveTo(new Vector3(6, 999, 0));
    for (int i = 0; i < 600; i++) world.Tick(1f / 60);
    Check(Vector3.Distance(root.Position, new Vector3(6, 0, 0)) < .001f && squad.Order == SquadOrder.Hold, "Squad never arrived.");
    Check(Math.Abs(a.Position.Y - 2) < .001f, "Formation changed unit elevation.");
    var groundA = new Vector2(a.Position.X, a.Position.Z); var groundB = new Vector2(b.Position.X, b.Position.Z);
    Check(Math.Abs(Vector2.Distance(groundA, groundB) - squad.Spacing) < .001f, "Formation spacing incorrect.");
    squad.MoveTo(new Vector3(-20, 0, 0)); world.Tick(.1f); squad.Hold(); var before = a.Position;
    world.Tick(.25f); Check(before == a.Position, "Hold did not stop immediately.");
    Reject(() => squad.SetMembers([a.Id, a.Id])); Reject(() => squad.SetMembers([root.Id]));
});
Test("squad follows outside its group and stops when target dies", () => {
    var world = new GameWorld(); var root = world.CreateActor("Squad", Vector3.Zero);
    var member = world.CreateActor("Member", Vector3.Zero); var target = world.CreateActor("Vehicle", new Vector3(0, 0, -12));
    var squad = world.AddComponent(root, new TacticalSquadComponent()); squad.SetMembers([member.Id]);
    squad.Follow(target.Id); for (int i = 0; i < 600; i++) world.Tick(1f / 60);
    Check(Math.Abs(Vector3.Distance(root.Position, target.Position) - squad.FollowDistance) < .01f, "Follow distance incorrect.");
    target.Health = 0; world.Tick(.1f); Check(squad.Order == SquadOrder.Hold, "Dead follow target still pursued.");
    Reject(() => squad.Follow(member.Id)); Reject(() => squad.Follow(999));
});
Test("canonical scene uses the same axes IDs and native components as browser Play", () => {
    var world=GameWorld.FromWarLikeJson("""
    {"schema":"warlike.scene.v2","objects":[{"id":"hero","sourceEntityId":9,"name":"Hero","parentId":null,"active":true,"components":[
      {"type":"Transform","position":[1,2,3],"rotation":[0,40,0],"scale":[1,1,1]},
      {"type":"LegacyEntity","data":{"id":9,"w":32,"h":64,"hp":80}},
      {"type":"NativeBehaviour","data":{"kind":"AutoRotate","speed":90}}
    ]}]}
    """);
    var actor=world.Actors.Single();Check(actor.Id==9&&actor.Position==new Vector3(1,2,3),"Canonical identity or axes lost.");
    var component=actor.GetComponent<AutoRotateBehaviour>();world.Tick(.1f);
    Check(Math.Abs(actor.Rotation-49)<.001f&&component is not null,"Canonical native behaviour missing.");
    world.ApplySharedFrame(Json("""[{"id":9,"x":128,"y":256,"elevation3d":5,"rotation":10,"hp":77,"enabled":true}]"""));world.Tick(.1f);
    Check(actor.Position==new Vector3(2,5,4)&&Math.Abs(actor.Rotation-19)<.001f&&actor.Health==77,"Shared frame did not execute.");
    Check(ReferenceEquals(component,actor.GetComponent<AutoRotateBehaviour>()),"Frame recreated native components.");
});
Test("shared frames validate all IDs before mutating any actor", () => {
    var world=new GameWorld();var a=world.CreateActor("A",Vector3.Zero);world.CreateActor("B",Vector3.One);
    Reject(()=>world.ApplySharedFrame(Json("""[{"id":1,"x":99,"y":0,"elevation3d":0,"rotation":0,"hp":10,"enabled":true},{"id":99,"x":0,"y":0,"elevation3d":0,"rotation":0,"hp":10,"enabled":true}]""")));
    Check(a.Position==Vector3.Zero&&a.Health==100,"Invalid shared frame partially applied.");
});
Console.WriteLine($"{passed} native C# tests passed.");

sealed class Probe(List<string> events) : WarLikeBehaviour {
    public override void Awake() => events.Add("Awake");
    public override void OnEnable() => events.Add("Enable");
    public override void Start() => events.Add("Start");
    public override void Update(float dt) => events.Add("Update");
    public override void FixedUpdate(float dt) => events.Add("Fixed");
    public override void LateUpdate(float dt) => events.Add("Late");
    public override void OnDisable() => events.Add("Disable");
    public override void OnDestroy() => events.Add("Destroy");
}
sealed class DisableInAwake : WarLikeBehaviour {
    public int Enables { get; private set; }
    public override void Awake() => Enabled = false;
    public override void OnEnable() => Enables++;
}
sealed class SpawnProbe(List<string> events) : WarLikeBehaviour {
    private bool _spawned;
    public override void Update(float dt) { if (!_spawned) { _spawned = true; AddComponent(new Probe(events)); } }
}
