// components/workflow-builder/workflow-selector-dialog/workflow-selector-dialog.component.ts
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
import { MatTabsModule } from '@angular/material/tabs';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { ApiService, ServiceFlowSummary } from '../../../services/api.service';

export interface ServiceFlowSelectionResult {
  action: 'create' | 'load' | 'load-workflow';
  serviceCode?: string;
  serviceName?: string;
  workflowId?: string;
  workflowName?: string;
}

// Remove this duplicate interface if it exists elsewhere
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
    MatTabsModule,
    MatSnackBarModule
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
                        <mat-chip [color]="workflow.is_draft ? 'warn' : 'primary'" highlighted>
                          {{ workflow.is_draft ? 'Draft' : 'Published' }}
                        </mat-chip>
                        <mat-chip *ngIf="workflow.version > 1" highlighted>
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
              <!-- Loading State -->
              <div *ngIf="isLoading" class="loading-container">
                <mat-spinner diameter="40"></mat-spinner>
                <p>Loading service flows...</p>
              </div>

              <!-- Error State -->
              <div *ngIf="errorMessage && !isLoading" class="error-container">
                <mat-icon color="warn">error</mat-icon>
                <p>{{ errorMessage }}</p>
                <button mat-button (click)="loadServiceFlows()" color="primary">
                  <mat-icon>refresh</mat-icon>
                  Retry
                </button>
              </div>

              <!-- Service Flows List -->
              <div *ngIf="!isLoading && !errorMessage" class="flows-section">
                <mat-form-field appearance="outline" class="search-field">
                  <mat-label>Search service flows</mat-label>
                  <mat-icon matPrefix>search</mat-icon>
                  <input matInput
                         [(ngModel)]="searchTerm"
                         (input)="applyFilter()"
                         placeholder="Search by code or name">
                </mat-form-field>

                <div class="flow-grid" *ngIf="filteredServiceFlows.length > 0">
                  <mat-card *ngFor="let serviceFlow of filteredServiceFlows; trackBy: trackServiceFlow"
                            class="flow-card"
                            [class.selected]="selectedServiceCode === serviceFlow.service_code"
                            (click)="selectServiceFlow(serviceFlow)">

                    <mat-card-header>
                      <mat-card-title>
                        <span class="service-code">{{ serviceFlow.service_code }}</span>
                        {{ serviceFlow.service_name }}
                      </mat-card-title>
                    </mat-card-header>

                    <mat-card-content>
                      <div class="flow-metadata">
                        <div class="metadata-item">
                          <mat-icon>description</mat-icon>
                          <span>{{ serviceFlow.page_count }} pages</span>
                        </div>
                        <div class="metadata-item">
                          <mat-icon>category</mat-icon>
                          <span>{{ serviceFlow.category_count }} categories</span>
                        </div>
                        <div class="metadata-item">
                          <mat-icon>input</mat-icon>
                          <span>{{ serviceFlow.field_count }} fields</span>
                        </div>
                      </div>

                      <mat-chip-set *ngIf="serviceFlow.is_active">
                        <mat-chip color="primary" highlighted>Active</mat-chip>
                      </mat-chip-set>
                    </mat-card-content>

                    <mat-card-actions>
                      <button mat-button color="primary" (click)="loadServiceFlow(serviceFlow, $event)">
                        <mat-icon>open_in_new</mat-icon>
                        Load
                      </button>
                      <button mat-button (click)="viewFlowDetails(serviceFlow, $event)">
                        <mat-icon>info</mat-icon>
                        Details
                      </button>
                    </mat-card-actions>
                  </mat-card>
                </div>

                <div *ngIf="filteredServiceFlows.length === 0 && !searchTerm" class="no-flows">
                  <mat-icon>dashboard</mat-icon>
                  <h3>No Service Flows Available</h3>
                  <p>No service flows are configured in the system.</p>
                </div>

                <div *ngIf="filteredServiceFlows.length === 0 && searchTerm" class="no-flows">
                  <mat-icon>search_off</mat-icon>
                  <h3>No Results Found</h3>
                  <p>No service flows match your search criteria.</p>
                  <button mat-button (click)="clearSearch()" color="primary">
                    Clear Search
                  </button>
                </div>
              </div>
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
    .workflow-selector-dialog {
      width: 100%;
      max-width: 900px;
    }

    h2 {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0;
      font-size: 20px;
      font-weight: 500;
    }

    .dialog-content {
      max-height: 600px;
      padding: 0;
      overflow: hidden;
    }

    .tab-content {
      padding: 20px;
      min-height: 400px;
      overflow-y: auto;
    }

    .loading-container,
    .error-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 60px 20px;
      text-align: center;
    }

    .loading-container p,
    .error-container p {
      margin: 16px 0;
      color: #666;
      font-size: 14px;
    }

    .error-container mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      color: #f44336;
      margin-bottom: 8px;
    }

    .search-field {
      width: 100%;
      margin-bottom: 20px;
    }

    ::ng-deep .search-field .mat-mdc-form-field-icon-prefix {
      padding-right: 8px;
    }

    .flow-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
      gap: 16px;
    }

    .flow-card,
    .workflow-card {
      cursor: pointer;
      transition: all 0.2s ease;
      border: 2px solid transparent;
    }

    .flow-card:hover,
    .workflow-card:hover {
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      transform: translateY(-2px);
    }

    .flow-card.selected,
    .workflow-card.selected {
      border-color: #2196F3;
      box-shadow: 0 0 0 1px rgba(33, 150, 243, 0.3);
    }

    mat-card-header {
      padding-bottom: 12px;
    }

    mat-card-title {
      font-size: 16px;
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    mat-card-subtitle {
      margin-top: 4px;
      color: #666;
    }

    .service-code {
      display: inline-block;
      background: #1976d2;
      color: white;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 500;
    }

    .flow-metadata,
    .workflow-metadata {
      margin: 16px 0;
    }

    .metadata-item {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      color: #666;
      margin-bottom: 8px;
    }

    .metadata-item mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: #888;
    }

    mat-chip-set {
      margin-top: 12px;
    }

    mat-chip {
      font-size: 12px;
    }

    .no-flows {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 60px 20px;
      text-align: center;
      color: #666;
    }

    .no-flows mat-icon {
      font-size: 64px;
      width: 64px;
      height: 64px;
      margin-bottom: 16px;
      color: #ddd;
    }

    .no-flows h3 {
      margin: 0 0 8px 0;
      font-size: 18px;
      font-weight: 500;
      color: #444;
    }

    .no-flows p {
      margin: 0 0 16px 0;
      font-size: 14px;
    }

    mat-card-actions {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 8px 8px 16px;
    }

    mat-dialog-actions {
      padding: 16px 20px;
      border-top: 1px solid #e0e0e0;
      gap: 8px;
    }

    @media (max-width: 768px) {
      .flow-grid {
        grid-template-columns: 1fr;
      }

      .dialog-content {
        max-height: 500px;
      }

      mat-dialog-actions {
        flex-direction: column;
        align-items: stretch;
      }

      mat-dialog-actions button {
        width: 100%;
        margin: 4px 0;
      }
    }
  `]
})
export class ServiceFlowSelectorDialogComponent implements OnInit {
  // Service flow properties
  serviceFlows: ServiceFlowSummary[] = [];
  filteredServiceFlows: ServiceFlowSummary[] = [];
  selectedServiceCode?: string;
  selectedServiceFlow?: ServiceFlowSummary;
  searchTerm = '';
  isLoading = false;
  errorMessage = '';

  // Workflow properties
  workflows: any[] = [];
  filteredWorkflows: any[] = [];
  selectedWorkflowId?: string;
  selectedWorkflow?: any;
  workflowSearchTerm = '';
  isLoadingWorkflows = false;
  selectedTabIndex = 0;

  constructor(
    private dialogRef: MatDialogRef<ServiceFlowSelectorDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private apiService: ApiService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    // Load workflows first (default tab)
    this.loadWorkflows();

    // Also load service flows
    this.loadServiceFlows();

    // If data contains a preference, switch to that tab
    if (this.data?.preferredTab === 'serviceFlows') {
      this.selectedTabIndex = 1;
    }
  }

  // ===== Workflow Methods =====
  loadWorkflows(): void {
    if (!this.apiService.isConfigured()) {
      console.log('API not configured, skipping workflow load');
      return;
    }

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
        // Don't show error to user, just show empty state
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
      (workflow.service_name && workflow.service_name.toLowerCase().includes(term)) ||
      (workflow.description && workflow.description.toLowerCase().includes(term))
    );
  }

  selectWorkflow(workflow: any): void {
    this.selectedWorkflowId = workflow.id;
    this.selectedWorkflow = workflow;
    // Clear service flow selection
    this.selectedServiceCode = undefined;
    this.selectedServiceFlow = undefined;
  }

  loadWorkflow(workflow: any, event: Event): void {
    event.stopPropagation();
    this.dialogRef.close({
      action: 'load-workflow',
      workflowId: workflow.id,
      workflowName: workflow.name
    } as ServiceFlowSelectionResult);
  }

  deleteWorkflow(workflow: any, event: Event): void {
    event.stopPropagation();

    if (confirm(`Delete workflow "${workflow.name}"? This action cannot be undone.`)) {
      this.apiService.deleteWorkflow(workflow.id).subscribe({
        next: () => {
          this.snackBar.open('Workflow deleted successfully', 'Close', { duration: 3000 });
          // Remove from list
          this.workflows = this.workflows.filter(w => w.id !== workflow.id);
          this.filterWorkflows();
          // Clear selection if this was selected
          if (this.selectedWorkflowId === workflow.id) {
            this.selectedWorkflowId = undefined;
            this.selectedWorkflow = undefined;
          }
        },
        error: (error) => {
          console.error('Error deleting workflow:', error);
          this.snackBar.open('Failed to delete workflow', 'Close', { duration: 5000 });
        }
      });
    }
  }

  // ===== Service Flow Methods =====
  loadServiceFlows(): void {
    if (!this.apiService.isConfigured()) {
      console.log('API not configured, skipping service flow load');
      return;
    }

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

  clearSearch(): void {
    this.searchTerm = '';
    this.applyFilter();
  }

  selectServiceFlow(serviceFlow: ServiceFlowSummary): void {
    this.selectedServiceCode = serviceFlow.service_code;
    this.selectedServiceFlow = serviceFlow;
    // Clear workflow selection
    this.selectedWorkflowId = undefined;
    this.selectedWorkflow = undefined;
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

    // You could open another dialog here with detailed flow information
    console.log('View details for service flow:', serviceFlow);

    // For now, just show a snackbar with basic info
    this.snackBar.open(
      `Service ${serviceFlow.service_code}: ${serviceFlow.page_count} pages, ${serviceFlow.field_count} fields`,
      'Close',
      { duration: 3000 }
    );
  }

  // ===== Common Methods =====
  canLoadSelected(): boolean {
    return (this.selectedTabIndex === 0 && !!this.selectedWorkflowId) ||
      (this.selectedTabIndex === 1 && !!this.selectedServiceCode);
  }

  onLoadSelected(): void {
    if (this.selectedTabIndex === 0 && this.selectedWorkflow) {
      // Load workflow
      this.loadWorkflow(this.selectedWorkflow, new Event('click'));
    } else if (this.selectedTabIndex === 1 && this.selectedServiceFlow) {
      // Load service flow
      this.loadServiceFlow(this.selectedServiceFlow, new Event('click'));
    }
  }

  createNewFlow(): void {
    this.dialogRef.close({
      action: 'create'
    } as ServiceFlowSelectionResult);
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  // Track by functions for performance
  trackServiceFlow(index: number, serviceFlow: ServiceFlowSummary): string {
    return serviceFlow.service_code;
  }

  trackWorkflow(index: number, workflow: any): string {
    return workflow.id;
  }
}

// Export the correct component name
export { ServiceFlowSelectorDialogComponent as WorkflowSelectorDialogComponent };
