@echo off
echo ============================================
echo   Orchid Construction ERP System - Setup
echo ============================================
echo.

echo [1/4] Installing backend dependencies...
cd backend
call npm install
if errorlevel 1 (echo ERROR: Backend npm install failed & pause & exit /b 1)

echo.
echo [2/4] Generating Prisma Client...
call npx prisma generate
if errorlevel 1 (echo ERROR: Prisma generate failed & pause & exit /b 1)

echo.
echo [3/4] Installing frontend dependencies...
cd ..\frontend
call npm install
if errorlevel 1 (echo ERROR: Frontend npm install failed & pause & exit /b 1)

echo.
echo [4/4] Setup complete!
echo.
echo ============================================
echo   NEXT STEPS:
echo ============================================
echo.
echo 1. Set up PostgreSQL database
echo 2. Update backend\.env with your DATABASE_URL
echo 3. Run: cd backend ^& npx prisma migrate dev
echo 4. Run: cd backend ^& node prisma/seed.js
echo 5. Start backend: cd backend ^& npm run dev
echo 6. Start frontend: cd frontend ^& npm run dev
echo.
echo Default Login: admin@orchidconstruction.com / Admin@123
echo.
pause
