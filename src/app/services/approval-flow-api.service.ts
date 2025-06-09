// services/approval-flow-api.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap, map } from 'rxjs/operators';
import { ConfigService } from './config.service';
import {
  Action,
  ApprovalStep,
  MasterStepResponse,
  MasterStepData,
  Group,
  Service,
  Status,
  ApprovalFlowData
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

  // Actions API
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

  // Master Steps API (existing approval flows)
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

  // Lookup APIs
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

  // Groups API
  getGroups(): Observable<GroupResponse> {
    return this.http.get<GroupResponse>(this.getApiUrl('/auth/groups/'))
      .pipe(
        tap(response => console.log('Loaded groups:', response)),
        catchError(this.handleError)
      );
  }

  // Convert master steps to approval flow summaries
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

  // Convert MasterStepData to ApprovalFlowData
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

  // Get specific approval flow by service code
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

  // Save approval flow (would need API endpoint for this)
  saveApprovalFlow(approvalFlow: ApprovalFlowData): Observable<any> {
    // This would convert back to the master step format and save
    // For now, just save to localStorage as fallback
    const savedData = JSON.stringify(approvalFlow, null, 2);
    localStorage.setItem(`approval_flow_${approvalFlow.id}`, savedData);

    return new Observable(observer => {
      setTimeout(() => {
        observer.next({ success: true, data: approvalFlow });
        observer.complete();
      }, 500);
    });
  }

  // Utility methods
  isConfigured(): boolean {
    return this.configService.isConfigured();
  }

  getBaseUrl(): string {
    return this.configService.getBaseUrl();
  }

  // Test connection method
  testConnection(): Observable<any> {
    return this.http.get(this.getApiUrl('/'))
      .pipe(
        tap(response => console.log('Connection test successful:', response)),
        catchError(this.handleError)
      );
  }

  // Convert lookup items to a more usable format
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
