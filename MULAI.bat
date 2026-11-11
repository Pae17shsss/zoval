@echo off
rem Menjalankan SENYAP di komputer ini lalu membukanya di browser.
start "" http://localhost:8123/
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0server.ps1"
