// src/app/services/mapper-validation.service.ts

import { Injectable } from '@angular/core';
import {
  // MapperState,
  MapperTarget,
  MapperFieldRule,
  ValidationError,
  ValidationResult
} from '../models/mapper.models';
import {MapperState} from './mapper-state.service';

@Injectable({
  providedIn: 'root'
})
export class MapperValidationService {

  validateMapper(state: MapperState): string[] {
    const errors: string[] = [];

    // Validate mapper configuration
    if (!state.currentMapper) {
      errors.push('No mapper configuration loaded');
      return errors;
    }

    if (!state.currentMapper.name || state.currentMapper.name.trim() === '') {
      errors.push('Mapper must have a name');
    }

    if (!state.currentMapper.case_type || state.currentMapper.case_type.trim() === '') {
      errors.push('Mapper must have a case type');
    }

    // Validate targets
    if (state.targets.length === 0) {
      errors.push('At least one target is required');
    }

    // Validate each target
    state.targets.forEach((target, index) => {
      const targetErrors = this.validateTarget(target, state.targets);
      targetErrors.forEach(error => {
        errors.push(`Target "${target.name || `#${index + 1}`}": ${error}`);
      });
    });

    // Check for circular dependencies
    const circularDeps = this.checkCircularDependencies(state.targets);
    if (circularDeps.length > 0) {
      errors.push(`Circular dependencies detected: ${circularDeps.join(' -> ')}`);
    }

    return errors;
  }

  validateTarget(target: MapperTarget, allTargets: MapperTarget[]): string[] {
    const errors: string[] = [];

    // Basic validation
    if (!target.name || target.name.trim() === '') {
      errors.push('Name is required');
    }

    if (!target.model || target.model.trim() === '') {
      errors.push('Model is required');
    }

    // Validate model format
    if (target.model && !target.model.includes('.')) {
      errors.push('Model must be in format "app_label.ModelName"');
    }

    // Validate parent reference
    if (target.parent_target) {
      const parentExists = allTargets.some(t => t.id === target.parent_target);
      if (!parentExists) {
        errors.push('Parent target does not exist');
      }
    }

    // Validate root path for child targets
    if (target.parent_target && !target.root_path) {
      errors.push('Child targets must have a root path specified');
    }

    // Validate field rules
    if (!target.field_rules || target.field_rules.length === 0) {
      errors.push('At least one field rule is required');
    } else {
      target.field_rules.forEach((rule, index) => {
        const ruleErrors = this.validateFieldRule(rule);
        ruleErrors.forEach(error => {
          errors.push(`Field rule #${index + 1}: ${error}`);
        });
      });
    }

    // Validate function paths
    if (target.finder_function_path) {
      const pathError = this.validateFunctionPath(target.finder_function_path);
      if (pathError) {
        errors.push(`Finder function: ${pathError}`);
      }
    }

    if (target.processor_function_path) {
      const pathError = this.validateFunctionPath(target.processor_function_path);
      if (pathError) {
        errors.push(`Processor function: ${pathError}`);
      }
    }

    if (target.filter_function_path) {
      const pathError = this.validateFunctionPath(target.filter_function_path);
      if (pathError) {
        errors.push(`Filter function: ${pathError}`);
      }
    }

    return errors;
  }

  validateFieldRule(rule: MapperFieldRule): string[] {
    const errors: string[] = [];

    // Basic validation
    if (!rule.json_path || rule.json_path.trim() === '') {
      errors.push('JSON path is required');
    } else {
      // Validate JSON path format
      const pathError = this.validateJsonPath(rule.json_path);
      if (pathError) {
        errors.push(`JSON path: ${pathError}`);
      }
    }

    if (!rule.target_field || rule.target_field.trim() === '') {
      errors.push('Target field is required');
    } else {
      // Validate field name format
      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(rule.target_field)) {
        errors.push('Target field must be a valid Python identifier');
      }
    }

    // Validate transform function
    if (rule.transform_function_path) {
      const pathError = this.validateFunctionPath(rule.transform_function_path);
      if (pathError) {
        errors.push(`Transform function: ${pathError}`);
      }
    }

    // Validate lookups
    if (rule.source_lookup && !rule.target_lookup) {
      errors.push('Target lookup is required when source lookup is specified');
    }

    if (!rule.source_lookup && rule.target_lookup) {
      errors.push('Source lookup is required when target lookup is specified');
    }

    // Validate condition expression
    if (rule.condition_expression) {
      const exprError = this.validateConditionExpression(rule.condition_expression);
      if (exprError) {
        errors.push(`Condition expression: ${exprError}`);
      }
    }

    // Validate conditions
    if (rule.conditions && rule.conditions.length > 0) {
      if (rule.condition_expression) {
        errors.push('Cannot have both expression and simple conditions');
      }

      rule.conditions.forEach((condition, index) => {
        if (!condition.condition_path || condition.condition_path.trim() === '') {
          errors.push(`Condition #${index + 1}: Path is required`);
        }
        if (!condition.condition_value || condition.condition_value.trim() === '') {
          errors.push(`Condition #${index + 1}: Value is required`);
        }
      });
    }

    return errors;
  }

  private validateJsonPath(path: string): string | null {
    // Basic validation for JSON path
    if (path.includes('..')) {
      return 'Invalid path: Contains ".."';
    }

    if (path.startsWith('.') || path.endsWith('.')) {
      return 'Invalid path: Cannot start or end with "."';
    }

    // Check for valid path segments
    const segments = path.split('.');
    for (const segment of segments) {
      if (segment === '') {
        return 'Invalid path: Empty segment';
      }

      // Allow array indices
      if (/^\d+$/.test(segment)) {
        continue;
      }

      // Check for valid identifier
      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(segment)) {
        return `Invalid path segment: "${segment}"`;
      }
    }

    return null;
  }

  private validateFunctionPath(path: string): string | null {
    // Validate Python function path format
    if (!path.includes('.')) {
      return 'Must be in format "module.function"';
    }

    const parts = path.split('.');
    if (parts.length < 2) {
      return 'Invalid function path format';
    }

    // Check each part is a valid Python identifier
    for (const part of parts) {
      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(part)) {
        return `Invalid identifier: "${part}"`;
      }
    }

    return null;
  }

  private validateConditionExpression(expression: string): string | null {
    // Basic validation for condition expressions
    if (expression.length > 1000) {
      return 'Expression too long (max 1000 characters)';
    }

    // Check for balanced parentheses
    let parenCount = 0;
    for (const char of expression) {
      if (char === '(') parenCount++;
      if (char === ')') parenCount--;
      if (parenCount < 0) {
        return 'Unbalanced parentheses';
      }
    }
    if (parenCount !== 0) {
      return 'Unbalanced parentheses';
    }

    // Check for dangerous patterns
    const dangerousPatterns = [
      '__import__',
      'eval',
      'exec',
      'compile',
      'globals',
      'locals',
      'vars',
      'dir'
    ];

    for (const pattern of dangerousPatterns) {
      if (expression.includes(pattern)) {
        return `Forbidden function: ${pattern}`;
      }
    }

    return null;
  }

  private checkCircularDependencies(targets: MapperTarget[]): string[] {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const path: string[] = [];

    for (const target of targets) {
      if (target.id && !visited.has(target.id)) {
        const cycle = this.hasCycle(target.id, targets, visited, recursionStack, path);
        if (cycle.length > 0) {
          return cycle;
        }
      }
    }

    return [];
  }

  private hasCycle(
    targetId: string,
    targets: MapperTarget[],
    visited: Set<string>,
    recursionStack: Set<string>,
    path: string[]
  ): string[] {
    visited.add(targetId);
    recursionStack.add(targetId);

    const target = targets.find(t => t.id === targetId);
    if (target) {
      path.push(target.name);

      // Check children
      const children = targets.filter(t => t.parent_target === targetId);
      for (const child of children) {
        if (child.id) {
          if (!visited.has(child.id)) {
            const cycle = this.hasCycle(child.id, targets, visited, recursionStack, path);
            if (cycle.length > 0) {
              return cycle;
            }
          } else if (recursionStack.has(child.id)) {
            // Found cycle
            const cycleStart = path.indexOf(child.name);
            return path.slice(cycleStart).concat(child.name);
          }
        }
      }
    }

    recursionStack.delete(targetId);
    path.pop();
    return [];
  }

  // Validate a single field rule (for real-time validation)
  validateFieldRuleForm(rule: Partial<MapperFieldRule>): ValidationResult {
    const errors: ValidationError[] = [];

    if (!rule.json_path || rule.json_path.trim() === '') {
      errors.push({ field: 'json_path', message: 'JSON path is required' });
    } else {
      const pathError = this.validateJsonPath(rule.json_path);
      if (pathError) {
        errors.push({ field: 'json_path', message: pathError });
      }
    }

    if (!rule.target_field || rule.target_field.trim() === '') {
      errors.push({ field: 'target_field', message: 'Target field is required' });
    }

    if (rule.condition_expression) {
      const exprError = this.validateConditionExpression(rule.condition_expression);
      if (exprError) {
        errors.push({ field: 'condition_expression', message: exprError });
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}
