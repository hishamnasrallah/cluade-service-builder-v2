// src/app/services/mapper-state.service.ts
import { v4 as uuidv4 } from 'uuid';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, combineLatest } from 'rxjs';
import { map, distinctUntilChanged } from 'rxjs/operators';
import {
  CaseMapper,
  MapperTarget,
  MapperFieldRule,
  MapperTreeNode,
  ModelOption,
  LookupOption,
  TransformFunction,
  FilterFunction,
  PreviewResult
} from '../models/mapper.models';

export interface MapperState {
  currentMapper?: CaseMapper;
  targets: MapperTarget[];
  selectedTargetId?: string;
  isDirty: boolean;
  availableModels: ModelOption[];
  availableLookups: LookupOption[];
  availableTransforms: TransformFunction[];
  availableFilters: FilterFunction[];
  previewResult?: PreviewResult;
  loading: boolean;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class MapperStateService {
  private state$ = new BehaviorSubject<MapperState>({
    targets: [],
    isDirty: false,
    availableModels: [],
    availableLookups: [],
    availableTransforms: [],
    availableFilters: [],
    loading: false
  });

  // Selectors
  getState$ = () => this.state$.asObservable();

  getTargets$ = () => this.state$.pipe(
    map(state => state.targets),
    distinctUntilChanged()
  );

  getSelectedTarget$ = () => this.state$.pipe(
    map(state => state.targets.find(t => t.id === state.selectedTargetId)),
    distinctUntilChanged()
  );

  getTargetHierarchy$ = () => this.state$.pipe(
    map(state => this.buildHierarchy(state.targets)),
    distinctUntilChanged()
  );

  getAvailableModels$ = () => this.state$.pipe(
    map(state => state.availableModels),
    distinctUntilChanged()
  );

  getAvailableLookups$ = () => this.state$.pipe(
    map(state => state.availableLookups),
    distinctUntilChanged()
  );

  getAvailableTransforms$ = () => this.state$.pipe(
    map(state => state.availableTransforms),
    distinctUntilChanged()
  );

  getAvailableFilters$ = () => this.state$.pipe(
    map(state => state.availableFilters),
    distinctUntilChanged()
  );

  getCurrentMapper$ = () => this.state$.pipe(
    map(state => state.currentMapper),
    distinctUntilChanged()
  );

  getPreviewResult$ = () => this.state$.pipe(
    map(state => state.previewResult),
    distinctUntilChanged()
  );

  isLoading$ = () => this.state$.pipe(
    map(state => state.loading),
    distinctUntilChanged()
  );

  isDirty$ = () => this.state$.pipe(
    map(state => state.isDirty),
    distinctUntilChanged()
  );

  // Actions
  loadMapper(mapper: CaseMapper, targets: MapperTarget[]): void {
    this.updateState({
      currentMapper: mapper,
      targets: targets,
      isDirty: false,
      selectedTargetId: targets.length > 0 ? targets[0].id : undefined
    });
  }

  createNewMapper(caseType: string): void {
    const newMapper: CaseMapper = {
      name: `New ${caseType} Mapper`,
      case_type: caseType,
      version: 1,
      active_ind: true
    };

    this.updateState({
      currentMapper: newMapper,
      targets: [],
      isDirty: false,
      selectedTargetId: undefined
    });
  }

  setReferenceData(data: {
    models?: ModelOption[];
    lookups?: LookupOption[];
    transforms?: TransformFunction[];
    filters?: FilterFunction[];
  }): void {
    this.updateState({
      availableModels: data.models || this.state$.value.availableModels,
      availableLookups: data.lookups || this.state$.value.availableLookups,
      availableTransforms: data.transforms || this.state$.value.availableTransforms,
      availableFilters: data.filters || this.state$.value.availableFilters
    });
  }

  addTarget(target: Partial<MapperTarget>): void {
    const newTarget: MapperTarget = {
      id: uuidv4(),  // Use the real uuid
      name: target.name || 'New Target',
      model: target.model || '',
      case_mapper: this.state$.value.currentMapper?.id || 0,
      active_ind: true,
      field_rules: [],
      ...target
    };

    const targets = [...this.state$.value.targets, newTarget];
    this.updateState({
      targets,
      selectedTargetId: newTarget.id,
      isDirty: true
    });
  }

  updateTarget(targetId: string, updates: Partial<MapperTarget>): void {
    const targets = this.state$.value.targets.map(t =>
      t.id === targetId ? { ...t, ...updates } : t
    );
    this.updateState({ targets, isDirty: true });
  }

  deleteTarget(targetId: string): void {
    const targets = this.state$.value.targets.filter(t => t.id !== targetId);
    const selectedTargetId = this.state$.value.selectedTargetId === targetId
      ? targets.length > 0 ? targets[0].id : undefined
      : this.state$.value.selectedTargetId;

    this.updateState({ targets, selectedTargetId, isDirty: true });
  }

  selectTarget(targetId: string): void {
    this.updateState({ selectedTargetId: targetId });
  }

  addFieldRule(targetId: string, rule: Partial<MapperFieldRule>): void {
    const targets = this.state$.value.targets.map(t => {
      if (t.id === targetId) {
        const newRule: MapperFieldRule = {
          id: Date.now(), // Temporary ID
          mapper_target: targetId,
          target_field: rule.target_field || '',
          json_path: rule.json_path || '',
          ...rule
        };
        return {
          ...t,
          field_rules: [...(t.field_rules || []), newRule]
        };
      }
      return t;
    });

    this.updateState({ targets, isDirty: true });
  }

  updateFieldRule(targetId: string, ruleId: number, updates: Partial<MapperFieldRule>): void {
    const targets = this.state$.value.targets.map(t => {
      if (t.id === targetId) {
        return {
          ...t,
          field_rules: (t.field_rules || []).map(r =>
            r.id === ruleId ? { ...r, ...updates } : r
          )
        };
      }
      return t;
    });

    this.updateState({ targets, isDirty: true });
  }

  deleteFieldRule(targetId: string, ruleId: number): void {
    const targets = this.state$.value.targets.map(t => {
      if (t.id === targetId) {
        return {
          ...t,
          field_rules: (t.field_rules || []).filter(r => r.id !== ruleId)
        };
      }
      return t;
    });

    this.updateState({ targets, isDirty: true });
  }

  moveTarget(targetId: string, newParentId?: string): void {
    const targets = this.state$.value.targets.map(t =>
      t.id === targetId ? { ...t, parent_target: newParentId } : t
    );
    this.updateState({ targets, isDirty: true });
  }

  setPreviewResult(result: PreviewResult | undefined): void {
    this.updateState({ previewResult: result });
  }

  setLoading(loading: boolean): void {
    this.updateState({ loading });
  }

  setError(error: string | undefined): void {
    this.updateState({ error });
  }

  resetDirtyState(): void {
    this.updateState({ isDirty: false });
  }

  // Helper methods
  private updateState(partial: Partial<MapperState>): void {
    this.state$.next({ ...this.state$.value, ...partial });
  }

  private buildHierarchy(targets: MapperTarget[]): MapperTreeNode[] {
    const nodeMap = new Map<string, MapperTreeNode>();
    const rootNodes: MapperTreeNode[] = [];

    // First pass: create all nodes
    targets.forEach(target => {
      nodeMap.set(target.id!, {
        id: target.id!,
        name: target.name,
        model: target.model,
        rootPath: target.root_path,
        children: [],
        expanded: true,
        active: target.active_ind,
        level: 0,
        data: target
      });
    });

    // Second pass: build hierarchy
    targets.forEach(target => {
      const node = nodeMap.get(target.id!)!;
      if (target.parent_target) {
        const parent = nodeMap.get(target.parent_target);
        if (parent) {
          parent.children.push(node);
          node.level = parent.level + 1;
        } else {
          rootNodes.push(node);
        }
      } else {
        rootNodes.push(node);
      }
    });

    return this.sortNodes(rootNodes);
  }

  private sortNodes(nodes: MapperTreeNode[]): MapperTreeNode[] {
    return nodes.sort((a, b) => a.name.localeCompare(b.name)).map(node => ({
      ...node,
      children: this.sortNodes(node.children)
    }));
  }

  // Generate a unique ID for new targets
  generateTargetId(): string {
    return uuidv4();  // Use the real uuid
  }

  // Validate the current state
  validateState(): string[] {
    const errors: string[] = [];
    const state = this.state$.value;

    if (!state.currentMapper) {
      errors.push('No mapper configuration loaded');
    }

    if (state.targets.length === 0) {
      errors.push('At least one target is required');
    }

    state.targets.forEach(target => {
      if (!target.model) {
        errors.push(`Target "${target.name}" must have a model selected`);
      }

      if (target.field_rules && target.field_rules.length === 0) {
        errors.push(`Target "${target.name}" has no field rules defined`);
      }

      target.field_rules?.forEach(rule => {
        if (!rule.json_path) {
          errors.push(`Field rule in "${target.name}" must have a JSON path`);
        }
        if (!rule.target_field) {
          errors.push(`Field rule in "${target.name}" must have a target field`);
        }
      });
    });

    return errors;
  }

  getCurrentState(): MapperState {
    return this.state$.value;
  }
}
