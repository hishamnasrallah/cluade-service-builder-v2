// services/workflow.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { WorkflowData, WorkflowElement, Connection, ElementType, Position } from '../models/workflow.models';
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
