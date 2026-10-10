Add-Type -AssemblyName System.Drawing

$iconPath = "c:\dev\Developer-Option-Toggle\android\app\src\main\res\drawable\white_icon.png"
if (Test-Path $iconPath) {
    $img = [System.Drawing.Image]::FromFile($iconPath)
    Write-Output "Image loaded successfully: $($img.Width)x$($img.Height)"
    $img.Dispose()
} else {
    Write-Output "File not found"
}
