#!/bin/bash

# Quick CLI test script
# Run with: bash test-cli.sh

echo "🧪 Testing Ghost SDK CLI"
echo "========================"

cd packages/cli

echo ""
echo "📦 Installing dependencies..."
npm install

echo ""
echo "🔨 Building CLI..."
npm run build

echo ""
echo "✅ Build complete!"
echo ""
echo "🚀 Available commands:"
echo ""
echo "  ghost init              - Initialize wallet"
echo "  ghost balance           - Check balance"
echo "  ghost transfer          - Send private transfer"
echo "  ghost deposit           - Deposit to shielded pool"
echo "  ghost withdraw          - Withdraw from pool"
echo "  ghost issue-token       - Issue private token"
echo "  ghost swap              - Private token swap"
echo "  ghost stake             - Stake privately"
echo ""
echo "💡 Try: ghost --help"
echo ""
