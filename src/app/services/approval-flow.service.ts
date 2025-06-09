// services/approval-flow.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { v4 as uuidv4 } from 'uuid';

import {
  ApprovalFlowData,
  ApprovalFlowElement,
  ApprovalConnection,
  ApprovalElementType,
  Position,
  APPROVAL_ELEMENT_CONFIGS,
  APPROVAL_ELEMENT_VALIDATION_RULES,
  MasterStepData
} from '../models/approval-flow.models';
import { ApprovalFlowApiService } from './approval-flow-api.service';

@Injectable({
  providedIn: 'root'
})
export class ApprovalFlowService {
  private approvalFlowSubject = new BehaviorSubject<ApprovalFlowData>({
    name: 'New Approval Flow',
    elements: [],
    connections: []
  });

  public approvalFlow$ = this.approvalFlowSubject.asObservable();
  private currentApprovalFlow: ApprovalFlowData;
  private currentServiceCode?: string;

  constructor(private approvalFlowApiService: ApprovalFlowApiService) {
    this.currentApprovalFlow = this.approvalFlowSubject.value;
    this.initializeWithStartElement();
  }

  private initializeWithStartElement(): void {
    if (this.currentApprovalFlow.elements.length === 0) {
      const startElement: ApprovalFlowElement = {
        id: uuidv4(),
        type: ApprovalElementType.START,
        position: { x: 100, y: 100 },
        properties: { name: 'Start' },
        connections: []
      };

      this.currentApprovalFlow.elements.push(startElement);
      this.updateApprovalFlow();
    }
  }

  getApprovalFlow(): ApprovalFlowData {
    return { ...this.currentApprovalFlow };
  }

  getCurrentServiceCode(): string | undefined {
    return this.currentServiceCode;
  }

  addElement(type: ApprovalElementType, position: Position, properties: any = {}): ApprovalFlowElement {
    // Check for maximum instances
    const config = APPROVAL_ELEMENT_CONFIGS.find(c => c.type === type);
    if (config?.maxInstances) {
      const existingElements = this.currentApprovalFlow.elements.filter(el => el.type === type);
      if (existingElements.length >= config.maxInstances) {
        throw new Error(`Only ${config.maxInstances} ${type} element(s) allowed`);
      }
    }

    // Generate default name based on type
    const defaultName = this.generateDefaultElementName(type);

    const element: ApprovalFlowElement = {
      id: uuidv4(),
      type,
      position,
      properties: { name: defaultName, ...properties },
      connections: []
    };

    this.currentApprovalFlow.elements.push(element);
    this.updateApprovalFlow();
    return element;
  }

  private generateDefaultElementName(type: ApprovalElementType): string {
    const existingElements = this.currentApprovalFlow.elements.filter(el => el.type === type);
    const count = existingElements.length + 1;

    switch (type) {
      case ApprovalElementType.START:
        return 'Start';
      case ApprovalElementType.APPROVAL_STEP:
        return `Approval Step ${count}`;
      case ApprovalElementType.ACTION_STEP:
        return `Action Step ${count}`;
      case ApprovalElementType.CONDITION_STEP:
        return `Condition ${count}`;
      case ApprovalElementType.PARALLEL_GROUP:
        return `Parallel Group ${count}`;
      case ApprovalElementType.END:
        return `End ${count}`;
      default:
        return `Element ${count}`;
    }
  }

  updateElement(id: string, updates: Partial<ApprovalFlowElement>): void {
    const elementIndex = this.currentApprovalFlow.elements.findIndex(el => el.id === id);
    if (elementIndex !== -1) {
      this.currentApprovalFlow.elements[elementIndex] = {
        ...this.currentApprovalFlow.elements[elementIndex],
        ...updates
      };
      this.updateApprovalFlow();
    }
  }

  removeElement(id: string): void {
    // Don't allow removing start element
    const element = this.currentApprovalFlow.elements.find(el => el.id === id);
    if (element?.type === ApprovalElementType.START) {
      throw new Error('Start element cannot be removed');
    }

    // Remove element
    this.currentApprovalFlow.elements = this.currentApprovalFlow.elements.filter(el => el.id !== id);

    // Remove connections involving this element
    this.currentApprovalFlow.connections = this.currentApprovalFlow.connections.filter(
      conn => conn.sourceId !== id && conn.targetId !== id
    );

    this.updateApprovalFlow();
  }

  addConnection(sourceId: string, targetId: string, actionId?: string): ApprovalConnection {
    // Validate connection rules
    const sourceElement = this.currentApprovalFlow.elements.find(el => el.id === sourceId);
    const targetElement = this.currentApprovalFlow.elements.find(el => el.id === targetId);

    if (!sourceElement || !targetElement) {
      throw new Error('Invalid connection: source or target element not found');
    }

    const sourceConfig = APPROVAL_ELEMENT_CONFIGS.find(c => c.type === sourceElement.type);
    const targetConfig = APPROVAL_ELEMENT_CONFIGS.find(c => c.type === targetElement.type);

    if (!sourceConfig?.canSendConnections) {
      throw new Error(`${sourceElement.type} elements cannot send connections`);
    }

    if (!targetConfig?.canReceiveConnections) {
      throw new Error(`${targetElement.type} elements cannot receive connections`);
    }

    // Check if connection already exists
    const existingConnection = this.currentApprovalFlow.connections.find(
      conn => conn.sourceId === sourceId && conn.targetId === targetId
    );

    if (existingConnection) {
      throw new Error('Connection already exists');
    }

    const connection: ApprovalConnection = {
      id: uuidv4(),
      sourceId,
      targetId,
      actionId
    };

    this.currentApprovalFlow.connections.push(connection);
    this.updateApprovalFlow();
    return connection;
  }

  removeConnection(connectionId: string): void {
    this.currentApprovalFlow.connections = this.currentApprovalFlow.connections.filter(
      conn => conn.id !== connectionId
    );
    this.updateApprovalFlow();
  }

  // Load approval flow from API by service code
  loadApprovalFlowFromApi(serviceCode: string): Observable<ApprovalFlowData> {
    return this.approvalFlowApiService.getApprovalFlow(serviceCode).pipe(
      map((approvalFlow: ApprovalFlowData) => {
        this.currentApprovalFlow = approvalFlow;
        this.currentServiceCode = serviceCode;
        this.updateApprovalFlow();

        console.log('Loaded approval flow from API:', approvalFlow);
        return approvalFlow;
      }),
      catchError(error => {
        console.error('Error loading approval flow from API:', error);
        return throwError(() => error);
      })
    );
  }

  // Load approval flow from master step data
  loadApprovalFlowFromMasterStep(masterStep: MasterStepData): void {
    const approvalFlow = this.approvalFlowApiService.convertMasterStepToApprovalFlow(masterStep);
    this.currentApprovalFlow = approvalFlow;
    this.currentServiceCode = masterStep.service.code;
    this.updateApprovalFlow();
  }

  // Convert current approval flow back to master step format
  convertApprovalFlowToMasterStep(): any {
    if (!this.currentServiceCode) {
      console.warn('No service code set, cannot convert to master step');
      return null;
    }

    const masterStep = {
      service: {
        id: this.currentApprovalFlow.service_type,
        code: this.currentServiceCode,
        name: this.currentApprovalFlow.name.replace('Approval Flow - ', ''),
        name_ara: '',
        active_ind: true
      },
      steps: [] as any[]
    };

    // Group elements by approval steps
    const approvalStepElements = this.currentApprovalFlow.elements.filter(
      el => el.type === ApprovalElementType.APPROVAL_STEP
    );

    approvalStepElements.forEach(stepEl => {
      const step: any = {
        id: stepEl.properties.approval_step || Date.now(),
        service_type: stepEl.properties.service_type,
        seq: stepEl.properties.seq || 1,
        step_type: stepEl.properties.step_type || 2,
        status: stepEl.properties.status,
        group: stepEl.properties.group,
        required_approvals: stepEl.properties.required_approvals,
        priority_approver_groups: (stepEl.properties.priority_approver_groups || []).map((id: number) => ({ id, name: `Group ${id}` })),
        active_ind: stepEl.properties.active_ind !== false,
        actions: [],
        parallel_approval_groups: [],
        approvalstepcondition_set: []
      };

      // Find action steps connected to this approval step
      const actionConnections = this.currentApprovalFlow.connections.filter(conn => conn.sourceId === stepEl.id);
      actionConnections.forEach(actionConn => {
        const actionEl = this.currentApprovalFlow.elements.find(
          el => el.id === actionConn.targetId && el.type === ApprovalElementType.ACTION_STEP
        );
        if (actionEl) {
          step.actions.push({
            id: Date.now() + Math.random(),
            approval_step: step.id,
            action: {
              id: actionEl.properties.action,
              name: actionEl.properties.action_name || actionEl.properties.name,
              name_ara: '',
              code: actionEl.properties.action_code,
              groups: [],
              services: [],
              active_ind: true
            },
            to_status: {
              id: actionEl.properties.to_status,
              name: `Status ${actionEl.properties.to_status}`,
              name_ara: '',
              code: '',
              active_ind: true
            },
            sub_status: actionEl.properties.sub_status ? {
              id: actionEl.properties.sub_status,
              name: `Sub Status ${actionEl.properties.sub_status}`,
              name_ara: '',
              code: '',
              active_ind: true
            } : null,
            active_ind: actionEl.properties.active_ind !== false
          });
        }

        // Find condition steps connected to this approval step
        const conditionEl = this.currentApprovalFlow.elements.find(
          el => el.id === actionConn.targetId && el.type === ApprovalElementType.CONDITION_STEP
        );
        if (conditionEl) {
          step.approvalstepcondition_set.push({
            id: Date.now() + Math.random(),
            approval_step: step.id,
            type: conditionEl.properties.type || 1,
            condition_logic: conditionEl.properties.condition_logic || [],
            to_status: conditionEl.properties.to_status ? {
              id: conditionEl.properties.to_status,
              name: `Status ${conditionEl.properties.to_status}`,
              name_ara: '',
              code: '',
              active_ind: true
            } : null,
            sub_status: conditionEl.properties.sub_status ? {
              id: conditionEl.properties.sub_status,
              name: `Sub Status ${conditionEl.properties.sub_status}`,
              name_ara: '',
              code: '',
              active_ind: true
            } : null,
            active_ind: conditionEl.properties.active_ind !== false
          });
        }

        // Find parallel group elements connected to this approval step
        const parallelEl = this.currentApprovalFlow.elements.find(
          el => el.id === actionConn.targetId && el.type === ApprovalElementType.PARALLEL_GROUP
        );
        if (parallelEl && parallelEl.properties.parallel_groups) {
          parallelEl.properties.parallel_groups.forEach((groupId: number) => {
            step.parallel_approval_groups.push({
              id: Date.now() + Math.random(),
              approval_step: step.id,
              group: {
                id: groupId,
                name: `Group ${groupId}`
              }
            });
          });
        }
      });

      masterStep.steps.push(step);
    });

    // Sort steps by sequence
    masterStep.steps.sort((a, b) => (a.seq || 0) - (b.seq || 0));

    return masterStep;
  }

  // Save current approval flow
  saveApprovalFlow(): Observable<any> {
    if (this.approvalFlowApiService.isConfigured()) {
      return this.approvalFlowApiService.saveApprovalFlow(this.currentApprovalFlow);
    } else {
      // Fallback to localStorage
      return this.saveToLocalStorage();
    }
  }

  private saveToLocalStorage(): Observable<any> {
    const savedData = JSON.stringify(this.currentApprovalFlow, null, 2);
    localStorage.setItem('current_approval_flow', savedData);

    return new Observable(observer => {
      setTimeout(() => {
        observer.next({ success: true, data: this.currentApprovalFlow });
        observer.complete();
      }, 500);
    });
  }

  loadApprovalFlow(approvalFlowData?: ApprovalFlowData): void {
    if (approvalFlowData) {
      this.currentApprovalFlow = { ...approvalFlowData };
      this.currentServiceCode = approvalFlowData.metadata?.service_code;
    } else {
      // Load from localStorage as fallback
      const savedData = localStorage.getItem('current_approval_flow');
      if (savedData) {
        try {
          this.currentApprovalFlow = JSON.parse(savedData);
          this.currentServiceCode = this.currentApprovalFlow.metadata?.service_code;
        } catch (error) {
          console.error('Error loading approval flow from localStorage:', error);
          this.resetApprovalFlow();
        }
      } else {
        this.resetApprovalFlow();
      }
    }

    // Ensure we have a start element
    if (!this.currentApprovalFlow.elements.some(el => el.type === ApprovalElementType.START)) {
      this.addStartElementToApprovalFlow(this.currentApprovalFlow);
    }

    this.updateApprovalFlow();
  }

  resetApprovalFlow(): void {
    this.currentApprovalFlow = {
      name: 'New Approval Flow',
      elements: [],
      connections: []
    };
    this.currentServiceCode = undefined;
    this.initializeWithStartElement();
  }

  // Create a new approval flow with a specific name
  createNewApprovalFlow(name: string = 'New Approval Flow'): void {
    this.currentApprovalFlow = {
      name,
      elements: [],
      connections: []
    };
    this.currentServiceCode = undefined;
    this.initializeWithStartElement();
  }

  private addStartElementToApprovalFlow(approvalFlow: ApprovalFlowData): void {
    const startElement: ApprovalFlowElement = {
      id: uuidv4(),
      type: ApprovalElementType.START,
      position: { x: 100, y: 100 },
      properties: { name: 'Start' },
      connections: []
    };
    approvalFlow.elements.unshift(startElement);
  }

  private updateApprovalFlow(): void {
    this.approvalFlowSubject.next({ ...this.currentApprovalFlow });
  }

  validateApprovalFlow(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check for start element
    const startElements = this.currentApprovalFlow.elements.filter(el => el.type === ApprovalElementType.START);
    if (startElements.length === 0) {
      errors.push('Approval flow must have a start element');
    } else if (startElements.length > 1) {
      errors.push('Approval flow can only have one start element');
    }

    // Check for end elements
    const endElements = this.currentApprovalFlow.elements.filter(el => el.type === ApprovalElementType.END);
    if (endElements.length === 0) {
      errors.push('Approval flow must have at least one end element');
    }

    // Check for orphaned elements (elements with no connections)
    const connectedElements = new Set<string>();
    this.currentApprovalFlow.connections.forEach(conn => {
      connectedElements.add(conn.sourceId);
      connectedElements.add(conn.targetId);
    });

    const orphanedElements = this.currentApprovalFlow.elements.filter(
      el => el.type !== ApprovalElementType.START && !connectedElements.has(el.id)
    );

    if (orphanedElements.length > 0) {
      errors.push(`Found ${orphanedElements.length} disconnected elements`);
    }

    // Validate individual elements using validation rules
    this.currentApprovalFlow.elements.forEach(element => {
      const rules = APPROVAL_ELEMENT_VALIDATION_RULES[element.type] || [];
      rules.forEach(rule => {
        if (rule.validator && !rule.validator(element)) {
          errors.push(rule.message);
        }
      });
    });

    // Approval flow specific validations
    const approvalStepElements = this.currentApprovalFlow.elements.filter(
      el => el.type === ApprovalElementType.APPROVAL_STEP
    );

    // Check for duplicate sequence numbers
    const sequences = approvalStepElements.map(el => el.properties.seq).filter(seq => seq != null);
    const duplicateSequences = sequences.filter((seq, index) => sequences.indexOf(seq) !== index);
    if (duplicateSequences.length > 0) {
      errors.push(`Duplicate sequence numbers found: ${duplicateSequences.join(', ')}`);
    }

    // Check that approval steps have required properties
    approvalStepElements.forEach((element, index) => {
      if (!element.properties.service_type) {
        errors.push(`Approval step ${index + 1} is missing service type`);
      }
      if (!element.properties.status) {
        errors.push(`Approval step ${index + 1} is missing status`);
      }
      if (!element.properties.group) {
        errors.push(`Approval step ${index + 1} is missing group assignment`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Auto-organize elements for better visual layout
  autoOrganizeElements(): void {
    const elements = this.currentApprovalFlow.elements;

    // Sort elements by type hierarchy
    const typeOrder = {
      [ApprovalElementType.START]: 0,
      [ApprovalElementType.APPROVAL_STEP]: 1,
      [ApprovalElementType.ACTION_STEP]: 2,
      [ApprovalElementType.CONDITION_STEP]: 3,
      [ApprovalElementType.PARALLEL_GROUP]: 4,
      [ApprovalElementType.END]: 5
    };

    // Group elements by level
    const levels: { [level: number]: ApprovalFlowElement[] } = {};

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

      // For approval steps, sort by sequence number
      if (level === 1) {
        levelElements.sort((a, b) => (a.properties.seq || 0) - (b.properties.seq || 0));
      }

      let xPosition = 100;

      levelElements.forEach((element, index) => {
        element.position = {
          x: xPosition + (index * elementSpacing),
          y: yPosition
        };
      });

      yPosition += levelSpacing;
    });

    this.updateApprovalFlow();
  }

  // Get element statistics
  getElementStatistics(): { [key: string]: number } {
    const stats: { [key: string]: number } = {};

    this.currentApprovalFlow.elements.forEach(element => {
      stats[element.type] = (stats[element.type] || 0) + 1;
    });

    return stats;
  }

  // Get next sequence number for approval steps
  getNextSequenceNumber(): number {
    const approvalSteps = this.currentApprovalFlow.elements.filter(
      el => el.type === ApprovalElementType.APPROVAL_STEP
    );

    const sequences = approvalSteps
      .map(el => el.properties.seq)
      .filter(seq => typeof seq === 'number')
      .sort((a, b) => a - b);

    return sequences.length > 0 ? Math.max(...sequences) + 1 : 1;
  }
}
