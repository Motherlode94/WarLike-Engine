@echo off
cd /d "%~dp0"
where py >nul 2>nul
if not errorlevel 1 (
  py -3 python\warlike.py multiplayer
) else (
  python python\warlike.py multiplayer
)
pause
