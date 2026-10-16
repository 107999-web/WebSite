# Open each generated .docx in Word (hidden), export to PDF, report page count.
# If Word shows a hidden dialog (e.g. corrupt file), the watchdog kills Word after the timeout.
param([string]$Dir = "$PSScriptRoot\test_out", [int]$TimeoutSec = 60)

$files = Get-ChildItem $Dir -Filter "*.docx" | Where-Object { $_.Name -match '^desktop_' }
foreach ($f in $files) {
  $job = Start-Job -ArgumentList $f.FullName -ScriptBlock {
    param($path)
    $word = New-Object -ComObject Word.Application
    $word.Visible = $false
    $word.DisplayAlerts = 0
    try {
      $doc = $word.Documents.Open($path, $false, $true, $false)
      $pdf = [IO.Path]::ChangeExtension($path, ".pdf")
      $doc.ExportAsFixedFormat($pdf, 17)
      $pages = $doc.ComputeStatistics(2)
      $doc.Close($false)
      "OK pages=$pages"
    } catch { "ERROR $($_.Exception.Message)" } finally { $word.Quit() }
  }
  if (Wait-Job $job -Timeout $TimeoutSec) {
    "{0}: {1}" -f $f.Name, (Receive-Job $job)
  } else {
    "{0}: TIMEOUT (Word probably showed a dialog)" -f $f.Name
    Stop-Job $job
    Get-Process WINWORD -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowTitle -eq '' } | Stop-Process -Force
  }
  Remove-Job $job -Force
}
