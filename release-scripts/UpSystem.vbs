' UpSystem - Launcher silencioso (sem janela de console)
' Clique duplo neste arquivo para iniciar o UpSystem na bandeja do sistema.

Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
ps1Path = scriptDir & "\tray.ps1"

cmd = "powershell.exe -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File """ & ps1Path & """"
WshShell.Run cmd, 0, False
