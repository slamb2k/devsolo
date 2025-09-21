export interface WorkflowTemplate {
  name: string;
  description: string;
  type: 'feature' | 'hotfix' | 'release' | 'experiment';
  branchPattern: string;
  commitPattern?: string;
  prTemplate?: string;
  hooks?: {
    preCommit?: string[];
    postCommit?: string[];
    prePush?: string[];
    postPush?: string[];
  };
  validations?: {
    requireTests?: boolean;
    requireReview?: boolean;
    requireCI?: boolean;
    minReviewers?: number;
  };
}

export const templates: Record<string, WorkflowTemplate> = {
  feature: {
    name: 'Feature Development',
    description: 'Standard feature development workflow',
    type: 'feature',
    branchPattern: 'feature/{description}',
    commitPattern: 'feat: {message}',
    prTemplate: `## Description
{description}

## Type of Change
- [ ] Bug fix
- [x] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No new warnings`,
    hooks: {
      preCommit: ['npm run lint', 'npm run test:unit'],
      prePush: ['npm run test']
    },
    validations: {
      requireTests: true,
      requireReview: true,
      requireCI: true,
      minReviewers: 1
    }
  },

  hotfix: {
    name: 'Emergency Hotfix',
    description: 'Emergency production fix workflow',
    type: 'hotfix',
    branchPattern: 'hotfix/{issue}',
    commitPattern: 'fix: {message}',
    prTemplate: `## HOTFIX

### Issue
{issue}

### Root Cause
{rootCause}

### Solution
{solution}

### Rollback Plan
{rollbackPlan}

### Testing
- [ ] Fix verified locally
- [ ] Regression tests pass
- [ ] Smoke tests pass

### Deployment
- [ ] Can be deployed immediately
- [ ] Requires coordination`,
    hooks: {
      preCommit: ['npm run lint:fix'],
      postPush: ['npm run deploy:staging']
    },
    validations: {
      requireTests: false,
      requireReview: true,
      requireCI: false,
      minReviewers: 2
    }
  },

  release: {
    name: 'Release Preparation',
    description: 'Release branch preparation workflow',
    type: 'release',
    branchPattern: 'release/{version}',
    commitPattern: 'chore: release {version}',
    prTemplate: `## Release {version}

### Features
{features}

### Bug Fixes
{bugFixes}

### Breaking Changes
{breakingChanges}

### Migration Guide
{migrationGuide}

### Testing
- [ ] All tests passing
- [ ] Performance benchmarks acceptable
- [ ] Security scan completed
- [ ] Staging deployment successful

### Release Checklist
- [ ] Version bumped
- [ ] Changelog updated
- [ ] Documentation updated
- [ ] Release notes prepared`,
    hooks: {
      preCommit: ['npm run build', 'npm run test'],
      postCommit: ['npm run changelog:generate'],
      prePush: ['npm run test:e2e']
    },
    validations: {
      requireTests: true,
      requireReview: true,
      requireCI: true,
      minReviewers: 2
    }
  },

  experiment: {
    name: 'Experimental Feature',
    description: 'Experimental feature development',
    type: 'experiment',
    branchPattern: 'experiment/{description}',
    commitPattern: 'exp: {message}',
    prTemplate: `## Experiment: {title}

### Hypothesis
{hypothesis}

### Approach
{approach}

### Results
{results}

### Learnings
{learnings}

### Next Steps
- [ ] Continue development
- [ ] Pivot approach
- [ ] Abandon experiment

### Code Status
- [ ] Prototype quality
- [ ] Can be refactored for production
- [ ] Should be discarded`,
    hooks: {
      preCommit: ['npm run lint']
    },
    validations: {
      requireTests: false,
      requireReview: false,
      requireCI: false,
      minReviewers: 0
    }
  },

  bugfix: {
    name: 'Bug Fix',
    description: 'Standard bug fix workflow',
    type: 'feature',
    branchPattern: 'bugfix/{issue}',
    commitPattern: 'fix: {message}',
    prTemplate: `## Bug Fix

### Issue
Fixes #{issue}

### Problem
{problemDescription}

### Root Cause
{rootCause}

### Solution
{solutionDescription}

### Testing
- [ ] Bug reproduced before fix
- [ ] Bug resolved after fix
- [ ] No regressions introduced
- [ ] Unit tests added/updated

### Screenshots (if applicable)
Before:
{beforeScreenshot}

After:
{afterScreenshot}`,
    hooks: {
      preCommit: ['npm run lint', 'npm run test:unit'],
      prePush: ['npm run test']
    },
    validations: {
      requireTests: true,
      requireReview: true,
      requireCI: true,
      minReviewers: 1
    }
  },

  documentation: {
    name: 'Documentation Update',
    description: 'Documentation-only changes',
    type: 'feature',
    branchPattern: 'docs/{description}',
    commitPattern: 'docs: {message}',
    prTemplate: `## Documentation Update

### Changes
{changes}

### Sections Updated
- [ ] README
- [ ] API Documentation
- [ ] User Guide
- [ ] Developer Guide
- [ ] Examples
- [ ] FAQ

### Review Checklist
- [ ] Grammar and spelling checked
- [ ] Links verified
- [ ] Code examples tested
- [ ] Screenshots updated (if needed)`,
    hooks: {
      preCommit: ['npm run docs:lint']
    },
    validations: {
      requireTests: false,
      requireReview: true,
      requireCI: false,
      minReviewers: 1
    }
  }
};

export class TemplateManager {
  public getTemplate(name: string): WorkflowTemplate | undefined {
    return templates[name];
  }

  public listTemplates(): string[] {
    return Object.keys(templates);
  }

  public applyTemplate(
    template: WorkflowTemplate,
    variables: Record<string, string>
  ): {
    branchName: string;
    commitMessage?: string;
    prDescription?: string;
  } {
    const branchName = this.interpolate(template.branchPattern, variables);
    const commitMessage = template.commitPattern
      ? this.interpolate(template.commitPattern, variables)
      : undefined;
    const prDescription = template.prTemplate
      ? this.interpolate(template.prTemplate, variables)
      : undefined;

    return {
      branchName,
      commitMessage,
      prDescription
    };
  }

  private interpolate(
    template: string,
    variables: Record<string, string>
  ): string {
    return template.replace(
      /{(\w+)}/g,
      (match, key) => variables[key] || match
    );
  }

  public validateWorkflow(
    template: WorkflowTemplate,
    context: {
      hasTests?: boolean;
      hasReview?: boolean;
      hasCIPassed?: boolean;
      reviewerCount?: number;
    }
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (template.validations?.requireTests && !context.hasTests) {
      errors.push('Tests are required for this workflow');
    }

    if (template.validations?.requireReview && !context.hasReview) {
      errors.push('Code review is required for this workflow');
    }

    if (template.validations?.requireCI && !context.hasCIPassed) {
      errors.push('CI must pass for this workflow');
    }

    if (
      template.validations?.minReviewers &&
      (context.reviewerCount || 0) < template.validations.minReviewers
    ) {
      errors.push(
        `At least ${template.validations.minReviewers} reviewer(s) required`
      );
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}