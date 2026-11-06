using System.Reflection;
using System.Runtime.Loader;
using System.Security.Cryptography;
using System.Text;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using WarLike.Runtime;

public sealed record NativeScriptSource(string Name, string Source);
public sealed record NativeScriptDiagnostic(string File, int Line, int Column, string Severity, string Message);
public sealed record NativeCompileResult(bool Ok, string[] Classes, NativeScriptDiagnostic[] Diagnostics);

// Actual .NET compilation. User assemblies run only in this local bridge process.
public sealed class NativeScriptCompiler : IDisposable {
    private AssemblyLoadContext? _context;
    private string _signature = "";
    public IReadOnlyDictionary<string, Type> Types { get; private set; } = new Dictionary<string, Type>();
    public NativeCompileResult Compile(NativeScriptSource[] sources) {
        if (sources.Length > 32 || sources.Any(s => s.Name.Length is 0 or > 100 || s.Source.Length > 65536 || s.Name.Any(c => !char.IsLetterOrDigit(c) && c is not '_' and not '.')))
            throw new ArgumentException("32 native scripts maximum, 64 KiB each; use a valid C# class name.");
        sources = sources.GroupBy(s => s.Name).Select(g => {
            if (g.Select(s => s.Source).Distinct().Count() != 1) throw new ArgumentException("Conflicting sources for " + g.Key);
            return g.First();
        }).OrderBy(s => s.Name, StringComparer.Ordinal).ToArray();
        string signature = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(string.Join('\0', sources.Select(s => s.Name + "\n" + s.Source)))));
        if (_signature == signature) return new(true, Types.Keys.ToArray(), []);
        if (sources.Length == 0) { Dispose(); _signature = signature; return new(true, [], []); }
        var trees = sources.Select(s => CSharpSyntaxTree.ParseText(s.Source, new CSharpParseOptions(LanguageVersion.CSharp12), s.Name + ".cs", Encoding.UTF8)).ToArray();
        var referencePaths = ((string?)AppContext.GetData("TRUSTED_PLATFORM_ASSEMBLIES") ?? "").Split(Path.PathSeparator, StringSplitOptions.RemoveEmptyEntries)
            .Append(typeof(MonoBehaviour).Assembly.Location).Distinct(StringComparer.OrdinalIgnoreCase);
        var compilation = CSharpCompilation.Create("WarLike.UserScripts." + Guid.NewGuid().ToString("N"), trees,
            referencePaths.Select(path => MetadataReference.CreateFromFile(path)), new CSharpCompilationOptions(OutputKind.DynamicallyLinkedLibrary, optimizationLevel: OptimizationLevel.Release, allowUnsafe: false));
        using var stream = new MemoryStream(); var emitted = compilation.Emit(stream);
        var diagnostics = emitted.Diagnostics.Where(d => d.Severity is DiagnosticSeverity.Error or DiagnosticSeverity.Warning).Take(64).Select(d => {
            var span = d.Location.GetLineSpan(); return new NativeScriptDiagnostic(span.Path, span.StartLinePosition.Line + 1, span.StartLinePosition.Character + 1,
                d.Severity == DiagnosticSeverity.Error ? "error" : "warning", d.Id + ": " + d.GetMessage());
        }).ToArray();
        if (!emitted.Success) return new(false, [], diagnostics);
        var context = new ScriptLoadContext();
        try {
            stream.Position = 0; var assembly = context.LoadFromStream(stream);
            var types = assembly.GetTypes().Where(t => t.IsClass && !t.IsAbstract && !t.ContainsGenericParameters && typeof(MonoBehaviour).IsAssignableFrom(t)).ToArray();
            var registry = new Dictionary<string, Type>(StringComparer.Ordinal);
            foreach (var type in types) {
                if (!type.IsPublic || type.GetConstructor(Type.EmptyTypes) is null) throw new ArgumentException(type.Name + " must be public and have a public parameterless constructor.");
                registry[type.FullName!] = type;
            }
            foreach (var group in types.GroupBy(t => t.Name)) if (group.Count() == 1) registry.TryAdd(group.Key, group.First());

            var previous = _context; _context = context; Types = registry; _signature = signature; previous?.Unload();
            return new(true, types.Select(t=>t.FullName!).ToArray(), diagnostics);
        } catch { context.Unload(); throw; }
    }
    public void Dispose() { Types = new Dictionary<string, Type>(); _signature = ""; _context?.Unload(); _context = null; }
    private sealed class ScriptLoadContext() : AssemblyLoadContext(isCollectible: true) {
        protected override Assembly? Load(AssemblyName name) => name.Name == typeof(MonoBehaviour).Assembly.GetName().Name ? typeof(MonoBehaviour).Assembly : null;
    }
}
