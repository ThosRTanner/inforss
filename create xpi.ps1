Compress-Archive -path source\* -force -destinationpath .\inforss.zip
Remove-Item .\inforss.xpi
Rename-Item .\inforss.zip .\inforss.xpi