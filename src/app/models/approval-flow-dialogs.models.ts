// src/app/models/approval-flow-dialogs.models.ts

export interface ApprovalFlowSelectionResult {
  action: 'create' | 'load';
  serviceCode?: string;
  serviceName?: string;
}

export interface ActionDialogData {
  action?: any; // Action from approval-flow.models
  mode: 'create' | 'edit';
}

export interface ActionDialogResult {
  action: any; // Action from approval-flow.models
  mode: 'create' | 'edit';
}

// Add other dialog interfaces as needed
export interface FlowValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

export interface CanvasInteractionEvent {
  type: 'element' | 'connection' | 'canvas';
  action: 'select' | 'create' | 'update' | 'delete';
  data?: any;
}
