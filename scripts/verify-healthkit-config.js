// ============================================
// PRE-BUILD HEALTHKIT VERIFICATION
// Checks all requirements before EAS build
// ============================================

const fs = require('fs');
const path = require('path');

console.log('');
console.log('='.repeat(70));
console.log('🔍 PRE-BUILD HEALTHKIT VERIFICATION');
console.log('='.repeat(70));
console.log('');

let hasErrors = false;
let hasWarnings = false;
const errors = [];
const warnings = [];
const successes = [];

// Check 1: package.json
console.log('📦 Checking package.json...');
try {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  
  if (pkg.dependencies && pkg.dependencies['react-native-health']) {
    const version = pkg.dependencies['react-native-health'];
    successes.push(`react-native-health@${version} in dependencies`);
  } else if (pkg.devDependencies && pkg.devDependencies['react-native-health']) {
    errors.push('react-native-health is in devDependencies (should be in dependencies)');
    hasErrors = true;
  } else {
    errors.push('react-native-health not found in package.json');
    hasErrors = true;
  }
} catch (error) {
  errors.push(`Cannot read package.json: ${error.message}`);
  hasErrors = true;
}

// Check 2: app.json
console.log('⚙️  Checking app.json...');
try {
  const appJson = JSON.parse(fs.readFileSync('app.json', 'utf8'));
  const ios = appJson.expo?.ios;
  const plugins = appJson.expo?.plugins;
  
  // Check plugins
  if (plugins) {
    const hasHealthPlugin = plugins.some(plugin => {
      if (typeof plugin === 'string') return plugin === 'react-native-health';
      if (Array.isArray(plugin)) return plugin[0] === 'react-native-health';
      return false;
    });
    
    if (hasHealthPlugin) {
      successes.push('react-native-health plugin configured');
    } else {
      errors.push('react-native-health plugin NOT in plugins array');
      hasErrors = true;
    }
  } else {
    errors.push('No plugins array in app.json');
    hasErrors = true;
  }
  
  // Check entitlements
  if (ios?.entitlements) {
    if (ios.entitlements['com.apple.developer.healthkit']) {
      successes.push('HealthKit entitlement enabled');
    } else {
      errors.push('com.apple.developer.healthkit entitlement not set to true');
      hasErrors = true;
    }
    
    if (ios.entitlements['com.apple.developer.healthkit.background-delivery']) {
      successes.push('HealthKit background delivery enabled');
    } else {
      warnings.push('com.apple.developer.healthkit.background-delivery not enabled');
      hasWarnings = true;
    }
  } else {
    errors.push('No entitlements in ios config');
    hasErrors = true;
  }
  
  // Check Info.plist
  if (ios?.infoPlist) {
    if (ios.infoPlist.NSHealthShareUsageDescription) {
      successes.push(`NSHealthShareUsageDescription: "${ios.infoPlist.NSHealthShareUsageDescription}"`);
    } else {
      errors.push('NSHealthShareUsageDescription not in Info.plist');
      hasErrors = true;
    }
  } else {
    warnings.push('No infoPlist in ios config');
    hasWarnings = true;
  }
  
  // Check build number
  if (ios?.buildNumber) {
    successes.push(`Build number: ${ios.buildNumber}`);
  } else {
    warnings.push('No build number set (will auto-increment)');
    hasWarnings = true;
  }
  
  // Check New Architecture (should be disabled for react-native-health)
  if (ios?.newArchEnabled === false) {
    successes.push('New Architecture disabled (good for react-native-health)');
  } else if (ios?.newArchEnabled === true) {
    errors.push('New Architecture enabled (can break react-native-health native bridge)');
    hasErrors = true;
  } else {
    warnings.push('New Architecture not explicitly set (defaults to false, but be explicit)');
    hasWarnings = true;
  }
  
} catch (error) {
  errors.push(`Cannot read app.json: ${error.message}`);
  hasErrors = true;
}

// Check 3: eas.json
console.log('🚀 Checking eas.json...');
try {
  const easJson = JSON.parse(fs.readFileSync('eas.json', 'utf8'));
  
  if (easJson.build?.testflight) {
    successes.push('testflight profile exists');
    
    if (easJson.build.testflight.ios?.cache?.disabled) {
      successes.push('Cache disabled for testflight builds');
    } else {
      warnings.push('Cache not explicitly disabled (will use --clear-cache flag)');
      hasWarnings = true;
    }
  } else {
    warnings.push('No testflight profile in eas.json');
    hasWarnings = true;
  }
} catch (error) {
  warnings.push(`Cannot read eas.json: ${error.message}`);
  hasWarnings = true;
}

// Check 4: services/health.ts
console.log('💊 Checking services/health.ts...');
try {
  const healthService = fs.readFileSync('services/health.ts', 'utf8');
  
  if (healthService.includes("require('react-native-health')")) {
    successes.push('Correctly requires react-native-health');
  } else if (healthService.includes('react-native-health')) {
    warnings.push('Uses react-native-health but not via require()');
    hasWarnings = true;
  } else if (healthService.includes('@kingstinct/react-native-healthkit')) {
    errors.push('Code uses @kingstinct/react-native-healthkit but package.json has react-native-health');
    hasErrors = true;
  } else {
    warnings.push('Cannot find health module import');
    hasWarnings = true;
  }
} catch (error) {
  warnings.push(`Cannot read services/health.ts: ${error.message}`);
  hasWarnings = true;
}

// Check 5: node_modules
console.log('📚 Checking node_modules...');
if (fs.existsSync('node_modules/react-native-health')) {
  successes.push('react-native-health installed in node_modules');
  
  // Check for package.json in module
  const modulePkg = path.join('node_modules/react-native-health/package.json');
  if (fs.existsSync(modulePkg)) {
    try {
      const moduleInfo = JSON.parse(fs.readFileSync(modulePkg, 'utf8'));
      successes.push(`Installed version: ${moduleInfo.version}`);
    } catch (e) {
      // Ignore
    }
  }
} else {
  errors.push('react-native-health NOT in node_modules (run npm install)');
  hasErrors = true;
}

// Check 6: package-lock.json
console.log('🔒 Checking package-lock.json...');
if (fs.existsSync('package-lock.json')) {
  successes.push('package-lock.json exists (good for reproducible builds)');
} else if (fs.existsSync('yarn.lock')) {
  successes.push('yarn.lock exists (good for reproducible builds)');
} else {
  warnings.push('No lock file found (consider committing package-lock.json)');
  hasWarnings = true;
}

// Print results
console.log('');
console.log('='.repeat(70));
console.log('RESULTS');
console.log('='.repeat(70));
console.log('');

if (successes.length > 0) {
  console.log('✅ SUCCESSES:');
  successes.forEach(s => console.log(`   ✅ ${s}`));
  console.log('');
}

if (warnings.length > 0) {
  console.log('⚠️  WARNINGS:');
  warnings.forEach(w => console.log(`   ⚠️  ${w}`));
  console.log('');
}

if (errors.length > 0) {
  console.log('❌ ERRORS:');
  errors.forEach(e => console.log(`   ❌ ${e}`));
  console.log('');
}

// Summary
console.log('='.repeat(70));
if (hasErrors) {
  console.log('❌ VERIFICATION FAILED');
  console.log('');
  console.log('Please fix the errors above before building.');
  console.log('');
  process.exit(1);
} else if (hasWarnings) {
  console.log('⚠️  VERIFICATION PASSED WITH WARNINGS');
  console.log('');
  console.log('You can proceed with the build, but consider addressing warnings.');
  console.log('');
} else {
  console.log('✅ VERIFICATION PASSED');
  console.log('');
  console.log('All checks passed! Ready to build.');
  console.log('');
  console.log('Run: npm run build:testflight');
  console.log('');
}
console.log('='.repeat(70));
console.log('');

