#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const version = process.argv[2];

if (!version || !/^\d+\.\d+\.\d+$/.test(version)) {
  console.error('Usage: npm run release <version>');
  console.error('Example: npm run release 1.2.0');
  process.exit(1);
}

const rootDir = path.join(__dirname, '..');
const pkgPath = path.join(rootDir, 'package.json');
const appPath = path.join(rootDir, 'app.json');

// Update package.json
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const oldVersion = pkg.version;
pkg.version = version;
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');

// Update app.json
const app = JSON.parse(fs.readFileSync(appPath, 'utf8'));
app.expo.version = version;
app.expo.android.versionCode += 1;
app.expo.ios.buildNumber = String(parseInt(app.expo.ios.buildNumber) + 1);
fs.writeFileSync(appPath, JSON.stringify(app, null, 2) + '\n');

console.log(`✓ Version: ${oldVersion} → ${version}`);
console.log(`✓ Android versionCode: ${app.expo.android.versionCode}`);
console.log(`✓ iOS buildNumber: ${app.expo.ios.buildNumber}`);
