// components/workflow-builder/workflow-builder.component.ts - Updated for service flows
import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { Subject, takeUntil } from 'rxjs';

import { WorkflowService } from '../../services/workflow.service';
import { ApiService } from '../../services/api.service';
import { WorkflowData, WorkflowElement, ElementType, ELEMENT_CONFIGS, Position, CanvasState } from '../../models/workflow.models';
import { WorkflowElementComponent } from './workflow-element/workflow-element.component';
import { PropertiesPanelComponent } from './properties-panel/properties-panel.component';
import { ElementPaletteComponent } from './element-palette/element-palette.component';
import { MinimapComponent } from './minimap/minimap.component';
import {
  ServiceFlowSelectionResult,
  ServiceFlowSelectorDialogComponent
} from './workflow-selector-dialog/workflow-selector-dialog.component';

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
    WorkflowElementComponent,
    PropertiesPanelComponent,
    ElementPaletteComponent,
    MinimapComponent
  ],
  templateUrl:'workflow-builder.component.html',
  styleUrl:"workflow-builder.component.scss"
})
export class WorkflowBuilderComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('canvas', { static: false }) canvasRef!: ElementRef<HTMLDivElement>;
  @ViewChild('canvasWrapper', { static: false }) canvasWrapperRef!: ElementRef<HTMLDivElement>;

  workflow: WorkflowData = { name: 'New Workflow', elements: [], connections: [] };
  selectedElementId?: string;
  selectedConnectionId?: string;
  availableElements = ELEMENT_CONFIGS;
  currentServiceCode?: string;

  canvasState: CanvasState = {
    zoom: 1,
    panX: 0,
    panY: 0
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

  constructor(
    private workflowService: WorkflowService,
    private apiService: ApiService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.workflowService.workflow$
      .pipe(takeUntil(this.destroy$))
      .subscribe(workflow => {
        this.workflow = workflow;
      });

    // Track current service code
    this.currentServiceCode = this.workflowService.getCurrentServiceCode();

    // Show service flow selector on startup if API is configured
    if (this.apiService.isConfigured()) {
      setTimeout(() => {
        this.showServiceFlowSelector();
      }, 500);
    }
  }

  ngAfterViewInit(): void {
    // Initialize canvas pan to center
    this.canvasState.panX = 100;
    this.canvasState.panY = 100;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
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
      this.loadServiceFlowFromApi(result.serviceCode, result.serviceName || 'Service Flow');
    }
  }

  private loadServiceFlowFromApi(serviceCode: string, serviceName: string): void {
    this.snackBar.open(`Loading ${serviceName}...`, '', { duration: 2000 });

    this.workflowService.loadServiceFlowFromApi(serviceCode).subscribe({
      next: (workflow) => {
        this.currentServiceCode = serviceCode;
        this.selectedElementId = undefined;
        this.selectedConnectionId = undefined;

        // Center the view on the workflow
        this.resetZoom();

        this.snackBar.open(`${serviceName} loaded successfully!`, 'Close', {
          duration: 3000
        });
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
    const newName = `New Workflow ${new Date().toLocaleDateString()}`;
    this.workflowService.createNewWorkflow(newName);
    this.currentServiceCode = undefined;
    this.selectedElementId = undefined;
    this.selectedConnectionId = undefined;
    this.resetZoom();
    this.snackBar.open('New workflow created', 'Close', { duration: 2000 });
  }

  autoOrganize(): void {
    this.workflowService.autoOrganizeElements();
    this.resetZoom();
    this.snackBar.open('Elements auto-organized', 'Close', { duration: 2000 });
  }

  exportServiceFlow(): void {
    if (!this.currentServiceCode) {
      this.snackBar.open('No service flow loaded to export', 'Close', { duration: 3000 });
      return;
    }

    const serviceFlow = this.workflowService.convertWorkflowToServiceFlow();
    if (serviceFlow) {
      const dataStr = JSON.stringify({ service_flow: [serviceFlow] }, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });

      const link = document.createElement('a');
      link.href = URL.createObjectURL(dataBlob);
      link.download = `service-flow-${this.currentServiceCode}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      this.snackBar.open('Service flow exported', 'Close', { duration: 3000 });
    } else {
      this.snackBar.open('Failed to export service flow', 'Close', { duration: 3000 });
    }
  }

  getElementCount(type: string): number {
    return this.workflow.elements.filter(el => el.type === type).length;
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

  // Mouse Events (keeping existing implementation)
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
        this.tempConnection = this.createCurvedPath(
          sourceElement.position.x + 100,
          sourceElement.position.y + 30,
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
  }

  onCanvasClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (target === this.canvasWrapperRef.nativeElement || target === this.canvasRef.nativeElement) {
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

      try {
        const element = this.workflowService.addElement(elementType, canvasPos);
        this.selectedElementId = element.id;
        this.snackBar.open(`${elementType} element added`, 'Close', { duration: 2000 });
      } catch (error) {
        this.snackBar.open((error as Error).message, 'Close', { duration: 3000 });
      }
    }
  }

  onElementSelected(elementType: ElementType): void {
    const position: Position = {
      x: 200 + Math.random() * 100,
      y: 200 + Math.random() * 100
    };

    try {
      const element = this.workflowService.addElement(elementType, position);
      this.selectedElementId = element.id;
      this.snackBar.open(`${elementType} element added`, 'Close', { duration: 2000 });
    } catch (error) {
      this.snackBar.open((error as Error).message, 'Close', { duration: 3000 });
    }
  }

  // Element Management (keeping existing implementation)
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

  // Connection Management (keeping existing implementation)
  startConnection(elementId: string, event: MouseEvent): void {
    this.connectingFrom = elementId;
    event.stopPropagation();
  }

  endConnection(elementId: string): void {
    if (this.connectingFrom && this.connectingFrom !== elementId) {
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

    return this.createCurvedPath(
      sourceElement.position.x + 100,
      sourceElement.position.y + 30,
      targetElement.position.x,
      targetElement.position.y + 30
    );
  }

  private createCurvedPath(x1: number, y1: number, x2: number, y2: number): string {
    const dx = x2 - x1;
    const dy = y2 - y1;

    const controlPoint1X = x1 + dx * 0.3;
    const controlPoint1Y = y1;
    const controlPoint2X = x2 - dx * 0.3;
    const controlPoint2Y = y2;

    return `M ${x1} ${y1} C ${controlPoint1X} ${controlPoint1Y} ${controlPoint2X} ${controlPoint2Y} ${x2} ${y2}`;
  }

  // Workflow Operations
  saveWorkflow(): void {
    this.workflowService.saveWorkflow().subscribe({
      next: (result) => {
        this.snackBar.open('Workflow saved successfully', 'Close', { duration: 3000 });
      },
      error: (error) => {
        this.snackBar.open('Error saving workflow', 'Close', { duration: 3000 });
      }
    });
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

  // Helper Methods
  getSelectedElement(): WorkflowElement | undefined {
    return this.workflow.elements.find(el => el.id === this.selectedElementId);
  }

  getSelectedConnection(): any {
    return this.workflow.connections.find(conn => conn.id === this.selectedConnectionId);
  }

  onElementUpdated(update: { id: string; properties: any }): void {
    this.workflowService.updateElement(update.id, { properties: update.properties });
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
}
