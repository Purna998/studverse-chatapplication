@echo off
echo Starting StudVerse Server...
echo.
echo Database: MySQL (localhost:3308)
echo Database Name: studverse
echo.
echo Press Ctrl+C to stop the server
echo.

python manage.py runserver

pause
