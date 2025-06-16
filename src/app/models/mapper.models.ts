// src/app/models/mapper.models.ts

export interface CaseMapper {
  id?: number;
  name: string;
  case_type: string;
  version: number;
  parent?: number;
  active_ind: boolean;
}

export interface MapperTarget {
  id?: string;  // UUID
  case_mapper: number;
  name: string;
  model: string;  // "app_label.Model"
  content_type?: number;
  finder_function_path?: string;
  processor_function_path?: string;
  post_processor_path?: string;
  root_path?: string;
  filter_function_path?: string;
  parent_target?: string;  // UUID
  active_ind: boolean;
  field_rules?: MapperFieldRule[];
}

export interface MapperFieldRule {
  id?: number;
  mapper_target: string;  // UUID
  target_field: string;
  json_path: string;
  transform_function_path?: string;
  source_lookup?: number;
  target_lookup?: number;
  default_value?: string;
  condition_expression?: string;
  conditions?: MapperFieldRuleCondition[];
}

export interface MapperFieldRuleCondition {
  id?: number;
  field_rule: number;
  group: string;
  condition_expression?: string;
  condition_path?: string;
  condition_operator?: ConditionOperator;
  condition_value?: string;
}

export type ConditionOperator = '==' | '!=' | '>' | '<' | 'in' | 'not_in';

export interface ModelOption {
  app_label: string;
  model: string;
  display_name?: string;
}

export interface LookupOption {
  id: number;
  code: string;
  label: string;
  values: LookupValue[];
}

export interface LookupValue {
  id: number;
  code: string;
  label: string;
}

export interface TransformFunction {
  path: string;
  label: string;
  description?: string;
}

export interface FilterFunction {
  path: string;
  label: string;
  description?: string;
}

export interface PreviewResult {
  target: string;
  action: string;
  preview_fields?: any;
  preview_list?: any[];
  children?: PreviewResult[];
  error?: string;
  summary?: {
    target_id: string;
    target_name: string;
    record_count: number;
    mapped_fields_count: number;
    child_targets_count: number;
    execution_time_ms: number;
  };
}

export interface SaveMapperRequest {
  case_mapper: CaseMapper;
  targets: MapperTarget[];
}

// Tree node interface for the mapper tree
export interface MapperTreeNode {
  id: string;
  name: string;
  model: string;
  rootPath?: string;
  children: MapperTreeNode[];
  expanded: boolean;
  active: boolean;
  level: number;
  data: MapperTarget;
}

// UI state interfaces
export interface DragDropEvent {
  previousIndex: number;
  currentIndex: number;
  item: MapperTreeNode;
  container: any;
  previousContainer: any;
}

export interface FieldRuleFormData {
  json_path: string;
  target_field: string;
  default_value?: string;
  transform_function_path?: string;
  source_lookup?: number;
  target_lookup?: number;
  condition_expression?: string;
  conditions?: ConditionFormData[];
}

export interface ConditionFormData {
  group: string;
  condition_expression?: string;
  condition_path?: string;
  condition_operator?: ConditionOperator;
  condition_value?: string;
}

// Validation result
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
}
