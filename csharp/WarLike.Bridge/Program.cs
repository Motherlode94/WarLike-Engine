using System.Net;
using System.Text;
using System.Text.Json;
using WarLike.Runtime;

var builder = new HttpListener();
builder.Prefixes.Add("http://127.0.0.1:8765/");
builder.Start();
Console.WriteLine("WarLike C# bridge listening on http://127.0.0.1:8765/");
var world = new GameWorld();
var gate = new SemaphoreSlim(1,1);
const int MaxSceneBytes = 2*1024*1024;
var permittedOrigins = new HashSet<string>(StringComparer.OrdinalIgnoreCase) { "http://localhost:8765", "http://127.0.0.1:8765", "https://warlike-engine.pages.dev" };
while (true) {
    var context = await builder.GetContextAsync();
    _ = Handle(context);
}
async Task Handle(HttpListenerContext ctx) {
    var req=ctx.Request;var res=ctx.Response;
    var origin=req.Headers["Origin"];
    if (origin is not null && !permittedOrigins.Contains(origin)) { res.StatusCode=403; res.Close(); return; }
    if (origin is not null) { res.Headers["Access-Control-Allow-Origin"]=origin; res.Headers["Vary"]="Origin"; }
    res.Headers["Access-Control-Allow-Methods"]="POST, GET, OPTIONS";
    res.Headers["Access-Control-Allow-Headers"]="Content-Type";
    if (req.Headers["Access-Control-Request-Private-Network"] == "true") res.Headers["Access-Control-Allow-Private-Network"]="true";
    res.Headers["Cache-Control"]="no-store";
    try {
        if (req.HttpMethod=="OPTIONS"){res.StatusCode=204;return;}
        if (req.Url?.AbsolutePath=="/health"&&req.HttpMethod=="GET"){await Reply(new {ready=true,engine="WarLike C# .NET 8"});return;}
        if (req.Url?.AbsolutePath=="/scene"&&req.HttpMethod=="POST"){
            if(req.ContentLength64>MaxSceneBytes){res.StatusCode=413;await Reply(new {error="Scene too large"});return;}
            using var reader=new StreamReader(req.InputStream);
            var json=await reader.ReadToEndAsync();
            if(Encoding.UTF8.GetByteCount(json)>MaxSceneBytes){res.StatusCode=413;await Reply(new {error="Scene too large"});return;}
            var incoming=GameWorld.FromWarLikeJson(json);
            await gate.WaitAsync();try{world=incoming;await Reply(new {ok=true,count=world.Actors.Count});}finally{gate.Release();}return;
        }
        if (req.Url?.AbsolutePath=="/genre/action"&&req.HttpMethod=="POST"){
            using var doc=await JsonDocument.ParseAsync(req.InputStream);
            var input=doc.RootElement;
            if(!input.TryGetProperty("id",out var id) || !id.TryGetInt32(out int actorId) ||
               !input.TryGetProperty("action",out var actionValue) || actionValue.ValueKind!=JsonValueKind.String){
                res.StatusCode=400;await Reply(new {error="Invalid genre action"});return;
            }
            var action=actionValue.GetString();
            await gate.WaitAsync();try{
                var actor=world.Actors.FirstOrDefault(a=>a.Id==actorId);
                if(actor is null){res.StatusCode=404;await Reply(new {error="Actor not found"});return;}
                object? snapshot=null;
                switch(action){
                    case "rp-work" when actor.GetComponent<RoleplayComponent>() is { } rpWork:
                        rpWork.Work(); snapshot=new {money=rpWork.Money,reputation=rpWork.Reputation};break;
                    case "rp-buy" when actor.GetComponent<RoleplayComponent>() is { } rpBuy:
                        var bought=rpBuy.BuySupplies();snapshot=new {ok=bought,money=rpBuy.Money,reputation=rpBuy.Reputation};break;
                    case "race-start" when actor.GetComponent<RacingRulesComponent>() is { } raceStart:
                        raceStart.StartRace();snapshot=new {started=raceStart.Started,seconds=raceStart.Elapsed,checkpoints=raceStart.Checkpoints,finished=raceStart.Finished};break;
                    case "race-checkpoint" when actor.GetComponent<RacingRulesComponent>() is { } raceCheckpoint:
                        var passed=raceCheckpoint.PassCheckpoint();snapshot=new {ok=passed,checkpoints=raceCheckpoint.Checkpoints,seconds=raceCheckpoint.Elapsed};break;
                    case "race-finish" when actor.GetComponent<RacingRulesComponent>() is { } raceFinish:
                        var finished=raceFinish.FinishRace();snapshot=new {ok=finished,seconds=raceFinish.Elapsed,finished=raceFinish.Finished};break;
                    case "sim-produce" when actor.GetComponent<SimulationEconomyComponent>() is { } simProduce:
                        simProduce.Produce();snapshot=new {materials=simProduce.Materials,money=simProduce.Money};break;
                    case "sim-deliver" when actor.GetComponent<SimulationEconomyComponent>() is { } simDeliver:
                        var delivered=simDeliver.FulfillOrder();snapshot=new {ok=delivered,materials=simDeliver.Materials,money=simDeliver.Money};break;
                    case "sim-service" when actor.GetComponent<SimulationEconomyComponent>() is { } simService:
                        simService.ServiceMachine();snapshot=new {maintenance=simService.Maintenance};break;
                    case "rpg-start" when actor.GetComponent<RpgProgressionComponent>() is { } rpgStart:
                        rpgStart.StartQuest();snapshot=new {active=rpgStart.QuestActive,level=rpgStart.Level,experience=rpgStart.Experience};break;
                    case "rpg-complete" when actor.GetComponent<RpgProgressionComponent>() is { } rpgComplete:
                        var completed=rpgComplete.CompleteQuest();snapshot=new {ok=completed,active=rpgComplete.QuestActive,level=rpgComplete.Level,experience=rpgComplete.Experience};break;
                    case "4x-explore" when actor.GetComponent<FourXEmpireComponent>() is { } empExplore:
                        empExplore.Explore();snapshot=new {science=empExplore.Science,turn=empExplore.Turn};break;
                    case "4x-expand" when actor.GetComponent<FourXEmpireComponent>() is { } empExpand:
                        var expanded=empExpand.Expand();snapshot=new {ok=expanded,food=empExpand.Food,territory=empExpand.Territory};break;
                    case "4x-exploit" when actor.GetComponent<FourXEmpireComponent>() is { } empExploit:
                        empExploit.Exploit();snapshot=new {industry=empExploit.Industry};break;
                    case "4x-conquer" when actor.GetComponent<FourXEmpireComponent>() is { } empConquer:
                        var conquered=empConquer.Conquer();snapshot=new {ok=conquered,army=empConquer.Army,territory=empConquer.Territory};break;
                    case "4x-next-turn" when actor.GetComponent<FourXEmpireComponent>() is { } empNextTurn:
                        empNextTurn.NextTurn();snapshot=new {turn=empNextTurn.Turn,food=empNextTurn.Food,industry=empNextTurn.Industry,science=empNextTurn.Science,territory=empNextTurn.Territory,army=empNextTurn.Army};break;
                    default:
                        res.StatusCode=400;await Reply(new {error="Unsupported genre action or component missing"});return;
                }
                await Reply(new {ok=true,id=actorId,action,state=snapshot});
            }finally{gate.Release();}return;
        }
        if (req.Url?.AbsolutePath=="/vehicle/input"&&req.HttpMethod=="POST"){
            using var doc=await JsonDocument.ParseAsync(req.InputStream);
            var input=doc.RootElement;
            if(!input.TryGetProperty("id",out var id) || !id.TryGetInt32(out int actorId) ||
               !input.TryGetProperty("throttle",out var throttleJson) ||
               !input.TryGetProperty("steer",out var steerJson) ||
               !throttleJson.TryGetSingle(out float throttle) ||
               !steerJson.TryGetSingle(out float steer) ||
               !float.IsFinite(throttle) || !float.IsFinite(steer) ||
               Math.Abs(throttle)>1 || Math.Abs(steer)>1){
                res.StatusCode=400;await Reply(new {error="Invalid vehicle input"});return;
            }
            bool handbrake=input.TryGetProperty("handbrake",out var brake) && brake.ValueKind==JsonValueKind.True;
            await gate.WaitAsync();try{
                var actor=world.Actors.FirstOrDefault(a=>a.Id==actorId);
                var component=actor?.GetComponent<VehicleControllerComponent>();
                if(component is null){res.StatusCode=404;await Reply(new {error="VehicleController not found"});return;}
                component.SetInput(throttle,steer,handbrake);
                await Reply(new {ok=true,id=actorId,throttle,steer,handbrake});
            }finally{gate.Release();}return;
        }
        if (req.Url?.AbsolutePath=="/tick"&&req.HttpMethod=="POST"){
            using var doc=await JsonDocument.ParseAsync(req.InputStream);
            var root=doc.RootElement;
            var dt=root.TryGetProperty("dt",out var time)?time.GetSingle():1f/60f;
            if(!float.IsFinite(dt)||dt<0||dt>0.25f)throw new ArgumentOutOfRangeException(nameof(dt),"Expected 0 <= dt <= 0.25");
            await gate.WaitAsync();try{
                world.Tick(dt);
                await Reply(new {ok=true,actors=world.Actors.Select(a=>new {id=a.Id,x=a.Position.X*64,y=a.Position.Z*64,elevation3d=a.Position.Y,rotation=a.Rotation,hp=a.Health}).ToArray()});
            }finally{gate.Release();}return;
        }
        res.StatusCode=404;await Reply(new {error="Not found"});
    }catch(Exception e){res.StatusCode=400;await Reply(new {error=e.Message});}
    finally{res.Close();}
    async Task Reply(object payload){var data=Encoding.UTF8.GetBytes(JsonSerializer.Serialize(payload));res.ContentType="application/json; charset=utf-8";res.ContentLength64=data.Length;await res.OutputStream.WriteAsync(data);}
}
