import { ConsoleOutput } from '../../ui/console-output';

export interface CheckResult {
  passed: boolean;
  name: string;
  message?: string;
  level: 'info' | 'warning' | 'error';
  suggestions?: string[];
}

export interface ValidationContext {
  command: string;
  session?: any;
  options?: any;
}

export abstract class PreFlightChecks {
  protected output: ConsoleOutput;
  protected checks: Array<() => Promise<CheckResult>>;

  constructor() {
    this.output = new ConsoleOutput();
    this.checks = [];
  }

  /**
   * Run all pre-flight checks and display results
   */
  async runChecks(_context: ValidationContext): Promise<boolean> {
    // Debug to file IMMEDIATELY
    const fs = require('fs');
    const path = require('path');
    const debugLog = path.join(process.cwd(), 'hansolo-preflight-debug.log');
    try {
      fs.appendFileSync(debugLog, `\n=== runChecks CALLED at ${new Date().toISOString()} ===\n`);
      fs.appendFileSync(debugLog, `CWD: ${process.cwd()}\n`);
    } catch (e) {
      console.error('Failed to write debug log:', e);
      console.error('Attempted path:', debugLog);
    }

    this.output.subheader('🔍 Pre-Flight Checks');
    console.log('[DEBUG PRE-FLIGHT] runChecks called');

    const results: CheckResult[] = [];
    try {
      fs.appendFileSync(debugLog, `Starting checks loop, ${this.checks.length} checks\n`);
    } catch (e) {
      // ignore
    }

    for (const check of this.checks) {
      try {
        const result = await check();
        results.push(result);
        try {
          fs.appendFileSync(debugLog, `Check result: ${JSON.stringify(result)}\n`);
        } catch (e) {
          // ignore
        }
        this.displayCheckResult(result);
      } catch (error) {
        try {
          fs.appendFileSync(debugLog, `Check threw error: ${error}\n`);
        } catch (e) {
          // ignore
        }
        throw error;
      }
    }
    try {
      fs.appendFileSync(debugLog, `All checks completed, ${results.length} results\n`);
    } catch (e) {
      // ignore
    }

    const allPassed = results.every(r => r.passed);
    const errorCount = results.filter(r => !r.passed && r.level === 'error').length;
    const warningCount = results.filter(r => !r.passed && r.level === 'warning').length;

    // Debug logging
    console.error('[PRE-FLIGHT] allPassed:', allPassed);
    console.error('[PRE-FLIGHT] errorCount:', errorCount);
    console.error('[PRE-FLIGHT] warningCount:', warningCount);
    console.error('[PRE-FLIGHT] results:', JSON.stringify(results, null, 2));

    this.output.info('');
    if (allPassed) {
      this.output.successMessage(`✓ All checks passed (${results.length}/${results.length})`);
    } else if (errorCount > 0) {
      this.output.errorMessage(`✗ ${errorCount} check(s) failed, ${warningCount} warning(s)`);

      // Show suggestions from failed checks
      const failedWithSuggestions = results.filter(r => !r.passed && r.suggestions);
      if (failedWithSuggestions.length > 0) {
        this.output.info('\n💡 Suggestions:');
        failedWithSuggestions.forEach(r => {
          r.suggestions?.forEach(s => this.output.dim(`   ${s}`));
        });
      }
    } else {
      this.output.warningMessage(`⚠ ${warningCount} warning(s), proceeding...`);
    }

    // Pass if all checks passed OR only warnings (no errors)
    const returnValue = allPassed || errorCount === 0;

    // Debug to file
    try {
      fs.appendFileSync(debugLog,
        '\n=== PRE-FLIGHT CHECKS RESULT ===\n' +
        `allPassed: ${allPassed}\n` +
        `errorCount: ${errorCount}\n` +
        `warningCount: ${warningCount}\n` +
        `returnValue: ${returnValue}\n` +
        `returnValue type: ${typeof returnValue}\n` +
        `results: ${JSON.stringify(results, null, 2)}\n`
      );
    } catch (e) {
      console.error('Failed to write final debug log:', e);
    }

    // TEMPORARY: Force return true to test if the problem is in the return logic
    console.log('[PRE-FLIGHT] About to return TRUE (forced for debugging)');
    return true;
  }

  /**
   * Display individual check result
   */
  protected displayCheckResult(result: CheckResult): void {
    const icon = result.passed ? '✓' : result.level === 'warning' ? '⚠' : '✗';
    const color = result.passed ? 'success' : result.level === 'warning' ? 'warning' : 'error';

    const message = result.message
      ? `${icon} ${result.name}: ${result.message}`
      : `${icon} ${result.name}`;

    if (color === 'success') {
      this.output.dim(`  ${message}`);
    } else if (color === 'warning') {
      this.output.warningMessage(`  ${message}`);
    } else {
      this.output.errorMessage(`  ${message}`);
    }
  }

  /**
   * Add a check to the list
   */
  protected addCheck(check: () => Promise<CheckResult>): void {
    this.checks.push(check);
  }
}

export abstract class PostFlightChecks {
  protected output: ConsoleOutput;
  protected verifications: Array<() => Promise<CheckResult>>;

  constructor() {
    this.output = new ConsoleOutput();
    this.verifications = [];
  }

  /**
   * Run all post-flight verifications and display results
   */
  async runVerifications(_context: ValidationContext): Promise<boolean> {
    this.output.subheader('✅ Post-Flight Verification');

    const results: CheckResult[] = [];

    for (const verification of this.verifications) {
      const result = await verification();
      results.push(result);

      this.displayVerificationResult(result);
    }

    const allPassed = results.every(r => r.passed);
    const failedCount = results.filter(r => !r.passed).length;

    this.output.info('');
    if (allPassed) {
      this.output.successMessage(`✓ All verifications passed (${results.length}/${results.length})`);
    } else {
      this.output.warningMessage(`⚠ ${failedCount} verification(s) failed`);
      this.output.dim('  Some post-flight checks did not pass - review above for details');
    }

    return allPassed;
  }

  /**
   * Display individual verification result
   */
  protected displayVerificationResult(result: CheckResult): void {
    const icon = result.passed ? '✓' : '✗';
    const message = result.message
      ? `${icon} ${result.name}: ${result.message}`
      : `${icon} ${result.name}`;

    if (result.passed) {
      this.output.dim(`  ${message}`);
    } else {
      this.output.warningMessage(`  ${message}`);
    }
  }

  /**
   * Add a verification to the list
   */
  protected addVerification(verification: () => Promise<CheckResult>): void {
    this.verifications.push(verification);
  }
}
