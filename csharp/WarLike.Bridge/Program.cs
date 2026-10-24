using System.Net;
using System.Text;
using System.Text.Json;
using WarLike.Runtime;

var builder = new HttpListener();
builder.Prefixes.Add("http://127.0.0.1:8765/");
builder.Start();
Console.WriteLine("WarLike C# bridge listening on http://127.0.0.1:8765/");
var world = new GameWorld();
while (true) {
    var context = await builder.GetContextAsync();
    _ = Handle(context);
}
async Task Handle(HttpListenerContext ctx) {
    var req=ctx.Request;var res=ctx.Response;
    res.Headers["Access-Control-Allow-Origin"]="*";
    res.Headers["Access-Control-Allow-Methods"]="POST, GET, OPTIONS";
    res.Headers["Access-Control-Allow-Headers"]="Content-Type";
    res.Headers["Cache-Control"]="no-store";
    try {
        if (req.HttpMethod=="OPTIONS"){res.StatusCode=204;return;}
        if (req.Url?.AbsolutePath=="/health"&&req.HttpMethod=="GET"){await Reply(new {ready=true,engine="WarLike C# .NET 8"});return;}
        if (req.Url?.AbsolutePath=="/scene"&&req.HttpMethod=="POST"){
            using var reader=new StreamReader(req.InputStream);
            world=GameWorld.FromWarLikeJson(await reader.ReadToEndAsync());
            await Reply(new {ok=true,count=world.Actors.Count});return;
        }
        if (req.Url?.AbsolutePath=="/tick"&&req.HttpMethod=="POST"){
            using var doc=await JsonDocument.ParseAsync(req.InputStream);
            var root=doc.RootElement;
            var dt=root.TryGetProperty("dt",out var time)?time.GetSingle():1f/60f;
            world.Tick(dt);
            await Reply(new {ok=true,actors=world.Actors.Select(a=>new {id=a.Id,x=a.Position.X*64,y=a.Position.Z*64,elevation3d=a.Position.Y,hp=a.Health}).ToArray()});return;
        }
        res.StatusCode=404;await Reply(new {error="Not found"});
    }catch(Exception e){res.StatusCode=400;await Reply(new {error=e.Message});}
    finally{res.Close();}
    async Task Reply(object payload){var data=Encoding.UTF8.GetBytes(JsonSerializer.Serialize(payload));res.ContentType="application/json; charset=utf-8";res.ContentLength64=data.Length;await res.OutputStream.WriteAsync(data);}
}
