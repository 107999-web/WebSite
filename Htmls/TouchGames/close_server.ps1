# Touch Games - Close Server (PowerShell, no installation required)
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add('http://127.0.0.1:9999/')
$listener.Start()

while ($listener.IsListening) {
    $context = $listener.GetContext()
    $request  = $context.Request
    $response = $context.Response

    if ($request.Url.LocalPath -eq '/close') {
        $response.StatusCode = 200
        $response.AddHeader('Access-Control-Allow-Origin', '*')
        $buf = [System.Text.Encoding]::UTF8.GetBytes('ok')
        $response.ContentLength64 = $buf.Length
        $response.OutputStream.Write($buf, 0, $buf.Length)
        $response.OutputStream.Close()
        $listener.Stop()

        Start-Sleep -Milliseconds 500
        Stop-Process -Name 'chrome' -Force -ErrorAction SilentlyContinue
        exit
    } else {
        $response.StatusCode = 404
        $response.OutputStream.Close()
    }
}
