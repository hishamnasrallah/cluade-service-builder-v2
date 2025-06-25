// services/workflow.service.ts - Complete version with hierarchy support
import { Injectable } from '@angular/core';
import {BehaviorSubject, Observable, of, throwError} from 'rxjs';
import {map, catchError, switchMap} from 'rxjs/operators';
import {
  WorkflowData,
  WorkflowElement,
  Connection,
  ElementType,
  Position,
  canContainChildren,
  canBeContained,
  getValidChildTypes,
  ELEMENT_VALIDATION_RULES
} from '../models/workflow.models';
import { ApiService, ServiceFlow } from './api.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable({
  providedIn: 'root'
})
export class WorkflowService {
  private workflowSubject = new BehaviorSubject<WorkflowData>({
    name: 'New Workflow',
    elements: [],
    connections: [],
    viewMode: 'collapsed'
  });

  public workflow$ = this.workflowSubject.asObservable();
  private currentWorkflow: WorkflowData;
  private currentServiceCode?: string;

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

  addElement(type: ElementType, position: Position, properties: any = {}, parentId?: string): WorkflowElement {
    // Validate parent-child relationship
    if (parentId) {
      const parent = this.currentWorkflow.elements.find(el => el.id === parentId);
      if (!parent) {
        throw new Error('Parent element not found');
      }

      if (!canContainChildren(parent.type)) {
        throw new Error(`${parent.type} elements cannot contain children`);
      }

      const validChildTypes = getValidChildTypes(parent.type);
      if (!validChildTypes.includes(type)) {
        throw new Error(`${type} cannot be a child of ${parent.type}`);
      }
    } else if (canBeContained(type)) {
      // Elements that should be contained need a parent
      throw new Error(`${type} elements must be placed inside a container`);
    }

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
      connections: [],
      parentId,
      children: canContainChildren(type) ? [] : undefined,
      isExpanded: false
    };

    this.currentWorkflow.elements.push(element);

    // Update parent's children array
    if (parentId) {
      const parent = this.currentWorkflow.elements.find(el => el.id === parentId);
      if (parent && parent.children) {
        parent.children.push(element.id);
      }
      this.updateParentCounts(parentId);
    }

    this.updateWorkflow();
    return element;
  }

  updateElement(id: string, updates: Partial<WorkflowElement>): void {
    const elementIndex = this.currentWorkflow.elements.findIndex(el => el.id === id);
    if (elementIndex !== -1) {
      const element = this.currentWorkflow.elements[elementIndex];

      // Preserve hierarchy properties
      this.currentWorkflow.elements[elementIndex] = {
        ...element,
        ...updates,
        parentId: element.parentId,
        children: element.children
      };

      // Update parent counts if this affects them
      if (element.parentId) {
        this.updateParentCounts(element.parentId);
      }

      this.updateWorkflow();
    }
  }

  removeElement(id: string): void {
    const element = this.currentWorkflow.elements.find(el => el.id === id);
    if (!element) return;

    if (element.type === ElementType.START) {
      throw new Error('Start element cannot be removed');
    }

    // Delete from backend if it has an ID
    let deleteObservable: Observable<any> = of(null);

    switch (element.type) {
      case ElementType.PAGE:
        if (element.properties.page_id) {
          deleteObservable = this.apiService.deletePage(element.properties.page_id);
        }
        break;
      case ElementType.CATEGORY:
        if (element.properties.category_id) {
          deleteObservable = this.apiService.deleteCategory(element.properties.category_id);
        }
        break;
      case ElementType.FIELD:
        if (element.properties._field_id) {
          deleteObservable = this.apiService.deleteField(element.properties._field_id);
        }
        break;
      case ElementType.CONDITION:
        if (element.properties.condition_id) {
          deleteObservable = this.apiService.deleteCondition(element.properties.condition_id);
        }
        break;
    }

    deleteObservable.subscribe({
      next: () => {
        console.log('Element deleted from backend');

        // Remove all children recursively
        if (element.children && element.children.length > 0) {
          [...element.children].forEach(childId => this.removeElement(childId));
        }

        // Remove from parent's children array
        if (element.parentId) {
          const parent = this.currentWorkflow.elements.find(el => el.id === element.parentId);
          if (parent && parent.children) {
            parent.children = parent.children.filter(childId => childId !== id);
            this.updateParentCounts(element.parentId);
          }
        }

        // Remove element
        this.currentWorkflow.elements = this.currentWorkflow.elements.filter(el => el.id !== id);

        // Remove connections involving this element
        this.currentWorkflow.connections = this.currentWorkflow.connections.filter(
          conn => conn.sourceId !== id && conn.targetId !== id
        );

        this.updateWorkflow();
      },
      error: (error) => {
        console.error('Failed to delete element from backend:', error);
        // Still remove from local state even if backend fails
        this.removeElementLocally(id);
      }
    });
  }

  private removeElementLocally(id: string): void {
    const element = this.currentWorkflow.elements.find(el => el.id === id);
    if (!element) return;

    // Remove all children recursively
    if (element.children && element.children.length > 0) {
      [...element.children].forEach(childId => this.removeElement(childId));
    }

    // Remove from parent's children array
    if (element.parentId) {
      const parent = this.currentWorkflow.elements.find(el => el.id === element.parentId);
      if (parent && parent.children) {
        parent.children = parent.children.filter(childId => childId !== id);
        this.updateParentCounts(element.parentId);
      }
    }

    // Remove element
    this.currentWorkflow.elements = this.currentWorkflow.elements.filter(el => el.id !== id);

    // Remove connections involving this element
    this.currentWorkflow.connections = this.currentWorkflow.connections.filter(
      conn => conn.sourceId !== id && conn.targetId !== id
    );

    this.updateWorkflow();
  }
  toggleElementExpansion(elementId: string): void {
    const element = this.currentWorkflow.elements.find(el => el.id === elementId);
    if (!element || !canContainChildren(element.type)) return;

    // Toggle the selected element
    element.isExpanded = !element.isExpanded;

    // Update the currently expanded element for drop targeting
    if (element.isExpanded) {
      this.currentWorkflow.expandedElementId = elementId;
    } else if (this.currentWorkflow.expandedElementId === elementId) {
      // If we're collapsing the currently targeted element, clear it
      this.currentWorkflow.expandedElementId = undefined;
    }

    this.updateWorkflow();
  }

  // Update parent element counts
  private updateParentCounts(parentId: string): void {
    const parent = this.currentWorkflow.elements.find(el => el.id === parentId);
    if (!parent) return;

    if (parent.type === ElementType.PAGE) {
      // Count categories
      const categories = this.getChildElements(parentId);
      parent.properties.categoryCount = categories.length;

      // Count all fields in all categories
      let totalFields = 0;
      categories.forEach(category => {
        const fields = this.getChildElements(category.id);
        totalFields += fields.length;
      });
      parent.properties.fieldCount = totalFields;
    } else if (parent.type === ElementType.CATEGORY) {
      // Count fields
      const fields = this.getChildElements(parentId);
      parent.properties.fieldCount = fields.length;
    }
  }
  // Get child elements
  private getChildElements(parentId: string): WorkflowElement[] {
    const parent = this.currentWorkflow.elements.find(el => el.id === parentId);
    if (!parent || !parent.children) return [];

    return parent.children
      .map(childId => this.currentWorkflow.elements.find(el => el.id === childId))
      .filter(el => el !== undefined) as WorkflowElement[];
  }

  // Modified connection logic to handle hierarchy
  addConnection(sourceId: string, targetId: string): Connection {
    const sourceElement = this.currentWorkflow.elements.find(el => el.id === sourceId);
    const targetElement = this.currentWorkflow.elements.find(el => el.id === targetId);

    if (!sourceElement || !targetElement) {
      throw new Error('Invalid connection: source or target element not found');
    }

    // Don't allow connections to/from child elements
    if (sourceElement.parentId || targetElement.parentId) {
      throw new Error('Cannot create connections to/from child elements');
    }

    if (sourceElement.type === ElementType.END) {
      throw new Error('End elements cannot send connections');
    }

    if (targetElement.type === ElementType.START) {
      throw new Error('Start elements cannot receive connections');
    }

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

  // Load service flow from API with hierarchy
  loadServiceFlowFromApi(serviceCode: string): Observable<WorkflowData> {
    return this.apiService.getServiceFlow(serviceCode).pipe(
      switchMap((serviceFlow: ServiceFlow) => {
        // Get service ID first, then convert
        return this.apiService.getServices().pipe(
          map(servicesResponse => {
            const service = servicesResponse.results.find(s => s.code === serviceCode);
            const serviceId = service?.id;

            this.currentServiceCode = serviceCode;

            const workflowData: WorkflowData = {
              name: `Service Flow - ${service?.name || serviceCode}`,
              description: `Service flow for service ${serviceCode}`,
              elements: [],
              connections: [],
              viewMode: 'collapsed',
              metadata: {
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                version: '1.0',
                service_code: serviceCode,
                service_id: serviceId
              }
            };

            // Convert service flow data to workflow elements with hierarchy
            this.convertServiceFlowToElements(serviceFlow, workflowData, serviceId);

            this.currentWorkflow = workflowData;
            this.updateWorkflow();

            console.log('Loaded service flow from API with hierarchy:', workflowData);
            return workflowData;
          })
        );
      }),
      catchError(error => {
        console.error('Error loading service flow from API:', error);
        return throwError(() => error);
      })
    );
  }
  // Convert service flow with hierarchy
  private convertServiceFlowToElements(serviceFlow: ServiceFlow, workflowData: WorkflowData, serviceId?: number): void {
    // Add start element
    const startElement: WorkflowElement = {
      id: 'start',
      type: ElementType.START,
      position: { x: 100, y: 100 },
      properties: { name: 'Start' },
      connections: []
    };
    workflowData.elements.push(startElement);

    let previousElementId = 'start';
    let xPosition = 350;

    // Track all conditions to add them after pages are processed
    const conditionsToAdd: Array<{
      element: WorkflowElement;
      pageId: string;
      fieldName: string;
    }> = [];

    // Convert pages to workflow elements
    if (serviceFlow.pages && Array.isArray(serviceFlow.pages)) {
      serviceFlow.pages.forEach((page: any, pageIndex: number) => {
        const pageElementId = `page-${page.page_id || pageIndex}`;

        // Extract IDs from objects if necessary
        const sequenceNumberId = page.sequence_number
          ? (typeof page.sequence_number === 'object' ? page.sequence_number.id : page.sequence_number)
          : null;

        const applicantTypeId = page.applicant_type
          ? (typeof page.applicant_type === 'object' ? page.applicant_type.id : page.applicant_type)
          : null;

        // Create page element with properly extracted IDs
        const pageElement: WorkflowElement = {
          id: pageElementId,
          type: ElementType.PAGE,
          position: { x: xPosition, y: 100 },
          properties: {
            name: page.name || `Page ${pageIndex + 1}`,
            name_ara: page.name_ara,
            description: page.description,
            description_ara: page.description_ara,
            sequence_number: sequenceNumberId,
            page_id: page.page_id,
            is_hidden_page: page.is_hidden_page || false,
            categoryCount: 0,
            fieldCount: 0,
            service: serviceId || serviceFlow.service_code,
            applicant_type: applicantTypeId,
            active_ind: true
          },
          connections: [],
          children: [],
          isExpanded: false
        };
        workflowData.elements.push(pageElement);

        // Connect to previous element
        workflowData.connections.push({
          id: `conn-${previousElementId}-${pageElementId}`,
          sourceId: previousElementId,
          targetId: pageElementId
        });

        // Convert categories as children of page
        if (page.categories && Array.isArray(page.categories)) {
          page.categories.forEach((category: any, categoryIndex: number) => {
            const categoryElementId = `category-${category?.id || categoryIndex}`;

            const categoryElement: WorkflowElement = {
              id: categoryElementId,
              type: ElementType.CATEGORY,
              position: { x: 0, y: 0 },
              properties: {
                name: category.name || `Category ${categoryIndex + 1}`,
                name_ara: category.name_ara,
                category_id: category.id,
                is_repeatable: category.repeatable || false,
                fieldCount: 0,
                description: category.description,
                code: category.code,
                active_ind: true
              },
              connections: [],
              parentId: pageElementId,
              children: [],
              isExpanded: false
            };
            workflowData.elements.push(categoryElement);
            pageElement.children!.push(categoryElementId);

            // Convert fields as children of category
            if (category.fields && Array.isArray(category.fields)) {
              category.fields.forEach((field: any, fieldIndex: number) => {
                if (!field) {
                  console.warn(`Skipping null field at index ${fieldIndex} in category ${category.name}`);
                  return;
                }

                const fieldElementId = `field-${field?.field_id || fieldIndex}`;

                // Extract field type ID if it's an object
                const fieldTypeId = field.field_type
                  ? (typeof field.field_type === 'object' && field.field_type ? field.field_type.id : field.field_type)
                  : null;

                const lookupId = field.lookup
                  ? (typeof field.lookup === 'object' && field.lookup ? field.lookup.id : field.lookup)
                  : null;

                const fieldElement: WorkflowElement = {
                  id: fieldElementId,
                  type: ElementType.FIELD,
                  position: { x: 0, y: 0 },
                  properties: {
                    name: field.display_name || field.name || `Field ${fieldIndex + 1}`,
                    _field_name: field.name,
                    _field_display_name: field.display_name,
                    _field_display_name_ara: field.display_name_ara,
                    _field_type: fieldTypeId,
                    _field_id: field.field_id,
                    _mandatory: field.mandatory || false,
                    _is_hidden: field.is_hidden || false,
                    _is_disabled: field.is_disabled || false,
                    _lookup: lookupId,
                    _sequence: field.sequence || fieldIndex,
                    // ... other field properties
                    allowed_lookups: field.allowed_lookups,
                    active_ind: true
                  },
                  connections: [],
                  parentId: categoryElementId
                };
                workflowData.elements.push(fieldElement);
                categoryElement.children!.push(fieldElementId);

                // Collect visibility conditions to add later
                if (field.visibility_conditions && Array.isArray(field.visibility_conditions) && field.visibility_conditions.length > 0) {
                  field.visibility_conditions.forEach((condition: any, conditionIndex: number) => {
                    if (!condition) return;

                    const conditionElementId = `condition-${field.field_id || fieldIndex}-${conditionIndex}`;

                    const conditionElement: WorkflowElement = {
                      id: conditionElementId,
                      type: ElementType.CONDITION,
                      position: { x: 0, y: 0 }, // Will be set later
                      properties: {
                        name: `Condition for ${field.display_name || field.name || 'Unknown Field'}`,
                        target_field: field.name || '',
                        target_field_id: field.field_id || null,
                        condition_logic: (condition && condition.condition_logic) ? condition.condition_logic : [],
                        condition_id: (condition && typeof condition.id !== 'undefined') ? condition.id : null
                      },
                      connections: []
                    };

                    conditionsToAdd.push({
                      element: conditionElement,
                      pageId: pageElementId,
                      fieldName: field.display_name || field.name
                    });
                  });
                }
              });

              categoryElement.properties.fieldCount = categoryElement.children!.length;
            }
          });

          // Update page counts
          pageElement.properties.categoryCount = pageElement.children!.length;
          let totalFields = 0;
          pageElement.children!.forEach(catId => {
            const cat = workflowData.elements.find(el => el.id === catId);
            if (cat) {
              totalFields += cat.properties.fieldCount || 0;
            }
          });
          pageElement.properties.fieldCount = totalFields;
        }

        previousElementId = pageElementId;
        xPosition += 300;
      });
    }

    // Now position and add all conditions
    const pageConditions: { [pageId: string]: typeof conditionsToAdd } = {};

    // Group conditions by page
    conditionsToAdd.forEach(conditionInfo => {
      if (!pageConditions[conditionInfo.pageId]) {
        pageConditions[conditionInfo.pageId] = [];
      }
      pageConditions[conditionInfo.pageId].push(conditionInfo);
    });

    // Position conditions for each page
    Object.entries(pageConditions).forEach(([pageId, conditions]) => {
      const pageElement = workflowData.elements.find(el => el.id === pageId);
      if (!pageElement) return;

      // Position conditions below the page
      const baseY = pageElement.position.y + 200;
      const baseX = pageElement.position.x;

      conditions.forEach((conditionInfo, index) => {
        // Arrange conditions in rows of 3
        const row = Math.floor(index / 3);
        const col = index % 3;

        conditionInfo.element.position = {
          x: baseX + (col * 80),
          y: baseY + (row * 80)
        };

        workflowData.elements.push(conditionInfo.element);

        // Connect condition to page
        workflowData.connections.push({
          id: `conn-${pageId}-${conditionInfo.element.id}`,
          sourceId: pageId,
          targetId: conditionInfo.element.id
        });
      });
    });

    // Add end element
    workflowData.elements.push({
      id: 'end',
      type: ElementType.END,
      position: { x: xPosition, y: 100 },
      properties: { name: 'End', action: 'submit' },
      connections: []
    });

    // Connect last page to end
    if (previousElementId !== 'start') {
      workflowData.connections.push({
        id: `conn-${previousElementId}-end`,
        sourceId: previousElementId,
        targetId: 'end'
      });
    }
  }

  convertWorkflowToServiceFlow(): ServiceFlow | null {
    if (!this.currentServiceCode) {
      console.warn('No service code set, cannot convert to service flow');
      return null;
    }

    const serviceFlow: ServiceFlow = {
      service_code: this.currentServiceCode,
      pages: []
    };

    // Get all page elements (top-level only)
    const pageElements = this.currentWorkflow.elements.filter(
      el => el.type === ElementType.PAGE && !el.parentId
    );

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

      // Get categories that are children of this page
      if (pageEl.children) {
        pageEl.children.forEach(categoryId => {
          const categoryEl = this.currentWorkflow.elements.find(
            el => el.id === categoryId && el.type === ElementType.CATEGORY
          );

          if (categoryEl) {
            const category: any = {
              id: categoryEl.properties.category_id || Date.now(),
              name: categoryEl.properties.name || 'Untitled Category',
              name_ara: categoryEl.properties.name_ara,
              repeatable: categoryEl.properties.is_repeatable || false,
              fields: []
            };

            // Get fields that are children of this category
            if (categoryEl.children) {
              categoryEl.children.forEach(fieldId => {
                const fieldEl = this.currentWorkflow.elements.find(
                  el => el.id === fieldId && el.type === ElementType.FIELD
                );

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

                  // Add all validation properties
                  const validationProps = [
                    'max_length', 'min_length', 'regex_pattern', 'allowed_characters',
                    'forbidden_words', 'value_greater_than', 'value_less_than',
                    'integer_only', 'positive_only', 'precision', 'default_boolean',
                    'file_types', 'max_file_size', 'image_max_width', 'image_max_height',
                    'max_selections', 'min_selections'
                  ];

                  validationProps.forEach(prop => {
                    const fieldProp = `_${prop}`;
                    if (fieldEl.properties[fieldProp] !== undefined && fieldEl.properties[fieldProp] !== null) {
                      field[prop] = fieldEl.properties[fieldProp];
                    }
                  });

                  category.fields.push(field);
                }
              });
            }

            page.categories.push(category);
          }
        });
      }

      serviceFlow.pages.push(page);
    });

    return serviceFlow;
  }

  // Save workflow
  saveWorkflow(): Observable<any> {
    if (this.apiService.isConfigured() && this.currentServiceCode) {
      // For service flows, we would need a different API endpoint to update
      return this.saveToLocalStorage();
    } else {
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
      this.currentServiceCode = workflowData.metadata?.service_code;
    } else {
      const savedData = localStorage.getItem('current_workflow');
      if (savedData) {
        try {
          this.currentWorkflow = JSON.parse(savedData);
          this.currentServiceCode = this.currentWorkflow.metadata?.service_code;
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
      connections: [],
      viewMode: 'collapsed'
    };
    this.currentServiceCode = undefined;
    this.initializeWithStartElement();
  }

  createNewWorkflow(name: string = 'New Workflow'): void {
    this.currentWorkflow = {
      name,
      elements: [],
      connections: [],
      viewMode: 'collapsed'
    };
    this.currentServiceCode = undefined;
    this.initializeWithStartElement();
  }

  // Toggle view mode
  setViewMode(mode: 'collapsed' | 'expanded'): void {
    this.currentWorkflow.viewMode = mode;

    if (mode === 'collapsed') {
      // Collapse all elements
      this.currentWorkflow.elements.forEach(el => {
        if (el.isExpanded) {
          el.isExpanded = false;
        }
      });
      this.currentWorkflow.expandedElementId = undefined;
    }

    this.updateWorkflow();
  }
  // Auto-organize with hierarchy in mind
// Auto-organize with hierarchy in mind
// Fix for autoOrganizeElements method in workflow.service.ts

// Option 1: Include all ElementType values in typeOrder
  autoOrganizeElements(): void {
    const elements = this.currentWorkflow.elements;

    // Position top-level elements only
    const topLevelElements = elements.filter(el => !el.parentId);

    // Sort by type - include all element types
    const typeOrder: Record<ElementType, number> = {
      [ElementType.START]: 0,
      [ElementType.PAGE]: 1,
      [ElementType.CATEGORY]: 2,
      [ElementType.FIELD]: 3,
      [ElementType.CONDITION]: 4,
      [ElementType.END]: 5
    };

    topLevelElements.sort((a, b) => (typeOrder[a.type] || 0) - (typeOrder[b.type] || 0));

    // Position in a horizontal line
    let xPosition = 100;
    const spacing = 300;

    topLevelElements.forEach(element => {
      element.position = { x: xPosition, y: 100 };
      xPosition += spacing;
    });

    this.updateWorkflow();
  }
  private serviceMetadata: any = {};

  setServiceMetadata(metadata: any): void {
    this.serviceMetadata = metadata;
    // Optionally store in workflow metadata
    if (this.currentWorkflow.metadata) {
      this.currentWorkflow.metadata = {
        ...this.currentWorkflow.metadata,
        ...metadata
      };
    }
    this.updateWorkflow();
  }

  getServiceMetadata(): any {
    return this.serviceMetadata;
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

    // Check for orphaned top-level elements (not counting children)
    const connectedElements = new Set<string>();
    this.currentWorkflow.connections.forEach(conn => {
      connectedElements.add(conn.sourceId);
      connectedElements.add(conn.targetId);
    });

    const orphanedElements = this.currentWorkflow.elements.filter(
      el => el.type !== ElementType.START &&
        !el.parentId && // Only check top-level elements
        !connectedElements.has(el.id)
    );

    if (orphanedElements.length > 0) {
      errors.push(`Found ${orphanedElements.length} disconnected elements`);
    }

    // Check hierarchy constraints
    this.currentWorkflow.elements.forEach(element => {
      if (canBeContained(element.type) && !element.parentId) {
        errors.push(`${element.type} "${element.properties.name}" must be inside a container`);
      }
    });

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
}
