// components/workflow-builder/workflow-builder.component.ts
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
        <span>{{ workflow.name }}</span>
        <span class="spacer"></span>

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

        <button mat-icon-button (click)="loadWorkflow()" title="Load">
          <mat-icon>folder_open</mat-icon>
        </button>

        <button mat-icon-button (click)="resetWorkflow()" title="New Workflow">
          <mat-icon>add</mat-icon>
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
                 (wheel)="onCanvasWheel($event)">

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

                  <path *ngFor="let connection of workflow.connections; trackBy: trackConnection"
                        [attr.d]="getConnectionPath(connection)"
                        stroke="#666"
                        stroke-width="2"
                        fill="none"
                        marker-end="url(#arrowhead)"
                        [class.selected]="selectedConnectionId === connection.id"
                        (click)="selectConnection(connection.id)"
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
                    (elementClick)="selectElement(element.id)"
                    (elementDoubleClick)="editElement(element.id)"
                    (positionChanged)="updateElementPosition(element.id, $event)"
                    (connectionStart)="startConnection(element.id, $event)"
                    (connectionEnd)="endConnection(element.id)"
                    (deleteElement)="deleteElement(element.id)">
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
    }

    .workflow-toolbar {
      flex-shrink: 0;
      background: #1976d2;
      color: white;
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
        linear-gradient(#eee 1px, transparent 1px),
        linear-gradient(90deg, #eee 1px, transparent 1px);
      background-size: 20px 20px, 20px 20px, 20px 20px;
      background-position: 0 0, 0 0, 0 0;
    }

    .canvas-wrapper.panning {
      cursor: grabbing;
    }

    .canvas {
      position: relative;
      width: 5000px;
      height: 5000px;
      transform-origin: 0 0;
    }

    .connections-layer {
      position: absolute;
      top: 0;
      left: 0;
      pointer-events: none;
      z-index: 1;
    }

    .connection-line {
      pointer-events: stroke;
      cursor: pointer;
      transition: stroke-width 0.2s;
    }

    .connection-line:hover {
      stroke-width: 3;
      stroke: #007bff;
    }

    .connection-line.selected {
      stroke: #007bff;
      stroke-width: 3;
    }

    .temp-connection {
      pointer-events: none;
    }

    .element-container {
      position: absolute;
      z-index: 2;
    }

    .minimap-container {
      position: absolute;
      bottom: 20px;
      right: 20px;
      width: 200px;
      height: 150px;
      background: rgba(255, 255, 255, 0.9);
      border: 1px solid #ddd;
      border-radius: 4px;
      overflow: hidden;
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
  }

  ngAfterViewInit(): void {
    // Initialize canvas pan to center
    this.canvasState.panX = -100;
    this.canvasState.panY = -100;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Canvas Transform
  getCanvasTransform(): string {
    return `translate(${this.canvasState.panX}px, ${this.canvasState.panY}px) scale(${this.canvasState.zoom})`;
  }

  // Zoom Controls
  zoomIn(): void {
    this.canvasState.zoom = Math.min(this.canvasState.zoom * 1.2, 3);
  }

  zoomOut(): void {
    this.canvasState.zoom = Math.max(this.canvasState.zoom / 1.2, 0.2);
  }

  resetZoom(): void {
    this.canvasState.zoom = 1;
    this.canvasState.panX = -100;
    this.canvasState.panY = -100;
  }

  // Mouse Events
  onCanvasMouseDown(event: MouseEvent): void {
    if (event.target === this.canvasWrapperRef.nativeElement) {
      this.isPanning = true;
      this.lastPanPoint = { x: event.clientX, y: event.clientY };
      this.canvasWrapperRef.nativeElement.classList.add('panning');
      event.preventDefault();
    }
  }

  onCanvasMouseMove(event: MouseEvent): void {
    if (this.isPanning) {
      const deltaX = event.clientX - this.lastPanPoint.x;
      const deltaY = event.clientY - this.lastPanPoint.y;

      this.canvasState.panX += deltaX;
      this.canvasState.panY += deltaY;

      this.lastPanPoint = { x: event.clientX, y: event.clientY };
    } else if (this.connectingFrom) {
      // Update temporary connection line
      const rect = this.canvasWrapperRef.nativeElement.getBoundingClientRect();
      const x = (event.clientX - rect.left - this.canvasState.panX) / this.canvasState.zoom;
      const y = (event.clientY - rect.top - this.canvasState.panY) / this.canvasState.zoom;

      const sourceElement = this.workflow.elements.find(el => el.id === this.connectingFrom);
      if (sourceElement) {
        this.tempConnection = this.createCurvedPath(
          sourceElement.position.x + 100,
          sourceElement.position.y + 30,
          x,
          y
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

  onCanvasWheel(event: WheelEvent): void {
    event.preventDefault();
    const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.2, Math.min(3, this.canvasState.zoom * zoomFactor));

    // Zoom towards mouse position
    const rect = this.canvasWrapperRef.nativeElement.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    const zoomRatio = newZoom / this.canvasState.zoom;
    this.canvasState.panX = mouseX - (mouseX - this.canvasState.panX) * zoomRatio;
    this.canvasState.panY = mouseY - (mouseY - this.canvasState.panY) * zoomRatio;
    this.canvasState.zoom = newZoom;
  }

  // Drag and Drop
  onDragOver(event: DragEvent): void {
    event.preventDefault();
  }

  onElementDrop(event: DragEvent): void {
    event.preventDefault();
    const elementType = event.dataTransfer?.getData('text/plain') as ElementType;

    if (elementType) {
      const rect = this.canvasRef.nativeElement.getBoundingClientRect();
      const position: Position = {
        x: (event.clientX - rect.left) / this.canvasState.zoom,
        y: (event.clientY - rect.top) / this.canvasState.zoom
      };

      try {
        const element = this.workflowService.addElement(elementType, position);
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

  // Element Management
  selectElement(elementId: string): void {
    this.selectedElementId = elementId;
    this.selectedConnectionId = undefined;
  }

  editElement(elementId: string): void {
    this.selectedElementId = elementId;
    // Properties panel will handle the editing
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

  // Connection Management
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

  selectConnection(connectionId: string): void {
    this.selectedConnectionId = connectionId;
    this.selectedElementId = undefined;
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
    const midX = (x1 + x2) / 2;
    return `M ${x1} ${y1} Q ${midX} ${y1} ${midX} ${(y1 + y2) / 2} Q ${midX} ${y2} ${x2} ${y2}`;
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

  loadWorkflow(): void {
    // In a real implementation, this would open a dialog to select a workflow
    this.workflowService.loadWorkflow();
    this.snackBar.open('Workflow loaded', 'Close', { duration: 2000 });
  }

  resetWorkflow(): void {
    if (confirm('Are you sure you want to create a new workflow? All unsaved changes will be lost.')) {
      this.workflowService.resetWorkflow();
      this.selectedElementId = undefined;
      this.selectedConnectionId = undefined;
      this.snackBar.open('New workflow created', 'Close', { duration: 2000 });
    }
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
    // Handle connection updates if needed
  }

  updateViewport(viewport: any): void {
    this.canvasState.panX = viewport.panX;
    this.canvasState.panY = viewport.panY;
    this.canvasState.zoom = viewport.zoom;
  }

  // Track Functions for ngFor
  trackElement(index: number, element: WorkflowElement): string {
    return element.id;
  }

  trackConnection(index: number, connection: any): string {
    return connection.id;
  }
}
