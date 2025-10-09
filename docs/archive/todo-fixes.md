# Remaining TypeScript Issues to Fix

## Summary
The following TypeScript errors remain after the initial quality check fixes. These are mostly related to:
1. Missing method implementations in service classes
2. Type mismatches in command implementations
3. Missing configuration properties

## Critical Issues

### GitOperations Service - Missing Methods
The following methods need to be added to `src/services/git-operations.ts`:
- `getGitVersion(): Promise<string>`
- `getMainBranch(): Promise<string>`
- `getCommitsBehindMain(branch: string): Promise<number>`
- `getCommitsSince(branch: string): Promise<any[]>`
- `getAheadBehindCount(): Promise<{ ahead: number, behind: number }>`
- `hasRemote(): Promise<boolean>`
- `fetchRemote(): Promise<void>`
- `getLastCommit(): Promise<{ message: string }>`
- `isBranchMerged(branch: string): Promise<boolean>`
- `getFilesInCommit(commit: string): Promise<string[]>`

### ValidationService - Missing Methods
Add to `src/services/validation-service.ts`:
- `validateSession(session: any): Promise<boolean>`

### Configuration Model - Missing Properties
Add to UserPreferences in `src/models/configuration.ts`:
- `statusLineFormat?: { template?: string }`
- `enforceConventionalCommits?: boolean`
- `runTestsOnPush?: boolean`

### StatusResult Interface - Missing Property
Add to StatusResult in git-operations.ts:
- `untracked: string[]`

### GitPlatformConfig Type Issues
Fix in `src/integrations/types.ts`:
- Add proper typing for platform-specific fields

## Non-Critical Issues

### Variable Unused Warnings
- Remove or use `args` parameter in various validate() methods
- Remove unused `mr` variable in gitlab-client.ts

### Type Safety Issues
- Add null checks for optional parameters
- Fix array access with proper type guards
- Add proper error handling for undefined values

## Recommended Next Steps

1. Add missing method stubs to services with basic implementations
2. Update configuration models with missing properties
3. Add proper type guards for nullable values
4. Run `npx tsc --noEmit` to verify fixes
5. Run `npm run lint` to check for additional issues
6. Add unit tests for new methods

## Files Most Affected
1. `src/services/git-operations.ts` - 10+ missing methods
2. `src/models/configuration.ts` - 3 missing properties
3. `src/services/validation-service.ts` - 1 missing method
4. Various command files - null check issues