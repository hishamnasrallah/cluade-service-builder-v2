// models/workflow.models.ts - Fixed duplicate properties and index signature
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
  [key: string]: any; // Add index signature to allow string indexing
  name?: string;
  description?: string;

  // Page properties
  useExisting?: boolean;
  existingPageId?: number;
  service?: number | string;
  sequence_number?: number | string;
  applicant_type?: number;
  name_ara?: string;
  description_ara?: string;
  page_id?: number;
  is_hidden_page?: boolean;

  // Category properties
  existingCategoryId?: number;
  category_id?: number;
  code?: string;
  is_repeatable?: boolean;
  fields?: FieldElementProperties[];

  // Field properties (using underscore prefix to match API)
  existingFieldId?: number;
  _field_id?: number;
  _field_name?: string;
  _field_display_name?: string;
  _field_display_name_ara?: string;
  _field_type?: number | string;
  _sequence?: number;
  _mandatory?: boolean;
  _is_hidden?: boolean;
  _is_disabled?: boolean;
  _lookup?: number;

  // Field validation properties (matching API structure)
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
  service?: number | string;
  sequence_number?: number | string;
  applicant_type?: number;
  name: string;
  name_ara?: string;
  description?: string;
  description_ara?: string;
  useExisting?: boolean;
  existingPageId?: number;
  page_id?: number;
  is_hidden_page?: boolean;
}

export interface CategoryElementProperties extends ElementProperties {
  name: string;
  name_ara?: string;
  description?: string;
  code?: string;
  is_repeatable?: boolean;
  useExisting?: boolean;
  existingCategoryId?: number;
  category_id?: number;
  fields?: FieldElementProperties[];
}

export interface FieldElementProperties extends ElementProperties {
  _field_name: string;
  _field_display_name: string;
  _field_display_name_ara?: string;
  _field_type: number | string;
  _field_id?: number;
  _sequence?: number;
  _mandatory?: boolean;
  _is_hidden?: boolean;
  _is_disabled?: boolean;
  _lookup?: number;
  useExisting?: boolean;
  existingFieldId?: number;

  // Validation properties (matching API structure exactly)
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
    service_code?: string;
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

// Field types mapping based on the API response
export const FIELD_TYPE_MAPPING: { [key: string]: string } = {
  'text': 'Text',
  'textarea': 'Textarea',
  'number': 'Number',
  'decimal': 'Decimal',
  'percentage': 'Percentage',
  'boolean': 'Boolean',
  'choice': 'Choice/Select',
  'file': 'File Upload',
  'date': 'Date',
  'datetime': 'Date & Time',
  'email': 'Email',
  'url': 'URL',
  'phone': 'Phone Number',
  'password': 'Password',
  'hidden': 'Hidden',
  'readonly': 'Read Only',
  'lookup': 'Lookup',
  'multi_choice': 'Multiple Choice',
  'radio': 'Radio Button',
  'checkbox': 'Checkbox',
  'range': 'Range Slider',
  'color': 'Color Picker',
  'coordinates': 'Coordinates',
  'uuid': 'UUID',
  'json': 'JSON'
};

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

// Helper function to get field type display name
export function getFieldTypeDisplayName(fieldType: string | number): string {
  const typeStr = typeof fieldType === 'number' ? fieldType.toString() : fieldType;
  return FIELD_TYPE_MAPPING[typeStr] || `Type ${typeStr}`;
}

// Helper function to validate field type
export function isValidFieldType(fieldType: string | number): boolean {
  const typeStr = typeof fieldType === 'number' ? fieldType.toString() : fieldType;
  return typeStr in FIELD_TYPE_MAPPING;
}

// Operation types for conditions (based on the API response)
export const CONDITION_OPERATIONS = [
  { value: '=', label: 'Equals (=)', group: 'Comparison' },
  { value: '!=', label: 'Not Equals (≠)', group: 'Comparison' },
  { value: '>', label: 'Greater Than (>)', group: 'Comparison' },
  { value: '<', label: 'Less Than (<)', group: 'Comparison' },
  { value: '>=', label: 'Greater Than or Equal (≥)', group: 'Comparison' },
  { value: '<=', label: 'Less Than or Equal (≤)', group: 'Comparison' },
  { value: 'contains', label: 'Contains', group: 'Text' },
  { value: 'startswith', label: 'Starts With', group: 'Text' },
  { value: 'endswith', label: 'Ends With', group: 'Text' },
  { value: 'matches', label: 'Matches Regex', group: 'Text' },
  { value: 'in', label: 'In List', group: 'Set' },
  { value: 'not in', label: 'Not In List', group: 'Set' },
  { value: '+', label: 'Add (+)', group: 'Math' },
  { value: '-', label: 'Subtract (-)', group: 'Math' },
  { value: '*', label: 'Multiply (×)', group: 'Math' },
  { value: '/', label: 'Divide (÷)', group: 'Math' },
  { value: '**', label: 'Power (^)', group: 'Math' }
];

// Workflow validation rules
export interface ValidationRule {
  type: 'required' | 'pattern' | 'range' | 'custom';
  message: string;
  value?: any;
  validator?: (element: WorkflowElement) => boolean;
}

export const ELEMENT_VALIDATION_RULES: { [key: string]: ValidationRule[] } = {
  [ElementType.START]: [
    { type: 'required', message: 'Start element must have a name', validator: (el) => !!el.properties.name }
  ],
  [ElementType.PAGE]: [
    { type: 'required', message: 'Page must have a name', validator: (el) => !!el.properties.name },
    { type: 'required', message: 'Page must have a sequence number', validator: (el) => !!el.properties.sequence_number }
  ],
  [ElementType.CATEGORY]: [
    { type: 'required', message: 'Category must have a name', validator: (el) => !!el.properties.name }
  ],
  [ElementType.FIELD]: [
    { type: 'required', message: 'Field must have a name', validator: (el) => !!el.properties._field_name },
    { type: 'required', message: 'Field must have a display name', validator: (el) => !!el.properties._field_display_name },
    { type: 'required', message: 'Field must have a type', validator: (el) => !!el.properties._field_type }
  ],
  [ElementType.CONDITION]: [
    { type: 'required', message: 'Condition must have a name', validator: (el) => !!el.properties.name },
    { type: 'required', message: 'Condition must have logic', validator: (el) => !!el.properties.condition_logic?.length }
  ],
  [ElementType.END]: [
    { type: 'required', message: 'End element must have a name', validator: (el) => !!el.properties.name }
  ]
};

// services/workflow.service.ts - Included in models file as per original structure
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
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
  private currentServiceCode?: string; // Track the current service code

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

  getCurrentServiceCode(): string | undefined {
    return this.currentServiceCode;
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

  // Load service flow data and convert to workflow
  loadServiceFlow(serviceFlowData: any, serviceCode: string): void {
    this.currentServiceCode = serviceCode;

    const workflowData: WorkflowData = {
      name: `Service Flow - ${serviceCode}`,
      description: `Service flow for service ${serviceCode}`,
      elements: [],
      connections: [],
      metadata: {
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        version: '1.0',
        service_code: serviceCode
      }
    };

    // Convert service flow data to workflow elements
    this.convertServiceFlowToElements(serviceFlowData, workflowData);

    this.currentWorkflow = workflowData;
    this.updateWorkflow();
  }

  private convertServiceFlowToElements(serviceFlowData: any, workflowData: WorkflowData): void {
    // Add start element
    workflowData.elements.push({
      id: 'start',
      type: ElementType.START,
      position: { x: 100, y: 100 },
      properties: { name: 'Start' },
      connections: []
    });

    let previousElementId = 'start';
    let yPosition = 100;

    // Convert pages to workflow elements
    if (serviceFlowData.pages && Array.isArray(serviceFlowData.pages)) {
      serviceFlowData.pages.forEach((page: any, pageIndex: number) => {
        const pageElementId = `page-${page.page_id || pageIndex}`;
        yPosition += 200;

        // Add page element
        workflowData.elements.push({
          id: pageElementId,
          type: ElementType.PAGE,
          position: { x: 100, y: yPosition },
          properties: {
            name: page.name || `Page ${pageIndex + 1}`,
            name_ara: page.name_ara,
            description: page.description,
            description_ara: page.description_ara,
            sequence_number: page.sequence_number,
            page_id: page.page_id,
            is_hidden_page: page.is_hidden_page || false
          },
          connections: []
        });

        // Connect to previous element
        workflowData.connections.push({
          id: `conn-${previousElementId}-${pageElementId}`,
          sourceId: previousElementId,
          targetId: pageElementId
        });

        let xPosition = 300;

        // Convert categories to workflow elements
        if (page.categories && Array.isArray(page.categories)) {
          page.categories.forEach((category: any, categoryIndex: number) => {
            const categoryElementId = `category-${category.id || categoryIndex}`;

            workflowData.elements.push({
              id: categoryElementId,
              type: ElementType.CATEGORY,
              position: { x: xPosition, y: yPosition },
              properties: {
                name: category.name || `Category ${categoryIndex + 1}`,
                name_ara: category.name_ara,
                category_id: category.id,
                is_repeatable: category.repeatable || false
              },
              connections: []
            });

            // Connect category to page
            workflowData.connections.push({
              id: `conn-${pageElementId}-${categoryElementId}`,
              sourceId: pageElementId,
              targetId: categoryElementId
            });

            let fieldYPosition = yPosition + 50;

            // Convert fields to workflow elements
            if (category.fields && Array.isArray(category.fields)) {
              category.fields.forEach((field: any, fieldIndex: number) => {
                const fieldElementId = `field-${field.field_id || fieldIndex}`;
                fieldYPosition += 100;

                const fieldProperties: ElementProperties = {
                  name: field.display_name || field.name || `Field ${fieldIndex + 1}`,
                  _field_name: field.name,
                  _field_display_name: field.display_name,
                  _field_display_name_ara: field.display_name_ara,
                  _field_type: field.field_type,
                  _field_id: field.field_id,
                  _mandatory: field.mandatory || false,
                  _is_hidden: field.is_hidden || false,
                  _is_disabled: field.is_disabled || false,
                  _lookup: field.lookup
                };

                // Add validation properties with explicit key checking
                const validationKeys = [
                  'max_length', 'min_length', 'regex_pattern', 'allowed_characters',
                  'forbidden_words', 'value_greater_than', 'value_less_than',
                  'integer_only', 'positive_only', 'precision', 'default_boolean',
                  'file_types', 'max_file_size', 'image_max_width', 'image_max_height',
                  'max_selections', 'min_selections'
                ];

                validationKeys.forEach(key => {
                  const apiKey = `_${key}`;
                  if (field[key] !== undefined && field[key] !== null) {
                    fieldProperties[apiKey] = field[key];
                  }
                });

                workflowData.elements.push({
                  id: fieldElementId,
                  type: ElementType.FIELD,
                  position: { x: xPosition + 200, y: fieldYPosition },
                  properties: fieldProperties,
                  connections: []
                });

                // Connect field to category
                workflowData.connections.push({
                  id: `conn-${categoryElementId}-${fieldElementId}`,
                  sourceId: categoryElementId,
                  targetId: fieldElementId
                });

                // Add visibility conditions as condition elements
                if (field.visibility_conditions && Array.isArray(field.visibility_conditions)) {
                  field.visibility_conditions.forEach((condition: any, conditionIndex: number) => {
                    const conditionElementId = `condition-${field.field_id || fieldIndex}-${conditionIndex}`;

                    workflowData.elements.push({
                      id: conditionElementId,
                      type: ElementType.CONDITION,
                      position: { x: xPosition + 400, y: fieldYPosition + (conditionIndex * 80) },
                      properties: {
                        name: `Visibility Condition for ${field.display_name || field.name}`,
                        target_field: field.name,
                        condition_logic: condition.condition_logic || []
                      },
                      connections: []
                    });

                    // Connect condition to field
                    workflowData.connections.push({
                      id: `conn-${fieldElementId}-${conditionElementId}`,
                      sourceId: fieldElementId,
                      targetId: conditionElementId
                    });
                  });
                }
              });
            }

            xPosition += 300;
          });
        }

        previousElementId = pageElementId;
      });
    }

    // Add end element
    const endElementId = 'end';
    yPosition += 200;

    workflowData.elements.push({
      id: endElementId,
      type: ElementType.END,
      position: { x: 100, y: yPosition },
      properties: {
        name: 'End',
        action: 'submit'
      },
      connections: []
    });

    // Connect last page to end
    if (previousElementId !== 'start') {
      workflowData.connections.push({
        id: `conn-${previousElementId}-${endElementId}`,
        sourceId: previousElementId,
        targetId: endElementId
      });
    }
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
      this.currentServiceCode = workflowData.metadata?.service_code;
    } else {
      // Load from localStorage
      const savedData = localStorage.getItem('current_workflow');
      if (savedData) {
        try {
          this.currentWorkflow = JSON.parse(savedData);
          this.currentServiceCode = this.currentWorkflow.metadata?.service_code;
        } catch (error) {
          console.error('Error loading workflow:', error);
          this.resetWorkflow();
        }
      } else {
        this.resetWorkflow();
      }
    }

    // Ensure we have a start element
    if (!this.currentWorkflow.elements.some(el => el.type === ElementType.START)) {
      this.addStartElementToWorkflow(this.currentWorkflow);
    }

    this.updateWorkflow();
  }

  resetWorkflow(): void {
    this.currentWorkflow = {
      name: 'New Workflow',
      elements: [],
      connections: []
    };
    this.currentServiceCode = undefined;
    this.initializeWithStartElement();
  }

  // Create a new workflow with a specific name
  createNewWorkflow(name: string = 'New Workflow'): void {
    this.currentWorkflow = {
      name,
      elements: [],
      connections: []
    };
    this.currentServiceCode = undefined;
    this.initializeWithStartElement();
  }

  // Auto-organize elements for better visual layout
  autoOrganizeElements(): void {
    const elements = this.currentWorkflow.elements;

    // Sort elements by type hierarchy: start -> pages -> categories -> fields -> conditions -> end
    const typeOrder = {
      [ElementType.START]: 0,
      [ElementType.PAGE]: 1,
      [ElementType.CATEGORY]: 2,
      [ElementType.FIELD]: 3,
      [ElementType.CONDITION]: 4,
      [ElementType.END]: 5
    };

    // Group elements by level
    const levels: { [level: number]: WorkflowElement[] } = {};

    elements.forEach(element => {
      const level = typeOrder[element.type] || 0;
      if (!levels[level]) levels[level] = [];
      levels[level].push(element);
    });

    // Position elements in a hierarchical layout
    let yPosition = 100;
    const levelSpacing = 300;
    const elementSpacing = 250;

    Object.keys(levels).sort((a, b) => Number(a) - Number(b)).forEach(levelKey => {
      const level = Number(levelKey);
      const levelElements = levels[level];

      let xPosition = 100;

      levelElements.forEach((element, index) => {
        element.position = {
          x: xPosition + (index * elementSpacing),
          y: yPosition
        };
      });

      yPosition += levelSpacing;
    });

    this.updateWorkflow();
  }

  private addStartElementToWorkflow(workflow: WorkflowData): void {
    const startElement: WorkflowElement = {
      id: uuidv4(),
      type: ElementType.START,
      position: { x: 100, y: 100 },
      properties: { name: 'Start' },
      connections: []
    };
    workflow.elements.unshift(startElement);
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

    // Service flow specific validations
    if (this.currentServiceCode) {
      // Check that pages have sequence numbers
      const pageElements = this.currentWorkflow.elements.filter(el => el.type === ElementType.PAGE);
      const pagesWithoutSequence = pageElements.filter(el => !el.properties.sequence_number);
      if (pagesWithoutSequence.length > 0) {
        errors.push(`${pagesWithoutSequence.length} pages are missing sequence numbers`);
      }

      // Check that fields have proper field types
      const fieldElements = this.currentWorkflow.elements.filter(el => el.type === ElementType.FIELD);
      const fieldsWithoutType = fieldElements.filter(el => !el.properties._field_type);
      if (fieldsWithoutType.length > 0) {
        errors.push(`${fieldsWithoutType.length} fields are missing field types`);
      }
    }

    // Validate individual elements using validation rules
    this.currentWorkflow.elements.forEach(element => {
      const rules = ELEMENT_VALIDATION_RULES[element.type] || [];
      rules.forEach(rule => {
        if (rule.validator && !rule.validator(element)) {
          errors.push(rule.message);
        }
      });
    });

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Convert current workflow back to service flow format
  convertWorkflowToServiceFlow(): any {
    if (!this.currentServiceCode) {
      console.warn('No service code set, cannot convert to service flow');
      return null;
    }

    const serviceFlow = {
      service_code: this.currentServiceCode,
      pages: [] as any[]
    };

    // Group elements by pages
    const pageElements = this.currentWorkflow.elements.filter(el => el.type === ElementType.PAGE);

    pageElements.forEach(pageEl => {
      const page: any = {
        sequence_number: pageEl.properties.sequence_number || '01',
        name: pageEl.properties.name || 'Untitled Page',
        name_ara: pageEl.properties.name_ara,
        description: pageEl.properties.description,
        description_ara: pageEl.properties.description_ara,
        is_hidden_page: pageEl.properties.is_hidden_page || false,
        page_id: pageEl.properties.page_id || Date.now(),
        categories: []
      };

      // Find categories connected to this page
      const categoryConnections = this.currentWorkflow.connections.filter(conn => conn.sourceId === pageEl.id);
      categoryConnections.forEach(catConn => {
        const categoryEl = this.currentWorkflow.elements.find(el => el.id === catConn.targetId && el.type === ElementType.CATEGORY);
        if (categoryEl) {
          const category: any = {
            id: categoryEl.properties.category_id || Date.now(),
            name: categoryEl.properties.name || 'Untitled Category',
            name_ara: categoryEl.properties.name_ara,
            repeatable: categoryEl.properties.is_repeatable || false,
            fields: []
          };

          // Find fields connected to this category
          const fieldConnections = this.currentWorkflow.connections.filter(conn => conn.sourceId === categoryEl.id);
          fieldConnections.forEach(fieldConn => {
            const fieldEl = this.currentWorkflow.elements.find(el => el.id === fieldConn.targetId && el.type === ElementType.FIELD);
            if (fieldEl) {
              const field: any = {
                name: fieldEl.properties._field_name || fieldEl.properties.name,
                field_id: fieldEl.properties._field_id || Date.now(),
                display_name: fieldEl.properties._field_display_name || fieldEl.properties.name,
                display_name_ara: fieldEl.properties._field_display_name_ara,
                field_type: fieldEl.properties._field_type || 'text',
                mandatory: fieldEl.properties._mandatory || false,
                lookup: fieldEl.properties._lookup,
                allowed_lookups: [],
                sub_fields: [],
                is_hidden: fieldEl.properties._is_hidden || false,
                is_disabled: fieldEl.properties._is_disabled || false,
                visibility_conditions: []
              };

              // Add field type specific properties - safer property access
              const fieldProps = fieldEl.properties;
              const validationKeys = [
                'max_length', 'min_length', 'regex_pattern', 'allowed_characters',
                'forbidden_words', 'value_greater_than', 'value_less_than',
                'integer_only', 'positive_only', 'precision', 'default_boolean',
                'file_types', 'max_file_size', 'image_max_width', 'image_max_height',
                'max_selections', 'min_selections'
              ];

              validationKeys.forEach(key => {
                const apiKey = `_${key}`;
                if (fieldProps && fieldProps[apiKey] !== undefined && fieldProps[apiKey] !== null) {
                  field[key] = fieldProps[apiKey];
                }
              });

              // Find condition elements connected to this field
              const conditionConnections = this.currentWorkflow.connections.filter(conn => conn.sourceId === fieldEl.id);
              conditionConnections.forEach(condConn => {
                const conditionEl = this.currentWorkflow.elements.find(el => el.id === condConn.targetId && el.type === ElementType.CONDITION);
                if (conditionEl && conditionEl.properties.condition_logic) {
                  field.visibility_conditions.push({
                    condition_logic: conditionEl.properties.condition_logic
                  });
                }
              });

              category.fields.push(field);
            }
          });

          page.categories.push(category);
        }
      });

      serviceFlow.pages.push(page);
    });

    return serviceFlow;
  }
}
