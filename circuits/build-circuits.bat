@echo off
echo.
echo ================================================
echo   Building ZK Circuits
echo ================================================
echo.

REM Create build directory
if not exist "build" mkdir build
cd build

echo Step 1: Compiling transfer circuit...
echo ================================================
echo.

circom ..\transfer.circom --r1cs --wasm --sym -o .
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Transfer circuit compilation failed
    cd ..
    exit /b 1
)
echo [OK] Transfer circuit compiled

echo.
echo Step 2: Compiling balance circuit...
echo ================================================
echo.

circom ..\balance.circom --r1cs --wasm --sym -o .
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Balance circuit compilation failed
    cd ..
    exit /b 1
)
echo [OK] Balance circuit compiled

echo.
echo Step 3: Compiling ring signature circuit...
echo ================================================
echo.

circom ..\ring_signature.circom --r1cs --wasm --sym -o .
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Ring signature circuit compilation failed
    cd ..
    exit /b 1
)
echo [OK] Ring signature circuit compiled

echo.
echo Step 4: Downloading Powers of Tau (trusted setup)...
echo ================================================
echo.

REM Download if not exists
if not exist "powersOfTau28_hez_final_14.ptau" (
    echo Downloading... (this is ~100MB, may take a few minutes)
    curl -L -o powersOfTau28_hez_final_14.ptau https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_14.ptau
    echo [OK] Downloaded
) else (
    echo [OK] Already downloaded
)

echo.
echo Step 5: Generating proving keys (transfer)...
echo ================================================
echo.

npx snarkjs groth16 setup transfer.r1cs powersOfTau28_hez_final_14.ptau transfer_0000.zkey
npx snarkjs zkey contribute transfer_0000.zkey transfer_0001.zkey --name="First contribution" -v -e="random entropy"
npx snarkjs zkey export verificationkey transfer_0001.zkey transfer_verification_key.json

echo [OK] Transfer proving key generated

echo.
echo Step 6: Generating proving keys (balance)...
echo ================================================
echo.

npx snarkjs groth16 setup balance.r1cs powersOfTau28_hez_final_14.ptau balance_0000.zkey
npx snarkjs zkey contribute balance_0000.zkey balance_0001.zkey --name="First contribution" -v -e="random entropy"
npx snarkjs zkey export verificationkey balance_0001.zkey balance_verification_key.json

echo [OK] Balance proving key generated

echo.
echo Step 7: Generating proving keys (ring signature)...
echo ================================================
echo.

npx snarkjs groth16 setup ring_signature.r1cs powersOfTau28_hez_final_14.ptau ring_signature_0000.zkey
npx snarkjs zkey contribute ring_signature_0000.zkey ring_signature_0001.zkey --name="First contribution" -v -e="random entropy"
npx snarkjs zkey export verificationkey ring_signature_0001.zkey ring_signature_verification_key.json

echo [OK] Ring signature proving key generated

echo.
echo ================================================
echo   Circuit Build Complete!
echo ================================================
echo.
echo Files generated:
echo   - transfer_0001.zkey (proving key)
echo   - balance_0001.zkey (proving key)
echo   - ring_signature_0001.zkey (proving key)
echo   - *_verification_key.json (verification keys)
echo.
echo These will be used for:
echo   1. Generating ZK proofs (client-side)
echo   2. Verifying proofs (on-chain)
echo.

cd ..
echo [OK] All circuits built successfully!
