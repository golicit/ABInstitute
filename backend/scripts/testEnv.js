const path = require('path');
const fs = require('fs');

console.log('Testing .env file...');
console.log('Current directory:', __dirname);

// Try different paths
const paths = [
  path.resolve(__dirname, '../.env'),
  path.resolve(__dirname, '../../.env'),
  path.resolve(__dirname, '.env'),
  path.resolve(process.cwd(), '.env'),
];

console.log('\nChecking .env locations:');
paths.forEach((p) => {
  console.log(`  ${fs.existsSync(p) ? '✅' : '❌'} ${p}`);
});

// Check if we're in the right directory
console.log('\nCurrent working directory:', process.cwd());
console.log('Directory contents:');
try {
  const files = fs.readdirSync(process.cwd());
  files.forEach((file) => {
    const isDir = fs.statSync(path.join(process.cwd(), file)).isDirectory();
    console.log(`  ${isDir ? '📁' : '📄'} ${file}`);
  });
} catch (err) {
  console.log('Cannot read directory:', err.message);
}

// Check if .env exists in current directory
const currentEnv = path.resolve(process.cwd(), '.env');
if (fs.existsSync(currentEnv)) {
  console.log('\n📋 .env file content:');
  console.log(fs.readFileSync(currentEnv, 'utf8'));
}
