@echo off
setlocal
cd /d "%~dp0"
where dotnet >nul 2>&1
if errorlevel 1 (
  echo [WarLike] .NET SDK 8 est requis pour lancer le moteur C#.
  echo https://dotnet.microsoft.com/download/dotnet/8.0
  pause
  exit /b 1
)
echo [WarLike] Lancement du runtime C# local sur http://127.0.0.1:8765/
echo [WarLike] Ouvre Window ^> C# Runtime dans WarLike Studio.
echo [WarLike] Fermer cette fenetre arrete le runtime C#.
dotnet run --project csharp\WarLike.Bridge\WarLike.Bridge.csproj
if errorlevel 1 (
  echo [WarLike] Erreur au lancement du runtime C#.
  pause
)
