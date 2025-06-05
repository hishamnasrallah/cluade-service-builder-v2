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
  template: `
    <div class="workflow-builder">
      <!-- Top Toolbar -->
      <mat-toolbar class="workflow-toolbar">
        <button mat-icon-button (click)="showServiceFlowSelector()" title="Select Service Flow">
          <mat-icon>account_tree</mat-icon>
        </button>

        <span class="workflow-title">{{ workflow.name }}</span>
        <span class="workflow-status" *ngIf="currentServiceCode">
          <mat-icon>cloud</mat-icon>
          Service: {{ currentServiceCode }}
        </span>
        <span class="workflow-status unsaved" *ngIf="!currentServiceCode">
          <mat-icon>cloud_off</mat-icon>
          Local Only
        </span>

        <span class="spacer"></span>

        <button mat-icon-button (click)="autoOrganize()" title="Auto-organize Layout">
          <mat-icon>auto_fix_high</mat-icon>
        </button>

        <button mat-icon-button (click)="zoomIn()" title="Zoom In">
          <mat-icon>zoom_in</mat-icon>
        </button>

        <button mat-icon-button (click)="zoomOut()" title="Zoom Out">
          <mat-icon>zoom_out</mat-icon>
        </button>

        <button mat-icon-button (click)="resetZoom()" title="Reset Zoom">
          <mat-icon>center_focus_strong</mat-icon>
        </button>

        <mat-divider vertical></mat-divider>

        <button mat-icon-button (click)="validateWorkflow()" title="Validate">
          <mat-icon>check_circle</mat-icon>
        </button>

        <button mat-icon-button (click)="saveWorkflow()" title="Save">
          <mat-icon>save</mat-icon>
        </button>

        <button mat-icon-button (click)="showServiceFlowSelector()" title="Load Service Flow">
          <mat-icon>folder_open</mat-icon>
        </button>

        <button mat-icon-button (click)="createNewWorkflow()" title="New Workflow">
          <mat-icon>add</mat-icon>
        </button>

        <button mat-icon-button (click)="exportServiceFlow()" title="Export Service Flow" [disabled]="!currentServiceCode">
          <mat-icon>download</mat-icon>
        </button>
      </mat-toolbar>

      <div class="workflow-content">
        <!-- Left Sidebar - Element Palette -->
        <mat-sidenav-container class="sidenav-container">
          <mat-sidenav mode="side" opened class="element-palette">
            <app-element-palette
              (elementSelected)="onElementSelected($event)"
              [availableElements]="availableElements">
            </app-element-palette>
          </mat-sidenav>

          <!-- Main Canvas Area -->
          <mat-sidenav-content class="canvas-container">
            <div class="canvas-wrapper"
                 #canvasWrapper
                 (mousedown)="onCanvasMouseDown($event)"
                 (mousemove)="onCanvasMouseMove($event)"
                 (mouseup)="onCanvasMouseUp($event)"
                 (mouseleave)="onCanvasMouseUp($event)"
                 (wheel)="onCanvasWheel($event)"
                 (click)="onCanvasClick($event)">

              <div class="canvas"
                   #canvas
                   [style.transform]="getCanvasTransform()"
                   (drop)="onElementDrop($event)"
                   (dragover)="onDragOver($event)">

                <!-- SVG for Connections -->
                <svg class="connections-layer"
                     [attr.width]="canvasSize.width"
                     [attr.height]="canvasSize.height">
                  <defs>
                    <marker id="arrowhead" markerWidth="10" markerHeight="7"
                            refX="9" refY="3.5" orient="auto">
                      <polygon points="0 0, 10 3.5, 0 7" fill="#666" />
                    </marker>
                  </defs>

                  <!-- Invisible wider stroke for easier clicking -->
                  <path *ngFor="let connection of workflow.connections; trackBy: trackConnection"
                        [attr.d]="getConnectionPath(connection)"
                        stroke="transparent"
                        stroke-width="12"
                        fill="none"
                        (click)="selectConnection(connection.id, $event)"
                        class="connection-clickable">
                  </path>

                  <!-- Visible connection lines -->
                  <path *ngFor="let connection of workflow.connections; trackBy: trackConnection"
                        [attr.d]="getConnectionPath(connection)"
                        stroke="#666"
                        stroke-width="2"
                        fill="none"
                        marker-end="url(#arrowhead)"
                        [class.selected]="selectedConnectionId === connection.id"
                        class="connection-line">
                  </path>

                  <!-- Temporary connection line while dragging -->
                  <path *ngIf="tempConnection"
                        [attr.d]="tempConnection"
                        stroke="#007bff"
                        stroke-width="2"
                        stroke-dasharray="5,5"
                        fill="none"
                        marker-end="url(#arrowhead)"
                        class="temp-connection">
                  </path>
                </svg>

                <!-- Workflow Elements -->
                <div *ngFor="let element of workflow.elements; trackBy: trackElement"
                     class="element-container"
                     [style.left.px]="element.position.x"
                     [style.top.px]="element.position.y">

                  <app-workflow-element
                    [element]="element"
                    [isSelected]="selectedElementId === element.id"
                    [isConnecting]="!!connectingFrom"
                    [canvasZoom]="canvasState.zoom"
                    (elementClick)="selectElement(element.id)"
                    (elementDoubleClick)="editElement(element.id)"
                    (positionChanged)="updateElementPosition(element.id, $event)"
                    (connectionStart)="startConnection(element.id, $event)"
                    (connectionEnd)="endConnection(element.id)"
                    (deleteElement)="deleteElement(element.id)"
                    (dragStart)="onElementDragStart()"
                    (dragEnd)="onElementDragEnd()">
                  </app-workflow-element>
                </div>
              </div>
            </div>

            <!-- Minimap -->
            <div class="minimap-container">
              <app-minimap
                [workflow]="workflow"
                [canvasState]="canvasState"
                [canvasSize]="canvasSize"
                (viewportChanged)="updateViewport($event)">
              </app-minimap>
            </div>

            <!-- Service Flow Info Panel -->
            <div class="info-panel" *ngIf="currentServiceCode">
              <div class="info-header">
                <mat-icon>info</mat-icon>
                <span>Service Flow: {{ currentServiceCode }}</span>
              </div>
              <div class="info-stats">
                <span>{{ getElementCount('page') }} Pages</span>
                <span>{{ getElementCount('category') }} Categories</span>
                <span>{{ getElementCount('field') }} Fields</span>
              </div>
            </div>
          </mat-sidenav-content>

          <!-- Right Sidebar - Properties Panel -->
          <mat-sidenav mode="side" opened position="end" class="properties-panel">
            <app-properties-panel
              [selectedElement]="getSelectedElement()"
              [selectedConnection]="getSelectedConnection()"
              (elementUpdated)="onElementUpdated($event)"
              (connectionUpdated)="onConnectionUpdated($event)">
            </app-properties-panel>
          </mat-sidenav>
        </mat-sidenav-container>
      </div>
    </div>
  `,
  styles: [`
    .workflow-builder {
      height: 100vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .workflow-toolbar {
      flex-shrink: 0;
      background: #1976d2;
      color: white;
    }

    .workflow-title {
      font-weight: 500;
      margin-left: 8px;
    }

    .workflow-status {
      display: flex;
      align-items: center;
      gap: 4px;
      margin-left: 12px;
      font-size: 12px;
      padding: 4px 8px;
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.2);
    }

    .workflow-status.unsaved {
      background: rgba(255, 152, 0, 0.3);
    }

    .workflow-status mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    .spacer {
      flex: 1 1 auto;
    }

    .workflow-content {
      flex: 1;
      overflow: hidden;
    }

    .sidenav-container {
      height: 100%;
    }

    .element-palette {
      width: 250px;
      background: #f5f5f5;
      border-right: 1px solid #ddd;
    }

    .properties-panel {
      width: 350px;
      background: #f5f5f5;
      border-left: 1px solid #ddd;
    }

    .canvas-container {
      position: relative;
      overflow: hidden;
    }

    .canvas-wrapper {
      width: 100%;
      height: 100%;
      position: relative;
      cursor: grab;
      background:
        radial-gradient(circle, #ccc 1px, transparent 1px),
        linear-gradient(#f0f0f0 1px, transparent 1px),
        linear-gradient(90deg, #f0f0f0 1px, transparent 1px);
      background-size: 20px 20px, 20px 20px, 20px 20px;
      background-position: 0 0, 0 0, 0 0;
      user-select: none;
    }

    .canvas-wrapper.panning {
      cursor: grabbing;
    }

    .canvas {
      position: relative;
      width: 5000px;
      height: 5000px;
      transform-origin: 0 0;
      pointer-events: none;
    }

    .connections-layer {
      position: absolute;
      top: 0;
      left: 0;
      z-index: 1;
    }

    .connection-clickable {
      pointer-events: stroke;
      cursor: pointer;
    }

    .connection-line {
      pointer-events: none;
      transition: stroke-width 0.2s, stroke 0.2s;
    }

    .connection-line.selected {
      stroke: #007bff !important;
      stroke-width: 3px;
    }

    .temp-connection {
      pointer-events: none;
    }

    .element-container {
      position: absolute;
      z-index: 2;
      pointer-events: all;
    }

    .minimap-container {
      position: absolute;
      bottom: 20px;
      right: 20px;
      width: 200px;
      height: 150px;
      background: rgba(255, 255, 255, 0.95);
      border: 1px solid #ddd;
      border-radius: 4px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      z-index: 1000;
    }

    .info-panel {
      position: absolute;
      top: 20px;
      right: 20px;
      background: rgba(255, 255, 255, 0.95);
      border: 1px solid #ddd;
      border-radius: 4px;
      padding: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      z-index: 1000;
      min-width: 200px;
    }

    .info-header {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 500;
      color: #333;
      margin-bottom: 8px;
    }

    .info-header mat-icon {
      font-size: 18px;
      color: #1976d2;
    }

    .info-stats {
      display: flex;
      flex-direction: column;
      gap: 4px;
      font-size: 12px;
      color: #666;
    }

    @media (max-width: 768px) {
      .element-palette {
        width: 60px;
      }

      .properties-panel {
        width: 280px;
      }

      .minimap-container {
        width: 150px;
        height: 100px;
      }

      .workflow-title {
        display: none;
      }

      .workflow-status {
        margin-left: 4px;
        padding: 2px 4px;
      }

      .info-panel {
        top: 10px;
        right: 10px;
        padding: 8px;
        min-width: 150px;
      }
    }
  `]
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
