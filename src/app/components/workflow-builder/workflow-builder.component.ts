// workflow-builder.component.ts - Complete corrected version
import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatDividerModule } from '@angular/material/divider';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { Subject, takeUntil } from 'rxjs';

import { WorkflowService } from '../../services/workflow.service';
import { ApiService } from '../../services/api.service';
import {
  WorkflowData,
  WorkflowElement,
  ElementType,
  ELEMENT_CONFIGS,
  ELEMENT_DIMENSIONS,
  Position,
  CanvasState,
  canBeContained,
  canContainChildren,
  getValidChildTypes
} from '../../models/workflow.models';
import { WorkflowElementComponent } from './workflow-element/workflow-element.component';
import { PropertiesPanelComponent } from './properties-panel/properties-panel.component';
import { ElementPaletteComponent } from './element-palette/element-palette.component';
import { MinimapComponent } from './minimap/minimap.component';
import {
  ServiceFlowSelectionResult,
  ServiceFlowSelectorDialogComponent
} from './workflow-selector-dialog/workflow-selector-dialog.component';
import { SaveWorkflowDialogComponent, SaveWorkflowResult } from './save-workflow-dialog/save-workflow-dialog.component';
import { ConfirmDialogComponent } from '../shared/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-workflow-builder',
  standalone: true,
  imports: [
    CommonModule,
    DragDropModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatSidenavModule,
    MatDividerModule,
    MatButtonToggleModule,
    MatTooltipModule,
    MatSnackBarModule,
    MatDialogModule,
    WorkflowElementComponent,
    PropertiesPanelComponent,
    ElementPaletteComponent,
    MinimapComponent
  ],
  templateUrl: './workflow-builder.component.html',
  styleUrl: './workflow-builder.component.scss'
})
export class WorkflowBuilderComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('canvas', { static: false }) canvasRef!: ElementRef<HTMLDivElement>;
  @ViewChild('canvasWrapper', { static: false }) canvasWrapperRef!: ElementRef<HTMLDivElement>;
  @ViewChild(PropertiesPanelComponent) propertiesPanel?: PropertiesPanelComponent;
  @ViewChild('leftSidenav') leftSidenav!: any; // Add this

  // Add these properties
  isLeftSidenavOpen = false; // Default to closed
  leftSidenavWidth = 280; // Default width in pixels
  isResizingLeftSidenav = false;

  workflow: WorkflowData = {
    name: 'New Workflow',
    elements: [],
    connections: [],
    viewMode: 'collapsed',
    metadata: {}
  };
  selectedElementId?: string;
  selectedConnectionId?: string;
  availableElements = ELEMENT_CONFIGS;
  currentServiceCode?: string;
  workflowId?: string; // Track current workflow ID

  canvasState: CanvasState = {
    zoom: 1,
    panX: 100,
    panY: 100
  };

  canvasSize = { width: 5000, height: 5000 };

  // Connection state
  connectingFrom?: string;
  tempConnection?: string;

  // Pan state
  isPanning = false;
  lastPanPoint = { x: 0, y: 0 };
  isDraggingElement = false;

  private destroy$ = new Subject<void>();
  private keydownHandler?: (event: KeyboardEvent) => void;

  constructor(
    private workflowService: WorkflowService,
    private apiService: ApiService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    // Subscribe to workflow changes
    this.workflowService.workflow$
      .pipe(takeUntil(this.destroy$))
      .subscribe(workflow => {
        this.workflow = workflow;
        this.workflowId = workflow.id;
        this.currentServiceCode = workflow.metadata?.service_code;
      });

    // Check if we have a workflow ID in the route
    this.route.params.pipe(takeUntil(this.destroy$)).subscribe(params => {
      if (params['workflowId']) {
        this.loadWorkflowById(params['workflowId']);
      } else {
        // Show selector if no workflow loaded and API is configured
        if (this.apiService.isConfigured()) {
          setTimeout(() => {
            this.showServiceFlowSelector();
          }, 500);
        }
      }
    });
  }
  toggleLeftSidenav(): void {
    this.isLeftSidenavOpen = !this.isLeftSidenavOpen;
  }
  startResizeLeftSidenav(event: MouseEvent): void {
    event.preventDefault();
    this.isResizingLeftSidenav = true;

    const startX = event.clientX;
    const startWidth = this.leftSidenavWidth;

    const onMouseMove = (e: MouseEvent) => {
      if (!this.isResizingLeftSidenav) return;

      const diff = e.clientX - startX;
      const newWidth = startWidth + diff;

      // Set min and max width constraints
      this.leftSidenavWidth = Math.max(200, Math.min(600, newWidth));
    };

    const onMouseUp = () => {
      this.isResizingLeftSidenav = false;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);

      // Add cursor style during resize
      document.body.style.cursor = '';
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);

    // Add cursor style during resize
    document.body.style.cursor = 'col-resize';
  }
  ngAfterViewInit(): void {
    this.setupKeyboardListeners();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();

    // Remove keyboard listener
    if (this.keydownHandler) {
      document.removeEventListener('keydown', this.keydownHandler);
    }
  }

  // Get only top-level elements (not children)
  getTopLevelElements(): WorkflowElement[] {
    return this.workflow.elements.filter(el => !el.parentId);
  }

  // Get only connections between top-level elements
  getTopLevelConnections(): any[] {
    const topLevelIds = new Set(this.getTopLevelElements().map(el => el.id));
    return this.workflow.connections.filter(conn =>
      topLevelIds.has(conn.sourceId) && topLevelIds.has(conn.targetId)
    );
  }

  // Handle view mode change
  onViewModeChange(event: any): void {
    this.workflowService.setViewMode(event.value);
  }

  // Handle element expansion toggle
  onElementExpandToggled(elementId: string): void {
    this.workflowService.toggleElementExpansion(elementId);
  }

  showServiceFlowSelector(): void {
    if (!this.apiService.isConfigured()) {
      this.snackBar.open('API not configured. Please configure the base URL first.', 'Close', {
        duration: 5000
      });
      return;
    }

    const dialogRef = this.dialog.open(ServiceFlowSelectorDialogComponent, {
      width: '90vw',
      maxWidth: '900px',
      height: '80vh',
      disableClose: false,
      data: {}
    });

    dialogRef.afterClosed().subscribe((result: ServiceFlowSelectionResult) => {
      if (result) {
        this.handleServiceFlowSelection(result);
      }
    });
  }

  private handleServiceFlowSelection(result: ServiceFlowSelectionResult): void {
    if (result.action === 'create') {
      this.createNewWorkflow();
    } else if (result.action === 'load' && result.serviceCode) {
      // Load service flow and create/update workflow
      this.loadServiceFlowFromApi(result.serviceCode, result.serviceName || 'Service Flow');
    } else if (result.action === 'load-workflow' && result.workflowId) {
      // Load existing workflow
      this.loadWorkflowById(result.workflowId);
    }
  }

  private loadWorkflowById(workflowId: string): void {
    this.snackBar.open('Loading workflow...', '', { duration: 2000 }
    );

    // First get the workflow data directly to access canvas state
    this.apiService.getWorkflow(workflowId).subscribe({
      next: (response) => {
        console.log('Raw workflow response:', response);

        // Load the workflow using the service
        this.workflowService.loadWorkflowById(workflowId).subscribe({
          next: (workflowData) => {
            this.workflowId = workflowData.id;
            this.currentServiceCode = workflowData.metadata?.service_code;
            this.selectedElementId = undefined;
            this.selectedConnectionId = undefined;

            // Restore canvas state if available
            if (response.canvas_state) {
              this.canvasState = {
                zoom: response.canvas_state.zoom || 1,
                panX: response.canvas_state.panX || 100,
                panY: response.canvas_state.panY || 100
              };

              // Restore sidenav state
              if (response.canvas_state.leftSidenavOpen !== undefined) {
                this.isLeftSidenavOpen = response.canvas_state.leftSidenavOpen;
              }
              if (response.canvas_state.leftSidenavWidth) {
                this.leftSidenavWidth = response.canvas_state.leftSidenavWidth;
              }

              console.log('Restored canvas state:', this.canvasState);
              console.log('Restored sidenav state:', {
                open: this.isLeftSidenavOpen,
                width: this.leftSidenavWidth
              });

              // Also restore view mode if available
              if (response.canvas_state.viewMode) {
                this.workflow.viewMode = response.canvas_state.viewMode;
              }
            } else {
              // If no canvas state, auto-organize for better layout
              setTimeout(() => {
                this.autoOrganize();
              }, 100);
            }

            // Debug: Log the loaded elements
            console.log('Loaded workflow elements:', this.workflow.elements);
            console.log('Pages with children:', this.workflow.elements.filter(el =>
              el.type === 'page' && el.children && el.children.length > 0
            ));

            // If viewMode is 'expanded', ensure at least some containers are expanded
            if (this.workflow.viewMode === 'expanded') {
              const pages = this.workflow.elements.filter(el => el.type === 'page');
              pages.forEach(page => {
                if (page.children && page.children.length > 0 && !page.isExpanded) {
                  console.log(`Auto-expanding page ${page.id} because it has children`);
                  page.isExpanded = true;
                }
              });
            }

            // Update route
            this.router.navigate(['/workflow-builder', { workflowId }]);

            this.snackBar.open('Workflow loaded successfully!', 'Close', {
              duration: 3000
            });
          },
          error: (error) => {
            console.error('Error loading workflow:', error);
            this.snackBar.open(`Failed to load workflow: ${error.message}`, 'Close', {
              duration: 5000
            });
          }
        });
      },
      error: (error) => {
        console.error('Error loading workflow:', error);
        this.snackBar.open(`Failed to load workflow: ${error.message}`, 'Close', {
          duration: 5000
        });
      }
    });
  }

  private loadServiceFlowFromApi(serviceCode: string, serviceName: string): void {
    this.snackBar.open(`Loading ${serviceName}...`, '', { duration: 2000 });

    // Use new API that creates/updates workflow
    this.apiService.loadServiceFlowAsWorkflow(serviceCode, serviceName).subscribe({
      next: (workflow) => {
        // Load the created/updated workflow
        this.loadWorkflowById(workflow.id);
      },
      error: (error) => {
        console.error('Error loading service flow:', error);
        this.snackBar.open(`Failed to load ${serviceName}: ${error.message}`, 'Close', {
          duration: 5000
        });
      }
    });
  }

  createNewWorkflow(): void {
    if (this.propertiesPanel) {
      this.propertiesPanel.clearAllCache();
    }
    const dialogRef = this.dialog.open(SaveWorkflowDialogComponent, {
      width: '500px',
      data: {
        name: `New Workflow ${new Date().toLocaleDateString()}`,
        isUpdate: false
      }
    });

    dialogRef.afterClosed().subscribe((result: SaveWorkflowResult) => {
      if (result) {
        const newWorkflow: WorkflowData = {
          name: result.name,
          description: result.description,
          elements: [],
          connections: [],
          viewMode: 'collapsed',
          metadata: {
            service_id: result.serviceId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            version: '1.0'
          }
        };

        // Create workflow via API
        this.apiService.createWorkflow({
          name: result.name,
          description: result.description,
          service_id: result.serviceId,
          metadata: newWorkflow.metadata
        }).subscribe({
          next: (createdWorkflow) => {
            newWorkflow.id = createdWorkflow.id;
            this.workflowService.loadWorkflow(newWorkflow);
            this.workflowId = createdWorkflow.id;
            this.currentServiceCode = createdWorkflow.service_code;
            this.selectedElementId = undefined;
            this.selectedConnectionId = undefined;
            this.resetZoom();

            // Update route
            if (createdWorkflow.id) {
              this.router.navigate(['/workflow-builder', { workflowId: createdWorkflow.id }]);
            }

            this.snackBar.open('New workflow created', 'Close', { duration: 2000 });
          },
          error: (error) => {
            this.snackBar.open('Failed to create workflow', 'Close', { duration: 5000 });
          }
        });
      }
    });
  }

  saveWorkflow(): void {
    if (!this.workflowId) {
      // If no workflow ID, need to create new
      this.saveAsNewWorkflow();
      return;
    }

    // Show saving indicator
    this.snackBar.open('Saving workflow...', '', { duration: 0 });
    if (this.propertiesPanel) {
      this.propertiesPanel.clearAllCache();
    }
    // Prepare data for saving - ensure all elements have their current positions and all properties
    const elementsWithPositions = this.workflow.elements.map(element => {
      const baseElement = {
        ...element,
        position: element.position || { x: 0, y: 0 },
        position_x: element.position?.x || 0,
        position_y: element.position?.y || 0,
        relative_position_x: element.parentId ? (element.position?.x || 0) : undefined,
        relative_position_y: element.parentId ? (element.position?.y || 0) : undefined,
        is_expanded: element.isExpanded || false,
        parent_id: element.parentId || null,
        children: element.children || []
      };

      // For pages, ensure all fields are properly in properties
      if (element.type === ElementType.PAGE) {
        const pageProperties = { ...element.properties };

        // Ensure active_ind is set
        if (pageProperties['active_ind'] === undefined) {
          pageProperties['active_ind'] = true;
        }

        // Ensure service is set from workflow if not in properties
        if (!pageProperties.service && !pageProperties.service_id && this.workflow.metadata?.service_id) {
          pageProperties.service = this.workflow.metadata.service_id;
          pageProperties.service_id = this.workflow.metadata.service_id;
        }

        baseElement.properties = pageProperties;
      } else {
        // For other elements, just ensure active_ind
        baseElement.properties = {
          ...element.properties,
          active_ind: element.properties['active_ind'] !== false
        };
      }

      return baseElement;
    });

    const saveData = {
      name: this.workflow.name,
      description: this.workflow.description || '',
      service_id: this.workflow.metadata?.service_id || null,
      service_code: this.workflow.metadata?.service_code || this.currentServiceCode || null,
      // is_active and is_draft should be at the root level, not in metadata
      is_active: true, // Default to true for active workflows
      is_draft: this.workflow.metadata?.is_draft !== false,
      version: this.workflow.metadata?.version || '1.0',
      metadata: {
        ...this.workflow.metadata,
        updated_at: new Date().toISOString(),
        last_saved_by: 'user' // Add user identifier if available
      },
      elements: elementsWithPositions,
      connections: this.workflow.connections.map(conn => ({
        ...conn,
        id: conn.id || null,
        source_id: conn.sourceId,
        target_id: conn.targetId,
        source_port: conn.sourcePort || null,
        target_port: conn.targetPort || null
      })),
      canvas_state: {
        zoom: this.canvasState.zoom || 1,
        panX: this.canvasState.panX || 0,
        panY: this.canvasState.panY || 0,
        viewMode: this.workflow.viewMode || 'collapsed',
        expandedElementId: this.workflow.expandedElementId || null,
        selectedElementId: this.selectedElementId || null,
        canvasSize: this.canvasSize,
        leftSidenavOpen: this.isLeftSidenavOpen,
        leftSidenavWidth: this.leftSidenavWidth
      },
      // Add deleted elements tracking
      deleted_elements: {}
    };

// Log what we're sending for debugging
    console.log('Saving workflow with elements:', saveData.elements.filter(el => el.type === 'page'));

    console.log('Saving workflow with data:', saveData);

    this.apiService.saveCompleteWorkflow(this.workflowId, saveData).subscribe({
      next: (result) => {
        this.snackBar.dismiss();
        this.snackBar.open('Workflow saved successfully', 'Close', { duration: 3000 });
      },
      error: (error) => {
        this.snackBar.dismiss();
        this.snackBar.open(`Error saving workflow: ${error.message}`, 'Close', { duration: 5000 });
      }
    });
  }
  saveAsNewWorkflow(): void {
    if (this.propertiesPanel) {
      this.propertiesPanel.clearAllCache();
    }
    const dialogRef = this.dialog.open(SaveWorkflowDialogComponent, {
      width: '500px',
      data: {
        name: `${this.workflow.name} (Copy)`,
        description: this.workflow.description,
        serviceId: this.workflow.metadata?.service_id,
        isUpdate: false
      }
    });

    dialogRef.afterClosed().subscribe((result: SaveWorkflowResult) => {
      if (result) {
        // Clone the workflow
        if (this.workflowId) {
          this.apiService.cloneWorkflow(this.workflowId, {
            name: result.name,
            description: result.description
          }).subscribe({
            next: (clonedWorkflow) => {
              this.loadWorkflowById(clonedWorkflow.id);
              this.snackBar.open('Workflow cloned successfully', 'Close', { duration: 3000 });
            },
            error: (error) => {
              this.snackBar.open(`Error cloning workflow: ${error.message}`, 'Close', { duration: 5000 });
            }
          });
        } else {
          // Create new workflow
          this.createNewWorkflow();
        }
      }
    });
  }

  deleteWorkflow(): void {
    if (!this.workflowId) {
      // Just clear local workflow
      this.workflowService.createNewWorkflow('New Workflow');
      return;
    }

    const confirmDialog = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Delete Workflow',
        message: `Are you sure you want to delete "${this.workflow.name}"? This action cannot be undone.`,
        confirmText: 'Delete',
        cancelText: 'Cancel'
      }
    });

    confirmDialog.afterClosed().subscribe(result => {
      if (result && this.workflowId) {
        this.snackBar.open('Deleting workflow...', '', { duration: 0 });

        this.apiService.deleteWorkflow(this.workflowId).subscribe({
          next: () => {
            this.snackBar.dismiss();
            this.snackBar.open('Workflow deleted successfully', 'Close', { duration: 3000 });

            // Navigate to workflow list or create new
            this.router.navigate(['/workflow-builder']);
            this.workflowService.createNewWorkflow('New Workflow');
            this.workflowId = undefined;
            setTimeout(() => {
              this.showServiceFlowSelector();
            }, 500);
          },
          error: (error) => {
            this.snackBar.dismiss();
            this.snackBar.open(`Error deleting workflow: ${error.message}`, 'Close', { duration: 5000 });
          }
        });
      }
    });
  }

  // Update the workflow status display
  getWorkflowStatus(): string {
    if (this.workflowId) {
      if (this.workflow.metadata?.is_draft) {
        return 'Draft';
      }
      return `v${this.workflow.metadata?.version || '1.0'}`;
    } else if (this.currentServiceCode) {
      return `Service ${this.currentServiceCode}`;
    }
    return 'Local Only';
  }

  // Add version control
  createNewVersion(): void {
    if (!this.workflowId) {
      this.snackBar.open('Save workflow first before creating versions', 'Close', { duration: 3000 });
      return;
    }

    this.apiService.cloneWorkflow(this.workflowId, {
      name: `${this.workflow.name} v${parseInt(this.workflow.metadata?.version || '1') + 1}`
    }).subscribe({
      next: (workflow) => {
        this.loadWorkflowById(workflow.id);
        this.snackBar.open('New version created', 'Close', { duration: 3000 });
      },
      error: (error) => {
        this.snackBar.open(`Error creating version: ${error.message}`, 'Close', { duration: 5000 });
      }
    });
  }

  // Add publish/unpublish workflow
  toggleWorkflowStatus(): void {
    if (!this.workflowId) return;

    const newStatus = !this.workflow.metadata?.is_draft;
    const statusText = newStatus ? 'draft' : 'published';

    this.apiService.updateWorkflow(this.workflowId, { is_draft: newStatus }).subscribe({
      next: (updated) => {
        this.workflow.metadata = {
          ...this.workflow.metadata,
          is_draft: newStatus
        };
        this.snackBar.open(`Workflow marked as ${statusText}`, 'Close', { duration: 3000 });
      },
      error: (error) => {
        this.snackBar.open(`Error updating workflow status: ${error.message}`, 'Close', { duration: 5000 });
      }
    });
  }

  // Modified to handle dropping into expanded containers
  onElementSelected(elementType: ElementType): void {
    // Check if we have expanded containers that can accept this type
    let parentId: string | undefined;
    let position: Position = {
      x: 200 + Math.random() * 100,
      y: 200 + Math.random() * 100
    };

    // Get all expanded elements that could contain this type
    const expandedContainers = this.workflow.elements.filter(el =>
      el.isExpanded &&
      canContainChildren(el.type) &&
      this.getValidChildTypes(el.type).includes(elementType)
    );

    if (expandedContainers.length > 0) {
      // Use the most recently expanded container (last in the list)
      // Or you could use the one stored in expandedElementId if it's valid
      let targetContainer: WorkflowElement | undefined;

      // First check if the tracked expanded element can accept this type
      if (this.workflow.expandedElementId) {
        targetContainer = expandedContainers.find(el => el.id === this.workflow.expandedElementId);
      }

      // If not found or not valid, use the last expanded container
      if (!targetContainer) {
        targetContainer = expandedContainers[expandedContainers.length - 1];
      }

      if (targetContainer) {
        parentId = targetContainer.id;
        position = { x: 0, y: 0 }; // Position will be relative to parent
      }
    } else if (canBeContained(elementType)) {
      // This element type must be in a container but no valid container is expanded
      const containerType = elementType === ElementType.CATEGORY ? 'page' : 'category';
      this.snackBar.open(
        `${elementType} must be placed inside a ${containerType}. Expand a ${containerType} first.`,
        'Close',
        { duration: 3000 }
      );
      return;
    }

    try {
      const element = this.workflowService.addElement(elementType, position, {}, parentId);
      this.selectedElementId = element.id;

      // Update the active expanded element if we added to a container
      if (parentId) {
        this.workflow.expandedElementId = parentId;
      }

      this.snackBar.open(`${elementType} element added`, 'Close', { duration: 2000 });
    } catch (error) {
      this.snackBar.open((error as Error).message, 'Close', { duration: 3000 });
    }
  }

  // Helper to get valid child types
  private getValidChildTypes(parentType: ElementType): ElementType[] {
    return getValidChildTypes(parentType);
  }

  // Export service flow
  exportServiceFlow(): void {
    if (!this.workflowId) {
      this.snackBar.open('Save workflow first before exporting', 'Close', { duration: 3000 });
      return;
    }

    this.apiService.exportWorkflow(this.workflowId).subscribe({
      next: (serviceFlow) => {
        const dataStr = JSON.stringify({ service_flow: [serviceFlow] }, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });

        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `service-flow-${this.currentServiceCode || 'export'}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        this.snackBar.open('Service flow exported', 'Close', { duration: 3000 });
      },
      error: (error) => {
        this.snackBar.open('Failed to export service flow', 'Close', { duration: 3000 });
      }
    });
  }

  autoOrganize(): void {
    this.workflowService.autoOrganizeElements();
    this.resetZoom();
    this.snackBar.open('Elements auto-organized', 'Close', { duration: 2000 });
  }

  getElementCount(type: string): number {
    return this.workflow.elements.filter(el => el.type === type).length;
  }

  validateWorkflow(): void {
    const validation = this.workflowService.validateWorkflow();
    if (validation.isValid) {
      this.snackBar.open('Workflow is valid', 'Close', { duration: 3000 });
    } else {
      const message = 'Validation errors: ' + validation.errors.join(', ');
      this.snackBar.open(message, 'Close', { duration: 5000 });
    }
  }

  // Canvas Transform
  getCanvasTransform(): string {
    return `translate(${this.canvasState.panX}px, ${this.canvasState.panY}px) scale(${this.canvasState.zoom})`;
  }

  // Convert screen coordinates to canvas coordinates
  screenToCanvas(screenX: number, screenY: number): { x: number; y: number } {
    const rect = this.canvasWrapperRef.nativeElement.getBoundingClientRect();
    const canvasX = (screenX - rect.left - this.canvasState.panX) / this.canvasState.zoom;
    const canvasY = (screenY - rect.top - this.canvasState.panY) / this.canvasState.zoom;
    return { x: canvasX, y: canvasY };
  }

  // Zoom Controls
  zoomIn(): void {
    const oldZoom = this.canvasState.zoom;
    this.canvasState.zoom = Math.min(this.canvasState.zoom * 1.2, 3);

    // Zoom towards center
    const rect = this.canvasWrapperRef.nativeElement.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const zoomRatio = this.canvasState.zoom / oldZoom;
    this.canvasState.panX = centerX - (centerX - this.canvasState.panX) * zoomRatio;
    this.canvasState.panY = centerY - (centerY - this.canvasState.panY) * zoomRatio;
  }

  zoomOut(): void {
    const oldZoom = this.canvasState.zoom;
    this.canvasState.zoom = Math.max(this.canvasState.zoom / 1.2, 0.2);

    // Zoom towards center
    const rect = this.canvasWrapperRef.nativeElement.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const zoomRatio = this.canvasState.zoom / oldZoom;
    this.canvasState.panX = centerX - (centerX - this.canvasState.panX) * zoomRatio;
    this.canvasState.panY = centerY - (centerY - this.canvasState.panY) * zoomRatio;
  }

  resetZoom(): void {
    this.canvasState.zoom = 1;
    this.canvasState.panX = 100;
    this.canvasState.panY = 100;
  }

  // Mouse Events
  onCanvasMouseDown(event: MouseEvent): void {
    if (this.connectingFrom || this.isDraggingElement) return;

    const target = event.target as HTMLElement;
    if (target === this.canvasWrapperRef.nativeElement || target === this.canvasRef.nativeElement) {
      this.isPanning = true;
      this.lastPanPoint = { x: event.clientX, y: event.clientY };
      this.canvasWrapperRef.nativeElement.classList.add('panning');
      event.preventDefault();
      event.stopPropagation();
    }
  }

  onCanvasMouseMove(event: MouseEvent): void {
    if (this.isPanning && !this.isDraggingElement) {
      const deltaX = event.clientX - this.lastPanPoint.x;
      const deltaY = event.clientY - this.lastPanPoint.y;

      this.canvasState.panX += deltaX;
      this.canvasState.panY += deltaY;

      this.lastPanPoint = { x: event.clientX, y: event.clientY };
    } else if (this.connectingFrom) {
      const canvasPos = this.screenToCanvas(event.clientX, event.clientY);
      const sourceElement = this.workflow.elements.find(el => el.id === this.connectingFrom);

      if (sourceElement) {
        const sourceDims = this.getElementDimensions(sourceElement);
        this.tempConnection = this.createCurvedPath(
          sourceElement.position.x + sourceDims.width,
          sourceElement.position.y + sourceDims.height / 2,
          canvasPos.x,
          canvasPos.y
        );
      }
    }
  }

  onCanvasMouseUp(event: MouseEvent): void {
    if (this.isPanning) {
      this.isPanning = false;
      this.canvasWrapperRef.nativeElement.classList.remove('panning');
    }

    // If we're connecting and mouse up on canvas (not on element), cancel connection
    if (this.connectingFrom) {
      const target = event.target as HTMLElement;
      // Only cancel if we're not over a connection point
      if (!target.classList.contains('connection-point') &&
        !target.closest('.connection-point')) {
        setTimeout(() => {
          if (this.connectingFrom) {
            this.cancelConnection();
          }
        }, 100); // Small delay to allow connection completion
      }
    }
  }

  onCanvasClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (target === this.canvasWrapperRef.nativeElement || target === this.canvasRef.nativeElement) {
      // Don't cancel connection immediately on click - let mouseup handle it
      if (this.connectingFrom) {
        // Connection canceling is now handled in onCanvasMouseUp
        return;
      }

      // Clear selection
      this.selectedElementId = undefined;
      this.selectedConnectionId = undefined;
    }
  }

  onCanvasWheel(event: WheelEvent): void {
    event.preventDefault();
    const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1;
    const oldZoom = this.canvasState.zoom;
    const newZoom = Math.max(0.2, Math.min(3, this.canvasState.zoom * zoomFactor));

    if (newZoom !== oldZoom) {
      const rect = this.canvasWrapperRef.nativeElement.getBoundingClientRect();
      const mouseX = event.clientX - rect.left;
      const mouseY = event.clientY - rect.top;

      const zoomRatio = newZoom / oldZoom;
      this.canvasState.panX = mouseX - (mouseX - this.canvasState.panX) * zoomRatio;
      this.canvasState.panY = mouseY - (mouseY - this.canvasState.panY) * zoomRatio;
      this.canvasState.zoom = newZoom;
    }
  }

  // Drag and Drop
  onDragOver(event: DragEvent): void {
    event.preventDefault();
  }

  onElementDrop(event: DragEvent): void {
    event.preventDefault();
    const elementType = event.dataTransfer?.getData('text/plain') as ElementType;

    if (elementType) {
      const canvasPos = this.screenToCanvas(event.clientX, event.clientY);

      // Check if this element type requires a container
      if (canBeContained(elementType)) {
        // Find which expanded container the drop occurred in
        let parentId: string | undefined;
        const dropPoint = { x: event.clientX, y: event.clientY };

        // Check all expanded elements to find which one contains the drop point
        const expandedContainers = this.workflow.elements.filter(el =>
          el.isExpanded &&
          canContainChildren(el.type) &&
          this.getValidChildTypes(el.type).includes(elementType)
        );

        for (const container of expandedContainers) {
          // Get the element's DOM bounds
          const elementNode = document.querySelector(`[data-element-id="${container.id}"]`);
          if (elementNode) {
            const rect = elementNode.getBoundingClientRect();
            if (dropPoint.x >= rect.left && dropPoint.x <= rect.right &&
              dropPoint.y >= rect.top && dropPoint.y <= rect.bottom) {
              parentId = container.id;
              break;
            }
          }
        }

        if (!parentId) {
          const containerType = elementType === ElementType.CATEGORY ? 'page' : 'category';
          this.snackBar.open(
            `Drop ${elementType} inside an expanded ${containerType}`,
            'Close',
            { duration: 3000 }
          );
          return;
        }

        // Add as child of the found container
        try {
          const element = this.workflowService.addElement(elementType, { x: 0, y: 0 }, {}, parentId);
          this.selectedElementId = element.id;
          this.workflow.expandedElementId = parentId; // Update active container
          this.snackBar.open(`${elementType} added to container`, 'Close', { duration: 2000 });
        } catch (error) {
          this.snackBar.open((error as Error).message, 'Close', { duration: 3000 });
        }
      } else {
        // Top-level element - check if not dropping inside a container
        const expandedContainers = this.workflow.elements.filter(el => el.isExpanded);
        const dropPoint = { x: event.clientX, y: event.clientY };

        // Make sure we're not dropping inside an expanded container
        for (const container of expandedContainers) {
          const elementNode = document.querySelector(`[data-element-id="${container.id}"]`);
          if (elementNode) {
            const rect = elementNode.getBoundingClientRect();
            if (dropPoint.x >= rect.left && dropPoint.x <= rect.right &&
              dropPoint.y >= rect.top && dropPoint.y <= rect.bottom) {
              this.snackBar.open(
                `${elementType} is a top-level element and cannot be placed inside containers`,
                'Close',
                { duration: 3000 }
              );
              return;
            }
          }
        }

        try {
          const element = this.workflowService.addElement(elementType, canvasPos, {});
          this.selectedElementId = element.id;
          this.snackBar.open(`${elementType} element added`, 'Close', { duration: 2000 });
        } catch (error) {
          this.snackBar.open((error as Error).message, 'Close', { duration: 3000 });
        }
      }
    }
  }

  // Element Management
  selectElement(elementId: string): void {
    this.selectedElementId = elementId;
    this.selectedConnectionId = undefined;
  }

  editElement(elementId: string): void {
    this.selectedElementId = elementId;
  }

  updateElementPosition(elementId: string, position: Position): void {
    this.workflowService.updateElement(elementId, { position });
  }

  deleteElement(elementId: string): void {
    try {
      this.workflowService.removeElement(elementId);
      if (this.selectedElementId === elementId) {
        this.selectedElementId = undefined;
      }
      this.snackBar.open('Element deleted', 'Close', { duration: 2000 });
    } catch (error) {
      this.snackBar.open((error as Error).message, 'Close', { duration: 3000 });
    }
  }

  onElementDragStart(): void {
    this.isDraggingElement = true;
  }

  onElementDragEnd(): void {
    this.isDraggingElement = false;
  }

  // Connection Management
  startConnection(elementId: string, event: MouseEvent): void {
    // Don't allow connections from child elements
    const element = this.workflow.elements.find(el => el.id === elementId);
    if (element?.parentId) {
      this.snackBar.open('Cannot create connections from child elements', 'Close', { duration: 2000 });
      return;
    }

    this.connectingFrom = elementId;
    event.stopPropagation();
  }

  endConnection(elementId: string): void {
    if (this.connectingFrom && this.connectingFrom !== elementId) {
      // Don't allow connections to child elements
      const element = this.workflow.elements.find(el => el.id === elementId);
      if (element?.parentId) {
        this.snackBar.open('Cannot create connections to child elements', 'Close', { duration: 2000 });
        this.connectingFrom = undefined;
        this.tempConnection = undefined;
        return;
      }

      try {
        this.workflowService.addConnection(this.connectingFrom, elementId);
        this.snackBar.open('Connection created', 'Close', { duration: 2000 });
      } catch (error) {
        this.snackBar.open((error as Error).message, 'Close', { duration: 3000 });
      }
    }

    this.connectingFrom = undefined;
    this.tempConnection = undefined;
  }

  selectConnection(connectionId: string, event?: MouseEvent): void {
    this.selectedConnectionId = connectionId;
    this.selectedElementId = undefined;
    event?.stopPropagation();
  }

  getConnectionPath(connection: any): string {
    const sourceElement = this.workflow.elements.find(el => el.id === connection.sourceId);
    const targetElement = this.workflow.elements.find(el => el.id === connection.targetId);

    if (!sourceElement || !targetElement) return '';

    const sourceDims = this.getElementDimensions(sourceElement);
    const targetDims = this.getElementDimensions(targetElement);

    // Calculate centers of both elements
    const sourceCenterX = sourceElement.position.x + sourceDims.width / 2;
    const sourceCenterY = sourceElement.position.y + sourceDims.height / 2;
    const targetCenterX = targetElement.position.x + targetDims.width / 2;
    const targetCenterY = targetElement.position.y + targetDims.height / 2;

    // Get the best connection point on source element (output)
    const sourceConnectionPoint = this.getBestConnectionPoint(
      targetCenterX,
      targetCenterY,
      sourceElement.position,
      sourceDims,
      'output'
    );

    // Get the best connection point on target element (input)
    const targetConnectionPoint = this.getBestConnectionPoint(
      sourceCenterX,
      sourceCenterY,
      targetElement.position,
      targetDims,
      'input'
    );

    return this.createCurvedPath(
      sourceConnectionPoint.x,
      sourceConnectionPoint.y,
      targetConnectionPoint.x,
      targetConnectionPoint.y
    );
  }

  private getBestConnectionPoint(
    fromX: number,
    fromY: number,
    elementPos: Position,
    elementDims: { width: number; height: number },
    type: 'input' | 'output'
  ): { x: number; y: number; side: 'left' | 'right' | 'top' | 'bottom' } {
    // Calculate center of element
    const centerX = elementPos.x + elementDims.width / 2;
    const centerY = elementPos.y + elementDims.height / 2;

    // Calculate angle from element center to the other element
    const angle = Math.atan2(fromY - centerY, fromX - centerX);
    const angleDeg = angle * 180 / Math.PI;

    // Determine which side to use based on angle
    let side: 'left' | 'right' | 'top' | 'bottom';
    let connectionX: number;
    let connectionY: number;

    if (angleDeg >= -45 && angleDeg <= 45) {
      // Right side
      side = 'right';
      connectionX = elementPos.x + elementDims.width;
      connectionY = elementPos.y + elementDims.height / 2;
    } else if (angleDeg > 45 && angleDeg <= 135) {
      // Bottom side
      side = 'bottom';
      connectionX = elementPos.x + elementDims.width / 2;
      connectionY = elementPos.y + elementDims.height;
    } else if (angleDeg > 135 || angleDeg <= -135) {
      // Left side
      side = 'left';
      connectionX = elementPos.x;
      connectionY = elementPos.y + elementDims.height / 2;
    } else {
      // Top side
      side = 'top';
      connectionX = elementPos.x + elementDims.width / 2;
      connectionY = elementPos.y;
    }

    return { x: connectionX, y: connectionY, side };
  }

  private getElementDimensions(element: WorkflowElement): { width: number; height: number } {
    const dims = ELEMENT_DIMENSIONS[element.type];
    if (!dims) return { width: 100, height: 60 };

    return element.isExpanded ? dims.expanded : dims.collapsed;
  }

  private createCurvedPath(x1: number, y1: number, x2: number, y2: number): string {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Calculate control point offset based on distance
    const offset = Math.min(distance * 0.5, 100);

    let cp1x: number, cp1y: number, cp2x: number, cp2y: number;

    // Determine curve direction based on relative positions
    const horizontalDominant = Math.abs(dx) > Math.abs(dy);

    if (horizontalDominant) {
      // Horizontal curve
      if (dx > 0) {
        // Left to right
        cp1x = x1 + offset;
        cp1y = y1;
        cp2x = x2 - offset;
        cp2y = y2;
      } else {
        // Right to left
        cp1x = x1 - offset;
        cp1y = y1;
        cp2x = x2 + offset;
        cp2y = y2;
      }
    } else {
      // Vertical curve
      if (dy > 0) {
        // Top to bottom
        cp1x = x1;
        cp1y = y1 + offset;
        cp2x = x2;
        cp2y = y2 - offset;
      } else {
        // Bottom to top
        cp1x = x1;
        cp1y = y1 - offset;
        cp2x = x2;
        cp2y = y2 + offset;
      }
    }

    return `M ${x1} ${y1} C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${x2} ${y2}`;
  }

  // Helper Methods
  getSelectedElement(): WorkflowElement | undefined {
    return this.workflow.elements.find(el => el.id === this.selectedElementId);
  }

  getSelectedConnection(): any {
    return this.workflow.connections.find(conn => conn.id === this.selectedConnectionId);
  }

  onElementUpdated(update: { id: string; properties: any }): void {
    // Update the element immediately in the workflow (no API call)
    const element = this.workflow.elements.find(el => el.id === update.id);
    if (element) {
      // Create a properly cleaned properties object
      const cleanedProperties = { ...update.properties };

      // Convert string IDs to numbers
      const numericFields = [
        'service', 'service_id', 'sequence_number', 'sequence_number_id',
        'applicant_type', 'applicant_type_id', '_field_type', 'field_type_id',
        '_lookup', 'lookup_id', 'parent_field_id', '_parent_field',
        'page_id', 'category_id', '_field_id', 'condition_id',
        '_sequence', '_max_length', '_min_length', '_value_greater_than',
        '_value_less_than', '_max_file_size', '_image_max_width',
        '_image_max_height', '_precision', '_max_selections', '_min_selections',
        'target_field_id'
      ];

      numericFields.forEach(field => {
        if (cleanedProperties[field] !== undefined && cleanedProperties[field] !== null && cleanedProperties[field] !== '') {
          const value = cleanedProperties[field];
          if (typeof value === 'string' && /^\d+$/.test(value)) {
            cleanedProperties[field] = parseInt(value, 10);
          } else if (typeof value === 'number') {
            cleanedProperties[field] = value;
          }
        } else if (cleanedProperties[field] === '') {
          cleanedProperties[field] = null;
        }
      });

      // Ensure boolean fields are properly converted
      const booleanFields = [
        '_mandatory', '_is_hidden', '_is_disabled', 'is_repeatable',
        '_integer_only', '_positive_only', '_future_only', '_past_only',
        '_default_boolean', '_unique', '_coordinates_format', '_uuid_format',
        'useExisting', 'is_hidden_page', 'active_ind'
      ];

      booleanFields.forEach(field => {
        if (cleanedProperties[field] !== undefined) {
          cleanedProperties[field] = cleanedProperties[field] === true;
        }
      });

      // Ensure array fields are arrays
      const arrayFields = ['page_ids', 'category_ids', 'service_ids', 'allowed_lookups'];

      arrayFields.forEach(field => {
        if (cleanedProperties[field] !== undefined) {
          if (!Array.isArray(cleanedProperties[field])) {
            cleanedProperties[field] = cleanedProperties[field] ? [cleanedProperties[field]] : [];
          }
          // Convert array elements to numbers if they are numeric strings
          cleanedProperties[field] = cleanedProperties[field]
            .filter((val: any) => val !== null && val !== undefined && val !== '')
            .map((val: any) => {
              if (typeof val === 'string' && /^\d+$/.test(val)) {
                return parseInt(val, 10);
              }
              return val;
            });

          // Remove the field if it's an empty array and it's an ID field
          if (cleanedProperties[field].length === 0 && (field === 'id' || field.endsWith('_id'))) {
            delete cleanedProperties[field];
          }
        }
      });

      // Handle single ID fields that might be arrays
      const singleIdFields = [
        'page_id', 'category_id', '_field_id', 'condition_id',
        'service_id', 'sequence_number_id', 'applicant_type_id',
        'field_type_id', 'lookup_id', 'parent_field_id', 'target_field_id'
      ];

      singleIdFields.forEach(field => {
        if (cleanedProperties[field] !== undefined) {
          if (Array.isArray(cleanedProperties[field])) {
            // If it's an array, take the first valid value
            const validValues = cleanedProperties[field].filter((val: any) =>
              val !== null && val !== undefined && val !== ''
            );
            if (validValues.length > 0) {
              cleanedProperties[field] = typeof validValues[0] === 'string' && /^\d+$/.test(validValues[0])
                ? parseInt(validValues[0], 10)
                : validValues[0];
            } else {
              delete cleanedProperties[field];
            }
          } else if (cleanedProperties[field] === '' || cleanedProperties[field] === null) {
            delete cleanedProperties[field];
          } else if (typeof cleanedProperties[field] === 'string' && /^\d+$/.test(cleanedProperties[field])) {
            cleanedProperties[field] = parseInt(cleanedProperties[field], 10);
          }
        }
      });

      // For pages, ensure we maintain the foreign key relationships
      if (element.type === ElementType.PAGE) {
        // Preserve existing foreign key data if not in update
        if (cleanedProperties.sequence_number === undefined && element.properties.sequence_number !== undefined) {
          cleanedProperties.sequence_number = element.properties.sequence_number;
          cleanedProperties.sequence_number_id = element.properties.sequence_number_id || element.properties.sequence_number;
        }
        if (cleanedProperties.applicant_type === undefined && element.properties.applicant_type !== undefined) {
          cleanedProperties.applicant_type = element.properties.applicant_type;
          cleanedProperties.applicant_type_id = element.properties.applicant_type_id || element.properties.applicant_type;
        }

        // Also preserve the descriptive fields if they exist
        ['sequence_number_code', 'sequence_number_name', 'applicant_type_code', 'applicant_type_name'].forEach(field => {
          if (cleanedProperties[field] === undefined && element.properties[field] !== undefined) {
            cleanedProperties[field] = element.properties[field];
          }
        });
      }

      // Update element properties - merge, don't replace
      element.properties = {
        ...element.properties,
        ...cleanedProperties
      };

      // Trigger change detection to update the UI
      this.workflow = { ...this.workflow };

      console.log('Updated element properties:', element.properties);

      // ADDED: Force update the workflow service to ensure everything is synced
      this.workflowService.updateElement(update.id, {
        properties: element.properties  // Pass the merged properties
      });

      // ADDED: If we have a parent element, update its counts
      if (element.parentId) {
        const parent = this.workflow.elements.find(el => el.id === element.parentId);
        if (parent && parent.type === ElementType.PAGE) {
          // Update category and field counts
          const categories = this.workflow.elements.filter(el =>
            el.parentId === parent.id && el.type === ElementType.CATEGORY
          );
          parent.properties.categoryCount = categories.length;

          let totalFields = 0;
          categories.forEach(category => {
            const fields = this.workflow.elements.filter(el =>
              el.parentId === category.id && el.type === ElementType.FIELD
            );
            totalFields += fields.length;
          });
          parent.properties.fieldCount = totalFields;
        }
      }
    }
  }
  onConnectionUpdated(update: any): void {
    if (update.action === 'delete' && update.connection) {
      this.workflowService.removeConnection(update.connection.id);
      this.selectedConnectionId = undefined;
      this.snackBar.open('Connection deleted', 'Close', { duration: 2000 });
    }
  }

  updateViewport(viewport: CanvasState): void {
    this.canvasState = { ...viewport };
  }

  // Track Functions for ngFor
  trackElement(index: number, element: WorkflowElement): string {
    return element.id;
  }

  trackConnection(index: number, connection: any): string {
    return connection.id;
  }

  private cancelConnection(): void {
    this.connectingFrom = undefined;
    this.tempConnection = undefined;
    this.snackBar.open('Connection cancelled', 'Close', { duration: 2000 });
  }

  private setupKeyboardListeners(): void {
    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' || event.key === 'Esc') {
        if (this.connectingFrom) {
          this.cancelConnection();
          event.preventDefault();
        }
      }
    };

    document.addEventListener('keydown', handleKeydown);

    // Store the handler so we can remove it on destroy
    this.keydownHandler = handleKeydown;
  }

  onSvgClick(event: MouseEvent): void {
    // Cancel connection if clicking on empty SVG area
    if (this.connectingFrom) {
      this.cancelConnection();
      event.stopPropagation();
    }
  }

  getElementZIndex(element: WorkflowElement): number {
    // Dragging elements should be on top
    if (this.isDraggingElement && this.selectedElementId === element.id) {
      return 1000;
    }

    // Expanded elements should be above collapsed ones
    if (element.isExpanded) {
      return 100;
    }

    // Selected elements should be higher than normal
    if (this.selectedElementId === element.id) {
      return 50;
    }

    // Default z-index
    return 10;
  }
}
