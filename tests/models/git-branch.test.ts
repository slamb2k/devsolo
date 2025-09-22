import { GitBranch } from '../../src/models/git-branch';

describe('GitBranch Model', () => {
  describe('Branch Creation', () => {
    it('should create a valid git branch', () => {
      const branch = new GitBranch({
        name: 'feature/new-feature',
        baseBranch: 'main',
        remote: 'origin',
        tracking: 'origin/feature/new-feature',
        ahead: 2,
        behind: 0,
        lastCommit: 'abc123',
        created: new Date('2024-01-01'),
        updated: new Date('2024-01-02')
      });

      expect(branch.name).toBe('feature/new-feature');
      expect(branch.baseBranch).toBe('main');
      expect(branch.ahead).toBe(2);
      expect(branch.behind).toBe(0);
    });

    it('should set default values', () => {
      const branch = new GitBranch({
        name: 'develop'
      });

      expect(branch.baseBranch).toBe('main');
      expect(branch.remote).toBe('origin');
      expect(branch.ahead).toBe(0);
      expect(branch.behind).toBe(0);
      expect(branch.created).toBeDefined();
    });

    it('should validate branch name', () => {
      expect(() => new GitBranch({
        name: ''
      })).toThrow('Branch name is required');

      expect(() => new GitBranch({
        name: 'invalid branch'
      })).toThrow('Invalid branch name format');
    });
  });

  describe('Branch Status', () => {
    it('should determine if branch is up to date', () => {
      const upToDate = new GitBranch({
        name: 'feature',
        ahead: 0,
        behind: 0
      });

      const ahead = new GitBranch({
        name: 'feature',
        ahead: 3,
        behind: 0
      });

      const behind = new GitBranch({
        name: 'feature',
        ahead: 0,
        behind: 2
      });

      expect(upToDate.isUpToDate()).toBe(true);
      expect(ahead.isUpToDate()).toBe(false);
      expect(behind.isUpToDate()).toBe(false);
    });

    it('should determine if branch has diverged', () => {
      const diverged = new GitBranch({
        name: 'feature',
        ahead: 2,
        behind: 3
      });

      const notDiverged = new GitBranch({
        name: 'feature',
        ahead: 2,
        behind: 0
      });

      expect(diverged.hasDiverged()).toBe(true);
      expect(notDiverged.hasDiverged()).toBe(false);
    });

    it('should check if branch is tracking remote', () => {
      const tracking = new GitBranch({
        name: 'feature',
        tracking: 'origin/feature'
      });

      const notTracking = new GitBranch({
        name: 'local-only'
      });

      expect(tracking.isTracking()).toBe(true);
      expect(notTracking.isTracking()).toBe(false);
    });

    it('should check if branch exists on remote', () => {
      const hasRemote = new GitBranch({
        name: 'feature',
        tracking: 'origin/feature',
        hasRemote: true
      });

      const noRemote = new GitBranch({
        name: 'local',
        hasRemote: false
      });

      expect(hasRemote.existsOnRemote()).toBe(true);
      expect(noRemote.existsOnRemote()).toBe(false);
    });
  });

  describe('Branch Type Detection', () => {
    it('should identify feature branches', () => {
      const feature1 = new GitBranch({ name: 'feature/new-ui' });
      const feature2 = new GitBranch({ name: 'feat/api-update' });
      const notFeature = new GitBranch({ name: 'hotfix/critical' });

      expect(feature1.getType()).toBe('feature');
      expect(feature2.getType()).toBe('feature');
      expect(notFeature.getType()).not.toBe('feature');
    });

    it('should identify hotfix branches', () => {
      const hotfix1 = new GitBranch({ name: 'hotfix/security-patch' });
      const hotfix2 = new GitBranch({ name: 'fix/urgent-bug' });

      expect(hotfix1.getType()).toBe('hotfix');
      expect(hotfix2.getType()).toBe('hotfix');
    });

    it('should identify release branches', () => {
      const release = new GitBranch({ name: 'release/v1.2.0' });
      expect(release.getType()).toBe('release');
    });

    it('should identify bugfix branches', () => {
      const bugfix = new GitBranch({ name: 'bugfix/issue-123' });
      expect(bugfix.getType()).toBe('bugfix');
    });

    it('should return other for unknown types', () => {
      const other = new GitBranch({ name: 'experimental-branch' });
      expect(other.getType()).toBe('other');
    });
  });

  describe('Branch Comparison', () => {
    it('should compare branches for equality', () => {
      const branch1 = new GitBranch({
        name: 'feature/test',
        baseBranch: 'main'
      });

      const branch2 = new GitBranch({
        name: 'feature/test',
        baseBranch: 'main'
      });

      const branch3 = new GitBranch({
        name: 'feature/other',
        baseBranch: 'main'
      });

      expect(branch1.equals(branch2)).toBe(true);
      expect(branch1.equals(branch3)).toBe(false);
    });

    it('should check if branch is ancestor of another', () => {
      const parent = new GitBranch({
        name: 'main',
        lastCommit: 'abc123'
      });

      const child = new GitBranch({
        name: 'feature',
        baseBranch: 'main',
        baseCommit: 'abc123'
      });

      expect(child.isBasedOn(parent)).toBe(true);
    });
  });

  describe('Branch Metadata', () => {
    it('should store and retrieve metadata', () => {
      const branch = new GitBranch({
        name: 'feature/metadata',
        metadata: {
          author: 'john.doe',
          jiraTicket: 'PROJ-123',
          prNumber: 456,
          reviewers: ['alice', 'bob']
        }
      });

      expect(branch.metadata.author).toBe('john.doe');
      expect(branch.metadata.jiraTicket).toBe('PROJ-123');
      expect(branch.metadata.reviewers).toEqual(['alice', 'bob']);
    });

    it('should update metadata', () => {
      const branch = new GitBranch({
        name: 'feature/update',
        metadata: { status: 'in-progress' }
      });

      branch.updateMetadata({
        status: 'ready-for-review',
        prNumber: 789
      });

      expect(branch.metadata.status).toBe('ready-for-review');
      expect(branch.metadata.prNumber).toBe(789);
    });
  });

  describe('Commit History', () => {
    it('should track commit history', () => {
      const branch = new GitBranch({
        name: 'feature/history',
        commits: [
          { sha: 'abc123', message: 'Initial commit', author: 'john', date: new Date() },
          { sha: 'def456', message: 'Add feature', author: 'john', date: new Date() },
          { sha: 'ghi789', message: 'Fix bug', author: 'jane', date: new Date() }
        ]
      });

      expect(branch.commits).toHaveLength(3);
      expect(branch.getCommitCount()).toBe(3);
      expect(branch.getLatestCommit().sha).toBe('ghi789');
    });

    it('should find commits by author', () => {
      const branch = new GitBranch({
        name: 'feature/authors',
        commits: [
          { sha: 'abc', message: 'Commit 1', author: 'alice', date: new Date() },
          { sha: 'def', message: 'Commit 2', author: 'bob', date: new Date() },
          { sha: 'ghi', message: 'Commit 3', author: 'alice', date: new Date() }
        ]
      });

      const aliceCommits = branch.getCommitsByAuthor('alice');
      expect(aliceCommits).toHaveLength(2);
      expect(aliceCommits[0].author).toBe('alice');
    });
  });

  describe('Protection Rules', () => {
    it('should check if branch is protected', () => {
      const protected = new GitBranch({
        name: 'main',
        protected: true,
        protectionRules: {
          requirePR: true,
          requireApprovals: 2,
          dismissStaleReviews: true,
          requireUpToDate: true
        }
      });

      const unprotected = new GitBranch({
        name: 'feature/test'
      });

      expect(protected.isProtected()).toBe(true);
      expect(unprotected.isProtected()).toBe(false);
    });

    it('should validate protection rules', () => {
      const branch = new GitBranch({
        name: 'main',
        protected: true,
        protectionRules: {
          requirePR: true,
          requireApprovals: 2
        }
      });

      const validPR = {
        approvals: 2,
        upToDate: true
      };

      const invalidPR = {
        approvals: 1,
        upToDate: false
      };

      expect(branch.validateProtectionRules(validPR)).toBe(true);
      expect(branch.validateProtectionRules(invalidPR)).toBe(false);
    });
  });

  describe('Branch Operations', () => {
    it('should generate rebase command', () => {
      const branch = new GitBranch({
        name: 'feature/rebase',
        baseBranch: 'develop'
      });

      const command = branch.getRebaseCommand();
      expect(command).toBe('git rebase develop');
    });

    it('should generate merge command', () => {
      const branch = new GitBranch({
        name: 'feature/merge'
      });

      const command = branch.getMergeCommand('--squash');
      expect(command).toBe('git merge --squash feature/merge');
    });

    it('should generate push command', () => {
      const branch = new GitBranch({
        name: 'feature/push',
        remote: 'upstream'
      });

      const normalPush = branch.getPushCommand();
      const forcePush = branch.getPushCommand(true);

      expect(normalPush).toBe('git push upstream feature/push');
      expect(forcePush).toBe('git push --force-with-lease upstream feature/push');
    });
  });

  describe('Serialization', () => {
    it('should serialize to JSON', () => {
      const branch = new GitBranch({
        name: 'feature/serialize',
        baseBranch: 'main',
        ahead: 2,
        behind: 1,
        metadata: { author: 'test' }
      });

      const json = branch.toJSON();
      expect(json.name).toBe('feature/serialize');
      expect(json.ahead).toBe(2);
      expect(json.metadata.author).toBe('test');
    });

    it('should deserialize from JSON', () => {
      const json = {
        name: 'feature/deserialize',
        baseBranch: 'develop',
        ahead: 3,
        behind: 0,
        hasRemote: true
      };

      const branch = GitBranch.fromJSON(json);
      expect(branch.name).toBe('feature/deserialize');
      expect(branch.baseBranch).toBe('develop');
      expect(branch.ahead).toBe(3);
    });
  });
});