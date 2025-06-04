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

  // Page properties
  useExisting?: boolean;
  existingPageId?: number;
  service?: number;
  sequence_number?: number;
  applicant_type?: number;
  name_ara?: string;
  description_ara?: string;

  // Category properties
  existingCategoryId?: number;
  code?: string;
  is_repeatable?: boolean;
  fields?: FieldElementProperties[];

  // Field properties
  existingFieldId?: number;
  _field_name?: string;
  _field_display_name?: string;
  _field_display_name_ara?: string;
  _field_type?: number;
  _sequence?: number;
  _mandatory?: boolean;
  _is_hidden?: boolean;
  _is_disabled?: boolean;

  // Field validation properties
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

  // Condition properties
  target_field?: string;
  condition_logic?: ConditionLogic[];

  // End properties
  action?: string;
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

// services/workflow.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
// import { WorkflowData, WorkflowElement, Connection, ElementType, Position } from '../models/workflow.models';
import { v4 as uuidv4 } from 'uuid';

@Injectable({
  providedIn: 'root'
})
export class WorkflowService {
  private workflowSubject = new BehaviorSubject<WorkflowData>({
    name: 'New Workflow',
    elements: [],
    connections: []
  });

  public workflow$ = this.workflowSubject.asObservable();
  private currentWorkflow: WorkflowData;

  constructor() {
    this.currentWorkflow = this.workflowSubject.value;
    this.initializeWithStartElement();
  }

  private initializeWithStartElement(): void {
    if (this.currentWorkflow.elements.length === 0) {
      const startElement: WorkflowElement = {
        id: uuidv4(),
        type: ElementType.START,
        position: { x: 100, y: 100 },
        properties: { name: 'Start' },
        connections: []
      };

      this.currentWorkflow.elements.push(startElement);
      this.updateWorkflow();
    }
  }

  getWorkflow(): WorkflowData {
    return { ...this.currentWorkflow };
  }

  addElement(type: ElementType, position: Position, properties: any = {}): WorkflowElement {
    // Check for maximum instances
    if (type === ElementType.START) {
      const existingStarts = this.currentWorkflow.elements.filter(el => el.type === ElementType.START);
      if (existingStarts.length > 0) {
        throw new Error('Only one start element is allowed');
      }
    }

    const element: WorkflowElement = {
      id: uuidv4(),
      type,
      position,
      properties: { name: type.charAt(0).toUpperCase() + type.slice(1), ...properties },
      connections: []
    };

    this.currentWorkflow.elements.push(element);
    this.updateWorkflow();
    return element;
  }

  updateElement(id: string, updates: Partial<WorkflowElement>): void {
    const elementIndex = this.currentWorkflow.elements.findIndex(el => el.id === id);
    if (elementIndex !== -1) {
      this.currentWorkflow.elements[elementIndex] = {
        ...this.currentWorkflow.elements[elementIndex],
        ...updates
      };
      this.updateWorkflow();
    }
  }

  removeElement(id: string): void {
    // Don't allow removing start element
    const element = this.currentWorkflow.elements.find(el => el.id === id);
    if (element?.type === ElementType.START) {
      throw new Error('Start element cannot be removed');
    }

    // Remove element
    this.currentWorkflow.elements = this.currentWorkflow.elements.filter(el => el.id !== id);

    // Remove connections involving this element
    this.currentWorkflow.connections = this.currentWorkflow.connections.filter(
      conn => conn.sourceId !== id && conn.targetId !== id
    );

    this.updateWorkflow();
  }

  addConnection(sourceId: string, targetId: string): Connection {
    // Validate connection rules
    const sourceElement = this.currentWorkflow.elements.find(el => el.id === sourceId);
    const targetElement = this.currentWorkflow.elements.find(el => el.id === targetId);

    if (!sourceElement || !targetElement) {
      throw new Error('Invalid connection: source or target element not found');
    }

    if (sourceElement.type === ElementType.END) {
      throw new Error('End elements cannot send connections');
    }

    if (targetElement.type === ElementType.START) {
      throw new Error('Start elements cannot receive connections');
    }

    // Check if connection already exists
    const existingConnection = this.currentWorkflow.connections.find(
      conn => conn.sourceId === sourceId && conn.targetId === targetId
    );

    if (existingConnection) {
      throw new Error('Connection already exists');
    }

    const connection: Connection = {
      id: uuidv4(),
      sourceId,
      targetId
    };

    this.currentWorkflow.connections.push(connection);
    this.updateWorkflow();
    return connection;
  }

  removeConnection(connectionId: string): void {
    this.currentWorkflow.connections = this.currentWorkflow.connections.filter(
      conn => conn.id !== connectionId
    );
    this.updateWorkflow();
  }

  saveWorkflow(): Observable<any> {
    // In a real implementation, this would call an API
    const savedData = JSON.stringify(this.currentWorkflow, null, 2);
    localStorage.setItem('current_workflow', savedData);
    return new Observable(observer => {
      setTimeout(() => {
        observer.next({ success: true, data: this.currentWorkflow });
        observer.complete();
      }, 500);
    });
  }

  loadWorkflow(workflowData?: WorkflowData): void {
    if (workflowData) {
      this.currentWorkflow = { ...workflowData };
    } else {
      // Load from localStorage
      const savedData = localStorage.getItem('current_workflow');
      if (savedData) {
        try {
          this.currentWorkflow = JSON.parse(savedData);
        } catch (error) {
          console.error('Error loading workflow:', error);
          this.resetWorkflow();
        }
      } else {
        this.resetWorkflow();
      }
    }

    this.updateWorkflow();
  }

  resetWorkflow(): void {
    this.currentWorkflow = {
      name: 'New Workflow',
      elements: [],
      connections: []
    };
    this.initializeWithStartElement();
  }

  private updateWorkflow(): void {
    this.workflowSubject.next({ ...this.currentWorkflow });
  }

  validateWorkflow(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check for start element
    const startElements = this.currentWorkflow.elements.filter(el => el.type === ElementType.START);
    if (startElements.length === 0) {
      errors.push('Workflow must have a start element');
    } else if (startElements.length > 1) {
      errors.push('Workflow can only have one start element');
    }

    // Check for end elements
    const endElements = this.currentWorkflow.elements.filter(el => el.type === ElementType.END);
    if (endElements.length === 0) {
      errors.push('Workflow must have at least one end element');
    }

    // Check for orphaned elements (elements with no connections)
    const connectedElements = new Set<string>();
    this.currentWorkflow.connections.forEach(conn => {
      connectedElements.add(conn.sourceId);
      connectedElements.add(conn.targetId);
    });

    const orphanedElements = this.currentWorkflow.elements.filter(
      el => el.type !== ElementType.START && !connectedElements.has(el.id)
    );

    if (orphanedElements.length > 0) {
      errors.push(`Found ${orphanedElements.length} disconnected elements`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}
