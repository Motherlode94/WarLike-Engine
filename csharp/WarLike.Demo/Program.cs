using System.Numerics;
using WarLike.Runtime;

var world = args.Length > 0 ? GameWorld.FromWarLikeJson(File.ReadAllText(args[0])) : new GameWorld();
var player = world.Actors.FirstOrDefault() ?? world.CreateActor("Player", Vector3.Zero);
world.AddComponent(player, new AutoRotate());
for (int i = 0; i < 120; i++) world.Tick(1f / 60f);
Console.WriteLine($"WarLike C# simulation: {world.Actors.Count} actors; first actor: {player.Name}; rotation={player.Get<RotationData>("rotation")?.Degrees:F1}");

// Native driving smoke check: fixed-step acceleration, steering, braking and reverse.
var drivingWorld = new GameWorld();
var car = drivingWorld.CreateActor("Native Test Car", Vector3.Zero);
var vehicle = drivingWorld.AddComponent(car, new VehicleControllerComponent());
vehicle.SetInput(1, 0);
for (int i = 0; i < 60; i++) drivingWorld.Tick(1f / 60f);
if (!(vehicle.Speed > 0 && car.Position.Z < 0))
    throw new Exception("C# vehicle did not accelerate forward.");
vehicle.SetInput(1, 1);
for (int i = 0; i < 30; i++) drivingWorld.Tick(1f / 60f);
if (car.Rotation <= 0)
    throw new Exception("C# vehicle steering failed.");
vehicle.SetInput(-1, 0);
for (int i = 0; i < 120; i++) drivingWorld.Tick(1f / 60f);
if (vehicle.Speed >= 0)
    throw new Exception("C# vehicle brake/reverse failed.");
Console.WriteLine("Native VehicleController smoke check: PASS");

// Native genre smoke checks: standard actions and guards.
var genres = new GameWorld();
var rp = genres.AddComponent(genres.CreateActor("Roleplay",Vector3.Zero),new RoleplayComponent());
rp.Work();
if (rp.Money != 70 || rp.Reputation != 1 || !rp.BuySupplies() || rp.Money != 60)
    throw new Exception("C# Roleplay genre failed");
var race = genres.AddComponent(genres.CreateActor("Racing",Vector3.Zero),new RacingRulesComponent());
race.StartRace();
genres.Tick(1f/60f);
if (race.Elapsed <= 0 || !race.PassCheckpoint() || !race.FinishRace())
    throw new Exception("C# Racing genre failed");
var sim = genres.AddComponent(genres.CreateActor("Simulation",Vector3.Zero),new SimulationEconomyComponent());
sim.Produce();
if (sim.Materials != 7 || !sim.FulfillOrder() || sim.Money != 125)
    throw new Exception("C# Simulation genre failed");
var rpg = genres.AddComponent(genres.CreateActor("RPG",Vector3.Zero),new RpgProgressionComponent());
rpg.StartQuest();
if (!rpg.CompleteQuest() || rpg.Experience != 50)
    throw new Exception("C# RPG genre failed");
var empire = genres.AddComponent(genres.CreateActor("4X",Vector3.Zero),new FourXEmpireComponent());
empire.Explore();empire.Expand();empire.Exploit();empire.Conquer();empire.NextTurn();
if (empire.Turn != 2 || empire.Science != 6 || empire.Territory != 3 || empire.Army != 1)
    throw new Exception("C# 4X genre failed");
Console.WriteLine("Native RP Racing Simulation RPG 4X smoke checks: PASS");

public sealed class RotationData { public float Degrees { get; set; } }

public sealed class AutoRotate : WarLikeBehaviour {
    public float DegreesPerSecond { get; set; } = 90f;
    public override void Start() => Actor.Properties["rotation"] = new RotationData();
    public override void Update(float deltaTime) {
        var rotation = Actor.Get<RotationData>("rotation")!;
        rotation.Degrees = (rotation.Degrees + DegreesPerSecond * deltaTime) % 360f;
    }
}
