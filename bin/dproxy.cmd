:: Created by npm, please don't edit manually.
@IF EXIST "%~dp0"\"node.exe" (
  "%~dp0"\"node.exe"  "%~dp0\..\fun\dproxy-cli.js" %*
) ELSE (
  node  "%~dp0\..\fun\dproxy-cli.js" %*
)
