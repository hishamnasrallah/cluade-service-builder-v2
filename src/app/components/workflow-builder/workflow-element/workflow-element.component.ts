// components/workflow-builder/workflow-element/workflow-element.component.ts
import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';

import { WorkflowElement, ElementType, ELEMENT_CONFIGS, Position } from '../../../models/workflow.models';

@Component({
  selector: 'app-workflow-element',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatDividerModule
  ],
  template: `
    <div class="workflow-element"
         #elementRef
         [class.selected]="isSelected"
         [class.connecting]="isConnecting"
         [class.dragging]="isDragging"
         [style.background-color]="elementConfig?.color"
         (mousedown)="onMouseDown($event)"
         (click)="onElementClick($event)"
         (dblclick)="onElementDoubleClick($event)">

      <!-- Element Header -->
      <div class="element-header">
        <mat-icon class="element-icon">{{ elementConfig?.icon }}</mat-icon>
        <span class="element-title">{{ element.properties.name || elementConfig?.name }}</span>

        <!-- Element Menu -->
        <button mat-icon-button
                class="element-menu-btn"
                [matMenuTriggerFor]="elementMenu"
                (click)="$event.stopPropagation()"
                (mousedown)="$event.stopPropagation()">
          <mat-icon>more_vert</mat-icon>
        </button>
      </div>

      <!-- Element Content -->
      <div class="element-content">
        <div class="element-description" *ngIf="element.properties.description">
          {{ element.properties.description }}
        </div>

        <!-- Element Type Specific Content -->
        <div [ngSwitch]="element.type" class="element-details">
          <div *ngSwitchCase="'page'" class="page-details">
            <div *ngIf="element.properties.service" class="detail-item">
              <small>Service: {{ getServiceName(convertToNumber(element.properties.service)) }}</small>
            </div>
            <div *ngIf="element.properties.sequence_number" class="detail-item">
              <small>Step: {{ getSequenceName(convertToNumber(element.properties.sequence_number)) }}</small>
            </div>
          </div>

          <div *ngSwitchCase="'category'" class="category-details">
            <div *ngIf="element.properties.is_repeatable" class="detail-item">
              <small><mat-icon inline="true" style="font-size: 12px;">repeat</mat-icon> Repeatable</small>
            </div>
            <div *ngIf="element.properties.fields && element.properties.fields.length > 0" class="detail-item">
              <small>{{ element.properties.fields.length }} fields</small>
            </div>
          </div>

          <div *ngSwitchCase="'field'" class="field-details">
            <div *ngIf="element.properties._field_type" class="detail-item">
              <small>Type: {{ getFieldTypeName(convertToNumber(element.properties._field_type)) }}</small>
            </div>
            <div *ngIf="element.properties._mandatory" class="detail-item">
              <small><mat-icon inline="true" style="font-size: 12px;">star</mat-icon> Required</small>
            </div>
          </div>

          <div *ngSwitchCase="'condition'" class="condition-details">
            <div *ngIf="element.properties.condition_logic && element.properties.condition_logic.length > 0" class="detail-item">
              <small>{{ element.properties.condition_logic.length }} rule(s)</small>
            </div>
          </div>
        </div>
      </div>

      <!-- Connection Points -->
      <div class="connection-points">
        <!-- Input connection point -->
        <div *ngIf="elementConfig?.canReceiveConnections"
             class="connection-point input"
             (mouseup)="onConnectionEnd($event)"
             (mousedown)="$event.stopPropagation()">
          <div class="connection-dot"></div>
        </div>

        <!-- Output connection point -->
        <div *ngIf="elementConfig?.canSendConnections"
             class="connection-point output"
             (mousedown)="onConnectionStart($event)">
          <div class="connection-dot"></div>
        </div>
      </div>

      <!-- Element Status Indicators -->
      <div class="element-status">
        <mat-icon *ngIf="!isValidElement()"
                  class="status-icon error"
                  title="Element has validation errors">
          error
        </mat-icon>
        <mat-icon *ngIf="isValidElement() && hasWarnings()"
                  class="status-icon warning"
                  title="Element has warnings">
          warning
        </mat-icon>
      </div>
    </div>

    <!-- Context Menu -->
    <mat-menu #elementMenu="matMenu">
      <button mat-menu-item (click)="onEdit()">
        <mat-icon>edit</mat-icon>
        <span>Edit Properties</span>
      </button>
      <button mat-menu-item (click)="onDuplicate()">
        <mat-icon>content_copy</mat-icon>
        <span>Duplicate</span>
      </button>
      <mat-divider></mat-divider>
      <button mat-menu-item (click)="onDelete()" [disabled]="element.type === 'start'">
        <mat-icon>delete</mat-icon>
        <span>Delete</span>
      </button>
    </mat-menu>
  `,
  styles: [`
    .workflow-element {
      position: relative;
      width: 200px;
      min-height: 60px;
      border: 2px solid #ddd;
      border-radius: 8px;
      background: white;
      cursor: pointer;
      transition: all 0.2s ease;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      user-select: none;
    }

    .workflow-element:hover {
      box-shadow: 0 4px 8px rgba(0,0,0,0.15);
      transform: translateY(-1px);
    }

    .workflow-element.selected {
      border-color: #2196F3;
      box-shadow: 0 0 0 2px rgba(33, 150, 243, 0.3);
    }

    .workflow-element.connecting {
      border-color: #FF9800;
      box-shadow: 0 0 0 2px rgba(255, 152, 0, 0.3);
    }

    .workflow-element.dragging {
      cursor: grabbing;
      transform: rotate(2deg);
      box-shadow: 0 8px 16px rgba(0,0,0,0.2);
      z-index: 1000;
    }

    .element-header {
      display: flex;
      align-items: center;
      padding: 8px 12px;
      background: rgba(255, 255, 255, 0.9);
      border-radius: 6px 6px 0 0;
      border-bottom: 1px solid rgba(0,0,0,0.1);
      cursor: grab;
    }

    .element-header:active {
      cursor: grabbing;
    }

    .element-icon {
      color: white;
      margin-right: 8px;
      font-size: 18px;
    }

    .element-title {
      flex: 1;
      font-weight: 500;
      color: white;
      font-size: 14px;
      text-shadow: 0 1px 2px rgba(0,0,0,0.3);
    }

    .element-menu-btn {
      width: 24px;
      height: 24px;
      line-height: 24px;
      color: white;
    }

    .element-content {
      padding: 8px 12px;
      background: white;
    }

    .element-description {
      font-size: 12px;
      color: #666;
      margin-bottom: 4px;
      max-height: 40px;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .element-details {
      font-size: 11px;
    }

    .detail-item {
      margin: 2px 0;
      color: #888;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .connection-points {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
    }

    .connection-point {
      position: absolute;
      width: 16px;
      height: 16px;
      pointer-events: all;
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

    .element-status {
      position: absolute;
      top: 4px;
      right: 4px;
      display: flex;
      gap: 2px;
      pointer-events: none;
    }

    .status-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    .status-icon.error {
      color: #f44336;
    }

    .status-icon.warning {
      color: #ff9800;
    }

    /* Element Type Specific Styles */
    .workflow-element[style*="#4CAF50"] .element-header { /* Start */
      background: linear-gradient(135deg, #4CAF50, #45a049);
    }

    .workflow-element[style*="#2196F3"] .element-header { /* Page */
      background: linear-gradient(135deg, #2196F3, #1976D2);
    }

    .workflow-element[style*="#FF9800"] .element-header { /* Category */
      background: linear-gradient(135deg, #FF9800, #F57C00);
    }

    .workflow-element[style*="#9C27B0"] .element-header { /* Field */
      background: linear-gradient(135deg, #9C27B0, #7B1FA2);
    }

    .workflow-element[style*="#FF5722"] .element-header { /* Condition */
      background: linear-gradient(135deg, #FF5722, #D84315);
    }

    .workflow-element[style*="#F44336"] .element-header { /* End */
      background: linear-gradient(135deg, #F44336, #D32F2F);
    }

    @media (max-width: 768px) {
      .workflow-element {
        width: 160px;
        min-height: 50px;
      }

      .element-title {
        font-size: 12px;
      }

      .element-content {
        padding: 6px 8px;
      }
    }
  `]
})
export class WorkflowElementComponent implements OnInit, OnDestroy {
  @ViewChild('elementRef') elementRef!: ElementRef<HTMLDivElement>;

  @Input() element!: WorkflowElement;
  @Input() isSelected = false;
  @Input() isConnecting = false;
  @Input() canvasZoom = 1;

  @Output() elementClick = new EventEmitter<MouseEvent>();
  @Output() elementDoubleClick = new EventEmitter<MouseEvent>();
  @Output() positionChanged = new EventEmitter<Position>();
  @Output() connectionStart = new EventEmitter<MouseEvent>();
  @Output() connectionEnd = new EventEmitter<MouseEvent>();
  @Output() deleteElement = new EventEmitter<void>();
  @Output() dragStart = new EventEmitter<void>();
  @Output() dragEnd = new EventEmitter<void>();

  elementConfig = ELEMENT_CONFIGS.find(config => config.type === this.element?.type);

  // Drag state
  isDragging = false;
  dragStartPos = { x: 0, y: 0 };
  elementStartPos = { x: 0, y: 0 };

  // Mock data for display purposes (in real app, would come from services)
  private serviceNames: { [key: number]: string } = {
    9: 'Passport Issuance',
    42: 'Birth Certificate',
    46: 'Vacation Request'
  };

  private sequenceNames: { [key: number]: string } = {
    23: 'First Step',
    24: 'Second Step',
    25: 'Third Step'
  };

  private fieldTypeNames: { [key: number]: string } = {
    7: 'Text',
    8: 'Textarea',
    9: 'Number',
    10: 'Decimal',
    11: 'Boolean'
  };

  ngOnInit(): void {
    this.elementConfig = ELEMENT_CONFIGS.find(config => config.type === this.element.type);
    this.setupDragListeners();
  }

  ngOnDestroy(): void {
    this.removeDragListeners();
  }

  private setupDragListeners(): void {
    document.addEventListener('mousemove', this.onMouseMove.bind(this));
    document.addEventListener('mouseup', this.onMouseUp.bind(this));
  }

  private removeDragListeners(): void {
    document.removeEventListener('mousemove', this.onMouseMove.bind(this));
    document.removeEventListener('mouseup', this.onMouseUp.bind(this));
  }

  // Helper method to convert string | number to number
  convertToNumber(value: string | number | undefined | null): number {
    if (value === undefined || value === null) {
      return 0;
    }
    if (typeof value === 'number') {
      return value;
    }
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 0 : parsed;
  }

  onMouseDown(event: MouseEvent): void {
    // Don't start drag if clicking on menu button or connection points
    const target = event.target as HTMLElement;
    if (target.closest('.element-menu-btn') || target.closest('.connection-point')) {
      return;
    }

    // Only allow dragging from header or main element
    if (target.closest('.element-header') || target.classList.contains('workflow-element')) {
      this.isDragging = true;
      this.dragStartPos = { x: event.clientX, y: event.clientY };
      this.elementStartPos = { ...this.element.position };

      this.dragStart.emit();
      event.preventDefault();
      event.stopPropagation();
    }
  }

  private onMouseMove(event: MouseEvent): void {
    if (!this.isDragging) return;

    const deltaX = (event.clientX - this.dragStartPos.x) / this.canvasZoom;
    const deltaY = (event.clientY - this.dragStartPos.y) / this.canvasZoom;

    const newPosition: Position = {
      x: Math.max(0, this.elementStartPos.x + deltaX),
      y: Math.max(0, this.elementStartPos.y + deltaY)
    };

    this.positionChanged.emit(newPosition);
  }

  private onMouseUp(event: MouseEvent): void {
    if (this.isDragging) {
      this.isDragging = false;
      this.dragEnd.emit();
    }
  }

  onElementClick(event: MouseEvent): void {
    if (!this.isDragging) {
      event.stopPropagation();
      this.elementClick.emit(event);
    }
  }

  onElementDoubleClick(event: MouseEvent): void {
    event.stopPropagation();
    this.elementDoubleClick.emit(event);
  }

  onConnectionStart(event: MouseEvent): void {
    event.stopPropagation();
    event.preventDefault();
    this.connectionStart.emit(event);
  }

  onConnectionEnd(event: MouseEvent): void {
    event.stopPropagation();
    event.preventDefault();
    this.connectionEnd.emit(event);
  }

  onEdit(): void {
    this.elementDoubleClick.emit(new MouseEvent('dblclick'));
  }

  onDuplicate(): void {
    this.elementClick.emit(new MouseEvent('click'));
  }

  onDelete(): void {
    if (this.element.type !== ElementType.START) {
      this.deleteElement.emit();
    }
  }

  isValidElement(): boolean {
    switch (this.element.type) {
      case ElementType.START:
        return !!this.element.properties.name;

      case ElementType.PAGE:
        if (this.element.properties.useExisting) {
          return !!this.element.properties.existingPageId;
        }
        return !!(this.element.properties.name &&
          this.element.properties.service &&
          this.element.properties.sequence_number &&
          this.element.properties.applicant_type);

      case ElementType.CATEGORY:
        if (this.element.properties.useExisting) {
          return !!this.element.properties.existingCategoryId;
        }
        return !!this.element.properties.name;

      case ElementType.FIELD:
        if (this.element.properties.useExisting) {
          return !!this.element.properties.existingFieldId;
        }
        return !!(this.element.properties._field_name &&
          this.element.properties._field_display_name &&
          this.element.properties._field_type);

      case ElementType.CONDITION:
        return !!(this.element.properties.name &&
          this.element.properties.condition_logic?.length);

      case ElementType.END:
        return !!this.element.properties.name;

      default:
        return false;
    }
  }

  hasWarnings(): boolean {
    if (this.element.type === ElementType.PAGE && !this.element.properties.description) {
      return true;
    }
    if (this.element.type === ElementType.FIELD && !this.element.properties._mandatory) {
      return true;
    }
    return false;
  }

  getServiceName(serviceId: number): string {
    return this.serviceNames[serviceId] || `Service ${serviceId}`;
  }

  getSequenceName(sequenceId: number): string {
    return this.sequenceNames[sequenceId] || `Step ${sequenceId}`;
  }

  getFieldTypeName(typeId: number): string {
    return this.fieldTypeNames[typeId] || `Type ${typeId}`;
  }
}
