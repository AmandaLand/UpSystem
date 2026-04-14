Add-Type -AssemblyName System.Drawing

$outPath = Join-Path $PSScriptRoot '..\release-scripts\upsystem.ico'
$sizes = @(16, 32, 48, 64, 128, 256)

function New-IconBitmap([int]$size) {
    $bmp = New-Object System.Drawing.Bitmap($size, $size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic

    # Fundo gradiente escuro (#0f172a -> #1e293b)
    $rect = New-Object System.Drawing.Rectangle(0, 0, $size, $size)
    $bgBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
        $rect,
        [System.Drawing.Color]::FromArgb(255, 15, 23, 42),
        [System.Drawing.Color]::FromArgb(255, 30, 41, 59),
        45.0)
    $g.FillRectangle($bgBrush, $rect)

    # Borda arredondada sutil
    $borderPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(80, 100, 116, 139), [float]([Math]::Max(1, $size / 32)))
    $g.DrawRectangle($borderPen, 0, 0, $size - 1, $size - 1)

    # Barras crescentes (gráfico de performance)
    $barBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
        $rect,
        [System.Drawing.Color]::FromArgb(255, 34, 211, 238),   # cyan-400
        [System.Drawing.Color]::FromArgb(255, 99, 102, 241),   # indigo-500
        90.0)

    $padding = [int]($size * 0.18)
    $barWidth = [int](($size - ($padding * 2)) / 4)
    $gap = [int](($size - ($padding * 2) - ($barWidth * 3)) / 2)
    $baseY = $size - $padding

    $heights = @(0.30, 0.55, 0.85)
    for ($i = 0; $i -lt 3; $i++) {
        $x = $padding + ($i * ($barWidth + $gap))
        $h = [int](($size - ($padding * 2)) * $heights[$i])
        $y = $baseY - $h
        $g.FillRectangle($barBrush, $x, $y, $barWidth, $h)
    }

    # Seta de tendência
    if ($size -ge 32) {
        $arrowPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 167, 139, 250), [float]([Math]::Max(1.5, $size / 20)))
        $arrowPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
        $arrowPen.EndCap = [System.Drawing.Drawing2D.LineCap]::ArrowAnchor
        $startX = $padding + [int]($barWidth / 2)
        $startY = $baseY - [int](($size - ($padding * 2)) * 0.25)
        $endX = $padding + (2 * ($barWidth + $gap)) + [int]($barWidth / 2)
        $endY = $baseY - [int](($size - ($padding * 2)) * 0.80)
        $g.DrawLine($arrowPen, $startX, $startY, $endX, $endY)
    }

    $g.Dispose()
    return $bmp
}

# Gerar ICO multi-resolução
$ms = New-Object System.IO.MemoryStream
$writer = New-Object System.IO.BinaryWriter($ms)

# ICONDIR header
$writer.Write([UInt16]0)           # reserved
$writer.Write([UInt16]1)           # type = icon
$writer.Write([UInt16]$sizes.Count)

$pngStreams = @()
foreach ($s in $sizes) {
    $bmp = New-IconBitmap $s
    $pngMs = New-Object System.IO.MemoryStream
    $bmp.Save($pngMs, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    $pngStreams += ,@($s, $pngMs.ToArray())
}

# Directory entries
$offset = 6 + (16 * $sizes.Count)
foreach ($p in $pngStreams) {
    $size = $p[0]
    $data = $p[1]
    $dim = if ($size -ge 256) { 0 } else { $size }
    $writer.Write([Byte]$dim)      # width
    $writer.Write([Byte]$dim)      # height
    $writer.Write([Byte]0)         # colors
    $writer.Write([Byte]0)         # reserved
    $writer.Write([UInt16]1)       # planes
    $writer.Write([UInt16]32)      # bpp
    $writer.Write([UInt32]$data.Length)
    $writer.Write([UInt32]$offset)
    $offset += $data.Length
}

foreach ($p in $pngStreams) {
    $writer.Write($p[1])
}

[System.IO.File]::WriteAllBytes($outPath, $ms.ToArray())
$writer.Dispose()

$sizeKB = [Math]::Round((Get-Item $outPath).Length / 1024, 1)
Write-Host "Icon saved to $outPath - $sizeKB KB"
