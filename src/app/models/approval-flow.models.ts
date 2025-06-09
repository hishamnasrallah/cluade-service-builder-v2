// models/approval-flow.models.ts - Approval Flow specific models
export interface ApprovalFlowElement {
  id: string;
  type: ApprovalElementType;
  position: Position;
  properties: ApprovalElementProperties;
  connections: ApprovalConnection[];
}

export enum ApprovalElementType {
  START = 'start',
  APPROVAL_STEP = 'approval_step',
  ACTION_STEP = 'action_step',
  CONDITION_STEP = 'condition_step',
  PARALLEL_GROUP = 'parallel_group',
  END = 'end'
}

export interface Position {
  x: number;
  y: number;
}

export interface ApprovalConnection {
  id: string;
  sourceId: string;
  targetId: string;
  sourcePort?: string;
  targetPort?: string;
  actionId?: string; // For action-based connections
}

export interface ApprovalElementProperties {
  [key: string]: any;
  name?: string;
  description?: string;

  // ApprovalStep properties
  service_type?: number;
  seq?: number;
  step_type?: StepType;
  status?: number;
  group?: number;
  required_approvals?: number;
  priority_approver_groups?: number[];
  active_ind?: boolean;

  // ActionStep properties
  approval_step?: number;
  action?: number;
  to_status?: number;
  sub_status?: number;

  // ApprovalStepCondition properties
  type?: ConditionType;
  condition_logic?: ConditionLogic[];

  // ParallelApprovalGroup properties
  parallel_groups?: number[];

  // Action properties (for reference)
  action_name?: string;
  action_code?: string;
  action_groups?: number[];
  action_services?: number[];
}

export enum StepType {
  AUTO = 1,
  ACTION_BASED = 2
}

export enum ConditionType {
  CONDITION = 1,
  AUTO_ACTION = 2
}

export interface ConditionLogic {
  field: string;
  operation: string;
  value: any;
  logical_operator?: 'and' | 'or';
}

export interface ApprovalFlowData {
  id?: string;
  name: string;
  service_type?: number;
  description?: string;
  elements: ApprovalFlowElement[];
  connections: ApprovalConnection[];
  metadata?: {
    created_at?: string;
    updated_at?: string;
    version?: string;
    service_code?: string;
  };
}

// API Response Models
export interface Action {
  id: number;
  name: string;
  name_ara: string;
  groups: Group[];
  services: Service[];
  code?: string;
  active_ind: boolean;
}

export interface ApprovalStep {
  id: number;
  service_type: number;
  seq: number;
  step_type: StepType;
  status: number;
  group: number;
  required_approvals?: number;
  priority_approver_groups: Group[];
  active_ind: boolean;
  actions: ActionStep[];
  parallel_approval_groups: ParallelApprovalGroup[];
  approvalstepcondition_set: ApprovalStepCondition[];
}

export interface ActionStep {
  id: number;
  approval_step: number;
  action: Action;
  to_status: Status;
  sub_status?: Status;
  active_ind: boolean;
}

export interface ApprovalStepCondition {
  id: number;
  approval_step: number;
  type: ConditionType;
  condition_logic: ConditionLogic[];
  to_status?: Status;
  sub_status?: Status;
  active_ind: boolean;
}

export interface ParallelApprovalGroup {
  id: number;
  approval_step: number;
  group: Group;
}

export interface Group {
  id: number;
  name: string;
}

export interface Service {
  id: number;
  name: string;
  name_ara: string;
  code: string;
  icon?: string;
  active_ind: boolean;
}

export interface Status {
  id: number;
  name: string;
  name_ara: string;
  code?: string;
  active_ind: boolean;
}

export interface MasterStepResponse {
  count: number;
  results: MasterStepData[];
}

export interface MasterStepData {
  service: Service;
  steps: ApprovalStep[];
}

// Element Type Configurations
export interface ApprovalElementTypeConfig {
  type: ApprovalElementType;
  name: string;
  icon: string;
  color: string;
  canReceiveConnections: boolean;
  canSendConnections: boolean;
  maxInstances?: number;
  description: string;
}

export const APPROVAL_ELEMENT_CONFIGS: ApprovalElementTypeConfig[] = [
  {
    type: ApprovalElementType.START,
    name: 'Start',
    icon: 'play_circle',
    color: '#4CAF50',
    canReceiveConnections: false,
    canSendConnections: true,
    maxInstances: 1,
    description: 'Starting point of the approval flow'
  },
  {
    type: ApprovalElementType.APPROVAL_STEP,
    name: 'Approval Step',
    icon: 'approval',
    color: '#2196F3',
    canReceiveConnections: true,
    canSendConnections: true,
    description: 'Main approval step with actions and conditions'
  },
  {
    type: ApprovalElementType.ACTION_STEP,
    name: 'Action Step',
    icon: 'play_arrow',
    color: '#FF9800',
    canReceiveConnections: true,
    canSendConnections: true,
    description: 'Specific action within an approval step'
  },
  {
    type: ApprovalElementType.CONDITION_STEP,
    name: 'Condition',
    icon: 'help',
    color: '#FF5722',
    canReceiveConnections: true,
    canSendConnections: true,
    description: 'Conditional logic and automatic actions'
  },
  {
    type: ApprovalElementType.PARALLEL_GROUP,
    name: 'Parallel Group',
    icon: 'account_tree',
    color: '#9C27B0',
    canReceiveConnections: true,
    canSendConnections: true,
    description: 'Parallel approval group for concurrent approvals'
  },
  {
    type: ApprovalElementType.END,
    name: 'End',
    icon: 'stop_circle',
    color: '#F44336',
    canReceiveConnections: true,
    canSendConnections: false,
    description: 'End point of the approval flow'
  }
];

// Validation Rules
export interface ApprovalValidationRule {
  type: 'required' | 'pattern' | 'range' | 'custom';
  message: string;
  value?: any;
  validator?: (element: ApprovalFlowElement) => boolean;
}

export const APPROVAL_ELEMENT_VALIDATION_RULES: { [key: string]: ApprovalValidationRule[] } = {
  [ApprovalElementType.START]: [
    { type: 'required', message: 'Start element must have a name', validator: (el) => !!el.properties.name }
  ],
  [ApprovalElementType.APPROVAL_STEP]: [
    { type: 'required', message: 'Approval step must have a name', validator: (el) => !!el.properties.name },
    { type: 'required', message: 'Approval step must have a service type', validator: (el) => !!el.properties.service_type },
    { type: 'required', message: 'Approval step must have a sequence number', validator: (el) => !!el.properties.seq },
    { type: 'required', message: 'Approval step must have a status', validator: (el) => !!el.properties.status },
    { type: 'required', message: 'Approval step must have a group', validator: (el) => !!el.properties.group }
  ],
  [ApprovalElementType.ACTION_STEP]: [
    { type: 'required', message: 'Action step must have an action', validator: (el) => !!el.properties.action },
    { type: 'required', message: 'Action step must have a target status', validator: (el) => !!el.properties.to_status }
  ],
  [ApprovalElementType.CONDITION_STEP]: [
    { type: 'required', message: 'Condition step must have a name', validator: (el) => !!el.properties.name },
    { type: 'required', message: 'Condition step must have condition logic', validator: (el) => !!el.properties.condition_logic?.length }
  ],
  [ApprovalElementType.PARALLEL_GROUP]: [
    { type: 'required', message: 'Parallel group must have assigned groups', validator: (el) => !!el.properties.parallel_groups?.length }
  ],
  [ApprovalElementType.END]: [
    { type: 'required', message: 'End element must have a name', validator: (el) => !!el.properties.name }
  ]
};

// Helper functions
export function getApprovalElementConfig(type: ApprovalElementType): ApprovalElementTypeConfig | undefined {
  return APPROVAL_ELEMENT_CONFIGS.find(config => config.type === type);
}

export function validateApprovalElement(element: ApprovalFlowElement): string[] {
  const rules = APPROVAL_ELEMENT_VALIDATION_RULES[element.type] || [];
  const errors: string[] = [];

  rules.forEach(rule => {
    if (rule.validator && !rule.validator(element)) {
      errors.push(rule.message);
    }
  });

  return errors;
}

export function getStepTypeName(stepType: StepType): string {
  switch (stepType) {
    case StepType.AUTO:
      return 'Auto';
    case StepType.ACTION_BASED:
      return 'Action Based';
    default:
      return 'Unknown';
  }
}

export function getConditionTypeName(conditionType: ConditionType): string {
  switch (conditionType) {
    case ConditionType.CONDITION:
      return 'Condition';
    case ConditionType.AUTO_ACTION:
      return 'Automatic Action';
    default:
      return 'Unknown';
  }
}
