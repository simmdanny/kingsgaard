# Kingsgaard launcher (tools/launch.ps1, started by "Play Kingsgaard.bat"): finds Godot 4.7, imports changed files, runs the game.
# Where it looks, in order: the path remembered in godot-path.txt (next to the .bat), the GODOT environment variable, then a
# search of the usual places a few folders deep (beside the game, C:\Godot, Downloads, Desktop, Documents, Program Files,
# Steam, winget, scoop, other drives' top folders) - this finds an "Extract All" copy inside its extra folder too. A Godot zip
# that was never unzipped is unzipped next to itself. If all that fails, a window asks for the Godot .exe. The choice is kept.

$ErrorActionPreference = 'SilentlyContinue'
$game = Split-Path -Parent $PSScriptRoot
$memo = Join-Path $game 'godot-path.txt'

function Test-Godot([string]$p) {
	return $p -and (Test-Path -LiteralPath $p -PathType Leaf) -and ($p -notmatch 'console')
}

## a Godot program's file name: Godot_v4.7.2-stable_win64.exe, godot.windows.opt.tools.64.exe (Steam), godot.exe (scoop);
## never the _console twin
function Test-GodotName([string]$n) {
	return ($n -match '^(Godot_v\d.*|godot\.windows\..*|godot)\.exe$') -and ($n -notmatch 'console')
}

function Find-Godot {
	if (Test-Path -LiteralPath $memo) {
		$p = (Get-Content -LiteralPath $memo -TotalCount 1).Trim()
		if (Test-Godot $p) { return $p }
	}
	if (Test-Godot $env:GODOT) { return $env:GODOT }
	$roots = @(
		(Split-Path -Parent $game), (Split-Path -Parent (Split-Path -Parent $game)), 'C:\Godot', 'C:\Users\User\Games\Godot',
		"$env:USERPROFILE\Downloads", "$env:USERPROFILE\Desktop", "$env:USERPROFILE\Documents", "$env:USERPROFILE\OneDrive\Desktop",
		"$env:USERPROFILE\scoop\apps\godot", "$env:LOCALAPPDATA\Programs", "$env:LOCALAPPDATA\Microsoft\WinGet\Packages",
		"$env:ProgramFiles", "${env:ProgramFiles(x86)}\Steam\steamapps\common\Godot Engine", "$env:ProgramFiles\Godot"
	)
	foreach ($d in (Get-PSDrive -PSProvider FileSystem | Where-Object { $_.Root -ne 'C:\' })) { $roots += $d.Root }
	$found = @()
	foreach ($r in ($roots | Where-Object { $_ -and (Test-Path -LiteralPath $_) } | Select-Object -Unique)) {
		$depth = 3
		if ($r -match '^[A-Z]:\\$') { $depth = 2 }
		# (-Filter, not -Include: with -LiteralPath, -Include lets every file through)
		$found += Get-ChildItem -LiteralPath $r -Recurse -Depth $depth -File -Filter '*.exe' | Where-Object { Test-GodotName $_.Name }
	}
	if ($found.Count -eq 0) {
		# a downloaded Godot zip that was never unzipped: unzip it next to itself
		$zip = Get-ChildItem -LiteralPath "$env:USERPROFILE\Downloads" -Filter 'Godot_v4*win64*.zip' | Sort-Object LastWriteTime -Descending | Select-Object -First 1
		if ($zip) {
			Write-Host "Found $($zip.Name) in Downloads - unzipping it..."
			$to = Join-Path $zip.DirectoryName ([IO.Path]::GetFileNameWithoutExtension($zip.Name) -replace '\.exe$', '')
			Expand-Archive -LiteralPath $zip.FullName -DestinationPath $to -Force
			$found += Get-ChildItem -LiteralPath $to -Recurse -File -Filter '*.exe' | Where-Object { Test-GodotName $_.Name }
		}
	}
	if ($found.Count -gt 0) {
		# prefer 4.7, then the newest name
		$best = $found | Sort-Object @{ Expression = { if ($_.Name -match 'v4\.7') { 0 } else { 1 } } }, @{ Expression = { $_.Name }; Descending = $true } | Select-Object -First 1
		return $best.FullName
	}
	Add-Type -AssemblyName System.Windows.Forms
	$dlg = New-Object System.Windows.Forms.OpenFileDialog
	$dlg.Title = 'Kingsgaard: where is Godot 4.7? Pick the Godot .exe (not the _console one)'
	$dlg.Filter = 'Godot (*.exe)|*.exe'
	$dlg.InitialDirectory = "$env:USERPROFILE\Downloads"
	if ($dlg.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) { return $dlg.FileName }
	return $null
}

$exe = Find-Godot
if (-not (Test-Godot $exe)) {
	Write-Host 'Godot 4.7 was not found or not chosen.'
	Write-Host 'Download "Godot Engine - Windows" 4.7.2 (the standard one, not .NET) from https://godotengine.org/download/windows/'
	Write-Host 'and unzip it (right click > Extract All), then start Play Kingsgaard.bat again and pick the Godot .exe.'
	Read-Host 'Press Enter to close'
	exit 1
}
Set-Content -LiteralPath $memo -Value $exe -Encoding UTF8
# (Godot is a windowed program: PowerShell would not wait for it or catch its output, so these run through Start-Process)
$out = Join-Path $env:TEMP 'kingsgaard-godot-version.txt'
Start-Process -FilePath $exe -ArgumentList '--version' -Wait -WindowStyle Hidden -RedirectStandardOutput $out
$ver = (Get-Content -LiteralPath $out -TotalCount 1)
Write-Host "Godot: $exe ($ver)"
if ($ver -and $ver -notmatch '^4\.(7|8|9|\d\d)') {
	Write-Host "This game is made for Godot 4.7.2 - this one is $ver and may not run it. Get 4.7.2 from https://godotengine.org/download/archive/"
	Read-Host 'Press Enter to try anyway'
}
Write-Host 'Preparing Kingsgaard (the first time takes a minute)...'
Start-Process -FilePath $exe -ArgumentList @('--headless', '--path', "`"$game`"", '--import') -Wait -WindowStyle Hidden
Start-Process -FilePath $exe -ArgumentList @('--path', "`"$game`"")
