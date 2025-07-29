// services/workflow.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject, forkJoin, Observable, of, throwError } from 'rxjs';
import { map, catchError, switchMap, tap } from 'rxjs/operators';
import { v4 as uuidv4 } from 'uuid';

import {
  WorkflowData,
  WorkflowElement,
  Connection,
  ElementType,
  Position,
  canContainChildren,
  canBeContained,
  getValidChildTypes,
  ELEMENT_VALIDATION_RULES,
  ElementProperties,
  CanvasState
} from '../models/workflow.models';
import { ApiService, Field, ServiceFlow } from './api.service';

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
  private workflowId?: string;

  // Track deleted elements for batch deletion
  private deletedElements: {
    pages: number[];
    categories: number[];
    fields: number[];
    conditions: number[];
  } = {
    pages: [],
    categories: [],
    fields: [],
    conditions: []
  };

  // Service metadata storage
  private serviceMetadata: any = {};

  constructor(private apiService: ApiService) {
    this.currentWorkflow = this.workflowSubject.value;
    this.initializeWithStartElement();
  }

  // Initialize with a start element
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

  // Get current workflow
  getWorkflow(): WorkflowData {
    return { ...this.currentWorkflow };
  }

  // Get current service code
  getCurrentServiceCode(): string | undefined {
    return this.currentServiceCode;
  }

  // Get current workflow ID
  getCurrentWorkflowId(): string | undefined {
    return this.workflowId;
  }

  // Add element with hierarchy support
  addElement(type: ElementType, position: Position, properties: ElementProperties = {}, parentId?: string): WorkflowElement {
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

  // Update element
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

  // Remove element with cascade delete
  removeElement(id: string): void {
    const element = this.currentWorkflow.elements.find(el => el.id === id);
    if (!element) return;

    if (element.type === ElementType.START) {
      throw new Error('Start element cannot be removed');
    }

    // Track deleted elements for backend cleanup
    this.trackDeletedElement(element);

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

  // Track deleted elements for batch deletion
  private trackDeletedElement(element: WorkflowElement): void {
    switch (element.type) {
      case ElementType.PAGE:
        if (element.properties.page_id) {
          this.deletedElements.pages.push(element.properties.page_id);
        }
        break;
      case ElementType.CATEGORY:
        if (element.properties.category_id) {
          this.deletedElements.categories.push(element.properties.category_id);
        }
        break;
      case ElementType.FIELD:
        if (element.properties['_field_id']) {
          this.deletedElements.fields.push(element.properties._field_id);
        }
        break;
      case ElementType.CONDITION:
        if (element.properties.condition_id) {
          this.deletedElements.conditions.push(element.properties.condition_id);
        }
        break;
    }
  }

  // Toggle element expansion
  toggleElementExpansion(elementId: string): void {
    const element = this.currentWorkflow.elements.find(el => el.id === elementId);
    if (!element || !canContainChildren(element.type)) return;

    element.isExpanded = !element.isExpanded;

    if (element.isExpanded) {
      this.currentWorkflow.expandedElementId = elementId;
    } else if (this.currentWorkflow.expandedElementId === elementId) {
      this.currentWorkflow.expandedElementId = undefined;
    }

    this.updateWorkflow();
  }

  // Update parent element counts
  private updateParentCounts(parentId: string): void {
    const parent = this.currentWorkflow.elements.find(el => el.id === parentId);
    if (!parent) return;

    if (parent.type === ElementType.PAGE) {
      const categories = this.getChildElements(parentId);
      parent.properties.categoryCount = categories.length;

      let totalFields = 0;
      categories.forEach(category => {
        const fields = this.getChildElements(category.id);
        totalFields += fields.length;
      });
      parent.properties.fieldCount = totalFields;
    } else if (parent.type === ElementType.CATEGORY) {
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

  // Add connection
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

  // Remove connection
  removeConnection(connectionId: string): void {
    this.currentWorkflow.connections = this.currentWorkflow.connections.filter(
      conn => conn.id !== connectionId
    );
    this.updateWorkflow();
  }

  // Set view mode
  setViewMode(mode: 'collapsed' | 'expanded'): void {
    this.currentWorkflow.viewMode = mode;

    if (mode === 'collapsed') {
      this.currentWorkflow.elements.forEach(el => {
        if (el.isExpanded) {
          el.isExpanded = false;
        }
      });
      this.currentWorkflow.expandedElementId = undefined;
    }

    this.updateWorkflow();
  }

// Auto-organize elements
  autoOrganizeElements(): void {
    const elements = this.currentWorkflow.elements;
    const topLevelElements = elements.filter(el => !el.parentId);

    // Group elements by type
    const startElements = topLevelElements.filter(el => el.type === ElementType.START);
    const pageElements = topLevelElements.filter(el => el.type === ElementType.PAGE);
    const conditionElements = topLevelElements.filter(el => el.type === ElementType.CONDITION);
    const endElements = topLevelElements.filter(el => el.type === ElementType.END);

    let currentX = 100;
    const horizontalSpacing = 350;
    const verticalSpacing = 200;

    // Position start element
    startElements.forEach(element => {
      element.position = { x: currentX, y: 100 };
    });

    if (startElements.length > 0) {
      currentX += horizontalSpacing;
    }

    // Position pages
    pageElements.forEach((page, index) => {
      const yOffset = index % 2 === 0 ? 0 : verticalSpacing; // Alternate rows
      page.position = { x: currentX, y: 100 + yOffset };

      // Reset child positions relative to parent
      if (page.children) {
        page.children.forEach((childId, childIndex) => {
          const child = elements.find(el => el.id === childId);
          if (child) {
            child.position = { x: 0, y: 0 }; // Children use relative positioning
          }
        });
      }

      currentX += horizontalSpacing;
    });

    // Position conditions below pages
    const conditionStartX = 350; // Start after start element
    conditionElements.forEach((condition, index) => {
      condition.position = {
        x: conditionStartX + (index * 150),
        y: 350 // Below pages
      };
    });

    // Position end element
    endElements.forEach(element => {
      element.position = { x: currentX, y: 100 };
    });

    this.updateWorkflow();
  }


  // Save workflow (with container support)
  saveWorkflow(): Observable<any> {
    if (this.workflowId) {
      return this.saveWorkflowContainer();
    }
    return this.saveWorkflowLegacy();
  }

// Save using workflow container API
  private saveWorkflowContainer(): Observable<any> {
    // Ensure all elements have valid positions and convert to Django format
    const elementsWithValidPositions = this.currentWorkflow.elements.map(element => {
      // Base element structure
      const baseElement = {
        ...element,
        position: element.position || { x: 100, y: 100 },
        position_x: element.position?.x || 100,
        position_y: element.position?.y || 100,
        relative_position_x: element.parentId ? (element.position?.x || 0) : undefined,
        relative_position_y: element.parentId ? (element.position?.y || 0) : undefined,
        is_expanded: element.isExpanded || false,
        parent_id: element.parentId || null,
        children: element.children || [],
        type: element.type
      };

      // Handle properties based on element type
      if (element.type === 'start' || element.type === 'end') {
        // Special elements only need basic properties
        baseElement.properties = {
          name: element.properties.name || element.type
        };
      } else {
        // Process properties for other element types
        const processedProperties = { ...element.properties };

        // List of ID fields that should be numeric
        const numericIdFields = [
          'page_id', 'category_id', '_field_id', 'condition_id',
          'service', 'service_id', 'sequence_number', 'sequence_number_id',
          'applicant_type', 'applicant_type_id', '_field_type', 'field_type_id',
          '_lookup', 'lookup_id', '_parent_field', 'parent_field_id',
          'target_field', 'target_field_id'
        ];

        // Convert numeric fields
        numericIdFields.forEach(field => {
          if (processedProperties[field] !== undefined && processedProperties[field] !== null) {
            const value = processedProperties[field];
            if (typeof value === 'string' && /^\d+$/.test(value)) {
              processedProperties[field] = parseInt(value, 10);
            } else if (typeof value === 'number') {
              processedProperties[field] = value;
            } else if (value === '') {
              processedProperties[field] = null;
            }
          }
        });

        // Ensure active_ind is always present - USE BRACKET NOTATION
        if (processedProperties['active_ind'] === undefined) {
          processedProperties['active_ind'] = true;
        }

        baseElement.properties = processedProperties;
      }

      return baseElement;
    });

/// Map connections to Django WorkflowConnection format
    const mappedConnections = this.currentWorkflow.connections.map(conn => {
      const sourceElement = this.currentWorkflow.elements.find(el => el.id === conn.sourceId);
      const targetElement = this.currentWorkflow.elements.find(el => el.id === conn.targetId);

      // Get the actual backend ID based on element type
      const getBackendId = (element: WorkflowElement | undefined): number | string | null => {
        if (!element) return null;

        switch (element.type) {
          case ElementType.START:
            return 'start';
          case ElementType.END:
            return 'end';
          case ElementType.PAGE:
            return element.properties['page_id'] || null;
          case ElementType.CATEGORY:
            return element.properties['category_id'] || null;
          case ElementType.FIELD:
            return element.properties['_field_id'] || null;
          case ElementType.CONDITION:
            return element.properties['condition_id'] || null;
          default:
            return null;
        }
      };

      const sourceBackendId = getBackendId(sourceElement);
      const targetBackendId = getBackendId(targetElement);

      return {
        source_type: sourceElement?.type || 'unknown',
        source_id: sourceBackendId,
        target_type: targetElement?.type || 'unknown',
        target_id: targetBackendId,
        connection_metadata: {
          frontend_source_id: conn.sourceId,
          frontend_target_id: conn.targetId,
          id: conn.id
        }
      };
    }).filter(conn =>
      // Only include connections where both elements exist
      conn.source_id !== null && conn.target_id !== null
    );
    const payload = {
      name: this.currentWorkflow.name,
      description: this.currentWorkflow.description,
      metadata: this.currentWorkflow.metadata,
      canvas_state: {
        zoom: 1,
        panX: 100,
        panY: 100,
        viewMode: this.currentWorkflow.viewMode,
        expandedElementId: this.currentWorkflow.expandedElementId
      },
      elements: elementsWithValidPositions,
      connections: mappedConnections,
      deleted_elements: this.deletedElements
    };

    console.log('Saving workflow with payload:', payload);

// Validate and clean payload before sending
    const cleanedPayload = this.validateAndCleanPayload(payload);
    console.log('Cleaned payload:', cleanedPayload);

    return this.apiService.saveCompleteWorkflow(this.workflowId!, cleanedPayload).pipe(
      tap(response => {
        console.log('Workflow saved successfully:', response);
        this.updateLocalIds(response);
        this.clearDeletedElements();

        if (this.currentWorkflow.metadata) {
          this.currentWorkflow.metadata.updated_at = new Date().toISOString();
          this.currentWorkflow.metadata.is_existing = true;
        }

        this.updateWorkflow();
      }),
      map(() => ({
        success: true,
        message: 'Workflow saved successfully'
      })),
      catchError(error => {
        console.error('Error saving workflow:', error);
        return this.saveWorkflowLegacy();
      })
    );
  }
  private validateAndCleanPayload(payload: any): any {
    const cleaned = JSON.parse(JSON.stringify(payload)); // Deep clone

    // Clean elements
    if (cleaned.elements) {
      cleaned.elements = cleaned.elements.map((element: any) => {
        // Ensure no ID field is an empty array
        Object.keys(element.properties || {}).forEach(key => {
          if (key === 'id' || key.endsWith('_id')) {
            if (Array.isArray(element.properties[key])) {
              if (element.properties[key].length === 0) {
                delete element.properties[key];
              } else {
                element.properties[key] = element.properties[key][0];
              }
            }
          }
        });
        return element;
      });
    }

    // Clean connections
    if (cleaned.connections) {
      cleaned.connections = cleaned.connections.filter((conn: any) => {
        // Ensure source_id and target_id are not arrays
        if (Array.isArray(conn.source_id)) {
          conn.source_id = conn.source_id[0] || null;
        }
        if (Array.isArray(conn.target_id)) {
          conn.target_id = conn.target_id[0] || null;
        }

        // Only include connections with valid IDs
        return conn.source_id !== null && conn.target_id !== null;
      });
    }

    return cleaned;
  }
  // Legacy save method (individual elements)
  private saveWorkflowLegacy(): Observable<any> {
    if (!this.currentServiceCode) {
      return this.saveToLocalStorage();
    }

    const deleteOperations: Observable<any>[] = this.createDeleteOperations();
    const saveOperations: Observable<any>[] = this.createSaveOperations();

    if (deleteOperations.length > 0) {
      return forkJoin(deleteOperations).pipe(
        switchMap(() => {
          this.clearDeletedElements();
          return this.executeSaveOperations(saveOperations);
        }),
        catchError(error => {
          console.error('Error during workflow save:', error);
          this.clearDeletedElements();
          return this.saveToLocalStorage();
        })
      );
    }

    return this.executeSaveOperations(saveOperations);
  }

  // Create delete operations for removed elements
  private createDeleteOperations(): Observable<any>[] {
    const operations: Observable<any>[] = [];

    this.deletedElements.conditions.forEach(id => {
      operations.push(
        this.apiService.deleteCondition(id).pipe(
          catchError(error => {
            console.warn('Failed to delete condition:', error);
            return of(null);
          })
        )
      );
    });

    this.deletedElements.fields.forEach(id => {
      operations.push(
        this.apiService.deleteField(id).pipe(
          catchError(error => {
            console.warn('Failed to delete field:', error);
            return of(null);
          })
        )
      );
    });

    this.deletedElements.categories.forEach(id => {
      operations.push(
        this.apiService.deleteCategory(id).pipe(
          catchError(error => {
            console.warn('Failed to delete category:', error);
            return of(null);
          })
        )
      );
    });

    this.deletedElements.pages.forEach(id => {
      operations.push(
        this.apiService.deletePage(id).pipe(
          catchError(error => {
            console.warn('Failed to delete page:', error);
            return of(null);
          })
        )
      );
    });

    return operations;
  }

  // Create save operations for all elements
  private createSaveOperations(): Observable<any>[] {
    const operations: Observable<any>[] = [];

    const pages = this.currentWorkflow.elements.filter(el => el.type === ElementType.PAGE);
    const categories = this.currentWorkflow.elements.filter(el => el.type === ElementType.CATEGORY);
    const fields = this.currentWorkflow.elements.filter(el => el.type === ElementType.FIELD);
    const conditions = this.currentWorkflow.elements.filter(el => el.type === ElementType.CONDITION);

    // Save pages
    pages.forEach(page => {
      if (page.properties.page_id) {
        operations.push(this.updatePage(page));
      } else if (!page.properties.useExisting) {
        operations.push(this.createPage(page));
      }
    });

    // Save categories
    categories.forEach(category => {
      if (category.properties.category_id) {
        operations.push(this.updateCategory(category));
      } else if (!category.properties.useExisting) {
        operations.push(this.createCategory(category));
      }
    });

    // Save fields
    fields.forEach(field => {
      if (field.properties._field_id) {
        operations.push(this.updateField(field));
      } else if (!field.properties.useExisting) {
        operations.push(this.createField(field));
      }
    });

    // Save conditions
    conditions.forEach(condition => {
      if (condition.properties.condition_id) {
        operations.push(this.updateCondition(condition));
      } else {
        operations.push(this.createCondition(condition));
      }
    });

    return operations;
  }

  // Execute save operations
  private executeSaveOperations(operations: Observable<any>[]): Observable<any> {
    if (operations.length === 0) {
      return this.saveToLocalStorage();
    }

    return forkJoin(operations).pipe(
      map(results => {
        this.saveToLocalStorage();

        if (this.currentWorkflow.metadata) {
          this.currentWorkflow.metadata.updated_at = new Date().toISOString();
          this.currentWorkflow.metadata.is_existing = true;
        }

        return {
          success: true,
          message: 'Workflow saved successfully',
          results
        };
      }),
      catchError(error => {
        console.error('Error saving workflow:', error);
        return this.saveToLocalStorage();
      })
    );
  }

  // CRUD operations for individual elements
  private createPage(page: WorkflowElement): Observable<any> {
    const payload = this.mapPageProperties(page);

    return this.apiService.createPage(payload).pipe(
      map(response => {
        page.properties.page_id = response.id;
        return response;
      }),
      catchError(error => {
        console.error('Failed to create page:', error);
        return of(null);
      })
    );
  }

  private updatePage(page: WorkflowElement): Observable<any> {
    const pageId = page.properties.page_id;
    if (!pageId) {
      console.error('Cannot update page without page_id');
      return of(null);
    }

    const payload = this.mapPageProperties(page);
    return this.apiService.updatePage(pageId, payload).pipe(
      catchError(error => {
        console.error('Failed to update page:', error);
        return of(null);
      })
    );
  }

  private createCategory(category: WorkflowElement): Observable<any> {
    const payload = this.mapCategoryProperties(category);

    console.log('Creating category with payload:', payload);

    return this.apiService.createCategory(payload).pipe(
      map(response => {
        category.properties.category_id = response.id;
        // Update the local workflow immediately
        this.updateWorkflow();
        return response;
      }),
      catchError(error => {
        console.error('Failed to create category:', error);
        return of(null);
      })
    );
  }

  private updateCategory(category: WorkflowElement): Observable<any> {
    const categoryId = category.properties.category_id;
    if (!categoryId) {
      console.error('Cannot update category without category_id');
      return of(null);
    }

    const payload = this.mapCategoryProperties(category);
    return this.apiService.updateCategory(categoryId, payload).pipe(
      catchError(error => {
        console.error('Failed to update category:', error);
        return of(null);
      })
    );
  }


  private createField(field: WorkflowElement): Observable<any> {
    const payload = this.mapFieldProperties(field);

    return this.apiService.createField(payload).pipe(
      map(response => {
        field.properties._field_id = response.id;
        return response;
      }),
      catchError(error => {
        console.error('Failed to create field:', error);
        return of(null);
      })
    );
  }

  private updateField(field: WorkflowElement): Observable<any> {
    const fieldId = field.properties._field_id;
    if (!fieldId) {
      console.error('Cannot update field without _field_id');
      return of(null);
    }

    const payload = this.mapFieldProperties(field);
    return this.apiService.updateField(fieldId, payload).pipe(
      catchError(error => {
        console.error('Failed to update field:', error);
        return of(null);
      })
    );
  }


  private createCondition(condition: WorkflowElement): Observable<any> {
    const payload = this.mapConditionProperties(condition);

    return this.apiService.createCondition(payload).pipe(
      map(response => {
        condition.properties.condition_id = response.id;
        return response;
      }),
      catchError(error => {
        console.error('Failed to create condition:', error);
        return of(null);
      })
    );
  }

  private updateCondition(condition: WorkflowElement): Observable<any> {
    const conditionId = condition.properties.condition_id;
    if (!conditionId) {
      console.error('Cannot update condition without condition_id');
      return of(null);
    }

    const payload = this.mapConditionProperties(condition);
    return this.apiService.updateCondition(conditionId, payload).pipe(
      catchError(error => {
        console.error('Failed to update condition:', error);
        return of(null);
      })
    );
  }

  // Property mapping methods
  private mapPageProperties(element: WorkflowElement): any {
    const properties = element.properties;

    const mapped: any = {
      name: properties['name'] !== undefined ? properties['name'] : '',
      name_ara: properties['name_ara'] !== undefined ? properties['name_ara'] : '',
      description: properties['description'] !== undefined ? properties['description'] : '',
      description_ara: properties['description_ara'] !== undefined ? properties['description_ara'] : '',
      active_ind: properties['active_ind'] !== false,
      position_x: element.position?.x || 0,
      position_y: element.position?.y || 0,
      is_expanded: element.isExpanded || false,
      workflow: this.workflowId ? this.toNumber(this.workflowId) : undefined
    };

    // Handle service
    const serviceValue = properties['service_id'] !== undefined ? properties['service_id'] : properties['service'];
    if (serviceValue !== undefined && serviceValue !== null && serviceValue !== '') {
      const numericValue = this.toNumber(serviceValue);
      if (numericValue > 0) {
        mapped.service = numericValue;
      }
    }

    // Handle sequence_number
    const sequenceValue = properties['sequence_number_id'] !== undefined ? properties['sequence_number_id'] : properties['sequence_number'];
    if (sequenceValue !== undefined && sequenceValue !== null && sequenceValue !== '') {
      const numericValue = this.toNumber(sequenceValue);
      if (numericValue > 0) {
        mapped.sequence_number = numericValue;
      }
    }

    // Handle applicant_type
    const applicantValue = properties['applicant_type_id'] !== undefined ? properties['applicant_type_id'] : properties['applicant_type'];
    if (applicantValue !== undefined && applicantValue !== null && applicantValue !== '') {
      const numericValue = this.toNumber(applicantValue);
      if (numericValue > 0) {
        mapped.applicant_type = numericValue;
      }
    }

    console.log('Mapped page properties in workflow service:', mapped);
    return mapped;
  }

  private mapCategoryProperties(category: WorkflowElement): any {
    const parentPage = this.findParentPage(category);
    const pageId = parentPage?.properties['page_id'];

    return {
      name: category.properties['name'],
      name_ara: category.properties['name_ara'],
      description: category.properties['description'],
      code: category.properties['code'],
      is_repeatable: category.properties['is_repeatable'],
      page: pageId ? [pageId] : category.properties['page_ids'] || [],
      active_ind: category.properties['active_ind'] !== false,
      relative_position_x: category.position?.x || 0,
      relative_position_y: category.position?.y || 0,
      workflow: this.workflowId ? this.toNumber(this.workflowId) : undefined
    };
  }

  private mapFieldProperties(field: WorkflowElement): any {
    const parentCategory = this.currentWorkflow.elements.find(el => el.id === field.parentId);
    const categoryId = parentCategory?.properties.category_id;
    const parentPage = this.findParentPage(field);
    const serviceId = parentPage?.properties.service_id || parentPage?.properties.service;

    const mapped: any = {
      _field_name: field.properties['_field_name'],
      _field_display_name: field.properties['_field_display_name'],
      _field_display_name_ara: field.properties['_field_display_name_ara'],
      _field_type: this.toNumber(field.properties['field_type_id'] || field.properties['_field_type']),
      _sequence: field.properties['_sequence'] !== undefined ? this.toNumber(field.properties['_sequence']) : undefined,
      _mandatory: field.properties['_mandatory'] === true,
      _is_hidden: field.properties['_is_hidden'] === true,
      _is_disabled: field.properties['_is_disabled'] === true,
      _lookup: this.toNumberOrNull(field.properties['lookup_id'] || field.properties['_lookup']),
      _parent_field: this.toNumberOrNull(field.properties['parent_field_id'] || field.properties['_parent_field']),
      _category: categoryId ? [this.toNumber(categoryId)] : (field.properties['category_ids'] || []).map((id: any) => this.toNumber(id)),
      service: serviceId ? [this.toNumber(serviceId)] : (field.properties['service_ids'] || []).map((id: any) => this.toNumber(id)),
      active_ind: field.properties['active_ind'] !== false,
      allowed_lookups: field.properties['allowed_lookups'] || [],
      relative_position_x: field.position?.x || 0,
      relative_position_y: field.position?.y || 0,
      workflow: this.workflowId ? this.toNumber(this.workflowId) : undefined
    };

// Add validation properties
    const validationProps = [
      '_max_length', '_min_length', '_regex_pattern', '_allowed_characters',
      '_forbidden_words', '_value_greater_than', '_value_less_than',
      '_integer_only', '_positive_only', '_precision', '_default_boolean',
      '_file_types', '_max_file_size', '_image_max_width', '_image_max_height',
      '_max_selections', '_min_selections', '_date_greater_than', '_date_less_than',
      '_future_only', '_past_only', '_unique', '_default_value',
      '_coordinates_format', '_uuid_format'
    ];

    validationProps.forEach(prop => {
      if (field.properties[prop] !== undefined && field.properties[prop] !== null) {
        mapped[prop] = field.properties[prop];
      }
    });

    return mapped;
  }

  private mapConditionProperties(condition: WorkflowElement): any {
    // Use target_field_id directly if available
    const targetFieldId = this.toNumber(condition.properties['target_field_id']);

    return {
      target_field: targetFieldId || 0, // API expects field ID as target_field
      condition_logic: condition.properties['condition_logic'] || [],
      active_ind: condition.properties['active_ind'] !== false,
      position_x: condition.position?.x || 0,
      position_y: condition.position?.y || 0,
      workflow: this.workflowId ? this.toNumber(this.workflowId) : undefined
    };
  }

  // Helper methods
  private toNumber(value: any): number {
    if (value === null || value === undefined || value === '') {
      return 0;
    }
    if (typeof value === 'number') {
      return value;
    }
    if (typeof value === 'string' && /^\d+$/.test(value)) {
      return parseInt(value, 10);
    }
    return 0;
  }

  private toNumberOrNull(value: any): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }
    if (typeof value === 'number') {
      return value;
    }
    if (typeof value === 'string' && /^\d+$/.test(value)) {
      return parseInt(value, 10);
    }
    return null;
  }

  private findParentPage(element: WorkflowElement): WorkflowElement | undefined {
    let current = element;
    while (current.parentId) {
      const parent = this.currentWorkflow.elements.find(el => el.id === current.parentId);
      if (!parent) break;
      if (parent.type === ElementType.PAGE) return parent;
      current = parent;
    }
    return undefined;
  }

  // Update local IDs after save
// Update local IDs after save
  private updateLocalIds(response: any): void {
    // If response contains the complete workflow, update from that
    if (response.elements && Array.isArray(response.elements)) {
      // Update the entire workflow with the response
      this.currentWorkflow.elements = response.elements;
      this.currentWorkflow.connections = response.connections || [];

      if (response.canvas_state) {
        this.currentWorkflow.viewMode = response.canvas_state.viewMode || 'collapsed';
        this.currentWorkflow.expandedElementId = response.canvas_state.expandedElementId;
      }

      return;
    }

    // Legacy format - update individual IDs
    const idMapping = new Map<string, number>();

    response.pages?.forEach((page: any) => {
      const localPage = this.currentWorkflow.elements.find(
        el => el.properties.page_id === page.id || el.properties.name === page.name
      );
      if (localPage) {
        localPage.properties.page_id = page.id;
        idMapping.set(localPage.id, page.id);
      }
    });

    response.categories?.forEach((category: any) => {
      const localCategory = this.currentWorkflow.elements.find(
        el => el.properties.category_id === category.id || el.properties.name === category.name
      );
      if (localCategory) {
        localCategory.properties.category_id = category.id;
        idMapping.set(localCategory.id, category.id);
      }
    });

    response.fields?.forEach((field: any) => {
      const localField = this.currentWorkflow.elements.find(
        el => el.properties._field_id === field.id || el.properties._field_name === field._field_name
      );
      if (localField) {
        localField.properties._field_id = field.id;
        idMapping.set(localField.id, field.id);
      }
    });

    response.conditions?.forEach((condition: any) => {
      const localCondition = this.currentWorkflow.elements.find(
        el => el.properties.condition_id === condition.id
      );
      if (localCondition) {
        localCondition.properties.condition_id = condition.id;
        idMapping.set(localCondition.id, condition.id);
      }
    });
  }
  // Clear deleted elements tracking
  private clearDeletedElements(): void {
    this.deletedElements = {
      pages: [],
      categories: [],
      fields: [],
      conditions: []
    };
  }

  // Save to local storage
  private saveToLocalStorage(): Observable<any> {
    const savedData = JSON.stringify(this.currentWorkflow, null, 2);
    localStorage.setItem('current_workflow', savedData);
    return of({ success: true, data: this.currentWorkflow });
  }

  // Create new workflow
  createNewWorkflow(name: string = 'New Workflow'): Observable<any> {
    if (this.apiService.isConfigured()) {
      const workflowData = {
        name,
        description: '',
        service_code: this.currentServiceCode,
        is_draft: true,
        metadata: {
          created_at: new Date().toISOString(),
          version: '1.0'
        }
      };

      return this.apiService.createWorkflow(workflowData).pipe(
        tap(response => {
          this.workflowId = response.id;
          this.currentWorkflow = {
            id: response.id,
            name: response.name,
            description: response.description,
            elements: [],
            connections: [],
            viewMode: 'collapsed',
            metadata: {
              ...response.metadata,
              workflow_id: response.id
            }
          };
          this.currentServiceCode = response.service_code;
          this.initializeWithStartElement();
          this.updateWorkflow();
        }),
        catchError(() => {
          return this.createNewWorkflowLocally(name);
        })
      );
    }

    return this.createNewWorkflowLocally(name);
  }

  // Create new workflow locally
  private createNewWorkflowLocally(name: string): Observable<any> {
    this.currentWorkflow = {
      name,
      elements: [],
      connections: [],
      viewMode: 'collapsed'
    };
    this.currentServiceCode = undefined;
    this.workflowId = undefined;
    this.initializeWithStartElement();
    return of({ success: true });
  }

  // Load workflow by ID
  loadWorkflowById(workflowId: string): Observable<WorkflowData> {
    return this.apiService.getWorkflow(workflowId).pipe(
      map(response => {
        console.log('Loading workflow response:', response);

        this.workflowId = response.id;
        this.currentServiceCode = response.service_code;

        // Check if response already has elements and connections (new format)
        if (response.elements && Array.isArray(response.elements)) {
          console.log('Loading new format with elements:', response.elements);
          console.log('Loading connections:', response.connections);

          // New format - use elements directly but ensure proper format
          const workflowData: WorkflowData = {
            id: response.id,
            name: response.name,
            description: response.description,
            elements: response.elements.map((el: any) => {
              // Ensure proper structure for all element types
              const elementPosition = el.position || { x: el.position_x || 100, y: el.position_y || 100 };

              if (el.type === 'page') {
                const pageProperties: any = {};

                // Copy all page-specific fields to properties
                const pageFields = [
                  'page_id', 'name', 'name_ara', 'description', 'description_ara',
                  'service', 'service_id', 'service_name', 'service_code',
                  'sequence_number', 'sequence_number_id', 'sequence_number_name', 'sequence_number_code',
                  'applicant_type', 'applicant_type_id', 'applicant_type_name', 'applicant_type_code',
                  'is_hidden_page', 'active_ind'
                ];

                pageFields.forEach(field => {
                  if (el[field] !== undefined) {
                    pageProperties[field] = el[field];
                  }
                });

                return {
                  ...el,
                  position: elementPosition,
                  properties: { ...pageProperties, ...(el.properties || {}) },
                  children: el.children || [],
                  isExpanded: el.is_expanded || el.isExpanded || false,
                  parentId: el.parent_id || el.parentId || undefined
                };
              } else if (el.type === 'category') {
                return {
                  ...el,
                  position: elementPosition,
                  properties: {
                    category_id: el.category_id || el.id,
                    name: el.name || '',
                    name_ara: el.name_ara || '',
                    code: el.code || '',
                    description: el.description || '',
                    is_repeatable: el.is_repeatable || false,
                    active_ind: el.active_ind !== false,
                    ...(el.properties || {})
                  },
                  children: el.children || [],
                  isExpanded: el.is_expanded || el.isExpanded || false,
                  parentId: el.parent_id || el.parentId || undefined
                };
              } else if (el.type === 'field') {
                return {
                  ...el,
                  position: elementPosition,
                  properties: {
                    _field_id: el._field_id || el.field_id || el.id,
                    _field_name: el._field_name || el.field_name || '',
                    _field_display_name: el._field_display_name || el.field_display_name || '',
                    _field_display_name_ara: el._field_display_name_ara || el.field_display_name_ara || '',
                    _field_type: el._field_type || el.field_type || '',
                    _sequence: el._sequence || el.sequence,
                    _mandatory: el._mandatory || el.mandatory || false,
                    _is_hidden: el._is_hidden || el.is_hidden || false,
                    _is_disabled: el._is_disabled || el.is_disabled || false,
                    active_ind: el.active_ind !== false,
                    ...(el.properties || {})
                  },
                  parentId: el.parent_id || el.parentId || undefined
                };
              }

// For other element types, use as is
              return {
                ...el,
                position: elementPosition,
                parentId: el.parent_id || el.parentId || undefined
              };
            }),
            connections: response.connections || [],
            viewMode: response.canvas_state?.viewMode || 'collapsed',
            expandedElementId: response.canvas_state?.expandedElementId,
            metadata: {
              ...response.metadata,
              workflow_id: response.id,
              service_code: response.service_code,
              service_id: response.service,
              created_at: response.created_at,
              updated_at: response.updated_at,
              is_existing: true,
              is_draft: response.is_draft,
              version: response.version
            }
          };

          // Update parent counts for all elements
          this.updateAllParentCounts(workflowData);

          this.currentWorkflow = workflowData;
          this.updateWorkflow();

          return workflowData;
        } else {
          // Legacy format - convert from separate arrays
          const workflowData: WorkflowData = {
            id: response.id,
            name: response.name,
            description: response.description,
            elements: [],
            connections: [],
            viewMode: response.canvas_state?.viewMode || 'collapsed',
            metadata: {
              ...response.metadata,
              workflow_id: response.id,
              created_at: response.created_at,
              updated_at: response.updated_at,
              is_existing: true
            }
          };

          this.convertBackendElementsToWorkflow(response, workflowData);
          this.currentWorkflow = workflowData;
          this.updateWorkflow();

          return workflowData;
        }
      })
    );
  }
  // Load service flow from API
  loadServiceFlowFromApi(serviceCode: string): Observable<WorkflowData> {
    return this.apiService.getServiceFlow(serviceCode).pipe(
      switchMap((serviceFlow: ServiceFlow) => {
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
                service_id: serviceId,
                is_existing: true
              }
            };

            this.convertServiceFlowToElements(serviceFlow, workflowData, serviceId);
            this.currentWorkflow = workflowData;
            this.updateWorkflow();

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

  // Convert backend response to workflow format
  private convertBackendElementsToWorkflow(response: any, workflowData: WorkflowData): void {
    // Create ID mapping for connections
    const idMapping: { [key: string]: string } = {};

    // Add start element
    const startId = 'start';
    idMapping['start'] = startId;
    workflowData.elements.push({
      id: startId,
      type: ElementType.START,
      position: { x: 100, y: 100 },
      properties: { name: 'Start' },
      connections: []
    });

    // Convert pages
// Convert pages - maintain proper spacing if positions are not saved
    let defaultXPosition = 350;

    console.log('Converting pages from response:', response.pages);
    console.log('All categories:', response.categories);
    console.log('All fields:', response.fields);

    response.pages?.forEach((page: any, index: number) => {
      const pageElementId = `page-${page.id}`;
      idMapping[`page-${page.id}`] = pageElementId;
      idMapping[page.id.toString()] = pageElementId; // Map backend ID to frontend ID

      // Use saved position or calculate default position with spacing
      const xPosition = page.position_x || (defaultXPosition + (index * 300));
      const yPosition = page.position_y || 100;

      const pageElement: WorkflowElement = {
        id: pageElementId,
        type: ElementType.PAGE,
        position: { x: xPosition, y: yPosition },
        properties: {
          page_id: page.id,
          name: page.name,
          name_ara: page.name_ara,
          description: page.description,
          description_ara: page.description_ara,
          service: page.service,
          sequence_number: page.sequence_number,
          applicant_type: page.applicant_type,
          service_id: page.service_id,
          service_name: page.service_name,
          sequence_number_id: page.sequence_number_id,
          sequence_number_name: page.sequence_number_name,
          applicant_type_id: page.applicant_type_id,
          applicant_type_name: page.applicant_type_name,
          active_ind: page.active_ind !== false
        },
        connections: [],
        isExpanded: page.is_expanded || false,  // Make sure this is set
        children: []
      };
      workflowData.elements.push(pageElement);

      // Debug log
      console.log(`Created page element:`, pageElement);

// Convert categories - fix property name and handle objects
      console.log(`Looking for categories for page ${page.id}`);

      const pageCategories = response.categories?.filter((cat: any) => {
        console.log(`Checking category ${cat.id} with pages data:`, cat.pages);

        // The 'pages' field (plural!) is an array of objects with id, name, code
        if (cat.pages && Array.isArray(cat.pages)) {
          const belongsToPage = cat.pages.some((p: any) => p.id === page.id);
          console.log(`Category ${cat.id} belongs to page ${page.id}:`, belongsToPage);
          return belongsToPage;
        }
        return false;
      }) || [];

      console.log(`Found ${pageCategories.length} categories for page ${page.id}`);

      console.log(`Found ${pageCategories.length} categories for page ${page.id}`);

      pageCategories.forEach((category: any) => {
        const categoryElementId = `category-${category.id}`;
        idMapping[`category-${category.id}`] = categoryElementId;
        idMapping[category.id.toString()] = categoryElementId;

        const categoryElement: WorkflowElement = {
          id: categoryElementId,
          type: ElementType.CATEGORY,
          position: {
            x: category.relative_position_x || 0,
            y: category.relative_position_y || 0
          },
          properties: {
            category_id: category.id,
            name: category.name,
            name_ara: category.name_ara,
            is_repeatable: category.is_repeatable,
            description: category.description,
            code: category.code,
            active_ind: category.active_ind !== false
          },
          connections: [],
          parentId: pageElement.id,
          children: [],
          isExpanded: false
        };
        workflowData.elements.push(categoryElement);

        // Ensure parent has children array
        if (!pageElement.children) {
          pageElement.children = [];
        }
        pageElement.children.push(categoryElement.id);

        console.log(`Added category ${categoryElement.id} to page ${pageElement.id}`);

        // Convert fields - fix property name and handle objects
        const categoryFields = response.fields?.filter((field: any) => {
          console.log(`Checking field ${field.id} with categories data:`, field.categories);

          // The 'categories' field is an array of objects with id, name, code
          if (field.categories && Array.isArray(field.categories)) {
            const belongsToCategory = field.categories.some((c: any) => c.id === category.id);
            console.log(`Field ${field.id} belongs to category ${category.id}:`, belongsToCategory);
            return belongsToCategory;
          }
          return false;
        }) || [];

        console.log(`Found ${categoryFields.length} fields for category ${category.id}`);

        console.log(`Found ${categoryFields.length} fields for category ${category.id}`);

        categoryFields.forEach((field: any) => {
          const fieldElementId = `field-${field.id}`;
          idMapping[`field-${field.id}`] = fieldElementId;
          idMapping[field.id.toString()] = fieldElementId;

          const fieldElement: WorkflowElement = {
            id: fieldElementId,
            type: ElementType.FIELD,
            position: {
              x: field.relative_position_x || 0,
              y: field.relative_position_y || 0
            },
            properties: this.mapFieldFromBackend(field),
            connections: [],
            parentId: categoryElement.id,
            children: undefined  // Fields don't have children
          };
          workflowData.elements.push(fieldElement);

          // Ensure parent has children array
          if (!categoryElement.children) {
            categoryElement.children = [];
          }
          categoryElement.children.push(fieldElement.id);

          console.log(`Added field ${fieldElement.id} to category ${categoryElement.id}`);
        });
      });
    });

    // Convert conditions
    response.conditions?.forEach((condition: any) => {
      const conditionElementId = `condition-${condition.id}`;
      idMapping[`condition-${condition.id}`] = conditionElementId;
      idMapping[condition.id.toString()] = conditionElementId;

      const conditionElement: WorkflowElement = {
        id: conditionElementId,
        type: ElementType.CONDITION,
        position: { x: condition.position_x || 0, y: condition.position_y || 0 },
        properties: {
          condition_id: condition.id,
          name: `Condition for ${condition.target_field_display_name}`,
          target_field: condition.target_field_name,
          target_field_id: condition.target_field_id,
          condition_logic: condition.condition_logic
        },
        connections: []
      };
      workflowData.elements.push(conditionElement);
    });

// Add end element - position after the last page
    const endId = 'end';
    idMapping['end'] = endId;

    // Calculate end position based on number of pages
    const pageCount = response.pages?.length || 0;
    const endXPosition = 350 + (pageCount * 300) + 300; // After last page + spacing

    workflowData.elements.push({
      id: endId,
      type: ElementType.END,
      position: { x: endXPosition, y: 100 },
      properties: { name: 'End', action: 'submit' },
      connections: []
    });

    // If no connections provided, create default connections
    if (!response.connections || response.connections.length === 0) {
      // Create default connections: start -> first page -> ... -> last page -> end
      const pageElements = workflowData.elements.filter(el => el.type === ElementType.PAGE);

      if (pageElements.length > 0) {
        // Sort pages by sequence number
        pageElements.sort((a, b) => {
          const seqA = a.properties.sequence_number || 0;
          const seqB = b.properties.sequence_number || 0;
          return Number(seqA) - Number(seqB);
        });

        // Connect start to first page
        workflowData.connections.push({
          id: uuidv4(),
          sourceId: startId,
          targetId: pageElements[0].id
        });

        // Connect pages in sequence
        for (let i = 0; i < pageElements.length - 1; i++) {
          workflowData.connections.push({
            id: uuidv4(),
            sourceId: pageElements[i].id,
            targetId: pageElements[i + 1].id
          });
        }

        // Connect last page to end
        workflowData.connections.push({
          id: uuidv4(),
          sourceId: pageElements[pageElements.length - 1].id,
          targetId: endId
        });
      }
    } else {
      // Convert existing connections
      response.connections.forEach((conn: any) => {
        let sourceId: string;
        let targetId: string;

        // Map source
        if (conn.source_type === 'start') {
          sourceId = 'start';  // Use the constant start ID
        } else if (conn.source_type === 'end') {
          sourceId = 'end';    // Use the constant end ID
        } else {
          // For pages, categories, fields, conditions - map by type and ID
          const sourceKey = `${conn.source_type}-${conn.source_id}`;
          sourceId = idMapping[sourceKey];

          if (!sourceId) {
            console.warn(`Could not find source mapping for ${sourceKey}`);
            return; // Skip this connection if source not found
          }
        }

        // Map target
        if (conn.target_type === 'end') {
          targetId = 'end';    // Use the constant end ID
        } else if (conn.target_type === 'start') {
          targetId = 'start';  // Use the constant start ID
        } else {
          // For pages, categories, fields, conditions - map by type and ID
          const targetKey = `${conn.target_type}-${conn.target_id}`;
          targetId = idMapping[targetKey];

          if (!targetId) {
            console.warn(`Could not find target mapping for ${targetKey}`);
            return; // Skip this connection if target not found
          }
        }

        console.log(`Mapping connection: ${conn.source_type}-${conn.source_id} -> ${conn.target_type}-${conn.target_id} as ${sourceId} -> ${targetId}`);

        workflowData.connections.push({
          id: conn.id || uuidv4(),
          sourceId,
          targetId,
          ...(conn.connection_metadata || {})
        });
      });
    }

    this.updateAllParentCounts(workflowData);
  }

  // Map field from backend
  private mapFieldFromBackend(field: any): ElementProperties {
    return {
      '_field_id': field.id,
      'name': field._field_display_name || field._field_name,
      '_field_name': field._field_name,
      '_field_display_name': field._field_display_name,
      '_field_display_name_ara': field._field_display_name_ara,
      '_field_type': field._field_type,
      'field_type_id': field.field_type_id,
      'field_type_name': field.field_type_name,
      '_mandatory': field._mandatory,
      '_is_hidden': field._is_hidden,
      '_is_disabled': field._is_disabled,
      '_sequence': field._sequence,
      '_lookup': field._lookup,
      'lookup_id': field.lookup_id,
      'lookup_name': field.lookup_name,
      '_max_length': field._max_length,
      '_min_length': field._min_length,
      '_regex_pattern': field._regex_pattern,
      '_allowed_characters': field._allowed_characters,
      '_forbidden_words': field._forbidden_words,
      '_value_greater_than': field._value_greater_than,
      '_value_less_than': field._value_less_than,
      '_integer_only': field._integer_only,
      '_positive_only': field._positive_only,
      '_precision': field._precision,
      '_date_greater_than': field._date_greater_than,
      '_date_less_than': field._date_less_than,
      '_future_only': field._future_only,
      '_past_only': field._past_only,
      '_file_types': field._file_types,
      '_max_file_size': field._max_file_size,
      '_image_max_width': field._image_max_width,
      '_image_max_height': field._image_max_height,
      '_default_boolean': field._default_boolean,
      '_max_selections': field._max_selections,
      '_min_selections': field._min_selections,
      '_unique': field._unique,
      '_default_value': field._default_value,
      '_coordinates_format': field._coordinates_format,
      '_uuid_format': field._uuid_format,
      'active_ind': field.active_ind !== false
    };
  }

  // Convert service flow to workflow elements
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

    // Track conditions to add after pages
    const conditionsToAdd: Array<{
      element: WorkflowElement;
      pageId: string;
      fieldName: string;
    }> = [];

    // Convert pages
    serviceFlow.pages?.forEach((page: any, pageIndex: number) => {
      const pageElementId = `page-${page.page_id || pageIndex}`;
      const pageElement = this.createPageElement(page, pageElementId, xPosition, pageIndex, serviceId);

      workflowData.elements.push(pageElement);

      // Connect to previous element
      workflowData.connections.push({
        id: `conn-${previousElementId}-${pageElementId}`,
        sourceId: previousElementId,
        targetId: pageElementId
      });

      // Convert categories
      page.categories?.forEach((category: any, categoryIndex: number) => {
        const categoryElement = this.createCategoryElement(category, categoryIndex, pageElementId, page.page_id);
        workflowData.elements.push(categoryElement);
        pageElement.children!.push(categoryElement.id);

        // Convert fields
        category.fields?.forEach((field: any, fieldIndex: number) => {
          if (!field) return;

          const fieldElement = this.createFieldElement(field, fieldIndex, categoryElement.id, category.id);

          // Ensure field element has all required properties
          fieldElement.properties = {
            ...fieldElement.properties,
            // Map service and category arrays
            service_ids: field.service || field.services || [serviceId].filter(Boolean),
            category_ids: field._category || field.categories || [category.id].filter(Boolean),
            // Ensure all IDs are properly set
            service: field.service || [serviceId].filter(Boolean),
            _category: field._category || [category.id].filter(Boolean)
          };

          workflowData.elements.push(fieldElement);
          categoryElement.children!.push(fieldElement.id);

          // Collect visibility conditions
          field.visibility_conditions?.forEach((condition: any, conditionIndex: number) => {
            if (!condition) return;

            const conditionElement = this.createConditionElement(
              condition,
              field,
              fieldIndex,
              conditionIndex
            );

            conditionsToAdd.push({
              element: conditionElement,
              pageId: pageElementId,
              fieldName: field.display_name || field.name
            });
          });
        });

        categoryElement.properties.fieldCount = categoryElement.children!.length;
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

      previousElementId = pageElementId;
      xPosition += 300;
    });

    // Position and add conditions
    this.positionAndAddConditions(conditionsToAdd, workflowData);

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

  // Create page element
  private createPageElement(page: any, elementId: string, xPosition: number, pageIndex: number, serviceId?: number): WorkflowElement {
    const sequenceNumberData = this.extractLookupData(page.sequence_number);
    const applicantTypeData = this.extractLookupData(page.applicant_type);
    const serviceData = this.extractLookupData(page.service);

    return {
      id: elementId,
      type: ElementType.PAGE,
      position: { x: xPosition, y: 100 },
      properties: {
        name: page.name || `Page ${pageIndex + 1}`,
        name_ara: page.name_ara,
        description: page.description,
        description_ara: page.description_ara,
        sequence_number: page.sequence_number_id || sequenceNumberData.id || page.sequence_number,
        sequence_number_id: page.sequence_number_id || sequenceNumberData.id,
        sequence_number_code: page.sequence_number_code || sequenceNumberData.code || page.sequence_number,
        sequence_number_name: page.sequence_number_name || sequenceNumberData.name,
        page_id: page.page_id,
        is_hidden_page: page.is_hidden_page || false,
        categoryCount: 0,
        fieldCount: 0,
        service: page.service_id || serviceData.id || serviceId || page.service,
        service_id: page.service_id || serviceData.id || serviceId,
        service_code: page.service_code || serviceData.code,
        service_name: page.service_name || serviceData.name,
        applicant_type: page.applicant_type_id || applicantTypeData.id || page.applicant_type,
        applicant_type_id: page.applicant_type_id || applicantTypeData.id,
        applicant_type_code: page.applicant_type_code || applicantTypeData.code,
        applicant_type_name: page.applicant_type_name || applicantTypeData.name,
        active_ind: page.active_ind !== false
      },
      connections: [],
      children: [],
      isExpanded: false
    };
  }

  // Create category element
  private createCategoryElement(category: any, categoryIndex: number, pageElementId: string, pageId: number): WorkflowElement {
    return {
      id: `category-${category?.id || categoryIndex}`,
      type: ElementType.CATEGORY,
      position: { x: 0, y: 0 },
      properties: {
        name: category.name || `Category ${categoryIndex + 1}`,
        name_ara: category.name_ara,
        category_id: category.id,
        is_repeatable: category.repeatable || category.is_repeatable || false,
        fieldCount: 0,
        description: category.description,
        code: category.code,
        active_ind: category.active_ind !== false,
        page_ids: category.page_ids || [pageId]
      },
      connections: [],
      parentId: pageElementId,
      children: [],
      isExpanded: false
    };
  }

  // Create field element
  private createFieldElement(field: any, fieldIndex: number, categoryElementId: string, categoryId: number): WorkflowElement {
    const fieldTypeId = this.extractIdFromValue(field.field_type);
    const lookupId = this.extractIdFromValue(field.lookup);

    return {
      id: `field-${field?.field_id || fieldIndex}`,
      type: ElementType.FIELD,
      position: { x: 0, y: 0 },
      properties: {
        name: field.display_name || field._field_display_name || field.name || field._field_name || `Field ${fieldIndex + 1}`,
        '_field_name': field._field_name || field.name,
        '_field_display_name': field._field_display_name || field.display_name,
        '_field_display_name_ara': field._field_display_name_ara || field.display_name_ara,
        '_field_type': field.field_type_id || fieldTypeId || field._field_type || field.field_type,
        'field_type_id': field.field_type_id,
        'field_type_name': field.field_type_name,
        'field_type_code': field.field_type_code,
        '_field_id': field._field_id || field.field_id || field.id,
        '_mandatory': field._mandatory !== undefined ? field._mandatory : (field.mandatory || false),
        '_is_hidden': field._is_hidden !== undefined ? field._is_hidden : (field.is_hidden || false),
        '_is_disabled': field._is_disabled !== undefined ? field._is_disabled : (field.is_disabled || false),
        '_lookup': field.lookup_id || lookupId || field._lookup || field.lookup,
        'lookup_id': field.lookup_id,
        'lookup_name': field.lookup_name,
        'lookup_code': field.lookup_code,
        '_sequence': field._sequence || field.sequence || fieldIndex,
        '_parent_field': field.parent_field_id || field._parent_field,
        'parent_field_id': field.parent_field_id,
        'parent_field_name': field.parent_field_name,
        '_max_length': field._max_length !== undefined ? field._max_length : field.max_length,
        '_min_length': field._min_length !== undefined ? field._min_length : field.min_length,
        '_regex_pattern': field._regex_pattern || field.regex_pattern,
        '_allowed_characters': field._allowed_characters || field.allowed_characters,
        '_forbidden_words': field._forbidden_words || field.forbidden_words,
        '_value_greater_than': field._value_greater_than !== undefined ? field._value_greater_than : field.value_greater_than,
        '_value_less_than': field._value_less_than !== undefined ? field._value_less_than : field.value_less_than,
        '_integer_only': field._integer_only !== undefined ? field._integer_only : field.integer_only,
        '_positive_only': field._positive_only !== undefined ? field._positive_only : field.positive_only,
        '_precision': field._precision !== undefined ? field._precision : field.precision,
        '_date_greater_than': field._date_greater_than || field.date_greater_than,
        '_date_less_than': field._date_less_than || field.date_less_than,
        '_future_only': field._future_only !== undefined ? field._future_only : field.future_only,
        '_past_only': field._past_only !== undefined ? field._past_only : field.past_only,
        '_file_types': field._file_types || field.file_types,
        '_max_file_size': field._max_file_size !== undefined ? field._max_file_size : field.max_file_size,
        '_image_max_width': field._image_max_width !== undefined ? field._image_max_width : field.image_max_width,
        '_image_max_height': field._image_max_height !== undefined ? field._image_max_height : field.image_max_height,
        '_default_boolean': field._default_boolean !== undefined ? field._default_boolean : field.default_boolean,
        '_max_selections': field._max_selections !== undefined ? field._max_selections : field.max_selections,
        '_min_selections': field._min_selections !== undefined ? field._min_selections : field.min_selections,
        '_unique': field._unique !== undefined ? field._unique : field.unique,
        '_default_value': field._default_value || field.default_value,
        '_coordinates_format': field._coordinates_format !== undefined ? field._coordinates_format : field.coordinates_format,
        '_uuid_format': field._uuid_format !== undefined ? field._uuid_format : field.uuid_format,
        'allowed_lookups': field.allowed_lookups || [],
        'service_ids': field.service || field.services || [],
        'category_ids': field._category || field.categories || [categoryId],
        'active_ind': field.active_ind !== false
      },
      connections: [],
      parentId: categoryElementId
    };
  }

  // Create condition element
  private createConditionElement(condition: any, field: any, fieldIndex: number, conditionIndex: number): WorkflowElement {
    return {
      id: `condition-${field.field_id || fieldIndex}-${conditionIndex}`,
      type: ElementType.CONDITION,
      position: { x: 0, y: 0 },
      properties: {
        name: `Condition for ${field.display_name || field.name || 'Unknown Field'}`,
        target_field: field.name || '',
        target_field_id: field.field_id || null,
        condition_logic: condition?.condition_logic || [],
        condition_id: condition?.id || null
      },
      connections: []
    };
  }

  // Position and add conditions
  private positionAndAddConditions(conditionsToAdd: any[], workflowData: WorkflowData): void {
    const pageConditions: { [pageId: string]: any[] } = {};

    conditionsToAdd.forEach(conditionInfo => {
      if (!pageConditions[conditionInfo.pageId]) {
        pageConditions[conditionInfo.pageId] = [];
      }
      pageConditions[conditionInfo.pageId].push(conditionInfo);
    });

    Object.entries(pageConditions).forEach(([pageId, conditions]) => {
      const pageElement = workflowData.elements.find(el => el.id === pageId);
      if (!pageElement) return;

      const baseY = pageElement.position.y + 200;
      const baseX = pageElement.position.x;

      conditions.forEach((conditionInfo, index) => {
        const row = Math.floor(index / 3);
        const col = index % 3;

        conditionInfo.element.position = {
          x: baseX + (col * 80),
          y: baseY + (row * 80)
        };

        workflowData.elements.push(conditionInfo.element);

        workflowData.connections.push({
          id: `conn-${pageId}-${conditionInfo.element.id}`,
          sourceId: pageId,
          targetId: conditionInfo.element.id
        });
      });
    });
  }

  // Extract lookup data from value
  private extractLookupData(value: any): { id: number | null; code: string | null; name: string | null } {
    const data = {
      id: null as number | null,
      code: null as string | null,
      name: null as string | null
    };

    if (!value) return data;

    if (typeof value === 'object') {
      data.id = value.id || null;
      data.code = value.code || null;
      data.name = value.name || null;
    } else if (typeof value === 'string' && !(/^\d+$/.test(value) && value.length > 2)) {
      data.code = value;
    } else if (typeof value === 'number' || /^\d+$/.test(value)) {
      data.id = Number(value);
    } else {
      data.code = value;
    }

    return data;
  }

  // Extract ID from value
  private extractIdFromValue(value: any): any {
    if (value && typeof value === 'object' && 'id' in value) {
      const id = value.id;
      return typeof id === 'string' && /^\d+$/.test(id) ? parseInt(id, 10) : id;
    }
    if (typeof value === 'string' && /^\d+$/.test(value)) {
      return parseInt(value, 10);
    }
    return value;
  }

  // Update all parent counts
  private updateAllParentCounts(workflowData: WorkflowData): void {
    workflowData.elements.forEach(element => {
      if (element.type === ElementType.PAGE && element.children) {
        const categories = element.children
          .map(id => workflowData.elements.find(el => el.id === id))
          .filter(el => el && el.type === ElementType.CATEGORY);

        element.properties.categoryCount = categories.length;

        let totalFields = 0;
        categories.forEach(category => {
          if (category && category.children) {
            totalFields += category.children.length;
          }
        });
        element.properties.fieldCount = totalFields;
      } else if (element.type === ElementType.CATEGORY && element.children) {
        element.properties.fieldCount = element.children.length;
      }
    });
  }

  // Convert workflow to service flow format
  convertWorkflowToServiceFlow(): ServiceFlow | null {
    if (!this.currentServiceCode) {
      console.warn('No service code set, cannot convert to service flow');
      return null;
    }

    const serviceFlow: ServiceFlow = {
      service_code: this.currentServiceCode,
      pages: []
    };

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

  // Load workflow from storage or default
  loadWorkflow(workflowData?: WorkflowData): void {
    if (workflowData) {
      this.currentWorkflow = { ...workflowData };
      this.currentServiceCode = workflowData.metadata?.service_code;
      this.workflowId = workflowData.id;
    } else {
      const savedData = localStorage.getItem('current_workflow');
      if (savedData) {
        try {
          this.currentWorkflow = JSON.parse(savedData);
          this.currentServiceCode = this.currentWorkflow.metadata?.service_code;
          this.workflowId = this.currentWorkflow.id;
        } catch (error) {
          console.error('Error loading workflow from localStorage:', error);
          this.resetWorkflow();
        }
      } else {
        this.resetWorkflow();
      }
    }

    if (!this.currentWorkflow.elements.some(el => el.type === ElementType.START)) {
      this.addStartElementToWorkflow(this.currentWorkflow);
    }

    this.updateWorkflow();
  }

  // Reset workflow
  resetWorkflow(): void {
    this.currentWorkflow = {
      name: 'New Workflow',
      elements: [],
      connections: [],
      viewMode: 'collapsed'
    };
    this.currentServiceCode = undefined;
    this.workflowId = undefined;
    this.clearDeletedElements();
    this.initializeWithStartElement();
  }

  // Clone workflow
  cloneWorkflow(asNewVersion: boolean = false): Observable<any> {
    if (!this.workflowId) {
      return throwError(() => new Error('No workflow to clone'));
    }

    return this.apiService.cloneWorkflow(this.workflowId, {
      name: asNewVersion ? this.currentWorkflow.name : `${this.currentWorkflow.name} (Copy)`,
      as_new_version: asNewVersion
    }).pipe(
      tap(response => {
        this.loadWorkflowById(response.id).subscribe();
      })
    );
  }

  // List workflows
  listWorkflows(filters?: any): Observable<any[]> {
    return this.apiService.getWorkflows(filters);
  }

  // Delete workflow
  deleteWorkflow(): Observable<any> {
    if (this.workflowId) {
      return this.apiService.deleteWorkflow(this.workflowId).pipe(
        tap(() => {
          this.resetWorkflow();
        })
      );
    }

    return this.deleteWorkflowLegacy();
  }

  // Legacy delete workflow
  private deleteWorkflowLegacy(): Observable<any> {
    if (!this.currentServiceCode) {
      localStorage.removeItem('current_workflow');
      this.resetWorkflow();
      return of({ success: true });
    }

    const deleteOperations: Observable<any>[] = [];

    const pages = this.currentWorkflow.elements.filter(el => el.type === ElementType.PAGE && el.properties.page_id);
    const categories = this.currentWorkflow.elements.filter(el => el.type === ElementType.CATEGORY && el.properties.category_id);
    const fields = this.currentWorkflow.elements.filter(el => el.type === ElementType.FIELD && el.properties._field_id);
    const conditions = this.currentWorkflow.elements.filter(el => el.type === ElementType.CONDITION && el.properties.condition_id);

    conditions.forEach(condition => {
      if (condition.properties.condition_id) {
        deleteOperations.push(
          this.apiService.deleteCondition(condition.properties.condition_id).pipe(
            catchError(error => {
              console.error('Failed to delete condition:', error);
              return of(null);
            })
          )
        );
      }
    });

    fields.forEach(field => {
      if (field.properties._field_id) {
        deleteOperations.push(
          this.apiService.deleteField(field.properties._field_id).pipe(
            catchError(error => {
              console.error('Failed to delete field:', error);
              return of(null);
            })
          )
        );
      }
    });

    categories.forEach(category => {
      if (category.properties.category_id) {
        deleteOperations.push(
          this.apiService.deleteCategory(category.properties.category_id).pipe(
            catchError(error => {
              console.error('Failed to delete category:', error);
              return of(null);
            })
          )
        );
      }
    });

    pages.forEach(page => {
      if (page.properties.page_id) {
        deleteOperations.push(
          this.apiService.deletePage(page.properties.page_id).pipe(
            catchError(error => {
              console.error('Failed to delete page:', error);
              return of(null);
            })
          )
        );
      }
    });

    if (deleteOperations.length === 0) {
      localStorage.removeItem('current_workflow');
      this.resetWorkflow();
      return of({ success: true });
    }

    return forkJoin(deleteOperations).pipe(
      map(results => {
        localStorage.removeItem('current_workflow');
        this.resetWorkflow();
        return { success: true, message: 'Workflow deleted successfully' };
      }),
      catchError(error => {
        console.error('Error deleting workflow:', error);
        return throwError(() => error);
      })
    );
  }

  // Validate workflow
  validateWorkflow(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    const startElements = this.currentWorkflow.elements.filter(el => el.type === ElementType.START);
    if (startElements.length === 0) {
      errors.push('Workflow must have a start element');
    } else if (startElements.length > 1) {
      errors.push('Workflow can only have one start element');
    }

    const endElements = this.currentWorkflow.elements.filter(el => el.type === ElementType.END);
    if (endElements.length === 0) {
      errors.push('Workflow must have at least one end element');
    }

    const connectedElements = new Set<string>();
    this.currentWorkflow.connections.forEach(conn => {
      connectedElements.add(conn.sourceId);
      connectedElements.add(conn.targetId);
    });

    const orphanedElements = this.currentWorkflow.elements.filter(
      el => el.type !== ElementType.START &&
        !el.parentId &&
        !connectedElements.has(el.id)
    );

    if (orphanedElements.length > 0) {
      errors.push(`Found ${orphanedElements.length} disconnected elements`);
    }

    this.currentWorkflow.elements.forEach(element => {
      if (canBeContained(element.type) && !element.parentId) {
        errors.push(`${element.type} "${element.properties.name}" must be inside a container`);
      }
    });

    if (this.currentServiceCode) {
      const pageElements = this.currentWorkflow.elements.filter(el => el.type === ElementType.PAGE);
      const pagesWithoutSequence = pageElements.filter(el => !el.properties.sequence_number);
      if (pagesWithoutSequence.length > 0) {
        errors.push(`${pagesWithoutSequence.length} pages are missing sequence numbers`);
      }

      const fieldElements = this.currentWorkflow.elements.filter(el => el.type === ElementType.FIELD);
      const fieldsWithoutType = fieldElements.filter(el => !el.properties._field_type);
      if (fieldsWithoutType.length > 0) {
        errors.push(`${fieldsWithoutType.length} fields are missing field types`);
      }
    }

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

  // Service metadata methods
  setServiceMetadata(metadata: any): void {
    this.serviceMetadata = metadata;
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

  // Utility methods
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
}
