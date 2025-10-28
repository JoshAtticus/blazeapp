# Script to replace "blaze" with "balze" while preserving capitalization
# Supports: blaze -> balze, Blaze -> Balze, BLAZE -> BALZE

param(
    [string]$Path = ".",
    [string[]]$Exclude = @("node_modules", ".git", "dist", "build", "*.ps1"),
    [switch]$DryRun = $false
)

function Get-ReplacementText {
    param([string]$Original)
    
    # Check capitalization pattern and return appropriate replacement
    if ($Original -ceq "blaze") {
        return "balze"
    }
    elseif ($Original -ceq "Blaze") {
        return "Balze"
    }
    elseif ($Original -ceq "BLAZE") {
        return "BALZE"
    }
    # Handle mixed case by preserving the pattern
    else {
        $result = ""
        $target = "balze"
        for ($i = 0; $i -lt $Original.Length -and $i -lt $target.Length; $i++) {
            if ([char]::IsUpper($Original[$i])) {
                $result += $target[$i].ToString().ToUpper()
            }
            else {
                $result += $target[$i]
            }
        }
        return $result
    }
}

Write-Host "Starting replacement: blaze -> balze (preserving capitalization)" -ForegroundColor Cyan
Write-Host "Path: $Path" -ForegroundColor Gray
Write-Host "Dry Run: $DryRun" -ForegroundColor Gray
Write-Host ""

$filesChanged = 0
$totalReplacements = 0

# Get all files, excluding specified patterns
$files = Get-ChildItem -Path $Path -Recurse -File | Where-Object {
    $file = $_
    $shouldInclude = $true
    
    foreach ($pattern in $Exclude) {
        if ($pattern.StartsWith("*")) {
            if ($file.Name -like $pattern) {
                $shouldInclude = $false
                break
            }
        }
        elseif ($file.FullName -like "*\$pattern\*" -or $file.FullName -like "*/$pattern/*") {
            $shouldInclude = $false
            break
        }
    }
    
    $shouldInclude
}

foreach ($file in $files) {
    try {
        # Read file content
        $content = Get-Content -Path $file.FullName -Raw -ErrorAction Stop
        
        if ($null -eq $content) {
            continue
        }
        
        $originalContent = $content
        $fileReplacements = 0
        
        # Replace all variations: blaze, Blaze, BLAZE
        $patterns = @("blaze", "Blaze", "BLAZE")
        
        foreach ($pattern in $patterns) {
            $replacement = Get-ReplacementText -Original $pattern
            $matches = ([regex]::Matches($content, [regex]::Escape($pattern))).Count
            
            if ($matches -gt 0) {
                $content = $content -creplace [regex]::Escape($pattern), $replacement
                $fileReplacements += $matches
            }
        }
        
        if ($fileReplacements -gt 0) {
            $filesChanged++
            $totalReplacements += $fileReplacements
            
            Write-Host "[$filesChanged] $($file.FullName)" -ForegroundColor Green
            Write-Host "    Replacements: $fileReplacements" -ForegroundColor Yellow
            
            if (-not $DryRun) {
                Set-Content -Path $file.FullName -Value $content -NoNewline
            }
        }
    }
    catch {
        Write-Host "Error processing $($file.FullName): $_" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Summary:" -ForegroundColor Cyan
Write-Host "  Files changed: $filesChanged" -ForegroundColor White
Write-Host "  Total replacements: $totalReplacements" -ForegroundColor White

if ($DryRun) {
    Write-Host ""
    Write-Host "DRY RUN - No files were actually modified" -ForegroundColor Yellow
    Write-Host "Run without -DryRun to apply changes" -ForegroundColor Yellow
}
