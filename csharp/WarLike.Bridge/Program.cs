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
