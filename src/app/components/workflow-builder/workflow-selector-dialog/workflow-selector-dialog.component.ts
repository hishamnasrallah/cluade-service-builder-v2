// components/workflow-builder/service-flow-selector-dialog/service-flow-selector-dialog.component.ts
import { Component, OnInit, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';

import { ApiService, ServiceFlowSummary } from '../../../services/api.service';
import {MatTab, MatTabGroup} from '@angular/material/tabs';
import {MatSnackBar} from '@angular/material/snack-bar';

export interface ServiceFlowSelectionResult {
  action: 'create' | 'load';
  serviceCode?: string;
  serviceName?: string;
}
export interface WorkflowSelectionResult {
  action: 'create' | 'load' | 'load-workflow';
  serviceCode?: string;
  serviceName?: string;
  workflowId?: string;
  workflowName?: string;
}
@Component({
  selector: 'app-service-flow-selector-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatProgressSpinnerModule,
    MatFormFieldModule,
    MatInputModule,
    MatCardModule,
    MatChipsModule,
    MatTooltipModule,
    FormsModule,
    DatePipe,
    MatTab,
    MatTabGroup
  ],
  template: `
    <div class="workflow-selector-dialog">
      <h2 mat-dialog-title>
        <mat-icon>account_tree</mat-icon>
        Select Workflow or Service Flow
      </h2>

      <mat-dialog-content class="dialog-content">
        <!-- Tab Group for Workflows vs Service Flows -->
        <mat-tab-group [(selectedIndex)]="selectedTabIndex">
          <!-- Workflows Tab -->
          <mat-tab label="My Workflows">
            <div class="tab-content">
              <!-- Loading State -->
              <div *ngIf="isLoadingWorkflows" class="loading-container">
                <mat-spinner diameter="40"></mat-spinner>
                <p>Loading workflows...</p>
              </div>

              <!-- Workflows List -->
              <div *ngIf="!isLoadingWorkflows" class="workflows-section">
                <mat-form-field appearance="outline" class="search-field">
                  <mat-label>Search workflows</mat-label>
                  <mat-icon matPrefix>search</mat-icon>
                  <input matInput
                         [(ngModel)]="workflowSearchTerm"
                         (input)="filterWorkflows()"
                         placeholder="Search by name or service">
                </mat-form-field>

                <div class="flow-grid" *ngIf="filteredWorkflows.length > 0">
                  <mat-card *ngFor="let workflow of filteredWorkflows"
                            class="workflow-card"
                            [class.selected]="selectedWorkflowId === workflow.id"
                            (click)="selectWorkflow(workflow)">

                    <mat-card-header>
                      <mat-card-title>{{ workflow.name }}</mat-card-title>
                      <mat-card-subtitle>
                        <span class="service-code" *ngIf="workflow.service_code">
                          {{ workflow.service_code }}
                        </span>
                        {{ workflow.service_name }}
                      </mat-card-subtitle>
                    </mat-card-header>

                    <mat-card-content>
                      <div class="workflow-metadata">
                        <div class="metadata-item">
                          <mat-icon>description</mat-icon>
                          <span>{{ workflow.element_count?.pages || 0 }} pages</span>
                        </div>
                        <div class="metadata-item">
                          <mat-icon>input</mat-icon>
                          <span>{{ workflow.element_count?.fields || 0 }} fields</span>
                        </div>
                        <div class="metadata-item">
                          <mat-icon>schedule</mat-icon>
                          <span>{{ workflow.updated_at | date:'short' }}</span>
                        </div>
                      </div>

                      <mat-chip-set>
                        <mat-chip [color]="workflow.is_draft ? 'warn' : 'primary'">
                          {{ workflow.is_draft ? 'Draft' : 'Published' }}
                        </mat-chip>
                        <mat-chip *ngIf="workflow.version > 1">
                          v{{ workflow.version }}
                        </mat-chip>
                      </mat-chip-set>
                    </mat-card-content>

                    <mat-card-actions>
                      <button mat-button color="primary" (click)="loadWorkflow(workflow, $event)">
                        <mat-icon>open_in_new</mat-icon>
                        Open
                      </button>
                      <button mat-icon-button (click)="deleteWorkflow(workflow, $event)"
                              matTooltip="Delete workflow">
                        <mat-icon color="warn">delete</mat-icon>
                      </button>
                    </mat-card-actions>
                  </mat-card>
                </div>

                <div *ngIf="filteredWorkflows.length === 0" class="no-flows">
                  <mat-icon>dashboard</mat-icon>
                  <h3>No Workflows Found</h3>
                  <p>Create a new workflow or import from a service flow.</p>
                </div>
              </div>
            </div>
          </mat-tab>

          <!-- Service Flows Tab -->
          <mat-tab label="Service Flows">
            <div class="tab-content">
              <!-- Existing service flow content -->
              <!-- ... keep existing service flow template ... -->
            </div>
          </mat-tab>
        </mat-tab-group>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button (click)="onCancel()">
          <mat-icon>close</mat-icon>
          Cancel
        </button>

        <button mat-button (click)="createNewFlow()" color="accent">
          <mat-icon>add</mat-icon>
          Create New Workflow
        </button>

        <button mat-raised-button
                color="primary"
                (click)="onLoadSelected()"
                [disabled]="!canLoadSelected()">
          <mat-icon>open_in_new</mat-icon>
          Open Selected
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .service-flow-selector-dialog {
      width: 100%;
      max-width: 900px;
    }

    .dialog-content {
      max-height: 600px;
      padding: 20px;
    }

    .loading-container,
    .error-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 40px 20px;
      text-align: center;
    }

    .loading-container p,
    .error-container p {
      margin: 16px 0;
      color: #666;
    }

    .filters-section {
      margin-bottom: 20px;
    }

    .search-field {
      width: 100%;
      margin-bottom: 16px;
    }

    .flow-stats {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .flows-container {
      max-height: 400px;
      overflow-y: auto;
    }

    .no-flows {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 40px 20px;
      text-align: center;
      color: #666;
    }

    .no-flows mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      margin-bottom: 16px;
      color: #ccc;
    }

    .no-flows h3 {
      margin: 0 0 8px 0;
    }

    .flow-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
      gap: 16px;
    }

    .flow-card {
      cursor: pointer;
      transition: all 0.2s ease;
      border: 2px solid transparent;
    }

    .flow-card:hover {
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      transform: translateY(-2px);
    }

    .flow-card.selected {
      border-color: #2196F3;
      box-shadow: 0 0 0 1px rgba(33, 150, 243, 0.3);
    }

    .flow-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      width: 100%;
    }

    .flow-info {
      flex: 1;
    }

    .service-code {
      display: inline-block;
      background: #1976d2;
      color: white;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 500;
      margin-right: 8px;
    }

    .flow-status {
      margin-left: 8px;
    }

    .flow-metadata {
      margin: 16px 0;
    }

    .metadata-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
    }

    .metadata-item {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: #666;
      flex: 1;
    }

    .metadata-item mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      color: #888;
    }

    .flow-preview {
      background: #f8f9fa;
      border-radius: 4px;
      padding: 12px;
      margin-top: 16px;
    }

    .preview-header {
      display: flex;
      align-items: center;
      gap: 6px;
      font-weight: 500;
      color: #333;
      margin-bottom: 8px;
    }

    .preview-header mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    .preview-text {
      font-size: 12px;
      color: #666;
      line-height: 1.4;
    }

    mat-card-actions {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    mat-dialog-actions {
      padding: 16px 20px;
      border-top: 1px solid #e0e0e0;
    }

    @media (max-width: 768px) {
      .flow-grid {
        grid-template-columns: 1fr;
      }

      .flow-header {
        flex-direction: column;
        align-items: flex-start;
      }

      .flow-status {
        margin: 8px 0 0 0;
      }

      .metadata-row {
        flex-direction: column;
        gap: 8px;
      }
    }
  `]
})

export class WorkflowSelectorDialogComponent implements OnInit {
  // Existing properties
  serviceFlows: ServiceFlowSummary[] = [];
  filteredServiceFlows: ServiceFlowSummary[] = [];
  selectedServiceCode?: string;
  selectedServiceFlow?: ServiceFlowSummary;
  searchTerm = '';
  isLoading = false;
  errorMessage = '';

  // New properties for workflows
  workflows: any[] = [];
  filteredWorkflows: any[] = [];
  selectedWorkflowId?: string;
  selectedWorkflow?: any;
  workflowSearchTerm = '';
  isLoadingWorkflows = false;
  selectedTabIndex = 0;

  constructor(
    private dialogRef: MatDialogRef<WorkflowSelectorDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private apiService: ApiService,
    private snackBar: MatSnackBar
  ) {
  }

  ngOnInit(): void {
    this.loadWorkflows();
    this.loadServiceFlows();
  }

  loadWorkflows(): void {
    this.isLoadingWorkflows = true;

    this.apiService.getWorkflows().subscribe({
      next: (response) => {
        this.workflows = response.results || [];
        this.filteredWorkflows = [...this.workflows];
        this.isLoadingWorkflows = false;
        console.log('Loaded workflows:', this.workflows);
      },
      error: (error) => {
        this.isLoadingWorkflows = false;
        console.error('Error loading workflows:', error);
        // Don't show error, just show empty state
      }
    });
  }

  filterWorkflows(): void {
    const term = this.workflowSearchTerm.toLowerCase().trim();

    if (!term) {
      this.filteredWorkflows = [...this.workflows];
      return;
    }

    this.filteredWorkflows = this.workflows.filter(workflow =>
      workflow.name.toLowerCase().includes(term) ||
      (workflow.service_code && workflow.service_code.toLowerCase().includes(term)) ||
      (workflow.service_name && workflow.service_name.toLowerCase().includes(term))
    );
  }

  selectWorkflow(workflow: any): void {
    this.selectedWorkflowId = workflow.id;
    this.selectedWorkflow = workflow;
    this.selectedServiceCode = undefined;
    this.selectedServiceFlow = undefined;
  }

  loadWorkflow(workflow: any, event: Event): void {
    event.stopPropagation();
    this.dialogRef.close({
      action: 'load-workflow',
      workflowId: workflow.id,
      workflowName: workflow.name
    } as WorkflowSelectionResult);
  }

  deleteWorkflow(workflow: any, event: Event): void {
    event.stopPropagation();

    if (confirm(`Delete workflow "${workflow.name}"? This action cannot be undone.`)) {
      this.apiService.deleteWorkflow(workflow.id).subscribe({
        next: () => {
          this.snackBar.open('Workflow deleted', 'Close', {duration: 3000});
          this.loadWorkflows();
        },
        error: (error) => {
          this.snackBar.open('Failed to delete workflow', 'Close', {duration: 5000});
        }
      });
    }
  }

  canLoadSelected(): boolean {
    return (this.selectedTabIndex === 0 && !!this.selectedWorkflowId) ||
      (this.selectedTabIndex === 1 && !!this.selectedServiceCode);
  }

  onLoadSelected(): void {
    if (this.selectedTabIndex === 0 && this.selectedWorkflow) {
      // Load workflow
      this.dialogRef.close({
        action: 'load-workflow',
        workflowId: this.selectedWorkflow.id,
        workflowName: this.selectedWorkflow.name
      } as WorkflowSelectionResult);
    } else if (this.selectedTabIndex === 1 && this.selectedServiceFlow) {
      // Load service flow
      this.dialogRef.close({
        action: 'load',
        serviceCode: this.selectedServiceFlow.service_code,
        serviceName: this.selectedServiceFlow.service_name
      } as WorkflowSelectionResult);
    }
  }


}
export class ServiceFlowSelectorDialogComponent implements OnInit {
  serviceFlows: ServiceFlowSummary[] = [];
  filteredServiceFlows: ServiceFlowSummary[] = [];
  selectedServiceCode?: string;
  selectedServiceFlow?: ServiceFlowSummary;
  searchTerm = '';
  isLoading = false;
  errorMessage = '';

  constructor(
    private dialogRef: MatDialogRef<ServiceFlowSelectorDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private apiService: ApiService
  ) {}

  ngOnInit(): void {
    this.loadServiceFlows();
  }

  loadServiceFlows(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.apiService.getServiceFlowSummaries().subscribe({
      next: (summaries) => {
        this.serviceFlows = summaries || [];
        this.filteredServiceFlows = [...this.serviceFlows];
        this.isLoading = false;
        console.log('Loaded service flow summaries:', this.serviceFlows);
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = `Failed to load service flows: ${error.message}`;
        console.error('Error loading service flows:', error);
      }
    });
  }

  applyFilter(): void {
    const term = this.searchTerm.toLowerCase().trim();

    if (!term) {
      this.filteredServiceFlows = [...this.serviceFlows];
      return;
    }

    this.filteredServiceFlows = this.serviceFlows.filter(serviceFlow =>
      serviceFlow.service_code.toLowerCase().includes(term) ||
      (serviceFlow.service_name && serviceFlow.service_name.toLowerCase().includes(term))
    );
  }

  selectServiceFlow(serviceFlow: ServiceFlowSummary): void {
    this.selectedServiceCode = serviceFlow.service_code;
    this.selectedServiceFlow = serviceFlow;
  }

  loadServiceFlow(serviceFlow: ServiceFlowSummary, event: Event): void {
    event.stopPropagation();
    this.dialogRef.close({
      action: 'load',
      serviceCode: serviceFlow.service_code,
      serviceName: serviceFlow.service_name
    } as ServiceFlowSelectionResult);
  }

  viewFlowDetails(serviceFlow: ServiceFlowSummary, event: Event): void {
    event.stopPropagation();

    // Here you could open another dialog with detailed flow information
    console.log('View details for service flow:', serviceFlow);

    // For now, just select the flow
    this.selectServiceFlow(serviceFlow);
  }

  createNewFlow(): void {
    this.dialogRef.close({
      action: 'create'
    } as ServiceFlowSelectionResult);
  }

  onLoadSelected(): void {
    if (this.selectedServiceFlow) {
      this.dialogRef.close({
        action: 'load',
        serviceCode: this.selectedServiceFlow.service_code,
        serviceName: this.selectedServiceFlow.service_name
      } as ServiceFlowSelectionResult);
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  trackServiceFlow(index: number, serviceFlow: ServiceFlowSummary): string {
    return serviceFlow.service_code;
  }
}
