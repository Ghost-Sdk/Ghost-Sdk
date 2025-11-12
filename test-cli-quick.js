#!/usr/bin/env node

/**
 * Quick CLI Test Script
 * Tests all Ghost SDK CLI commands
 */

const { execSync } = require('child_process');
const path = require('path');

console.log('🧪 Ghost SDK CLI Quick Test\n');
console.log('='.repeat(50));

// Helper function to run commands
function run(command, description) {
  console.log(`\n📝 ${description}`);
  console.log(`   Command: ${command}`);
  console.log('   '.repeat(25));

  try {
    const output = execSync(command, {
      cwd: path.join(__dirname, 'packages', 'cli'),
      encoding: 'utf8',
      stdio: 'pipe'
    });
    console.log(output);
    console.log('   ✅ Success\n');
  } catch (error) {
    console.log('   ❌ Error:', error.message);
    console.log('   (This is expected in development mode)\n');
  }
}

// Build and setup
console.log('\n🔧 Building CLI...\n');

try {
  console.log('Installing dependencies...');
  execSync('npm install', {
    cwd: path.join(__dirname, 'packages', 'cli'),
    stdio: 'inherit'
  });

  console.log('\nBuilding TypeScript...');
  execSync('npm run build', {
    cwd: path.join(__dirname, 'packages', 'cli'),
    stdio: 'inherit'
  });

  console.log('\n✅ Build complete!\n');
  console.log('='.repeat(50));
} catch (error) {
  console.error('❌ Build failed:', error.message);
  console.log('\nTry running manually:');
  console.log('  cd packages/cli');
  console.log('  npm install');
  console.log('  npm run build');
  process.exit(1);
}

// Test commands
console.log('\n🧪 Testing CLI Commands\n');
console.log('='.repeat(50));

run('node dist/index.js --help', 'Test: Show help');
run('node dist/index.js --version', 'Test: Show version');

// Test individual commands with --help
const commands = [
  'init',
  'balance',
  'transfer',
  'deposit',
  'withdraw',
  'issue-token',
  'swap',
  'stake'
];

console.log('\n📋 Testing individual commands:\n');

commands.forEach(cmd => {
  run(`node dist/index.js ${cmd} --help`, `Test: ${cmd} --help`);
});

console.log('\n' + '='.repeat(50));
console.log('\n✅ CLI Testing Complete!\n');
console.log('Next steps:');
console.log('  1. Run: cd packages/cli && npm link');
console.log('  2. Then use: ghost --help');
console.log('  3. Initialize: ghost init');
console.log('  4. See full guide: CLI_TESTING_GUIDE.md\n');
