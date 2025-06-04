// models/workflow.models.ts
export interface WorkflowElement {
  id: string;
  type: ElementType;
  position: Position;
  properties: ElementProperties;
  connections: Connection[];
}

export enum ElementType {
  START = 'start',
  PAGE = 'page',
  CATEGORY = 'category',
  FIELD = 'field',
  CONDITION = 'condition',
  END = 'end'
}

export interface Position {
  x: number;
  y: number;
}

export interface Connection {
  id: string;
  sourceId: string;
  targetId: string;
  sourcePort?: string;
  targetPort?: string;
}

export interface ElementProperties {
  name?: string;
  description?: string;
  [key: string]: any;
}

export interface StartElementProperties extends ElementProperties {
  name: string;
}

export interface PageElementProperties extends ElementProperties {
  service?: number;
  sequence_number?: number;
  applicant_type?: number;
  name: string;
  name_ara?: string;
  description?: string;
  description_ara?: string;
  useExisting?: boolean;
  existingPageId?: number;
}

export interface CategoryElementProperties extends ElementProperties {
  name: string;
  name_ara?: string;
  description?: string;
  code?: string;
  is_repeatable?: boolean;
  useExisting?: boolean;
  existingCategoryId?: number;
  fields?: FieldElementProperties[];
}

export interface FieldElementProperties extends ElementProperties {
  _field_name: string;
  _field_display_name: string;
  _field_display_name_ara?: string;
  _field_type: number;
  _sequence?: number;
  _mandatory?: boolean;
  _is_hidden?: boolean;
  _is_disabled?: boolean;
  useExisting?: boolean;
  existingFieldId?: number;

  // Validation properties
  _max_length?: number;
  _min_length?: number;
  _regex_pattern?: string;
  _allowed_characters?: string;
  _forbidden_words?: string;
  _value_greater_than?: number;
  _value_less_than?: number;
  _integer_only?: boolean;
  _positive_only?: boolean;
  _date_greater_than?: string;
  _date_less_than?: string;
  _future_only?: boolean;
  _past_only?: boolean;
  _default_boolean?: boolean;
  _file_types?: string;
  _max_file_size?: number;
  _image_max_width?: number;
  _image_max_height?: number;
  _max_selections?: number;
  _min_selections?: number;
  _precision?: number;
  _unique?: boolean;
  _default_value?: string;
  _coordinates_format?: boolean;
  _uuid_format?: boolean;
  _parent_field?: number;
  _lookup?: number;
}

export interface ConditionElementProperties extends ElementProperties {
  target_field?: string;
  condition_logic: ConditionLogic[];
  name: string;
  description?: string;
}

export interface ConditionLogic {
  field: string;
  operation: string;
  value: any;
  logical_operator?: 'and' | 'or';
}

export interface EndElementProperties extends ElementProperties {
  name: string;
  action?: string;
}

export interface WorkflowData {
  id?: string;
  name: string;
  description?: string;
  elements: WorkflowElement[];
  connections: Connection[];
  metadata?: {
    created_at?: string;
    updated_at?: string;
    version?: string;
  };
}

export interface CanvasState {
  zoom: number;
  panX: number;
  panY: number;
  selectedElementId?: string;
}

export interface ElementTypeConfig {
  type: ElementType;
  name: string;
  icon: string;
  color: string;
  canReceiveConnections: boolean;
  canSendConnections: boolean;
  maxInstances?: number;
}

export const ELEMENT_CONFIGS: ElementTypeConfig[] = [
  {
    type: ElementType.START,
    name: 'Start',
    icon: 'play_circle',
    color: '#4CAF50',
    canReceiveConnections: false,
    canSendConnections: true,
    maxInstances: 1
  },
  {
    type: ElementType.PAGE,
    name: 'Page',
    icon: 'description',
    color: '#2196F3',
    canReceiveConnections: true,
    canSendConnections: true
  },
  {
    type: ElementType.CATEGORY,
    name: 'Category',
    icon: 'category',
    color: '#FF9800',
    canReceiveConnections: true,
    canSendConnections: true
  },
  {
    type: ElementType.FIELD,
    name: 'Field',
    icon: 'input',
    color: '#9C27B0',
    canReceiveConnections: true,
    canSendConnections: true
  },
  {
    type: ElementType.CONDITION,
    name: 'Condition',
    icon: 'help',
    color: '#FF5722',
    canReceiveConnections: true,
    canSendConnections: true
  },
  {
    type: ElementType.END,
    name: 'End',
    icon: 'stop_circle',
    color: '#F44336',
    canReceiveConnections: true,
    canSendConnections: false
  }
];
