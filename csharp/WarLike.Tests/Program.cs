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
Test("MonoBehaviour private Unity messages use the right clock and defer inactive Awake", () => {
    var world = new GameWorld { FixedDeltaTime = .02f }; var actor = world.CreateActor("Unity style", Vector3.Zero); actor.Enabled = false;
    var calls = new List<string>(); var script = world.AddComponent(actor, new MonoProbe(calls));
    world.Tick(.04f); Check(calls.Count == 0, "Inactive MonoBehaviour awakened.");
    actor.Enabled = true; world.Tick(.04f);
    Check(string.Join(',',calls) == "Awake,Enable,Start,Fixed,Fixed,Update,Late", "Unity message order failed: " + string.Join(',', calls));
    Check(Math.Abs(script.FrameDelta-.04f)<.00001f && Math.Abs(script.FixedDelta-.02f)<.00001f, "Incorrect Time.deltaTime.");
    Check(Math.Abs(actor.Rotation-3.6f)<.0001f, "Native transform did not rotate.");
    script.enabled = false; world.Tick(.04f); script.enabled = true; world.Tick(.02f);
    Check(calls.Count(e=>e=="Start")==1 && calls.Count(e=>e=="Awake")==1, "MonoBehaviour restarted.");
    script.DestroySelf(); script.DestroySelf(); world.Tick(0);
    Check(calls.Count(e=>e=="Destroy")==1 && actor.GetComponent<MonoProbe>() is null, "Deferred component destruction failed.");
});
Test("MonoBehaviour component access, activation and scene disposal preserve identity", () => {
    var world = new GameWorld(); var actor = world.CreateActor("Object", Vector3.Zero);
    var calls = new List<string>(); var script=world.AddComponent(actor,new MonoProbe(calls));
    var health=script.gameObject.AddComponent<HealthComponent>();
    Check(ReferenceEquals(script.GetComponent<HealthComponent>(),health) && script.TryGetComponent<HealthComponent>(out var found) && ReferenceEquals(found,health), "Component references differ.");
    Check(script.GetComponents<MonoBehaviour>().Length==2 && script.gameObject.name=="Object", "GameObject access failed.");
    script.gameObject.SetActive(false); Check(!script.isActiveAndEnabled && !script.gameObject.activeSelf, "GameObject stayed active.");
    script.gameObject.SetActive(true); world.Tick(0); world.Dispose(); world.Dispose();
    Check(calls.Count(e=>e=="Destroy")==1 && world.Actors.Count==0, "Scene disposal repeated destruction.");
});
Test("native script fields serialize before Awake and edit through the Inspector", () => {
    var types=new Dictionary<string,Type>{{"SerializedMono",typeof(SerializedMono)}};
    var world=GameWorld.FromWarLikeJson("""{"entities":[{"id":1,"name":"Native","csharpScript":{"name":"SerializedMono","source":"compiled","values":{"Speed":12,"Label":"test","Offset":{"x":1,"y":2,"z":3},"privateValue":7}}}]}""",types);
    var script=world.Actors[0].GetComponent<SerializedMono>()!;
    Check(script.CapturedSpeed==12 && script.Offset==new Vector3(1,2,3) && script.PrivateValue==7, "Script values applied after Awake.");
    var component=RuntimeInspector.Inspect(world,1).Components.Single();
    Check(component.SourceIndex==-1 && component.Properties.Any(p=>p.Name=="Label" && p.Type=="string"), "Script fields absent from Inspector.");
    RuntimeInspector.Set(world,1,0,"Speed",Json("4")); RuntimeInspector.Set(world,1,0,"Label",Json("\"new\""));
    Check(script.Speed==4 && script.Label=="new", "Native field update failed.");
    Reject(()=>RuntimeInspector.Set(world,1,0,"Speed",Json("\"bad\"")));
    Reject(()=>RuntimeInspector.Set(world,1,0,"World",Json("0")));
});
Test("native input belongs to a frame and Time does not leak between worlds", () => {
    var world=new GameWorld();var actor=world.CreateActor("Input",Vector3.Zero);var script=world.AddComponent(actor,new InputProbe());
    world.SetInput(["w"],["e"]);world.Tick(.1f);Check(script.Held && script.Pressed,"Input frame not visible in Update.");
    world.Tick(.1f);Check(!script.Pressed && script.Held,"GetKeyDown persisted beyond one frame.");
    Check(Time.deltaTime==0 && Time.time==0,"Time leaked outside a callback.");
});

Test("native Animator typed values, triggers and command consumption", () => {
    var animator = new Animator(Json("""{"states":[{"id":"idle"},{"id":"attack"}],"parameters":[{"name":"pace","type":"float","default":0},{"name":"attackRequest","type":"trigger","default":false}]}"""));
    animator.SetFloat("pace", 2.5f); animator.SetTrigger("attackRequest"); animator.Play("attack", 0, .25f);
    Check(animator.GetFloat("pace") == 2.5f && animator.GetBool("attackRequest"), "Native Animator values were not shared.");
    var commands = animator.DrainCommands(); Check(commands.Length == 3 && commands[2].Method == "Play", "Commands missing or reordered.");
    Check(animator.DrainCommands().Length == 0, "Commands replayed.");
    Reject(() => animator.SetFloat("pace", float.NaN)); Reject(() => animator.SetBool("pace", true)); Reject(() => animator.Play("missing"));
});
Test("Animator receives browser state and is available to native components", () => {
    using var world = GameWorld.FromWarLikeJson("""{"entities":[{"id":1,"name":"Hero","x":0,"y":0,"animatorGraph":{"states":[{"id":"idle"}],"parameters":[]}}]}""");
    var animator = world.Actors[0].GetComponent<Animator>(); Check(animator is not null, "Animator was not imported as a component.");
    world.ApplySharedFrame(Json("""[{"id":1,"x":0,"y":0,"elevation3d":0,"rotation":0,"hp":100,"enabled":true,"animator":{"stateId":"idle","normalizedTime":0.5,"transition":true,"parameters":{"speed":2}}}]"""));
    Check(animator!.GetCurrentAnimatorStateInfo().IsName("idle") && animator.IsInTransition() && animator.GetFloat("speed") == 2, "Shared Animator snapshot missing.");
    animator.CrossFade("idle", .2f); Check(animator.DrainCommands()[0].Method == "CrossFade", "CrossFade missing.");
});
Test("invalid Animator snapshots do not partially change a native scene", () => {
    using var world = GameWorld.FromWarLikeJson("""{"entities":[{"id":1,"x":0,"y":0}]}""");
    Reject(() => world.ApplySharedFrame(Json("""[{"id":1,"x":64,"y":0,"elevation3d":0,"rotation":0,"hp":100,"enabled":true,"animator":{"parameters":{"speed":{}}}}]""")));
    Check(world.Actors[0].Position.X == 0, "Invalid Animator frame changed the actor.");
});

Test("MonoBehaviour callbacks use the actor Animator instance", () => {
    using var world = GameWorld.FromWarLikeJson("""{"entities":[{"id":1,"x":0,"y":0,"animatorGraph":{"states":[{"id":"idle"}],"parameters":[{"name":"pace","type":"float","default":0}]}}]}""");
    var actor = world.Actors[0]; world.AddComponent(actor, new AnimatorCallbackProbe()); world.Tick(.05f);
    var animator = actor.GetComponent<Animator>()!; Check(animator.GetFloat("pace") == 3, "MonoBehaviour did not use its actor Animator.");
    Check(animator.DrainCommands().Any(c=>c.Method=="SetFloat"), "Callback commands were not retained for the shared frame.");
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

sealed class MonoProbe(List<string> calls) : MonoBehaviour {
    public float FrameDelta, FixedDelta;
    void Awake() => calls.Add("Awake");
    void OnEnable() => calls.Add("Enable");
    void Start() => calls.Add("Start");
    void FixedUpdate() { calls.Add("Fixed"); FixedDelta=Time.deltaTime; }
    void Update() { calls.Add("Update");FrameDelta=Time.deltaTime;transform.Rotate(0,90*Time.deltaTime,0); }
    void LateUpdate() => calls.Add("Late");
    void OnDisable() => calls.Add("Disable");
    void OnDestroy() => calls.Add("Destroy");
    public void DestroySelf() => Destroy(this);
}
public sealed class SerializedMono : MonoBehaviour {
    public float Speed=2;
    public string Label="default";
    public Vector3 Offset=Vector3.Zero;
    [SerializeField] private float privateValue=1;
    public float CapturedSpeed { get; private set; }
    public float PrivateValue => privateValue;
    void Awake() => CapturedSpeed=Speed;
}
sealed class InputProbe : MonoBehaviour {
    public bool Held, Pressed;
    void Update() { Held=Input.GetKey(KeyCode.W);Pressed=Input.GetKeyDown("e"); }
}

sealed class AnimatorCallbackProbe : MonoBehaviour {
    private Animator animator = null!;
    void Awake() => animator = GetComponent<Animator>()!;
    void Update() => animator.SetFloat("pace", 3);
}
