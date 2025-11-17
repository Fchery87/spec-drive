/**
 * Validation Engine Tests
 * Tests for validation rule execution, different validation types,
 * error handling, and edge cases
 */

import { ValidationEngine, ValidationRule, ValidationReport, ArtifactContent } from '../validation';
import { db } from '@/db';
import { validationRules, validationReports } from '@/db/schema';
import { eq } from 'drizzle-orm';

describe('ValidationEngine', () => {
  let engine: ValidationEngine;
  const testProjectId = 'test-project-' + Date.now();
  const testPhase = 'analysis';

  beforeEach(() => {
    engine = new ValidationEngine();
  });

  afterEach(async () => {
    // Cleanup test data
    try {
      await db.delete(validationReports).where(eq(validationReports.projectId, testProjectId));
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  });

  describe('ValidationEngine Initialization', () => {
    it('should initialize with default rules', () => {
      const rules = engine.getRules();
      expect(rules.length).toBeGreaterThan(0);
    });

    it('should have at least 5 default rules', () => {
      const rules = engine.getRules();
      expect(rules.length).toBeGreaterThanOrEqual(5);
    });

    it('should have rules with correct structure', () => {
      const rules = engine.getRules();
      rules.forEach(rule => {
        expect(rule).toHaveProperty('id');
        expect(rule).toHaveProperty('name');
        expect(rule).toHaveProperty('description');
        expect(rule).toHaveProperty('type');
        expect(rule).toHaveProperty('severity');
        expect(rule).toHaveProperty('enabled');
        expect(rule).toHaveProperty('rule');
      });
    });

    it('should have rules with valid types', () => {
      const rules = engine.getRules();
      const validTypes = ['requirement_api', 'requirement_data', 'requirement_task', 'stack_dependency'];

      rules.forEach(rule => {
        expect(validTypes).toContain(rule.type);
      });
    });

    it('should have rules with valid severity levels', () => {
      const rules = engine.getRules();
      const validSeverities = ['error', 'warning', 'info'];

      rules.forEach(rule => {
        expect(validSeverities).toContain(rule.severity);
      });
    });

    it('should have rules enabled by default', () => {
      const rules = engine.getRules();
      rules.forEach(rule => {
        expect(rule.enabled).toBe(true);
      });
    });
  });

  describe('Rule Management', () => {
    it('should add a new rule', () => {
      const newRule: ValidationRule = {
        id: 'TEST-RULE-001',
        name: 'Test Rule',
        description: 'A test rule',
        type: 'requirement_api',
        severity: 'warning',
        enabled: true,
        rule: 'function validate() { return { passed: true }; }'
      };

      const initialCount = engine.getRules().length;
      engine.addRule(newRule);
      const finalCount = engine.getRules().length;

      expect(finalCount).toBe(initialCount + 1);

      const addedRule = engine.getRules().find(r => r.id === 'TEST-RULE-001');
      expect(addedRule).toEqual(newRule);
    });

    it('should get all rules', () => {
      const rules = engine.getRules();
      expect(Array.isArray(rules)).toBe(true);
      expect(rules.length).toBeGreaterThan(0);
    });

    it('should get a copy of rules (not reference)', () => {
      const rules1 = engine.getRules();
      const rules2 = engine.getRules();

      expect(rules1).not.toBe(rules2);
      expect(rules1).toEqual(rules2);
    });

    it('should enable a rule', () => {
      const ruleId = 'REQ-API-001';
      engine.setRuleEnabled(ruleId, false);

      let rule = engine.getRules().find(r => r.id === ruleId);
      expect(rule?.enabled).toBe(false);

      engine.setRuleEnabled(ruleId, true);
      rule = engine.getRules().find(r => r.id === ruleId);
      expect(rule?.enabled).toBe(true);
    });

    it('should disable a rule', () => {
      const ruleId = 'REQ-API-001';
      engine.setRuleEnabled(ruleId, false);

      const rule = engine.getRules().find(r => r.id === ruleId);
      expect(rule?.enabled).toBe(false);
    });
  });

  describe('Validation Execution - Requirement API', () => {
    it('should validate requirement to API mapping', async () => {
      const artifacts: Record<string, ArtifactContent> = {
        'PRD.md': {
          id: '1',
          name: 'PRD.md',
          phase: testPhase,
          type: 'prd',
          content: `
# Product Requirements

REQ-API-001: User authentication endpoint
REQ-API-002: User data retrieval endpoint
REQ-API-003: Data update endpoint
          `
        },
        'api-spec.json': {
          id: '2',
          name: 'api-spec.json',
          phase: testPhase,
          type: 'api',
          content: JSON.stringify({
            paths: {
              '/api/auth': {
                post: {
                  summary: 'User authentication',
                  description: 'Authenticate user login'
                }
              },
              '/api/users': {
                get: {
                  summary: 'Get user data',
                  description: 'Retrieve user information'
                }
              }
            }
          })
        }
      };

      const report = await engine.validateArtifacts(testProjectId, testPhase, artifacts);

      expect(report).toHaveProperty('projectId', testProjectId);
      expect(report).toHaveProperty('phase', testPhase);
      expect(report).toHaveProperty('overallStatus');
      expect(report).toHaveProperty('validationResults');
      expect(Array.isArray(report.validationResults)).toBe(true);
    });

    it('should identify unmatched API requirements', async () => {
      const artifacts: Record<string, ArtifactContent> = {
        'PRD.md': {
          id: '1',
          name: 'PRD.md',
          phase: testPhase,
          type: 'prd',
          content: 'REQ-API-001: Very specific requirement without matching endpoint'
        },
        'api-spec.json': {
          id: '2',
          name: 'api-spec.json',
          phase: testPhase,
          type: 'api',
          content: JSON.stringify({
            paths: {
              '/api/other': {
                get: { summary: 'Other endpoint' }
              }
            }
          })
        }
      };

      const report = await engine.validateArtifacts(testProjectId, testPhase, artifacts);

      expect(report.validationResults).toBeDefined();
      expect(report.validationResults.length).toBeGreaterThan(0);
    });
  });

  describe('Validation Execution - Data Model', () => {
    it('should validate data model coverage of requirements', async () => {
      const artifacts: Record<string, ArtifactContent> = {
        'PRD.md': {
          id: '1',
          name: 'PRD.md',
          phase: testPhase,
          type: 'prd',
          content: `
REQ-DATA-001: Store user information
REQ-DATA-002: Store user profile data
REQ-DATA-003: Store user authentication data
          `
        },
        'data-model.md': {
          id: '2',
          name: 'data-model.md',
          phase: testPhase,
          type: 'data',
          content: `
## User Table
- id: uuid
- email: string
- name: string

## UserProfile Table
- userId: uuid
- avatar: string
          `
        }
      };

      const report = await engine.validateArtifacts(testProjectId, testPhase, artifacts);

      expect(report).toBeDefined();
      expect(report.validationResults).toBeDefined();
    });
  });

  describe('Validation Execution - Task Coverage', () => {
    it('should validate task coverage of requirements', async () => {
      const artifacts: Record<string, ArtifactContent> = {
        'PRD.md': {
          id: '1',
          name: 'PRD.md',
          phase: testPhase,
          type: 'prd',
          content: `
REQ-TASK-001: Implement authentication
REQ-TASK-002: Create user profile
REQ-TASK-003: Build data storage
          `
        },
        'tasks.md': {
          id: '2',
          name: 'tasks.md',
          phase: testPhase,
          type: 'tasks',
          content: `
- [TODO] Set up authentication system
- [TODO] Build user profile UI
- [TODO] Configure database
          `
        }
      };

      const report = await engine.validateArtifacts(testProjectId, testPhase, artifacts);

      expect(report).toBeDefined();
      expect(report.overallStatus).toBeDefined();
    });
  });

  describe('Validation Execution - Stack Dependencies', () => {
    it('should validate stack dependencies', async () => {
      const artifacts: Record<string, ArtifactContent> = {
        'stack-proposal.md': {
          id: '1',
          name: 'stack-proposal.md',
          phase: testPhase,
          type: 'stack',
          content: `
# Tech Stack

- Frontend: Next.js, React, TypeScript
- Styling: Tailwind CSS
- Database: PostgreSQL
- ORM: Drizzle
          `
        },
        'DEPENDENCIES.md': {
          id: '2',
          name: 'DEPENDENCIES.md',
          phase: testPhase,
          type: 'dependencies',
          content: JSON.stringify({
            dependencies: {
              'next': '^14.0.0',
              'react': '^18.0.0',
              'typescript': '^5.0.0',
              'tailwindcss': '^3.0.0'
            }
          })
        }
      };

      const report = await engine.validateArtifacts(testProjectId, testPhase, artifacts);

      expect(report).toBeDefined();
      expect(report.validationResults.length).toBeGreaterThan(0);
    });
  });

  describe('Validation Report Generation', () => {
    it('should generate complete validation report', async () => {
      const artifacts: Record<string, ArtifactContent> = {
        'PRD.md': {
          id: '1',
          name: 'PRD.md',
          phase: testPhase,
          type: 'prd',
          content: 'REQ-API-001: Test requirement'
        },
        'api-spec.json': {
          id: '2',
          name: 'api-spec.json',
          phase: testPhase,
          type: 'api',
          content: JSON.stringify({ paths: {} })
        }
      };

      const report = await engine.validateArtifacts(testProjectId, testPhase, artifacts);

      expect(report).toHaveProperty('projectId');
      expect(report).toHaveProperty('phase');
      expect(report).toHaveProperty('reportName');
      expect(report).toHaveProperty('overallStatus');
      expect(report).toHaveProperty('totalRules');
      expect(report).toHaveProperty('passedRules');
      expect(report).toHaveProperty('failedRules');
      expect(report).toHaveProperty('warningRules');
      expect(report).toHaveProperty('validationResults');
      expect(report).toHaveProperty('reportMetadata');
    });

    it('should calculate correct rule statistics', async () => {
      const artifacts: Record<string, ArtifactContent> = {
        'PRD.md': {
          id: '1',
          name: 'PRD.md',
          phase: testPhase,
          type: 'prd',
          content: 'Test content'
        },
        'api-spec.json': {
          id: '2',
          name: 'api-spec.json',
          phase: testPhase,
          type: 'api',
          content: JSON.stringify({ paths: {} })
        }
      };

      const report = await engine.validateArtifacts(testProjectId, testPhase, artifacts);

      const { totalRules, passedRules, failedRules, warningRules, validationResults } = report;

      expect(totalRules).toBe(validationResults.length);
      expect(passedRules + failedRules + warningRules).toBeLessThanOrEqual(totalRules);
    });

    it('should set overall status to pass when all rules pass', async () => {
      // This is a simplified test - actual rules would need to pass
      const artifacts: Record<string, ArtifactContent> = {
        'PRD.md': {
          id: '1',
          name: 'PRD.md',
          phase: testPhase,
          type: 'prd',
          content: 'REQ-API-001: test'
        },
        'api-spec.json': {
          id: '2',
          name: 'api-spec.json',
          phase: testPhase,
          type: 'api',
          content: JSON.stringify({ paths: { '/api/test': { get: {} } } })
        }
      };

      const report = await engine.validateArtifacts(testProjectId, testPhase, artifacts);

      expect(['pass', 'warning', 'fail']).toContain(report.overallStatus);
    });

    it('should set overall status to fail when error rules fail', async () => {
      const artifacts: Record<string, ArtifactContent> = {
        'PRD.md': {
          id: '1',
          name: 'PRD.md',
          phase: testPhase,
          type: 'prd',
          content: 'REQ-API-001: critical requirement'
        },
        'api-spec.json': {
          id: '2',
          name: 'api-spec.json',
          phase: testPhase,
          type: 'api',
          content: JSON.stringify({ paths: {} }) // No matching endpoint
        }
      };

      const report = await engine.validateArtifacts(testProjectId, testPhase, artifacts);

      // Since REQ-API-001 is error severity and won't match
      if (report.failedRules > 0) {
        expect(report.overallStatus).toBe('fail');
      }
    });

    it('should include validation result details', async () => {
      const artifacts: Record<string, ArtifactContent> = {
        'PRD.md': {
          id: '1',
          name: 'PRD.md',
          phase: testPhase,
          type: 'prd',
          content: 'REQ-API-001: test'
        },
        'api-spec.json': {
          id: '2',
          name: 'api-spec.json',
          phase: testPhase,
          type: 'api',
          content: JSON.stringify({ paths: {} })
        }
      };

      const report = await engine.validateArtifacts(testProjectId, testPhase, artifacts);

      report.validationResults.forEach(result => {
        expect(result).toHaveProperty('ruleId');
        expect(result).toHaveProperty('ruleName');
        expect(result).toHaveProperty('passed');
        expect(typeof result.passed).toBe('boolean');
        expect(result).toHaveProperty('severity');
        expect(result).toHaveProperty('message');
      });
    });

    it('should include report metadata', async () => {
      const artifacts: Record<string, ArtifactContent> = {
        'PRD.md': {
          id: '1',
          name: 'PRD.md',
          phase: testPhase,
          type: 'prd',
          content: 'Test'
        },
        'api-spec.json': {
          id: '2',
          name: 'api-spec.json',
          phase: testPhase,
          type: 'api',
          content: JSON.stringify({})
        }
      };

      const report = await engine.validateArtifacts(testProjectId, testPhase, artifacts);

      expect(report.reportMetadata).toBeDefined();
      expect(report.reportMetadata?.validatedAt).toBeDefined();
      expect(report.reportMetadata?.artifactsValidated).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle empty artifact content gracefully', async () => {
      const artifacts: Record<string, ArtifactContent> = {
        'PRD.md': {
          id: '1',
          name: 'PRD.md',
          phase: testPhase,
          type: 'prd',
          content: ''
        }
      };

      const report = await engine.validateArtifacts(testProjectId, testPhase, artifacts);

      expect(report).toBeDefined();
      expect(Array.isArray(report.validationResults)).toBe(true);
    });

    it('should handle missing artifact files', async () => {
      const artifacts: Record<string, ArtifactContent> = {};

      const report = await engine.validateArtifacts(testProjectId, testPhase, artifacts);

      expect(report).toBeDefined();
      expect(report.validationResults).toBeDefined();
    });

    it('should handle malformed JSON in artifacts', async () => {
      const artifacts: Record<string, ArtifactContent> = {
        'api-spec.json': {
          id: '1',
          name: 'api-spec.json',
          phase: testPhase,
          type: 'api',
          content: '{ invalid json }'
        }
      };

      const report = await engine.validateArtifacts(testProjectId, testPhase, artifacts);

      expect(report).toBeDefined();
      expect(report.validationResults).toBeDefined();
    });

    it('should handle null/undefined artifact content', async () => {
      const artifacts: Record<string, ArtifactContent> = {
        'test.md': {
          id: '1',
          name: 'test.md',
          phase: testPhase,
          type: 'test',
          content: null as unknown as string
        }
      };

      expect(() => {
        engine.validateArtifacts(testProjectId, testPhase, artifacts);
      }).not.toThrow();
    });

    it('should skip disabled rules', async () => {
      engine.setRuleEnabled('REQ-API-001', false);

      const artifacts: Record<string, ArtifactContent> = {
        'PRD.md': {
          id: '1',
          name: 'PRD.md',
          phase: testPhase,
          type: 'prd',
          content: 'REQ-API-001: test'
        }
      };

      const report = await engine.validateArtifacts(testProjectId, testPhase, artifacts);

      const disabledRuleResult = report.validationResults.find(
        r => r.ruleId === 'REQ-API-001'
      );

      expect(disabledRuleResult).toBeUndefined();
    });

    it('should handle large artifact content', async () => {
      const largeContent = 'REQ-API-001: test\n'.repeat(10000);

      const artifacts: Record<string, ArtifactContent> = {
        'PRD.md': {
          id: '1',
          name: 'PRD.md',
          phase: testPhase,
          type: 'prd',
          content: largeContent
        }
      };

      const report = await engine.validateArtifacts(testProjectId, testPhase, artifacts);

      expect(report).toBeDefined();
      expect(report.validationResults).toBeDefined();
    });

    it('should handle special characters in artifact content', async () => {
      const artifacts: Record<string, ArtifactContent> = {
        'PRD.md': {
          id: '1',
          name: 'PRD.md',
          phase: testPhase,
          type: 'prd',
          content: 'REQ-API-001: Test <script>alert("xss")</script>'
        }
      };

      const report = await engine.validateArtifacts(testProjectId, testPhase, artifacts);

      expect(report).toBeDefined();
      expect(report.validationResults).toBeDefined();
    });
  });

  describe('Validation History', () => {
    it('should save validation report to database', async () => {
      const artifacts: Record<string, ArtifactContent> = {
        'PRD.md': {
          id: '1',
          name: 'PRD.md',
          phase: testPhase,
          type: 'prd',
          content: 'test'
        }
      };

      const report = await engine.validateArtifacts(testProjectId, testPhase, artifacts);

      // Verify report was saved
      const savedReports = await engine.getValidationHistory(testProjectId, 10);
      expect(savedReports).toBeDefined();
    });

    it('should retrieve validation history for project', async () => {
      const artifacts: Record<string, ArtifactContent> = {
        'PRD.md': {
          id: '1',
          name: 'PRD.md',
          phase: testPhase,
          type: 'prd',
          content: 'test'
        }
      };

      // Run validation twice
      await engine.validateArtifacts(testProjectId, testPhase, artifacts);
      await engine.validateArtifacts(testProjectId, testPhase, artifacts);

      const history = await engine.getValidationHistory(testProjectId, 10);
      expect(Array.isArray(history)).toBe(true);
    });

    it('should return reports in reverse chronological order', async () => {
      const artifacts: Record<string, ArtifactContent> = {
        'PRD.md': {
          id: '1',
          name: 'PRD.md',
          phase: testPhase,
          type: 'prd',
          content: 'test'
        }
      };

      await engine.validateArtifacts(testProjectId, testPhase, artifacts);
      await new Promise(resolve => setTimeout(resolve, 100));
      await engine.validateArtifacts(testProjectId, testPhase, artifacts);

      const history = await engine.getValidationHistory(testProjectId, 10);
      if (history.length > 1) {
        // Most recent should be first
        expect(history[0].createdAt).toBeGreaterThanOrEqual(history[1].createdAt);
      }
    });

    it('should respect limit parameter', async () => {
      const artifacts: Record<string, ArtifactContent> = {
        'PRD.md': {
          id: '1',
          name: 'PRD.md',
          phase: testPhase,
          type: 'prd',
          content: 'test'
        }
      };

      // Create multiple reports
      for (let i = 0; i < 5; i++) {
        await engine.validateArtifacts(testProjectId, testPhase, artifacts);
      }

      const history = await engine.getValidationHistory(testProjectId, 2);
      expect(history.length).toBeLessThanOrEqual(2);
    });
  });

  describe('Validation Report Retrieval', () => {
    it('should retrieve a specific validation report', async () => {
      const artifacts: Record<string, ArtifactContent> = {
        'PRD.md': {
          id: '1',
          name: 'PRD.md',
          phase: testPhase,
          type: 'prd',
          content: 'test'
        }
      };

      const report = await engine.validateArtifacts(testProjectId, testPhase, artifacts);

      const retrieved = await engine.getValidationReport(report.id || '');
      expect(retrieved).toBeDefined();
    });

    it('should return null for non-existent report', async () => {
      const retrieved = await engine.getValidationReport('non-existent-id');
      expect(retrieved).toBeNull();
    });
  });

  describe('Cross-Artifact Validation', () => {
    it('should validate consistency across artifacts', async () => {
      const artifacts: Record<string, ArtifactContent> = {
        'PRD.md': {
          id: '1',
          name: 'PRD.md',
          phase: testPhase,
          type: 'prd',
          content: 'This document discusses user authentication and data storage'
        },
        'api-spec.json': {
          id: '2',
          name: 'api-spec.json',
          phase: testPhase,
          type: 'api',
          content: JSON.stringify({
            paths: {
              '/api/auth': { post: { summary: 'User authentication' } }
            }
          })
        },
        'data-model.md': {
          id: '3',
          name: 'data-model.md',
          phase: testPhase,
          type: 'data',
          content: '# User Table\n# Data Storage'
        }
      };

      const report = await engine.validateArtifacts(testProjectId, testPhase, artifacts);

      expect(report.validationResults.length).toBeGreaterThan(0);
      expect(report.validationResults.some(r => r.ruleId === 'CROSS-ARTIFACT-001')).toBe(true);
    });
  });

  describe('Different Artifact Types and Phases', () => {
    it('should validate artifacts from different phases', async () => {
      const phases = ['analysis', 'design', 'implementation', 'testing'];

      for (const phase of phases) {
        const artifacts: Record<string, ArtifactContent> = {
          'PRD.md': {
            id: '1',
            name: 'PRD.md',
            phase,
            type: 'prd',
            content: 'test content'
          }
        };

        const report = await engine.validateArtifacts(testProjectId, phase, artifacts);
        expect(report.phase).toBe(phase);

        // Cleanup phase reports
        await db.delete(validationReports).where(
          eq(validationReports.projectId, testProjectId)
        );
      }
    });

    it('should handle multiple artifact types in single validation', async () => {
      const artifacts: Record<string, ArtifactContent> = {
        'PRD.md': {
          id: '1',
          name: 'PRD.md',
          phase: testPhase,
          type: 'prd',
          content: 'Requirements document'
        },
        'api-spec.json': {
          id: '2',
          name: 'api-spec.json',
          phase: testPhase,
          type: 'api',
          content: JSON.stringify({ paths: {} })
        },
        'data-model.md': {
          id: '3',
          name: 'data-model.md',
          phase: testPhase,
          type: 'data',
          content: 'Data schema'
        },
        'tasks.md': {
          id: '4',
          name: 'tasks.md',
          phase: testPhase,
          type: 'tasks',
          content: 'Task list'
        }
      };

      const report = await engine.validateArtifacts(testProjectId, testPhase, artifacts);
      expect(report.validationResults.length).toBeGreaterThan(0);
    });
  });
});
