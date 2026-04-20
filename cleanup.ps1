$path = "frontend/public/src/pages/PropertyDetail.tsx"
$lines = Get-Content $path
# Line 710 (0-based: 709) has ")}" which is a leftover from the old structure
# It was the closing of "property.roomTypes &&" conditional. We should remove it.
$lines[709] = '' # was ")}"
$lines | Set-Content $path -Encoding UTF8
Write-Host "Removed spurious )}. File now has $($lines.Count) lines."
