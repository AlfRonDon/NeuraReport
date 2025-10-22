param(
    [string]$CommitMessage = $(Read-Host "Commit message"),
    [string]$Branch = $(git rev-parse --abbrev-ref HEAD).Trim(),
    [string[]]$ExcludePaths = @('.venv/', 'uploads/', 'backend/uploads/')
)

Write-Host "Repository:" (Get-Location)
git status

$proceed = Read-Host "Stage, commit, and push these changes? (Y/N)"
if ($proceed -notmatch '^[Yy]$') {
    Write-Host "Aborted."
    exit 0
}

git add -A

foreach ($path in $ExcludePaths) {
    git restore --staged -- $path 2>$null | Out-Null
}

if (-not $CommitMessage) {
    Write-Error "No commit message supplied."
    exit 1
}

git commit -m $CommitMessage

if (-not $Branch) {
    Write-Error "Unable to determine current branch. Specify one with -Branch <name>."
    exit 1
}

git push origin $Branch
Write-Host "Done."
