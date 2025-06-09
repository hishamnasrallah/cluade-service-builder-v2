// components/approval-flow-builder/approval-flow-builder.component.ts
import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { Subject, takeUntil } from 'rxjs';

import { ApprovalFlowService } from '../../services/approval-flow.service';
import { ApprovalFlowApiService } from '../../services/approval-flow-api.service';
import {
  ApprovalFlowData,
  ApprovalFlowElement,
  ApprovalElementType,
  APPROVAL_ELEMENT_CONFIGS,
  Position,
  ApprovalConnection
} from '../../models/approval-flow.models';

// Import components (these would need to be created)
// import { ApprovalElementPaletteComponent } from './approval-element-palette/approval-element-palette.component';
// import { ApprovalPropertiesPanelComponent } from './approval-properties-panel/approval-properties-panel.component';
// import { ApprovalFlowSelectorDialogComponent } from './approval-flow-selector-dialog/approval-flow-selector-dialog.component';

interface CanvasState {
  zoom: number;
  panX: number;
  panY: number;
}

export interface ApprovalFlowSelectionResult {
  action: 'create' | 'load';
  serviceCode?: string;
  serviceName?: string;
}

@Component({
  selector: 'app-approval-flow-builder',
  standalone: true,
  imports: [
    CommonModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatSidenavModule,
    MatDividerModule
    // ApprovalElementPaletteComponent,
    // ApprovalPropertiesPanelComponent
  ],
  template: `
    <div class="approval-flow-builder">
      <!-- Top Toolbar -->
      <mat-toolbar class="approval-toolbar">
        <button mat-icon-button (click)="showApprovalFlowSelector()" title="Select Approval Flow">
          <mat-icon>account_tree</mat-icon>
        </button>

        <span class="approval-title">{{ approvalFlow.name }}</span>
        <span class="approval-status" *ngIf="currentServiceCode">
          <mat-icon>cloud</mat-icon>
          Service: {{ currentServiceCode }}
        </span>
        <span class="approval-status unsaved" *ngIf="!currentServiceCode">
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

        <button mat-icon-button (click)="validateApprovalFlow()" title="Validate">
          <mat-icon>check_circle</mat-icon>
        </button>

        <button mat-icon-button (click)="saveApprovalFlow()" title="Save">
          <mat-icon>save</mat-icon>
        </button>

        <button mat-icon-button (click)="showApprovalFlowSelector()" title="Load Approval Flow">
          <mat-icon>folder_open</mat-icon>
        </button>

        <button mat-icon-button (click)="createNewApprovalFlow()" title="New Approval Flow">
          <mat-icon>add</mat-icon>
        </button>

        <button mat-icon-button (click)="exportApprovalFlow()" title="Export Approval Flow" [disabled]="!currentServiceCode">
          <mat-icon>download</mat-icon>
        </button>
      </mat-toolbar>

      <div class="approval-content">
        <!-- Left Sidebar - Element Palette -->
        <mat-sidenav-container class="sidenav-container">
          <mat-sidenav mode="side" opened class="element-palette">
            <!-- Approval Element Palette -->
            <div class="palette-header">
              <h3>Approval Elements</h3>
              <p>Drag elements to the canvas</p>
            </div>

            <mat-divider></mat-divider>

            <div class="palette-content">
              <div *ngFor="let elementType of availableElements; trackBy: trackElement"
                   class="palette-item"
                   [style.border-left-color]="elementType.color"
                   (click)="selectElement(elementType.type)"
                   draggable="true"
                   (dragstart)="onDragStart($event, elementType.type)"
                   [title]="elementType.description">

                <div class="palette-item-content">
                  <div class="palette-item-icon" [style.background-color]="elementType.color">
                    <mat-icon>{{ elementType.icon }}</mat-icon>
                  </div>

                  <div class="palette-item-info">
                    <div class="palette-item-name">{{ elementType.name }}</div>
                    <div class="palette-item-description">{{ elementType.description }}</div>
                  </div>
                </div>

                <div class="palette-item-constraints" *ngIf="hasConstraints(elementType)">
                  <mat-icon *ngIf="!elementType.canReceiveConnections"
                            class="constraint-icon"
                            title="Cannot receive connections">
                    input
                  </mat-icon>
                  <mat-icon *ngIf="!elementType.canSendConnections"
                            class="constraint-icon"
                            title="Cannot send connections">
                    output
                  </mat-icon>
                  <span *ngIf="elementType.maxInstances"
                        class="max-instances"
                        title="Maximum instances: {{ elementType.maxInstances }}">
                    {{ elementType.maxInstances }}
                  </span>
                </div>
              </div>
            </div>
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
                  <path *ngFor="let connection of approvalFlow.connections; trackBy: trackConnection"
                        [attr.d]="getConnectionPath(connection)"
                        stroke="transparent"
                        stroke-width="12"
                        fill="none"
                        (click)="selectConnection(connection.id, $event)"
                        class="connection-clickable">
                  </path>

                  <!-- Visible connection lines -->
                  <path *ngFor="let connection of approvalFlow.connections; trackBy: trackConnection"
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

                <!-- Approval Flow Elements -->
                <div *ngFor="let element of approvalFlow.elements; trackBy: trackApprovalElement"
                     class="element-container"
                     [style.left.px]="element.position.x"
                     [style.top.px]="element.position.y">

                  <!-- Simple element representation (would be replaced with proper component) -->
                  <div class="approval-element"
                       [class.selected]="selectedElementId === element.id"
                       [style.background-color]="getElementColor(element.type)"
                       (click)="selectElement(element.id)"
                       (mousedown)="onElementMouseDown($event, element.id)">

                    <div class="element-header">
                      <mat-icon>{{ getElementIcon(element.type) }}</mat-icon>
                      <span>{{ element.properties.name || element.type }}</span>
                      <button mat-icon-button
                              class="delete-btn"
                              (click)="deleteElement(element.id, $event)"
                              *ngIf="element.type !== 'start'">
                        <mat-icon>delete</mat-icon>
                      </button>
                    </div>

                    <div class="element-content">
                      <div *ngIf="element.type === 'approval_step'" class="step-info">
                        <div *ngIf="element.properties.seq">Seq: {{ element.properties.seq }}</div>
                        <div *ngIf="element.properties.step_type">Type: {{ getStepTypeName(element.properties.step_type) }}</div>
                      </div>
                      <div *ngIf="element.type === 'action_step'" class="action-info">
                        <div *ngIf="element.properties.action_name">{{ element.properties.action_name }}</div>
                      </div>
                    </div>

                    <!-- Connection points -->
                    <div class="connection-point input"
                         *ngIf="canReceiveConnections(element.type)"
                         (mouseup)="endConnection(element.id)"
                         (mousedown)="$event.stopPropagation()">
                      <div class="connection-dot"></div>
                    </div>

                    <div class="connection-point output"
                         *ngIf="canSendConnections(element.type)"
                         (mousedown)="startConnection(element.id, $event)">
                      <div class="connection-dot"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Info Panel -->
            <div class="info-panel" *ngIf="currentServiceCode">
              <div class="info-header">
                <mat-icon>info</mat-icon>
                <span>Approval Flow: {{ currentServiceCode }}</span>
              </div>
              <div class="info-stats">
                <span>{{ getElementCount('approval_step') }} Approval Steps</span>
                <span>{{ getElementCount('action_step') }} Action Steps</span>
                <span>{{ getElementCount('condition_step') }} Conditions</span>
              </div>
            </div>
          </mat-sidenav-content>

          <!-- Right Sidebar - Properties Panel -->
          <mat-sidenav mode="side" opened position="end" class="properties-panel">
            <!-- Approval Properties Panel -->
            <div class="properties-content">
              <div class="panel-header">
                <h3>Properties</h3>
                <p>Configure element properties</p>
              </div>

              <div *ngIf="selectedElementId" class="element-properties">
                <div class="selected-element-info">
                  <mat-icon>{{ getElementIcon(getSelectedElement()?.type || '') }}</mat-icon>
                  <span>{{ getSelectedElement()?.properties.name || getSelectedElement()?.type }}</span>
                </div>

                <!-- Basic properties form would go here -->
                <div class="property-form">
                  <p>Element properties panel would be implemented here</p>
                  <p><strong>Type:</strong> {{ getSelectedElement()?.type }}</p>
                  <p><strong>ID:</strong> {{ selectedElementId }}</p>
                </div>
              </div>

              <div *ngIf="!selectedElementId && !selectedConnectionId" class="no-selection">
                <mat-icon>info</mat-icon>
                <h3>No Element Selected</h3>
                <p>Select an element to view and edit its properties.</p>
              </div>
            </div>
          </mat-sidenav>
        </mat-sidenav-container>
      </div>
    </div>
  `,
  styles: [`
    .approval-flow-builder {
      height: 100vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .approval-toolbar {
      flex-shrink: 0;
      background: #1976d2;
      color: white;
    }

    .approval-title {
      font-weight: 500;
      margin-left: 8px;
    }

    .approval-status {
      display: flex;
      align-items: center;
      gap: 4px;
      margin-left: 12px;
      font-size: 12px;
      padding: 4px 8px;
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.2);
    }

    .approval-status.unsaved {
      background: rgba(255, 152, 0, 0.3);
    }

    .spacer {
      flex: 1 1 auto;
    }

    .approval-content {
      flex: 1;
      overflow: hidden;
    }

    .sidenav-container {
      height: 100%;
    }

    .element-palette {
      width: 280px;
      background: #f5f5f5;
      border-right: 1px solid #ddd;
    }

    .palette-header {
      padding: 16px;
      text-align: center;
      background: white;
      border-bottom: 1px solid #e0e0e0;
    }

    .palette-content {
      flex: 1;
      overflow-y: auto;
      padding: 8px;
    }

    .palette-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px;
      margin-bottom: 8px;
      background: white;
      border-radius: 8px;
      border-left: 4px solid;
      cursor: pointer;
      transition: all 0.2s ease;
      user-select: none;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }

    .palette-item:hover {
      transform: translateY(-1px);
      box-shadow: 0 2px 6px rgba(0,0,0,0.15);
    }

    .palette-item-content {
      display: flex;
      align-items: center;
      flex: 1;
    }

    .palette-item-icon {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-right: 12px;
      color: white;
    }

    .palette-item-info {
      flex: 1;
    }

    .palette-item-name {
      font-weight: 500;
      color: #333;
      font-size: 14px;
    }

    .palette-item-description {
      color: #666;
      font-size: 11px;
      line-height: 1.3;
    }

    .palette-item-constraints {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .constraint-icon {
      font-size: 16px;
      color: #999;
    }

    .max-instances {
      background: #e0e0e0;
      color: #666;
      border-radius: 10px;
      padding: 2px 6px;
      font-size: 10px;
    }

    .properties-panel {
      width: 350px;
      background: #f5f5f5;
      border-left: 1px solid #ddd;
    }

    .properties-content {
      height: 100%;
      display: flex;
      flex-direction: column;
    }

    .panel-header {
      padding: 16px;
      background: white;
      border-bottom: 1px solid #e0e0e0;
      text-align: center;
    }

    .element-properties {
      padding: 16px;
    }

    .selected-element-info {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 16px;
      padding: 12px;
      background: white;
      border-radius: 4px;
      font-weight: 500;
    }

    .no-selection {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 40px 20px;
      text-align: center;
      color: #666;
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
      background-size: 20px 20px;
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

    .element-container {
      position: absolute;
      z-index: 2;
      pointer-events: all;
    }

    .approval-element {
      position: relative;
      width: 220px;
      min-height: 80px;
      border: 2px solid #ddd;
      border-radius: 8px;
      background: white;
      cursor: pointer;
      transition: all 0.2s ease;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .approval-element:hover {
      box-shadow: 0 4px 8px rgba(0,0,0,0.15);
      transform: translateY(-1px);
    }

    .approval-element.selected {
      border-color: #2196F3;
      box-shadow: 0 0 0 2px rgba(33, 150, 243, 0.3);
    }

    .element-header {
      display: flex;
      align-items: center;
      padding: 8px 12px;
      background: rgba(255, 255, 255, 0.9);
      border-radius: 6px 6px 0 0;
      border-bottom: 1px solid rgba(0,0,0,0.1);
      color: white;
      font-weight: 500;
    }

    .element-header mat-icon {
      margin-right: 8px;
    }

    .element-header span {
      flex: 1;
      text-shadow: 0 1px 2px rgba(0,0,0,0.3);
    }

    .delete-btn {
      width: 24px;
      height: 24px;
      color: white;
    }

    .element-content {
      padding: 8px 12px;
      font-size: 12px;
      color: #666;
    }

    .connection-point {
      position: absolute;
      width: 16px;
      height: 16px;
      cursor: crosshair;
      z-index: 10;
    }

    .connection-point.input {
      top: 50%;
      left: -8px;
      transform: translateY(-50%);
    }

    .connection-point.output {
      top: 50%;
      right: -8px;
      transform: translateY(-50%);
    }

    .connection-dot {
      width: 12px;
      height: 12px;
      border: 2px solid #007bff;
      background: white;
      border-radius: 50%;
      transition: all 0.2s ease;
    }

    .connection-point:hover .connection-dot {
      background: #007bff;
      transform: scale(1.2);
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

    .info-stats {
      display: flex;
      flex-direction: column;
      gap: 4px;
      font-size: 12px;
      color: #666;
    }
  `]
})
export class ApprovalFlowBuilderComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('canvas', { static: false }) canvasRef!: ElementRef<HTMLDivElement>;
  @ViewChild('canvasWrapper', { static: false }) canvasWrapperRef!: ElementRef<HTMLDivElement>;

  approvalFlow: ApprovalFlowData = { name: 'New Approval Flow', elements: [], connections: [] };
  selectedElementId?: string;
  selectedConnectionId?: string;
  availableElements = APPROVAL_ELEMENT_CONFIGS;
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
    private approvalFlowService: ApprovalFlowService,
    private approvalFlowApiService: ApprovalFlowApiService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.approvalFlowService.approvalFlow$
      .pipe(takeUntil(this.destroy$))
      .subscribe(approvalFlow => {
        this.approvalFlow = approvalFlow;
      });

    // Track current service code
    this.currentServiceCode = this.approvalFlowService.getCurrentServiceCode();

    // Show approval flow selector on startup if API is configured
    if (this.approvalFlowApiService.isConfigured()) {
      setTimeout(() => {
        this.showApprovalFlowSelector();
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

  // Placeholder for approval flow selector dialog
  showApprovalFlowSelector(): void {
    this.snackBar.open('Approval flow selector dialog would open here', 'Close', { duration: 3000 });
  }

  createNewApprovalFlow(): void {
    const newName = `New Approval Flow ${new Date().toLocaleDateString()}`;
    this.approvalFlowService.createNewApprovalFlow(newName);
    this.currentServiceCode = undefined;
    this.selectedElementId = undefined;
    this.selectedConnectionId = undefined;
    this.resetZoom();
    this.snackBar.open('New approval flow created', 'Close', { duration: 2000 });
  }

  autoOrganize(): void {
    this.approvalFlowService.autoOrganizeElements();
    this.resetZoom();
    this.snackBar.open('Elements auto-organized', 'Close', { duration: 2000 });
  }

  exportApprovalFlow(): void {
    if (!this.currentServiceCode) {
      this.snackBar.open('No approval flow loaded to export', 'Close', { duration: 3000 });
      return;
    }

    const masterStep = this.approvalFlowService.convertApprovalFlowToMasterStep();
    if (masterStep) {
      const dataStr = JSON.stringify({ approval_flow: [masterStep] }, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });

      const link = document.createElement('a');
      link.href = URL.createObjectURL(dataBlob);
      link.download = `approval-flow-${this.currentServiceCode}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      this.snackBar.open('Approval flow exported', 'Close', { duration: 3000 });
    } else {
      this.snackBar.open('Failed to export approval flow', 'Close', { duration: 3000 });
    }
  }

  getElementCount(type: string): number {
    return this.approvalFlow.elements.filter(el => el.type === type).length;
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
      const sourceElement = this.approvalFlow.elements.find(el => el.id === this.connectingFrom);

      if (sourceElement) {
        this.tempConnection = this.createCurvedPath(
          sourceElement.position.x + 110,
          sourceElement.position.y + 40,
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
    const elementType = event.dataTransfer?.getData('text/plain') as ApprovalElementType;

    if (elementType) {
      const canvasPos = this.screenToCanvas(event.clientX, event.clientY);

      try {
        let properties: any = {};

        // Set default properties based on element type
        if (elementType === ApprovalElementType.APPROVAL_STEP) {
          properties.seq = this.approvalFlowService.getNextSequenceNumber();
          properties.step_type = 2; // ACTION_BASED by default
          properties.active_ind = true;
        }

        const element = this.approvalFlowService.addElement(elementType, canvasPos, properties);
        this.selectedElementId = element.id;
        this.snackBar.open(`${elementType} element added`, 'Close', { duration: 2000 });
      } catch (error) {
        this.snackBar.open((error as Error).message, 'Close', { duration: 3000 });
      }
    }
  }

  onDragStart(event: DragEvent, elementType: ApprovalElementType): void {
    if (event.dataTransfer) {
      event.dataTransfer.setData('text/plain', elementType);
      event.dataTransfer.effectAllowed = 'copy';
    }
  }

  selectElement(elementTypeOrId: ApprovalElementType | string): void {
    if (typeof elementTypeOrId === 'string') {
      // Selecting existing element by ID
      this.selectedElementId = elementTypeOrId;
      this.selectedConnectionId = undefined;
    } else {
      // Adding new element by type
      const position: Position = {
        x: 200 + Math.random() * 100,
        y: 200 + Math.random() * 100
      };

      try {
        let properties: any = {};

        if (elementTypeOrId === ApprovalElementType.APPROVAL_STEP) {
          properties.seq = this.approvalFlowService.getNextSequenceNumber();
          properties.step_type = 2; // ACTION_BASED by default
          properties.active_ind = true;
        }

        const element = this.approvalFlowService.addElement(elementTypeOrId, position, properties);
        this.selectedElementId = element.id;
        this.snackBar.open(`${elementTypeOrId} element added`, 'Close', { duration: 2000 });
      } catch (error) {
        this.snackBar.open((error as Error).message, 'Close', { duration: 3000 });
      }
    }
  }

  onElementMouseDown(event: MouseEvent, elementId: string): void {
    // Handle element dragging logic here
    this.isDraggingElement = true;
  }

  deleteElement(elementId: string, event: MouseEvent): void {
    event.stopPropagation();
    try {
      this.approvalFlowService.removeElement(elementId);
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
        this.approvalFlowService.addConnection(this.connectingFrom, elementId);
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

  getConnectionPath(connection: ApprovalConnection): string {
    const sourceElement = this.approvalFlow.elements.find(el => el.id === connection.sourceId);
    const targetElement = this.approvalFlow.elements.find(el => el.id === connection.targetId);

    if (!sourceElement || !targetElement) return '';

    return this.createCurvedPath(
      sourceElement.position.x + 110,
      sourceElement.position.y + 40,
      targetElement.position.x,
      targetElement.position.y + 40
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

  // Approval Flow Operations
  saveApprovalFlow(): void {
    this.approvalFlowService.saveApprovalFlow().subscribe({
      next: (result) => {
        this.snackBar.open('Approval flow saved successfully', 'Close', { duration: 3000 });
      },
      error: (error) => {
        this.snackBar.open('Error saving approval flow', 'Close', { duration: 3000 });
      }
    });
  }

  validateApprovalFlow(): void {
    const validation = this.approvalFlowService.validateApprovalFlow();
    if (validation.isValid) {
      this.snackBar.open('Approval flow is valid', 'Close', { duration: 3000 });
    } else {
      const message = 'Validation errors: ' + validation.errors.join(', ');
      this.snackBar.open(message, 'Close', { duration: 5000 });
    }
  }

  // Helper Methods
  getSelectedElement(): ApprovalFlowElement | undefined {
    return this.approvalFlow.elements.find(el => el.id === this.selectedElementId);
  }

  getElementColor(elementType: ApprovalElementType): string {
    const config = APPROVAL_ELEMENT_CONFIGS.find(c => c.type === elementType);
    return config?.color || '#999';
  }

  getElementIcon(elementType: ApprovalElementType): string {
    const config = APPROVAL_ELEMENT_CONFIGS.find(c => c.type === elementType);
    return config?.icon || 'help';
  }

  getStepTypeName(stepType: number): string {
    return stepType === 1 ? 'Auto' : 'Action Based';
  }

  canReceiveConnections(elementType: ApprovalElementType): boolean {
    const config = APPROVAL_ELEMENT_CONFIGS.find(c => c.type === elementType);
    return config?.canReceiveConnections || false;
  }

  canSendConnections(elementType: ApprovalElementType): boolean {
    const config = APPROVAL_ELEMENT_CONFIGS.find(c => c.type === elementType);
    return config?.canSendConnections || false;
  }

  hasConstraints(elementType: any): boolean {
    return !elementType.canReceiveConnections ||
      !elementType.canSendConnections ||
      !!elementType.maxInstances;
  }

  // Track Functions for ngFor
  trackElement(index: number, element: any): string {
    return element.type;
  }

  trackApprovalElement(index: number, element: ApprovalFlowElement): string {
    return element.id;
  }

  trackConnection(index: number, connection: ApprovalConnection): string {
    return connection.id;
  }
}
