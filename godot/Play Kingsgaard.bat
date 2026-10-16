@echo off
rem Starts Kingsgaard (the Godot rebuild): tools\launch.ps1 finds Godot 4.7 (searching the usual places, or asking once),
rem imports changed files and runs the game. To use a different Godot later, delete godot-path.txt next to this file.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\launch.ps1"
if errorlevel 1 pause
