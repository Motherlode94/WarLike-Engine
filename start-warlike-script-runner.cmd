@echo off
setlocal
cd /d "%~dp0"
where py >nul 2>nul
if not errorlevel 1 (
  py -3 python\script_runner.py
) else (
  python python\script_runner.py
)
if errorlevel 1 (
  echo.
  echo Python 3.10+ est requis pour lancer le service local WarLike.
  pause
)
