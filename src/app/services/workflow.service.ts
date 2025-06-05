// services/workflow.service.ts - Updated for service flow integration
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { WorkflowData, WorkflowElement, Connection, ElementType, Position } from '../models/workflow.models';
import { ApiService, ServiceFlow } from './api.service';
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
  private currentServiceCode?: string; // Track the current service code instead of workflow ID

  constructor(private apiService: ApiService) {
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

  // Load service flow from API by service code
  loadServiceFlowFromApi(serviceCode: string): Observable<WorkflowData> {
    return this.apiService.getServiceFlow(serviceCode).pipe(
      map((serviceFlow: ServiceFlow) => {
        const workflowData = this.apiService.convertServiceFlowToWorkflow(serviceFlow);

        this.currentWorkflow = workflowData;
        this.currentServiceCode = serviceCode;
        this.updateWorkflow();

        console.log('Loaded service flow from API:', workflowData);
        return workflowData;
      }),
      catchError(error => {
        console.error('Error loading service flow from API:', error);
        return throwError(() => error);
      })
    );
  }

  // Convert current workflow back to service flow format
  convertWorkflowToServiceFlow(): ServiceFlow | null {
    if (!this.currentServiceCode) {
      console.warn('No service code set, cannot convert to service flow');
      return null;
    }

    const serviceFlow: ServiceFlow = {
      service_code: this.currentServiceCode,
      pages: []
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

              // Add field type specific properties
              if (fieldEl.properties._max_length) field.max_length = fieldEl.properties._max_length;
              if (fieldEl.properties._min_length) field.min_length = fieldEl.properties._min_length;
              if (fieldEl.properties._regex_pattern) field.regex_pattern = fieldEl.properties._regex_pattern;
              if (fieldEl.properties._allowed_characters) field.allowed_characters = fieldEl.properties._allowed_characters;
              if (fieldEl.properties._forbidden_words) field.forbidden_words = fieldEl.properties._forbidden_words;
              if (fieldEl.properties._value_greater_than) field.value_greater_than = fieldEl.properties._value_greater_than;
              if (fieldEl.properties._value_less_than) field.value_less_than = fieldEl.properties._value_less_than;
              if (fieldEl.properties._integer_only) field.integer_only = fieldEl.properties._integer_only;
              if (fieldEl.properties._positive_only) field.positive_only = fieldEl.properties._positive_only;
              if (fieldEl.properties._precision) field.precision = fieldEl.properties._precision;
              if (fieldEl.properties._default_boolean !== undefined) field.default_boolean = fieldEl.properties._default_boolean;
              if (fieldEl.properties._file_types) field.file_types = fieldEl.properties._file_types;
              if (fieldEl.properties._max_file_size) field.max_file_size = fieldEl.properties._max_file_size;
              if (fieldEl.properties._image_max_width) field.image_max_width = fieldEl.properties._image_max_width;
              if (fieldEl.properties._image_max_height) field.image_max_height = fieldEl.properties._image_max_height;
              if (fieldEl.properties._max_selections) field.max_selections = fieldEl.properties._max_selections;
              if (fieldEl.properties._min_selections) field.min_selections = fieldEl.properties._min_selections;

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

  // Save current workflow (not applicable for service flows - they would need API update)
  saveWorkflow(): Observable<any> {
    if (this.apiService.isConfigured() && this.currentServiceCode) {
      // For service flows, we would need a different API endpoint to update the service flow
      // For now, just save to localStorage as fallback
      return this.saveToLocalStorage();
    } else {
      // Fallback to localStorage
      return this.saveToLocalStorage();
    }
  }

  private saveToLocalStorage(): Observable<any> {
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
      this.currentServiceCode = undefined; // Clear service code when loading local data
    } else {
      // Load from localStorage as fallback
      const savedData = localStorage.getItem('current_workflow');
      if (savedData) {
        try {
          this.currentWorkflow = JSON.parse(savedData);
          this.currentServiceCode = undefined;
        } catch (error) {
          console.error('Error loading workflow from localStorage:', error);
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

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Auto-organize elements for better visual layout
  autoOrganizeElements(): void {
    const elements = this.currentWorkflow.elements;
    const connections = this.currentWorkflow.connections;

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
}
