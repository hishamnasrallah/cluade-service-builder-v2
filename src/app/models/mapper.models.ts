// src/app/models/mapper.models.ts

export interface CaseMapper {
  id?: number;
  name: string;
  case_type: string;
  version: number;
  parent?: number;
  active_ind: boolean;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
  updated_by?: string;
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
  created_at?: string;
  updated_at?: string;
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
  created_at?: string;
  updated_at?: string;
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

export type ConditionOperator = '==' | '!=' | '>' | '<' | '>=' | '<=' | 'in' | 'not in';

// New interfaces for missing features
export interface MapperExecutionLog {
  id: number;
  case: number;
  mapper_target: string;
  executed_at: string;
  executed_by?: string;
  success: boolean;
  result_data: any;
  error_trace?: string;
  execution_time_ms?: number;
  records_created?: number;
  records_updated?: number;
}

export interface MapperFieldRuleLog {
  id: number;
  rule: number;
  user: string;
  timestamp: string;
  action: 'create' | 'update' | 'delete';
  old_data?: any;
  new_data?: any;
  changes?: string[];
}

export interface ModelField {
  name: string;
  type: string;
  required: boolean;
  max_length?: number;
  choices?: Array<{value: any, display: string}>;
  help_text?: string;
  default?: any;
  related_model?: string;
}

export interface MapperVersion {
  id: number;
  mapper_id: number;
  version: number;
  name: string;
  created_at: string;
  created_by: string;
  changes_summary?: string;
  parent_version?: number;
  is_active: boolean;
}

export interface TestResult {
  field_rule_id: number;
  input_value: any;
  output_value: any;
  success: boolean;
  error?: string;
  execution_time_ms: number;
  condition_matched?: boolean;
  transform_applied?: boolean;
}

export interface BatchOperationRequest {
  operation: 'create' | 'update' | 'delete';
  target_ids: string[];
  data?: any;
}

export interface JSONPathSuggestion {
  path: string;
  type: string;
  sample_value?: any;
  frequency?: number;
}

// Extended interfaces
export interface ModelOption {
  app_label: string;
  model: string;
  display_name?: string;
  fields?: ModelField[];
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
  parameters?: Array<{
    name: string;
    type: string;
    required: boolean;
    default?: any;
  }>;
  example?: string;
}

export interface FilterFunction {
  path: string;
  label: string;
  description?: string;
  example?: string;
}

export interface ProcessorFunction {
  path: string;
  label: string;
  description?: string;
  type: 'finder' | 'processor' | 'post_processor';
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
  field_mappings?: Array<{
    source_path: string;
    target_field: string;
    source_value: any;
    mapped_value: any;
    transform_applied?: string;
    condition_matched?: boolean;
  }>;
}

export interface SaveMapperRequest {
  case_mapper: CaseMapper;
  targets: MapperTarget[];
  create_version?: boolean;
  version_notes?: string;
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
  hasErrors?: boolean;
  fieldRuleCount?: number;
}

// UI state interfaces
export interface DragDropEvent {
  previousIndex: number;
  currentIndex: number;
  item: MapperTreeNode;
  container: any;
  previousContainer: any;
  targetParentId?: string;
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
  warnings?: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  severity?: 'error' | 'warning' | 'info';
}

export interface ValidationWarning {
  field: string;
  message: string;
}

// Keyboard shortcuts
export interface KeyboardShortcut {
  key: string;
  modifiers?: string[];
  description: string;
  action: () => void;
  enabled?: boolean;
}

// State management
export interface UndoableAction {
  type: string;
  timestamp: Date;
  description: string;
  undo: () => void;
  redo: () => void;
}

// Export/Import formats
export interface MapperExportData {
  version: string;
  exported_at: string;
  exported_by?: string;
  mapper: CaseMapper;
  targets: MapperTarget[];
  metadata?: {
    total_rules: number;
    total_targets: number;
    dependencies?: string[];
  };
}
