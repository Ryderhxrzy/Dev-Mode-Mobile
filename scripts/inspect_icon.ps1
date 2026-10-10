Add-Type -AssemblyName System.Drawing

$iconPath = "c:\dev\Developer-Option-Toggle\android\app\src\main\res\drawable\white_icon.png"
$bmp = New-Object System.Drawing.Bitmap $iconPath

$minX = $bmp.Width
$minY = $bmp.Height
$maxX = 0
$maxY = 0

for ($y = 0; $y -lt $bmp.Height; $y += 4) {
    for ($x = 0; $x -lt $bmp.Width; $x += 4) {
        $c = $bmp.GetPixel($x, $y)
        if ($c.A -gt 20) {
            if ($x -lt $minX) { $minX = $x }
            if ($x -gt $maxX) { $maxX = $x }
            if ($y -lt $minY) { $minY = $y }
            if ($y -gt $maxY) { $maxY = $y }
        }
    }
}

Write-Output "Bounds of non-transparent pixels: X=[$minX, $maxX], Y=[$minY, $maxY], Width=$($maxX - $minX), Height=$($maxY - $minY)"
$bmp.Dispose()
