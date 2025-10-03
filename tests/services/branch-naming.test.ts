import { BranchNamingService } from '../../src/services/branch-naming';

describe('BranchNamingService', () => {
  let service: BranchNamingService;

  beforeEach(() => {
    service = new BranchNamingService();
  });

  describe('validate', () => {
    it('should validate standard branch names', () => {
      const result = service.validate('feature/add-login');
      expect(result.isValid).toBe(true);
      expect(result.type).toBe('feature');
      expect(result.description).toBe('add-login');
    });

    it('should reject non-standard branch names', () => {
      const result = service.validate('my-feature');
      expect(result.isValid).toBe(false);
      expect(result.message).toContain('standard convention');
      expect(result.suggestions).toHaveLength(1);
      expect(result.suggestions?.[0]).toBe('feature/my-feature');
    });

    it('should validate all branch types', () => {
      const types = ['feature', 'bugfix', 'hotfix', 'release', 'chore', 'docs', 'test', 'refactor'];

      types.forEach(type => {
        const result = service.validate(`${type}/test-name`);
        expect(result.isValid).toBe(true);
        expect(result.type).toBe(type);
      });
    });
  });

  describe('generateFromDescription', () => {
    it('should generate feature branch from description', () => {
      const result = service.generateFromDescription('Add user authentication');
      expect(result).toBe('feature/add-user-authentication');
    });

    it('should guess bugfix type from keywords', () => {
      const result = service.generateFromDescription('Fix login bug');
      expect(result).toBe('bugfix/fix-login-bug');
    });

    it('should guess hotfix type from keywords', () => {
      const result = service.generateFromDescription('Critical security issue');
      expect(result).toMatch(/^(hotfix|feature)\/critical-security-issue$/);
    });

    it('should convert to kebab-case', () => {
      const result = service.generateFromDescription('Add New Feature With Spaces');
      expect(result).toBe('feature/add-new-feature-with-spaces');
    });

    it('should handle special characters', () => {
      const result = service.generateFromDescription('Add user@authentication!');
      expect(result).toBe('feature/add-user-authentication');
    });
  });

  describe('generateFromTimestamp', () => {
    it('should generate timestamp-based branch name', () => {
      const result = service.generateFromTimestamp();
      expect(result).toMatch(/^feature\/\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2}$/);
    });

    it('should use provided type', () => {
      const result = service.generateFromTimestamp('hotfix');
      expect(result).toMatch(/^hotfix\/\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2}$/);
    });
  });

  describe('generate', () => {
    it('should use description when provided', async () => {
      const result = await service.generate({ description: 'Add feature' });
      expect(result).toBe('feature/add-feature');
    });

    it('should fall back to timestamp when no description', async () => {
      const result = await service.generate({});
      expect(result).toMatch(/^feature\/\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2}$/);
    });
  });
});
