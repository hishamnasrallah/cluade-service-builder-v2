// services/approval-flow-api.service.ts - Enhanced with POST/PUT/DELETE methods
import { Injectable } from '@angular/core';

import { HttpClient, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { catchError, tap, map, switchMap } from 'rxjs/operators';
import { ConfigService } from './config.service';
import {
  Action,
  ApprovalStep,
  MasterStepResponse,
  MasterStepData,
  Group,
  Service,
  Status,
  ApprovalFlowData,
  ActionStep,
  ApprovalStepCondition,
  ParallelApprovalGroup
} from '../models/approval-flow.models';

// API Response interfaces
export interface ActionResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Action[];
}

export interface GroupResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Group[];
}

export interface LookupResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: LookupItem[];
}

export interface LookupItem {
  id: number;
  parent_lookup?: number;
  type: number;
  name: string;
  name_ara: string;
  code: string;
  icon?: string | null;
  active_ind: boolean;
}

// Approval Flow Summary for selector
export interface ApprovalFlowSummary {
  service_code: string;
  service_name: string;
  step_count: number;
  action_count: number;
  last_updated?: string;
  is_active: boolean;
}

// Request/Response interfaces for Master Steps CRUD
export interface CreateMasterStepRequest {
  service: {
    id: number;
    code: string;
    name: string;
    name_ara?: string;
  };
  steps: CreateApprovalStepRequest[];
}

export interface CreateApprovalStepRequest {
  service_type: number;
  seq: number;
  step_type: number;
  status: number;
  group: number;
  required_approvals?: number;
  priority_approver_groups?: number[];
  active_ind?: boolean;
  actions?: CreateActionStepRequest[];
  parallel_approval_groups?: CreateParallelApprovalGroupRequest[];
  approvalstepcondition_set?: CreateApprovalStepConditionRequest[];
  apicallcondition_set?: any[];
}
export interface CreateActionStepRequest {
  action: number;
  to_status: number;
  sub_status?: number;
  active_ind?: boolean;
}

export interface CreateApprovalStepConditionRequest {
  type: number;
  condition_logic: any[];
  to_status?: number;
  sub_status?: number;
  active_ind?: boolean;
}

export interface CreateParallelApprovalGroupRequest {
  group: number;
}

export interface UpdateMasterStepRequest {
  service?: {
    id: number;
    code: string;
    name: string;
    name_ara?: string;
  };
  steps: UpdateApprovalStepRequest[];
}

export interface UpdateApprovalStepRequest extends CreateApprovalStepRequest {
  id?: number; // Include ID for updates
  actions?: UpdateActionStepRequest[];
  parallel_approval_groups?: UpdateParallelApprovalGroupRequest[];
  approvalstepcondition_set?: UpdateApprovalStepConditionRequest[];
}

export interface UpdateActionStepRequest extends CreateActionStepRequest {
  id?: number; // Include ID for updates
}

export interface UpdateApprovalStepConditionRequest extends CreateApprovalStepConditionRequest {
  id?: number; // Include ID for updates
}

export interface UpdateParallelApprovalGroupRequest extends CreateParallelApprovalGroupRequest {
  id?: number; // Include ID for updates
}

@Injectable({
  providedIn: 'root'
})
export class ApprovalFlowApiService {
  constructor(
    private http: HttpClient,
    private configService: ConfigService
  ) {}

  private getApiUrl(endpoint: string): string {
    const baseUrl = this.configService.getBaseUrl();
    if (!baseUrl) {
      throw new Error('Base URL not configured. Please configure the API base URL first.');
    }
    return `${baseUrl}${endpoint}`;
  }
  private cleanApprovalStepData(data: any): any {
    const cleaned: any = { ...data };

    // Remove empty arrays and undefined values
    Object.keys(cleaned).forEach(key => {
      if (Array.isArray(cleaned[key]) && cleaned[key].length === 0) {
        delete cleaned[key];
      } else if (cleaned[key] === undefined || cleaned[key] === null) {
        delete cleaned[key];
      }
    });

    return cleaned;
  }

// Helper method to clean master step data
  private cleanMasterStepData(data: CreateMasterStepRequest): CreateMasterStepRequest {
    const cleaned: CreateMasterStepRequest = {
      service: data.service,
      steps: data.steps.map(step => this.cleanApprovalStepData(step))
    };

    return cleaned;
  }
  private handleError = (error: HttpErrorResponse) => {
    console.error('API Error:', error);

    let errorMessage = 'An unknown error occurred';

    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Client Error: ${error.error.message}`;
    } else {
      // Server-side error
      switch (error.status) {
        case 400:
          errorMessage = `Bad Request: ${error.error?.detail || error.message}`;
          break;
        case 401:
          errorMessage = 'Unauthorized: Please login again';
          break;
        case 403:
          errorMessage = 'Forbidden: You do not have permission to access this resource';
          break;
        case 404:
          errorMessage = 'Not Found: The requested resource was not found';
          break;
        case 500:
          errorMessage = 'Internal Server Error: Please try again later';
          break;
        default:
          errorMessage = `Server Error (${error.status}): ${error.error?.detail || error.message}`;
      }
    }

    return throwError(() => ({ ...error, message: errorMessage }));
  };

  // Actions API (existing methods)
  getActions(): Observable<ActionResponse> {
    return this.http.get<ActionResponse>(this.getApiUrl('/conditional_approvals/actions/'))
      .pipe(
        tap(response => console.log('Loaded actions:', response)),
        catchError(this.handleError)
      );
  }

  createAction(action: Partial<Action>): Observable<Action> {
    return this.http.post<Action>(this.getApiUrl('/conditional_approvals/actions/'), action)
      .pipe(
        tap(response => console.log('Created action:', response)),
        catchError(this.handleError)
      );
  }

  updateAction(id: number, action: Partial<Action>): Observable<Action> {
    return this.http.put<Action>(this.getApiUrl(`/conditional_approvals/actions/${id}/`), action)
      .pipe(
        tap(response => console.log('Updated action:', response)),
        catchError(this.handleError)
      );
  }

  deleteAction(id: number): Observable<void> {
    return this.http.delete<void>(this.getApiUrl(`/conditional_approvals/actions/${id}/`))
      .pipe(
        tap(() => console.log('Deleted action:', id)),
        catchError(this.handleError)
      );
  }

  // Master Steps API - READ operations (existing)
  getMasterSteps(): Observable<MasterStepResponse> {
    return this.http.get<MasterStepResponse>(this.getApiUrl('/conditional_approvals/master-steps/'))
      .pipe(
        tap(response => console.log('Loaded master steps:', response)),
        catchError(this.handleError)
      );
  }

  getMasterStepsByService(serviceTypeId: number): Observable<MasterStepResponse> {
    const params = new HttpParams().set('service_type', serviceTypeId.toString());
    return this.http.get<MasterStepResponse>(this.getApiUrl('/conditional_approvals/master-steps/'), { params })
      .pipe(
        tap(response => console.log('Loaded master steps for service:', serviceTypeId, response)),
        catchError(this.handleError)
      );
  }

  // Master Steps API - CREATE/UPDATE/DELETE operations (NEW)
  createMasterStep(masterStepData: CreateMasterStepRequest): Observable<MasterStepData> {
    const cleanedData = this.cleanMasterStepData(masterStepData);

    return this.http.post<MasterStepData>(this.getApiUrl('/conditional_approvals/master-steps/'), cleanedData)
      .pipe(
        tap(response => console.log('Created master step:', response)),
        catchError(this.handleError)
      );
  }

  updateMasterStep(serviceCode: string, masterStepData: UpdateMasterStepRequest): Observable<MasterStepData> {
    return this.http.put<MasterStepData>(this.getApiUrl(`/conditional_approvals/master-steps/${serviceCode}/`), masterStepData)
      .pipe(
        tap(response => console.log('Updated master step:', response)),
        catchError(this.handleError)
      );
  }

  deleteMasterStep(serviceCode: string): Observable<void> {
    return this.http.delete<void>(this.getApiUrl(`/conditional_approvals/master-steps/${serviceCode}/`))
      .pipe(
        tap(() => console.log('Deleted master step:', serviceCode)),
        catchError(this.handleError)
      );
  }

  // Individual Approval Steps API (NEW)
  createApprovalStep(approvalStepData: CreateApprovalStepRequest): Observable<ApprovalStep> {
    return this.http.post<ApprovalStep>(this.getApiUrl('/conditional_approvals/approval-steps/'), approvalStepData)
      .pipe(
        tap(response => console.log('Created approval step:', response)),
        catchError(this.handleError)
      );
  }

  updateApprovalStep(id: number, approvalStepData: UpdateApprovalStepRequest): Observable<ApprovalStep> {
    return this.http.put<ApprovalStep>(this.getApiUrl(`/conditional_approvals/approval-steps/${id}/`), approvalStepData)
      .pipe(
        tap(response => console.log('Updated approval step:', response)),
        catchError(this.handleError)
      );
  }

  deleteApprovalStep(id: number): Observable<void> {
    return this.http.delete<void>(this.getApiUrl(`/conditional_approvals/approval-steps/${id}/`))
      .pipe(
        tap(() => console.log('Deleted approval step:', id)),
        catchError(this.handleError)
      );
  }

  // Action Steps API (NEW)
  createActionStep(actionStepData: CreateActionStepRequest & { approval_step: number }): Observable<ActionStep> {
    return this.http.post<ActionStep>(this.getApiUrl('/conditional_approvals/action-steps/'), actionStepData)
      .pipe(
        tap(response => console.log('Created action step:', response)),
        catchError(this.handleError)
      );
  }

  updateActionStep(id: number, actionStepData: UpdateActionStepRequest): Observable<ActionStep> {
    return this.http.put<ActionStep>(this.getApiUrl(`/conditional_approvals/action-steps/${id}/`), actionStepData)
      .pipe(
        tap(response => console.log('Updated action step:', response)),
        catchError(this.handleError)
      );
  }

  deleteActionStep(id: number): Observable<void> {
    return this.http.delete<void>(this.getApiUrl(`/conditional_approvals/action-steps/${id}/`))
      .pipe(
        tap(() => console.log('Deleted action step:', id)),
        catchError(this.handleError)
      );
  }

  // Approval Step Conditions API (NEW)
  createApprovalStepCondition(conditionData: CreateApprovalStepConditionRequest & { approval_step: number }): Observable<ApprovalStepCondition> {
    return this.http.post<ApprovalStepCondition>(this.getApiUrl('/conditional_approvals/approval-step-conditions/'), conditionData)
      .pipe(
        tap(response => console.log('Created approval step condition:', response)),
        catchError(this.handleError)
      );
  }

  updateApprovalStepCondition(id: number, conditionData: UpdateApprovalStepConditionRequest): Observable<ApprovalStepCondition> {
    return this.http.put<ApprovalStepCondition>(this.getApiUrl(`/conditional_approvals/approval-step-conditions/${id}/`), conditionData)
      .pipe(
        tap(response => console.log('Updated approval step condition:', response)),
        catchError(this.handleError)
      );
  }

  deleteApprovalStepCondition(id: number): Observable<void> {
    return this.http.delete<void>(this.getApiUrl(`/conditional_approvals/approval-step-conditions/${id}/`))
      .pipe(
        tap(() => console.log('Deleted approval step condition:', id)),
        catchError(this.handleError)
      );
  }

  // Parallel Approval Groups API (NEW)
  createParallelApprovalGroup(groupData: CreateParallelApprovalGroupRequest & { approval_step: number }): Observable<ParallelApprovalGroup> {
    return this.http.post<ParallelApprovalGroup>(this.getApiUrl('/conditional_approvals/parallel-approval-groups/'), groupData)
      .pipe(
        tap(response => console.log('Created parallel approval group:', response)),
        catchError(this.handleError)
      );
  }

  updateParallelApprovalGroup(id: number, groupData: UpdateParallelApprovalGroupRequest): Observable<ParallelApprovalGroup> {
    return this.http.put<ParallelApprovalGroup>(this.getApiUrl(`/conditional_approvals/parallel-approval-groups/${id}/`), groupData)
      .pipe(
        tap(response => console.log('Updated parallel approval group:', response)),
        catchError(this.handleError)
      );
  }

  deleteParallelApprovalGroup(id: number): Observable<void> {
    return this.http.delete<void>(this.getApiUrl(`/conditional_approvals/parallel-approval-groups/${id}/`))
      .pipe(
        tap(() => console.log('Deleted parallel approval group:', id)),
        catchError(this.handleError)
      );
  }

  // Batch Operations (NEW) - for creating/updating entire approval flows
  saveCompleteApprovalFlow(serviceCode: string, approvalFlowData: ApprovalFlowData): Observable<MasterStepData> {
    console.log('Saving complete approval flow:', serviceCode, approvalFlowData);

    // Convert ApprovalFlowData to MasterStep format
    const masterStepRequest = this.convertApprovalFlowToMasterStepRequest(approvalFlowData);

    // Determine if this is create or update based on existing data
    return this.getMasterStepsByService(approvalFlowData.service_type || 0).pipe(
      map(response => {
        const existingMasterStep = response.results.find(ms => ms.service.code === serviceCode);
        return !!existingMasterStep;
      }),
      catchError(() => of(false)), // If error, assume it doesn't exist
      switchMap(exists => {
        if (exists) {
          console.log('Updating existing approval flow');
          return this.updateMasterStep(serviceCode, masterStepRequest);
        } else {
          console.log('Creating new approval flow');
          return this.createMasterStep(masterStepRequest);
        }
      }),
      catchError(this.handleError)
    );
  }
  // Conversion method: ApprovalFlowData -> MasterStepRequest
  private convertApprovalFlowToMasterStepRequest(approvalFlow: ApprovalFlowData): CreateMasterStepRequest {
    console.log('Converting approval flow to master step request:', approvalFlow);

    const request: CreateMasterStepRequest = {
      service: {
        id: approvalFlow.service_type || 0,
        code: approvalFlow.metadata?.service_code || approvalFlow.id || '',
        name: approvalFlow.name,
        name_ara: approvalFlow.name // You might want to add name_ara to ApprovalFlowData
      },
      steps: []
    };

    // Get approval step elements and sort by sequence
    const approvalStepElements = approvalFlow.elements
      .filter(el => el.type === 'approval_step')
      .sort((a, b) => (a.properties.seq || 0) - (b.properties.seq || 0));

    approvalStepElements.forEach(stepEl => {
      const stepRequest: CreateApprovalStepRequest = {
        service_type: stepEl.properties.service_type || 0,
        seq: stepEl.properties.seq || 1,
        step_type: stepEl.properties.step_type || 2,
        status: stepEl.properties.status || 0,
        group: stepEl.properties.group || 0,
        active_ind: stepEl.properties.active_ind !== false
      };

      // Only add optional fields if they have values
      if (stepEl.properties.required_approvals) {
        stepRequest.required_approvals = stepEl.properties.required_approvals;
      }

      if (stepEl.properties.priority_approver_groups && stepEl.properties.priority_approver_groups.length > 0) {
        stepRequest.priority_approver_groups = stepEl.properties.priority_approver_groups;
      }

      // Initialize arrays for connected elements
      const actions: CreateActionStepRequest[] = [];
      const parallelGroups: CreateParallelApprovalGroupRequest[] = [];
      const conditions: CreateApprovalStepConditionRequest[] = [];

      // Find connected elements (actions, conditions, parallel groups)
      const connections = approvalFlow.connections.filter(conn => conn.sourceId === stepEl.id);

      connections.forEach(conn => {
        const targetElement = approvalFlow.elements.find(el => el.id === conn.targetId);
        if (!targetElement) return;

        switch (targetElement.type) {
          case 'action_step':
            if (targetElement.properties.action && targetElement.properties.to_status) {
              actions.push({
                action: targetElement.properties.action,
                to_status: targetElement.properties.to_status,
                sub_status: targetElement.properties.sub_status,
                active_ind: targetElement.properties.active_ind !== false
              });
            }
            break;

          case 'condition_step':
            conditions.push({
              type: targetElement.properties.type || 1,
              condition_logic: targetElement.properties.condition_logic || [],
              to_status: targetElement.properties.to_status,
              sub_status: targetElement.properties.sub_status,
              active_ind: targetElement.properties.active_ind !== false
            });
            break;

          case 'parallel_group':
            if (targetElement.properties.parallel_groups) {
              targetElement.properties.parallel_groups.forEach((groupId: number) => {
                parallelGroups.push({
                  group: groupId
                });
              });
            }
            break;
        }
      });

// Only add arrays if they have data
      if (actions.length > 0) {
        stepRequest.actions = actions;
      }

      if (parallelGroups.length > 0) {
        stepRequest.parallel_approval_groups = parallelGroups;
      }

      if (conditions.length > 0) {
        stepRequest.approvalstepcondition_set = conditions;
      }

      request.steps.push(stepRequest);
    });

    console.log('Converted master step request:', request);
    return request;
  }

  // Lookup APIs (existing)
  private getLookups(name: string): Observable<LookupResponse> {
    const params = new HttpParams().set('name', name);
    return this.http.get<LookupResponse>(this.getApiUrl('/lookups/'), { params })
      .pipe(
        tap(response => console.log(`Loaded ${name} lookups:`, response)),
        catchError(this.handleError)
      );
  }

  // Service Types (from Service lookup)
  getServiceTypes(): Observable<LookupResponse> {
    return this.getLookups('Service');
  }

  // Case Status (from Case Status lookup)
  getCaseStatuses(): Observable<LookupResponse> {
    return this.getLookups('Case Status');
  }

  // Case Sub Status (from Case Sub Status lookup)
  getCaseSubStatuses(): Observable<LookupResponse> {
    return this.getLookups('Case Sub Status');
  }

  // Groups API (existing)
  getGroups(): Observable<GroupResponse> {
    return this.http.get<GroupResponse>(this.getApiUrl('/auth/groups/'))
      .pipe(
        tap(response => console.log('Loaded groups:', response)),
        catchError(this.handleError)
      );
  }

  // Convert master steps to approval flow summaries (existing)
  getApprovalFlowSummaries(): Observable<ApprovalFlowSummary[]> {
    return this.getMasterSteps().pipe(
      map(response => {
        return response.results.map(masterStep => ({
          service_code: masterStep.service.code,
          service_name: masterStep.service.name,
          step_count: masterStep.steps.length,
          action_count: masterStep.steps.reduce((sum, step) => sum + step.actions.length, 0),
          last_updated: new Date().toISOString(), // You might want to add this to your API
          is_active: masterStep.service.active_ind
        }));
      }),
      tap(summaries => console.log('Approval flow summaries:', summaries)),
      catchError(this.handleError)
    );
  }

  // Convert MasterStepData to ApprovalFlowData (existing method - no changes needed)
  convertMasterStepToApprovalFlow(masterStep: MasterStepData): ApprovalFlowData {
    const approvalFlow: ApprovalFlowData = {
      id: masterStep.service.code,
      name: `Approval Flow - ${masterStep.service.name}`,
      service_type: masterStep.service.id,
      description: `Approval flow for ${masterStep.service.name}`,
      elements: [],
      connections: [],
      metadata: {
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        version: '1.0',
        service_code: masterStep.service.code
      }
    };

    // Add start element
    approvalFlow.elements.push({
      id: 'start',
      type: 'start' as any,
      position: { x: 100, y: 100 },
      properties: { name: 'Start' },
      connections: []
    });

    let previousElementId = 'start';
    let yPosition = 100;

    // Convert approval steps to workflow elements
    masterStep.steps.forEach((step, stepIndex) => {
      const stepElementId = `approval-step-${step.id}`;
      yPosition += 200;

      // Add approval step element
      approvalFlow.elements.push({
        id: stepElementId,
        type: 'approval_step' as any,
        position: { x: 100, y: yPosition },
        properties: {
          name: `Step ${step.seq}`,
          service_type: step.service_type,
          seq: step.seq,
          step_type: step.step_type,
          status: step.status,
          group: step.group,
          required_approvals: step.required_approvals,
          priority_approver_groups: step.priority_approver_groups.map(g => g.id),
          active_ind: step.active_ind
        },
        connections: []
      });

      // Connect to previous element
      approvalFlow.connections.push({
        id: `conn-${previousElementId}-${stepElementId}`,
        sourceId: previousElementId,
        targetId: stepElementId
      });

      let xPosition = 300;

      // Convert actions to action step elements
      step.actions.forEach((action, actionIndex) => {
        const actionElementId = `action-step-${action.id}`;

        approvalFlow.elements.push({
          id: actionElementId,
          type: 'action_step' as any,
          position: { x: xPosition, y: yPosition },
          properties: {
            name: action.action.name,
            approval_step: action.approval_step,
            action: action.action.id,
            action_name: action.action.name,
            action_code: action.action.code,
            to_status: action.to_status.id,
            sub_status: action.sub_status?.id,
            active_ind: action.active_ind
          },
          connections: []
        });

        // Connect action to approval step
        approvalFlow.connections.push({
          id: `conn-${stepElementId}-${actionElementId}`,
          sourceId: stepElementId,
          targetId: actionElementId,
          actionId: action.action.id.toString()
        });

        xPosition += 200;
      });

      // Convert conditions to condition step elements
      step.approvalstepcondition_set.forEach((condition, conditionIndex) => {
        const conditionElementId = `condition-step-${condition.id}`;

        approvalFlow.elements.push({
          id: conditionElementId,
          type: 'condition_step' as any,
          position: { x: xPosition, y: yPosition + (conditionIndex * 80) },
          properties: {
            name: `Condition ${conditionIndex + 1}`,
            approval_step: condition.approval_step,
            type: condition.type,
            condition_logic: condition.condition_logic,
            to_status: condition.to_status?.id,
            sub_status: condition.sub_status?.id,
            active_ind: condition.active_ind
          },
          connections: []
        });

        // Connect condition to approval step
        approvalFlow.connections.push({
          id: `conn-${stepElementId}-${conditionElementId}`,
          sourceId: stepElementId,
          targetId: conditionElementId
        });
      });

      // Convert parallel approval groups
      step.parallel_approval_groups.forEach((parallelGroup, pgIndex) => {
        const parallelElementId = `parallel-group-${parallelGroup.id}`;

        approvalFlow.elements.push({
          id: parallelElementId,
          type: 'parallel_group' as any,
          position: { x: xPosition + 200, y: yPosition + (pgIndex * 80) },
          properties: {
            name: `Parallel Group - ${parallelGroup.group.name}`,
            approval_step: parallelGroup.approval_step,
            parallel_groups: [parallelGroup.group.id]
          },
          connections: []
        });

        // Connect parallel group to approval step
        approvalFlow.connections.push({
          id: `conn-${stepElementId}-${parallelElementId}`,
          sourceId: stepElementId,
          targetId: parallelElementId
        });
      });

      previousElementId = stepElementId;
    });

    // Add end element
    const endElementId = 'end';
    yPosition += 200;

    approvalFlow.elements.push({
      id: endElementId,
      type: 'end' as any,
      position: { x: 100, y: yPosition },
      properties: {
        name: 'End',
        action: 1
      },
      connections: []
    });

    // Connect last step to end
    if (previousElementId !== 'start') {
      approvalFlow.connections.push({
        id: `conn-${previousElementId}-${endElementId}`,
        sourceId: previousElementId,
        targetId: endElementId
      });
    }

    return approvalFlow;
  }

  // Get specific approval flow by service code (existing)
  getApprovalFlow(serviceCode: string): Observable<ApprovalFlowData> {
    return this.getMasterSteps().pipe(
      map(response => {
        const masterStep = response.results.find(ms => ms.service.code === serviceCode);
        if (!masterStep) {
          throw new Error(`Approval flow with service code ${serviceCode} not found`);
        }
        return this.convertMasterStepToApprovalFlow(masterStep);
      }),
      tap(approvalFlow => console.log('Loaded specific approval flow:', approvalFlow)),
      catchError(this.handleError)
    );
  }

  // Updated saveApprovalFlow method to use the new API
  saveApprovalFlow(approvalFlow: ApprovalFlowData): Observable<any> {
    const serviceCode = approvalFlow.metadata?.service_code || approvalFlow.id || '';

    if (!serviceCode) {
      return throwError(() => new Error('Service code is required to save approval flow'));
    }

    if (this.isConfigured()) {
      return this.saveCompleteApprovalFlow(serviceCode, approvalFlow).pipe(
        map(result => ({ success: true, data: result })),
        catchError(error => {
          console.error('Failed to save to API, falling back to localStorage:', error);
          return this.saveToLocalStorage(approvalFlow);
        })
      );
    } else {
      return this.saveToLocalStorage(approvalFlow);
    }
  }

  private saveToLocalStorage(approvalFlow: ApprovalFlowData): Observable<any> {
    const savedData = JSON.stringify(approvalFlow, null, 2);
    localStorage.setItem(`approval_flow_${approvalFlow.id}`, savedData);

    return new Observable(observer => {
      setTimeout(() => {
        observer.next({ success: true, data: approvalFlow });
        observer.complete();
      }, 500);
    });
  }

  // Utility methods (existing)
  isConfigured(): boolean {
    return this.configService.isConfigured();
  }

  getBaseUrl(): string {
    return this.configService.getBaseUrl();
  }

  // Test connection method (existing)
  testConnection(): Observable<any> {
    return this.http.get(this.getApiUrl('/'))
      .pipe(
        tap(response => console.log('Connection test successful:', response)),
        catchError(this.handleError)
      );
  }

  // Convert lookup items to a more usable format (existing)
  convertLookupsToServices(lookups: LookupItem[]): Service[] {
    return lookups.map(lookup => ({
      id: lookup.id,
      name: lookup.name,
      name_ara: lookup.name_ara,
      code: lookup.code,
      icon: lookup.icon || undefined, // Fix: handle null values
      active_ind: lookup.active_ind
    }));
  }

  convertLookupsToStatuses(lookups: LookupItem[]): Status[] {
    return lookups.map(lookup => ({
      id: lookup.id,
      name: lookup.name,
      name_ara: lookup.name_ara,
      code: lookup.code,
      active_ind: lookup.active_ind
    }));
  }
}
