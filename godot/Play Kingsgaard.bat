@echo off
rem Starts Kingsgaard (the Godot rebuild). Finds Godot 4.7.2: the GODOT environment variable, a Godot folder next to this
rem one or next to the repo, C:\Godot, C:\Users\User\Games\Godot, or godot on the PATH. Imports changed files first (a few
rem seconds; on a fresh copy it builds the import cache once), then runs the game.
setlocal
set "HERE=%~dp0"
set "EXE="
if defined GODOT if exist "%GODOT%" set "EXE=%GODOT%"
if not defined EXE for %%D in ("%HERE%..\Godot" "%HERE%..\..\Godot" "C:\Godot" "C:\Users\User\Games\Godot") do (
  if not defined EXE for %%F in ("%%~D\Godot_v4.7*_win64.exe") do if not defined EXE set "EXE=%%~fF"
)
if not defined EXE for /f "delims=" %%P in ('where godot 2^>nul') do if not defined EXE set "EXE=%%P"
if not defined EXE (
  echo Godot 4.7.2 was not found.
  echo Download "Godot Engine - Windows" 4.7.2 from https://godotengine.org/download/windows/ and unzip it to C:\Godot
  echo or set the GODOT environment variable to the Godot .exe, then run this again.
  pause
  exit /b 1
)
echo Preparing Kingsgaard with %EXE% ...
"%EXE%" --headless --path "%HERE%." --import >nul 2>&1
start "" "%EXE%" --path "%HERE%."
