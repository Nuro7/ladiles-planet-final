# Deploys the committed code (plus local .env files and optional media zip) to the Lightsail instance.
# Usage, from the repo root:  powershell -ExecutionPolicy Bypass -File deploy\deploy-lightsail.ps1
param(
    [string]$HostIp = "15.206.253.153",
    [string]$Key = "$env:USERPROFILE\.ssh\lightsail-neuro7-ap-south-1.pem",
    [string]$MediaZip = "",
    # Supabase user UID allowed to connect Higgsfield; needed once, then remembered on the server.
    [string]$OwnerUserId = ""
)
$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
$target = "ec2-user@$HostIp"
$tmp = Join-Path $env:TEMP "ladies-code.tgz"

Push-Location $root
try {
    # Ship the working copy (committed + uncommitted + new files), honouring .gitignore so .env/node_modules never leave this PC.
    # A throwaway index keeps the real staging area and history untouched.
    $env:GIT_INDEX_FILE = Join-Path $env:TEMP "ladies-deploy.index"
    try {
        git read-tree HEAD
        git add -A
        $tree = git write-tree
        git archive --format=tar.gz -o $tmp $tree
        if ($LASTEXITCODE -ne 0) { throw "Packaging the source failed" }
    }
    finally {
        Remove-Item $env:GIT_INDEX_FILE -ErrorAction SilentlyContinue
        Remove-Item Env:GIT_INDEX_FILE
    }
    $files = @($tmp, "deploy\server-setup.sh")
    if (Test-Path backend\.env) { Copy-Item backend\.env "$env:TEMP\backend.env" -Force; $files += "$env:TEMP\backend.env" }
    else { Write-Warning "backend\.env not found: server will use .env.example (Supabase keys empty)" }
    if (Test-Path frontend\.env) { Copy-Item frontend\.env "$env:TEMP\frontend.env" -Force; $files += "$env:TEMP\frontend.env" }
    else { Write-Warning "frontend\.env not found: server will use .env.example" }
    if ($MediaZip) { Copy-Item $MediaZip "$env:TEMP\ladies-media.zip" -Force; $files += "$env:TEMP\ladies-media.zip" }

    scp -i $Key -o StrictHostKeyChecking=accept-new @files "${target}:~/"
    $ownerVar = if ($OwnerUserId) { "HIGGSFIELD_OWNER_USER_ID=$OwnerUserId " } else { "" }
    ssh -i $Key $target "sed -i 's/\r$//' ~/server-setup.sh && PUBLIC_HOST=$HostIp ${ownerVar}bash ~/server-setup.sh"
}
finally {
    Remove-Item "$env:TEMP\backend.env","$env:TEMP\frontend.env" -ErrorAction SilentlyContinue
    Pop-Location
}
