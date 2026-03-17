$body = '{"username":"admin","password":"admin123"}'
$r = Invoke-RestMethod -Uri 'http://localhost:8899/api/auth/login' -Method POST -ContentType 'application/json' -Body $body
Write-Host "Login code:" $r.code "msg:" $r.msg
$token = $r.data.token
Write-Host "Token:" $token
$headers = @{ 'Authorization' = "Bearer $token" }
$m = Invoke-RestMethod -Uri 'http://localhost:8899/api/members?page=1&size=5' -Method GET -Headers $headers
Write-Host "Members code:" $m.code "total:" $m.data.total
$m.data.items | Format-Table id,username,email,status
