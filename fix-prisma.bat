@echo off
echo ========================================
echo Fixing Prisma Installation
echo ========================================

:: Step 1: Stop any running Node processes
echo Stopping Node processes...
taskkill /f /im node.exe 2>nul

:: Step 2: Delete problematic folders
echo Cleaning up old files...
rmdir /s /q node_modules 2>nul
del package-lock.json 2>nul
rmdir /s /q .next 2>nul

:: Step 3: Clear npm cache
echo Clearing npm cache...
call npm cache clean --force

:: Step 4: Reinstall dependencies
echo Reinstalling dependencies...
call npm install

:: Step 5: Install specific Prisma versions
echo Installing Prisma 4.16.2...
call npm install prisma@4.16.2 --save-dev
call npm install @prisma/client@4.16.2 --save

:: Step 6: Generate Prisma client
echo Generating Prisma client...
call npx prisma generate

:: Step 7: Push database schema
echo Pushing database schema...
call npx prisma db push

echo ========================================
echo Fix Complete!
echo Run 'npm run dev' to start the server
echo ========================================
pause