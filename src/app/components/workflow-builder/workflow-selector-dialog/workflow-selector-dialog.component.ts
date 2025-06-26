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
  templateUrl:'./workflow-selector-dialog.component.html',
  styleUrl:'./workflow-selector-dialog.component.css',
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
