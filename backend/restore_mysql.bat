@echo off
echo Restoring MySQL backup...
set /p BACKUP_FILE=Enter backup filename (e.g., studverse_backup_20241201_143022.sql): 

mysql -h localhost -P 3308 -u root -proot studverse < %BACKUP_FILE%

echo Restore completed!
pause
