$root = Split-Path -Parent $PSScriptRoot
$hooksSrc = Join-Path $PSScriptRoot 'git-hooks'
$hooksDest = Join-Path $root '.git\hooks'

foreach ($hook in Get-ChildItem $hooksSrc -File) {
  Copy-Item $hook.FullName (Join-Path $hooksDest $hook.Name) -Force
  Write-Host "Installed hook: $($hook.Name)"
}
