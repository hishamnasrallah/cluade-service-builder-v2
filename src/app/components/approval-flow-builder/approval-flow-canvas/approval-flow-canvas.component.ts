// components/approval-flow-builder/approval-flow-canvas/approval-flow-canvas.component.ts
import { Component, Input, Output, EventEmitter, ViewChild, ElementRef, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';

import {
  ApprovalFlowElement,
  ApprovalConnection,
  ApprovalElementType,
  Position,
  APPROVAL_ELEMENT_CONFIGS
} from '../../../models/approval-flow.models';
import { ApprovalElementComponent } from '../approval-element/approval-element.component';

interface CanvasState {
  zoom: number;
  panX: number;
  panY: number;
}

@Component({
  selector: 'app-approval-flow-canvas',
  standalone: true,
  imports: [
    CommonModule,
    ApprovalElementComponent
  ],
  template: `
    <div class="approval-flow-canvas"
         #canvasWrapper
         [class.panning]="isPanning"
         [class.connecting]="connectingFrom"
         (mousedown)="onCanvasMouseDown($event)"
         (mousemove)="onCanvasMouseMove($event)"
         (mouseup)="onCanvasMouseUp($event)"
         (mouseleave)="onCanvasMouseUp($event)"
         (wheel)="onCanvasWheel($event)"
         (click)="onCanvasClick($event)"
         (drop)="onElementDrop($event)"
         (dragover)="onDragOver($event)">

      <div class="canvas"
           #canvas
           [style.transform]="getCanvasTransform()">

        <!-- Grid Background -->
        <div class="grid-background"></div>

        <!-- SVG for Connections -->
        <svg class="connections-layer"
             [attr.width]="canvasSize.width"
             [attr.height]="canvasSize.height">
          <defs>
            <marker id="arrowhead" markerWidth="10" markerHeight="7"
                    refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="#666" />
            </marker>
            <marker id="arrowhead-selected" markerWidth="10" markerHeight="7"
                    refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="#007bff" />
            </marker>
          </defs>

          <!-- Invisible wider stroke for easier clicking -->
          <path *ngFor="let connection of connections; trackBy: trackConnection"
                [attr.d]="getConnectionPath(connection)"
                stroke="transparent"
                stroke-width="20"
                fill="none"
                (click)="selectConnection(connection.id, $event)"
                class="connection-clickable"
                style="cursor: pointer;">
          </path>

          <!-- Visible connection lines -->
          <path *ngFor="let connection of connections; trackBy: trackConnection"
                [attr.d]="getConnectionPath(connection)"
                [attr.stroke]="selectedConnectionId === connection.id ? '#007bff' : '#666'"
                [attr.stroke-width]="selectedConnectionId === connection.id ? '3' : '2'"
                fill="none"
                [attr.marker-end]="selectedConnectionId === connection.id ? 'url(#arrowhead-selected)' : 'url(#arrowhead)'"
                class="connection-line"
                [class.selected]="selectedConnectionId === connection.id">
          </path>

          <!-- Temporary connection line while dragging -->
          <path *ngIf="tempConnection"
                [attr.d]="tempConnection"
                stroke="#007bff"
                stroke-width="3"
                stroke-dasharray="8,4"
                fill="none"
                marker-end="url(#arrowhead-selected)"
                class="temp-connection">
          </path>
        </svg>

        <!-- Approval Flow Elements -->
        <div *ngFor="let element of elements; trackBy: trackElement"
             class="element-container"
             [style.left.px]="element.position.x"
             [style.top.px]="element.position.y"
             [style.z-index]="getElementZIndex(element.id)">

          <app-approval-element
            [element]="element"
            [isSelected]="selectedElementId === element.id"
            [isConnecting]="connectingFrom === element.id"
            [canvasZoom]="canvasState.zoom"
            (elementClick)="selectElement(element.id, $event)"
            (elementDoubleClick)="editElement(element.id, $event)"
            (positionChanged)="updateElementPosition(element.id, $event)"
            (connectionStart)="startConnection(element.id, $event)"
            (connectionEnd)="endConnection(element.id, $event)"
            (deleteElement)="deleteElement(element.id)"
            (toggleActiveElement)="toggleElementActive(element.id)"
            (duplicateElement)="duplicateElement(element.id)"
            (dragStart)="onElementDragStart(element.id)"
            (dragEnd)="onElementDragEnd(element.id)">
          </app-approval-element>
        </div>

        <!-- Drop Zone Indicator -->
        <div *ngIf="isDragOver" class="drop-zone-indicator">
          <div class="drop-zone-content">
            <div class="drop-zone-icon">+</div>
            <div class="drop-zone-text">Drop element here</div>
          </div>
        </div>

        <!-- Selection Rectangle -->
        <div *ngIf="selectionRect"
             class="selection-rectangle"
             [style.left.px]="selectionRect.x"
             [style.top.px]="selectionRect.y"
             [style.width.px]="selectionRect.width"
             [style.height.px]="selectionRect.height">
        </div>
      </div>

      <!-- Canvas Info -->
      <div class="canvas-info">
        <div class="zoom-info">{{ Math.round(canvasState.zoom * 100) }}%</div>
        <div class="coordinates-info" *ngIf="showCoordinates">
          {{ mouseCoordinates.x }}, {{ mouseCoordinates.y }}
        </div>
      </div>

      <!-- Minimap -->
      <div class="minimap" *ngIf="showMinimap">
        <div class="minimap-viewport"
             [style.left.px]="minimapViewport.x"
             [style.top.px]="minimapViewport.y"
             [style.width.px]="minimapViewport.width"
             [style.height.px]="minimapViewport.height">
        </div>
        <div *ngFor="let element of elements"
             class="minimap-element"
             [style.left.px]="getMinimapElementX(element)"
             [style.top.px]="getMinimapElementY(element)"
             [style.background-color]="getElementColor(element.type)">
        </div>
      </div>
    </div>
  `,
  styles: [`
    .approval-flow-canvas {
      position: relative;
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: #f8f9fa;
      cursor: grab;
      user-select: none;
    }

    .approval-flow-canvas.panning {
      cursor: grabbing;
    }

    .approval-flow-canvas.connecting {
      cursor: crosshair;
    }

    .canvas {
      position: relative;
      width: 5000px;
      height: 5000px;
      transform-origin: 0 0;
      transition: transform 0.1s ease-out;
    }

    .grid-background {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-image:
        radial-gradient(circle, #ddd 1px, transparent 1px),
        linear-gradient(#e8e8e8 1px, transparent 1px),
        linear-gradient(90deg, #e8e8e8 1px, transparent 1px);
      background-size: 20px 20px, 20px 20px, 20px 20px;
      background-position: 0 0, 0 0, 0 0;
      opacity: 0.6;
    }

    .connections-layer {
      position: absolute;
      top: 0;
      left: 0;
      pointer-events: none;
      z-index: 1;
    }

    .connection-clickable {
      pointer-events: stroke;
      cursor: pointer;
    }

    .connection-line {
      pointer-events: none;
      transition: stroke-width 0.2s ease, stroke 0.2s ease;
    }

    .connection-line.selected {
      filter: drop-shadow(0 0 3px rgba(0, 123, 255, 0.5));
    }

    .temp-connection {
      pointer-events: none;
      animation: dash 1s linear infinite;
    }

    @keyframes dash {
      to {
        stroke-dashoffset: -12;
      }
    }

    .element-container {
      position: absolute;
      pointer-events: all;
      transition: z-index 0.1s ease;
    }

    .drop-zone-indicator {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(33, 150, 243, 0.1);
      border: 2px dashed #2196F3;
      pointer-events: none;
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .drop-zone-content {
      text-align: center;
      color: #2196F3;
      font-size: 24px;
      font-weight: 500;
    }

    .drop-zone-icon {
      font-size: 48px;
      margin-bottom: 8px;
    }

    .drop-zone-text {
      font-size: 18px;
    }

    .selection-rectangle {
      position: absolute;
      border: 2px dashed #2196F3;
      background: rgba(33, 150, 243, 0.1);
      pointer-events: none;
      z-index: 999;
    }

    .canvas-info {
      position: absolute;
      bottom: 16px;
      left: 16px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      pointer-events: none;
      z-index: 1001;
    }

    .zoom-info,
    .coordinates-info {
      background: rgba(0, 0, 0, 0.7);
      color: white;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-family: monospace;
    }

    .minimap {
      position: absolute;
      bottom: 16px;
      right: 16px;
      width: 200px;
      height: 150px;
      background: rgba(255, 255, 255, 0.9);
      border: 1px solid #ddd;
      border-radius: 4px;
      overflow: hidden;
      z-index: 1001;
    }

    .minimap-viewport {
      position: absolute;
      border: 2px solid #2196F3;
      background: rgba(33, 150, 243, 0.2);
      pointer-events: none;
    }

    .minimap-element {
      position: absolute;
      width: 4px;
      height: 4px;
      border-radius: 2px;
      pointer-events: none;
    }

    /* Responsive adjustments */
    @media (max-width: 768px) {
      .minimap {
        width: 150px;
        height: 100px;
      }

      .canvas-info {
        bottom: 8px;
        left: 8px;
      }

      .zoom-info,
      .coordinates-info {
        font-size: 10px;
        padding: 2px 6px;
      }
    }

    /* Dark theme support */
    @media (prefers-color-scheme: dark) {
      .approval-flow-canvas {
        background: #2e2e2e;
      }

      .grid-background {
        background-image:
          radial-gradient(circle, #555 1px, transparent 1px),
          linear-gradient(#444 1px, transparent 1px),
          linear-gradient(90deg, #444 1px, transparent 1px);
      }

      .minimap {
        background: rgba(40, 40, 40, 0.9);
        border-color: #555;
      }
    }

    /* High contrast mode */
    @media (prefers-contrast: high) {
      .connection-line {
        stroke-width: 3px !important;
      }

      .grid-background {
        opacity: 0.8;
      }
    }
  `]
})
export class ApprovalFlowCanvasComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('canvas', { static: false }) canvasRef!: ElementRef<HTMLDivElement>;
  @ViewChild('canvasWrapper', { static: false }) canvasWrapperRef!: ElementRef<HTMLDivElement>;

  @Input() elements: ApprovalFlowElement[] = [];
  @Input() connections: ApprovalConnection[] = [];
  @Input() selectedElementId?: string;
  @Input() selectedConnectionId?: string;
  @Input() showMinimap = false;
  @Input() showCoordinates = false;

  @Output() elementSelected = new EventEmitter<string>();
  @Output() elementDoubleClicked = new EventEmitter<string>();
  @Output() connectionSelected = new EventEmitter<string>();
  @Output() elementPositionChanged = new EventEmitter<{ id: string; position: Position }>();
  @Output() elementAdded = new EventEmitter<{ type: ApprovalElementType; position: Position }>();
  @Output() elementDeleted = new EventEmitter<string>();
  @Output() elementDuplicated = new EventEmitter<string>();
  @Output() elementActiveToggled = new EventEmitter<string>();
  @Output() connectionCreated = new EventEmitter<{ sourceId: string; targetId: string }>();
  @Output() canvasClicked = new EventEmitter<void>();

  canvasState: CanvasState = {
    zoom: 1,
    panX: 100,
    panY: 100
  };

  canvasSize = { width: 5000, height: 5000 };

  // Interaction state
  isPanning = false;
  isDragOver = false;
  connectingFrom?: string;
  tempConnection?: string;
  draggedElementId?: string;
  lastPanPoint = { x: 0, y: 0 };
  mouseCoordinates = { x: 0, y: 0 };

  // Selection state
  selectionRect?: { x: number; y: number; width: number; height: number };
  selectionStart?: { x: number; y: number };

  // Minimap
  minimapViewport = { x: 0, y: 0, width: 0, height: 0 };

  private destroy$ = new Subject<void>();

  constructor() {}

  ngOnInit(): void {
    this.setupEventListeners();
  }

  ngAfterViewInit(): void {
    this.updateMinimapViewport();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupEventListeners(): void {
    // Handle keyboard shortcuts
    document.addEventListener('keydown', this.onKeyDown.bind(this));
    document.addEventListener('keyup', this.onKeyUp.bind(this));
  }

  getCanvasTransform(): string {
    return `translate(${this.canvasState.panX}px, ${this.canvasState.panY}px) scale(${this.canvasState.zoom})`;
  }

  // Mouse event handlers
  onCanvasMouseDown(event: MouseEvent): void {
    const target = event.target as HTMLElement;

    // Don't start panning if clicking on an element or connection
    if (target.closest('app-approval-element') || target.closest('.connection-clickable')) {
      return;
    }

    if (event.button === 0) { // Left mouse button
      if (event.ctrlKey || event.metaKey) {
        // Start selection rectangle
        this.startSelection(event);
      } else {
        // Start panning
        this.isPanning = true;
        this.lastPanPoint = { x: event.clientX, y: event.clientY };
      }
    }

    event.preventDefault();
  }

  onCanvasMouseMove(event: MouseEvent): void {
    this.updateMouseCoordinates(event);

    if (this.isPanning) {
      this.handlePanning(event);
    } else if (this.connectingFrom) {
      this.updateTempConnection(event);
    } else if (this.selectionStart) {
      this.updateSelection(event);
    }
  }

  onCanvasMouseUp(event: MouseEvent): void {
    if (this.isPanning) {
      this.isPanning = false;
    }

    if (this.selectionStart) {
      this.finishSelection();
    }

    // Cancel connection if clicking on empty space
    if (this.connectingFrom && event.target === this.canvasWrapperRef?.nativeElement) {
      this.cancelConnection();
    }
  }

  onCanvasClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;

    if (target === this.canvasWrapperRef?.nativeElement || target === this.canvasRef?.nativeElement) {
      this.canvasClicked.emit();
    }
  }

  onCanvasWheel(event: WheelEvent): void {
    event.preventDefault();

    const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1;
    const oldZoom = this.canvasState.zoom;
    const newZoom = Math.max(0.1, Math.min(3, this.canvasState.zoom * zoomFactor));

    if (newZoom !== oldZoom) {
      const rect = this.canvasWrapperRef.nativeElement.getBoundingClientRect();
      const mouseX = event.clientX - rect.left;
      const mouseY = event.clientY - rect.top;

      const zoomRatio = newZoom / oldZoom;
      this.canvasState.panX = mouseX - (mouseX - this.canvasState.panX) * zoomRatio;
      this.canvasState.panY = mouseY - (mouseY - this.canvasState.panY) * zoomRatio;
      this.canvasState.zoom = newZoom;

      this.updateMinimapViewport();
    }
  }

  // Drag and drop handlers
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver = true;
  }

  onElementDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver = false;

    const elementType = event.dataTransfer?.getData('text/plain') as ApprovalElementType;
    if (elementType) {
      const canvasPos = this.screenToCanvas(event.clientX, event.clientY);
      this.elementAdded.emit({ type: elementType, position: canvasPos });
    }
  }

  // Element interaction handlers
  selectElement(elementId: string, event: MouseEvent): void {
    event.stopPropagation();
    this.elementSelected.emit(elementId);
  }

  editElement(elementId: string, event: MouseEvent): void {
    event.stopPropagation();
    this.elementDoubleClicked.emit(elementId);
  }

  updateElementPosition(elementId: string, position: Position): void {
    this.elementPositionChanged.emit({ id: elementId, position });
  }

  deleteElement(elementId: string): void {
    this.elementDeleted.emit(elementId);
  }

  duplicateElement(elementId: string): void {
    this.elementDuplicated.emit(elementId);
  }

  toggleElementActive(elementId: string): void {
    this.elementActiveToggled.emit(elementId);
  }

  onElementDragStart(elementId: string): void {
    this.draggedElementId = elementId;
  }

  onElementDragEnd(elementId: string): void {
    this.draggedElementId = undefined;
  }

  // Connection handlers
  startConnection(elementId: string, event: MouseEvent): void {
    event.stopPropagation();
    this.connectingFrom = elementId;
  }

  endConnection(elementId: string, event: MouseEvent): void {
    event.stopPropagation();

    if (this.connectingFrom && this.connectingFrom !== elementId) {
      this.connectionCreated.emit({
        sourceId: this.connectingFrom,
        targetId: elementId
      });
    }

    this.cancelConnection();
  }

  selectConnection(connectionId: string, event: MouseEvent): void {
    event.stopPropagation();
    this.connectionSelected.emit(connectionId);
  }

  private cancelConnection(): void {
    this.connectingFrom = undefined;
    this.tempConnection = undefined;
  }

  // Utility methods
  private screenToCanvas(screenX: number, screenY: number): Position {
    const rect = this.canvasWrapperRef.nativeElement.getBoundingClientRect();
    const canvasX = (screenX - rect.left - this.canvasState.panX) / this.canvasState.zoom;
    const canvasY = (screenY - rect.top - this.canvasState.panY) / this.canvasState.zoom;
    return { x: Math.max(0, canvasX), y: Math.max(0, canvasY) };
  }

  private updateMouseCoordinates(event: MouseEvent): void {
    const canvasPos = this.screenToCanvas(event.clientX, event.clientY);
    this.mouseCoordinates = {
      x: Math.round(canvasPos.x),
      y: Math.round(canvasPos.y)
    };
  }

  private handlePanning(event: MouseEvent): void {
    const deltaX = event.clientX - this.lastPanPoint.x;
    const deltaY = event.clientY - this.lastPanPoint.y;

    this.canvasState.panX += deltaX;
    this.canvasState.panY += deltaY;

    this.lastPanPoint = { x: event.clientX, y: event.clientY };
    this.updateMinimapViewport();
  }

  private updateTempConnection(event: MouseEvent): void {
    if (!this.connectingFrom) return;

    const sourceElement = this.elements.find(el => el.id === this.connectingFrom);
    if (!sourceElement) return;

    const canvasPos = this.screenToCanvas(event.clientX, event.clientY);
    this.tempConnection = this.createConnectionPath(
      sourceElement.position.x + 120,
      sourceElement.position.y + 50,
      canvasPos.x,
      canvasPos.y
    );
  }

  private startSelection(event: MouseEvent): void {
    const canvasPos = this.screenToCanvas(event.clientX, event.clientY);
    this.selectionStart = canvasPos;
    this.selectionRect = {
      x: canvasPos.x,
      y: canvasPos.y,
      width: 0,
      height: 0
    };
  }

  private updateSelection(event: MouseEvent): void {
    if (!this.selectionStart || !this.selectionRect) return;

    const canvasPos = this.screenToCanvas(event.clientX, event.clientY);

    this.selectionRect = {
      x: Math.min(this.selectionStart.x, canvasPos.x),
      y: Math.min(this.selectionStart.y, canvasPos.y),
      width: Math.abs(canvasPos.x - this.selectionStart.x),
      height: Math.abs(canvasPos.y - this.selectionStart.y)
    };
  }

  private finishSelection(): void {
    // Implement multi-selection logic here if needed
    this.selectionStart = undefined;
    this.selectionRect = undefined;
  }

  private onKeyDown(event: KeyboardEvent): void {
    switch (event.key) {
      case 'Escape':
        this.cancelConnection();
        break;
      case 'Delete':
      case 'Backspace':
        if (this.selectedElementId) {
          this.deleteElement(this.selectedElementId);
        }
        break;
    }
  }

  private onKeyUp(event: KeyboardEvent): void {
    // Handle key up events if needed
  }

  // Connection path generation
  getConnectionPath(connection: ApprovalConnection): string {
    const sourceElement = this.elements.find(el => el.id === connection.sourceId);
    const targetElement = this.elements.find(el => el.id === connection.targetId);

    if (!sourceElement || !targetElement) return '';

    return this.createConnectionPath(
      sourceElement.position.x + 120,
      sourceElement.position.y + 50,
      targetElement.position.x,
      targetElement.position.y + 50
    );
  }

  private createConnectionPath(x1: number, y1: number, x2: number, y2: number): string {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Use curved path for better visual appeal
    const controlOffset = Math.min(distance * 0.4, 100);

    const controlPoint1X = x1 + controlOffset;
    const controlPoint1Y = y1;
    const controlPoint2X = x2 - controlOffset;
    const controlPoint2Y = y2;

    return `M ${x1} ${y1} C ${controlPoint1X} ${controlPoint1Y} ${controlPoint2X} ${controlPoint2Y} ${x2} ${y2}`;
  }

  // Element styling
  getElementColor(elementType: ApprovalElementType): string {
    const config = APPROVAL_ELEMENT_CONFIGS.find(c => c.type === elementType);
    return config?.color || '#999';
  }

  getElementZIndex(elementId: string): number {
    if (elementId === this.selectedElementId) return 100;
    if (elementId === this.draggedElementId) return 200;
    if (elementId === this.connectingFrom) return 150;
    return 10;
  }

  // Minimap methods
  private updateMinimapViewport(): void {
    if (!this.showMinimap) return;

    const minimapWidth = 200;
    const minimapHeight = 150;
    const canvasWidth = this.canvasSize.width;
    const canvasHeight = this.canvasSize.height;

    const viewportWidth = (this.canvasWrapperRef?.nativeElement.clientWidth || 800) / this.canvasState.zoom;
    const viewportHeight = (this.canvasWrapperRef?.nativeElement.clientHeight || 600) / this.canvasState.zoom;

    this.minimapViewport = {
      x: (-this.canvasState.panX / this.canvasState.zoom / canvasWidth) * minimapWidth,
      y: (-this.canvasState.panY / this.canvasState.zoom / canvasHeight) * minimapHeight,
      width: (viewportWidth / canvasWidth) * minimapWidth,
      height: (viewportHeight / canvasHeight) * minimapHeight
    };
  }

  getMinimapElementX(element: ApprovalFlowElement): number {
    return (element.position.x / this.canvasSize.width) * 200;
  }

  getMinimapElementY(element: ApprovalFlowElement): number {
    return (element.position.y / this.canvasSize.height) * 150;
  }

  // Public API methods
  zoomIn(): void {
    const newZoom = Math.min(this.canvasState.zoom * 1.2, 3);
    this.setZoom(newZoom);
  }

  zoomOut(): void {
    const newZoom = Math.max(this.canvasState.zoom / 1.2, 0.1);
    this.setZoom(newZoom);
  }

  resetZoom(): void {
    this.setZoom(1);
    this.canvasState.panX = 100;
    this.canvasState.panY = 100;
    this.updateMinimapViewport();
  }

  private setZoom(zoom: number): void {
    const rect = this.canvasWrapperRef.nativeElement.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const zoomRatio = zoom / this.canvasState.zoom;
    this.canvasState.panX = centerX - (centerX - this.canvasState.panX) * zoomRatio;
    this.canvasState.panY = centerY - (centerY - this.canvasState.panY) * zoomRatio;
    this.canvasState.zoom = zoom;

    this.updateMinimapViewport();
  }

  fitToContent(): void {
    if (this.elements.length === 0) return;

    const bounds = this.getElementsBounds();
    const padding = 100;

    const rect = this.canvasWrapperRef.nativeElement.getBoundingClientRect();
    const availableWidth = rect.width - padding * 2;
    const availableHeight = rect.height - padding * 2;

    const contentWidth = bounds.maxX - bounds.minX + 240; // 240 is approx element width
    const contentHeight = bounds.maxY - bounds.minY + 100; // 100 is approx element height

    const scaleX = availableWidth / contentWidth;
    const scaleY = availableHeight / contentHeight;
    const scale = Math.min(scaleX, scaleY, 1);

    this.canvasState.zoom = scale;
    this.canvasState.panX = padding - bounds.minX * scale;
    this.canvasState.panY = padding - bounds.minY * scale;

    this.updateMinimapViewport();
  }

  private getElementsBounds(): { minX: number; minY: number; maxX: number; maxY: number } {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    this.elements.forEach(element => {
      minX = Math.min(minX, element.position.x);
      minY = Math.min(minY, element.position.y);
      maxX = Math.max(maxX, element.position.x);
      maxY = Math.max(maxY, element.position.y);
    });

    return { minX, minY, maxX, maxY };
  }

  // Track functions for ngFor
  trackElement(index: number, element: ApprovalFlowElement): string {
    return element.id;
  }

  trackConnection(index: number, connection: ApprovalConnection): string {
    return connection.id;
  }
}
