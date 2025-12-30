#!/usr/bin/env npx ts-node

/**
 * REGRESSION TEST RUNNER
 *
 * This script runs the complete regression test suite for the Lock-In app.
 * Designed to be run by AI agents for automated testing.
 *
 * Usage:
 *   npx ts-node tests/run-regression.ts
 *   npx ts-node tests/run-regression.ts --category "Weekly Scoring"
 *   npx ts-node tests/run-regression.ts --output json
 */

import { runRegressionTests } from './regression-tests';

interface CLIOptions {
  category?: string;
  output: 'text' | 'json' | 'markdown';
  verbose: boolean;
}

function parseArgs(): CLIOptions {
  const args = process.argv.slice(2);
  const options: CLIOptions = {
    output: 'text',
    verbose: false,
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--category' && args[i + 1]) {
      options.category = args[i + 1];
      i++;
    } else if (args[i] === '--output' && args[i + 1]) {
      options.output = args[i + 1] as 'text' | 'json' | 'markdown';
      i++;
    } else if (args[i] === '--verbose' || args[i] === '-v') {
      options.verbose = true;
    }
  }

  return options;
}

function formatAsMarkdown(results: ReturnType<typeof runRegressionTests>): string {
  let md = '# Lock-In Regression Test Results\n\n';
  md += `**Date:** ${new Date().toISOString()}\n\n`;
  md += `**Summary:** ${results.summary}\n\n`;

  md += '## Results by Category\n\n';
  md += '| Category | Passed | Failed | Status |\n';
  md += '|----------|--------|--------|--------|\n';

  Object.values(results.categories).forEach(cat => {
    const status = cat.failed === 0 ? 'PASS' : 'FAIL';
    md += `| ${cat.name} | ${cat.passed} | ${cat.failed} | ${status} |\n`;
  });

  if (results.issues.length > 0) {
    md += '\n## Issues Found\n\n';
    results.issues.forEach(issue => {
      md += `### ${issue.testId}\n\n`;
      md += `**Severity:** ${issue.severity}\n\n`;
      md += `**Description:** ${issue.description}\n\n`;
      md += '---\n\n';
    });
  }

  return md;
}

function formatAsJSON(results: ReturnType<typeof runRegressionTests>): string {
  return JSON.stringify(
    {
      timestamp: new Date().toISOString(),
      summary: results.summary,
      totalTests: results.results.length,
      passed: results.results.filter(r => r.passed).length,
      failed: results.results.filter(r => !r.passed).length,
      categories: Object.fromEntries(
        Object.entries(results.categories).map(([name, cat]) => [
          name,
          {
            passed: cat.passed,
            failed: cat.failed,
            tests: cat.tests.map(t => ({
              id: t.testId,
              name: t.name,
              passed: t.passed,
              severity: t.severity,
              error: t.error,
            })),
          },
        ])
      ),
      issues: results.issues,
    },
    null,
    2
  );
}

async function main() {
  const options = parseArgs();

  console.log('========================================');
  console.log('LOCK-IN REGRESSION TEST RUNNER');
  console.log('========================================\n');

  if (options.category) {
    console.log(`Filtering by category: ${options.category}\n`);
  }

  // Run tests
  const results = runRegressionTests();

  // Filter by category if specified
  if (options.category) {
    const filteredResults = results.results.filter(
      r => r.category.toLowerCase().includes(options.category!.toLowerCase())
    );
    console.log(`\nFiltered: ${filteredResults.length} tests in matching categories`);
  }

  // Output in requested format
  switch (options.output) {
    case 'json':
      console.log('\n' + formatAsJSON(results));
      break;
    case 'markdown':
      console.log('\n' + formatAsMarkdown(results));
      break;
    default:
      // Text output already printed by runRegressionTests()
      break;
  }

  // Exit with error code if any tests failed
  const failedCount = results.results.filter(r => !r.passed).length;
  if (failedCount > 0) {
    console.log(`\nExiting with code 1 (${failedCount} tests failed)`);
    process.exit(1);
  } else {
    console.log('\nAll tests passed!');
    process.exit(0);
  }
}

main().catch(err => {
  console.error('Test runner failed:', err);
  process.exit(1);
});
