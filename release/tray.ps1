$ErrorActionPreference = 'SilentlyContinue'
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$exePath = Join-Path $scriptDir 'upsystem.exe'
$url = 'http://localhost:3333'

if (-not (Test-Path $exePath)) {
    [System.Windows.Forms.MessageBox]::Show(
        "upsystem.exe não encontrado em $scriptDir",
        'UpSystem — Erro', 'OK', 'Error') | Out-Null
    exit 1
}

$env:UPSYSTEM_NO_OPEN = '1'
$backend = Start-Process -FilePath $exePath -WindowStyle Hidden -PassThru

$icon = New-Object System.Windows.Forms.NotifyIcon
$iconPath = Join-Path $scriptDir 'upsystem.ico'
if (Test-Path $iconPath) {
    $icon.Icon = New-Object System.Drawing.Icon($iconPath)
} else {
    $icon.Icon = [System.Drawing.SystemIcons]::Information
}
$icon.Text = 'UpSystem — monitoramento ativo'
$icon.Visible = $true

$menu = New-Object System.Windows.Forms.ContextMenuStrip

$openItem = New-Object System.Windows.Forms.ToolStripMenuItem('Abrir painel')
$openItem.Add_Click({ Start-Process $url })
$menu.Items.Add($openItem) | Out-Null

$reportItem = New-Object System.Windows.Forms.ToolStripMenuItem('Abrir relatório diário')
$reportItem.Add_Click({ Start-Process "$url/api/reports/daily" })
$menu.Items.Add($reportItem) | Out-Null

$menu.Items.Add('-') | Out-Null

$statusItem = New-Object System.Windows.Forms.ToolStripMenuItem('UpSystem rodando em :3333')
$statusItem.Enabled = $false
$menu.Items.Add($statusItem) | Out-Null

$menu.Items.Add('-') | Out-Null

$exitItem = New-Object System.Windows.Forms.ToolStripMenuItem('Sair')
$exitItem.Add_Click({
    $icon.Visible = $false
    if ($backend -and -not $backend.HasExited) {
        Stop-Process -Id $backend.Id -Force -ErrorAction SilentlyContinue
    }
    [System.Windows.Forms.Application]::Exit()
})
$menu.Items.Add($exitItem) | Out-Null

$icon.ContextMenuStrip = $menu
$icon.Add_DoubleClick({ Start-Process $url })

Start-Sleep -Milliseconds 1500
$icon.ShowBalloonTip(3000, 'UpSystem', 'Monitoramento iniciado. Dê clique duplo aqui para abrir o painel.', 'Info')

[System.Windows.Forms.Application]::Run()

if ($backend -and -not $backend.HasExited) {
    Stop-Process -Id $backend.Id -Force -ErrorAction SilentlyContinue
}
