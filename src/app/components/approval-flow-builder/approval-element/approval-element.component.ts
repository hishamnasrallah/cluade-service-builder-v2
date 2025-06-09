// components/approval-flow-builder/approval-element/approval-element.component.ts
import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';

import {
  ApprovalFlowElement,
  ApprovalElementType,
  APPROVAL_ELEMENT_CONFIGS,
  Position,
  StepType,
  ConditionType
} from '../../../models/approval-flow.models';

@Component({
  selector: 'app-approval-element',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatDividerModule,
    MatTooltipModule,
    MatChipsModule
  ],
  template: `
    <div class="approval-element"
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
          <!-- Approval Step Details -->
          <div *ngSwitchCase="'approval_step'" class="approval-step-details">
            <div class="detail-row">
              <div class="detail-item" *ngIf="element.properties.seq">
                <mat-icon inline="true" style="font-size: 12px;">filter_list</mat-icon>
                <small>Seq: {{ element.properties.seq }}</small>
              </div>
              <div class="detail-item" *ngIf="element.properties.step_type">
                <mat-icon inline="true" style="font-size: 12px;">{{ getStepTypeIcon() }}</mat-icon>
                <small>{{ getStepTypeName() }}</small>
              </div>
            </div>

            <div class="detail-row">
              <div class="detail-item" *ngIf="element.properties.status">
                <mat-icon inline="true" style="font-size: 12px;">flag</mat-icon>
                <small>Status: {{ getStatusName(element.properties.status) }}</small>
              </div>
              <div class="detail-item" *ngIf="element.properties.group">
                <mat-icon inline="true" style="font-size: 12px;">group</mat-icon>
                <small>Group: {{ getGroupName(element.properties.group) }}</small>
              </div>
            </div>

            <div class="detail-row" *ngIf="element.properties.required_approvals">
              <div class="detail-item">
                <mat-icon inline="true" style="font-size: 12px;">people</mat-icon>
                <small>Parallel: {{ element.properties.required_approvals }} approvals</small>
              </div>
            </div>

            <div class="priority-groups" *ngIf="element.properties.priority_approver_groups && element.properties.priority_approver_groups.length > 0">              <mat-chip-set>
                <mat-chip *ngFor="let groupId of element.properties.priority_approver_groups">
                  Priority: {{ getGroupName(groupId) }}
                </mat-chip>
              </mat-chip-set>
            </div>
          </div>

          <!-- Action Step Details -->
          <div *ngSwitchCase="'action_step'" class="action-step-details">
            <div class="detail-row">
              <div class="detail-item" *ngIf="element.properties.action_name">
                <mat-icon inline="true" style="font-size: 12px;">play_arrow</mat-icon>
                <small>{{ element.properties.action_name }}</small>
              </div>
            </div>

            <div class="detail-row">
              <div class="detail-item" *ngIf="element.properties.to_status">
                <mat-icon inline="true" style="font-size: 12px;">arrow_forward</mat-icon>
                <small>To: {{ getStatusName(element.properties.to_status) }}</small>
              </div>
            </div>

            <div class="detail-row" *ngIf="element.properties.sub_status">
              <div class="detail-item">
                <mat-icon inline="true" style="font-size: 12px;">subdirectory_arrow_right</mat-icon>
                <small>Sub: {{ getStatusName(element.properties.sub_status) }}</small>
              </div>
            </div>
          </div>

          <!-- Condition Step Details -->
          <div *ngSwitchCase="'condition_step'" class="condition-step-details">
            <div class="detail-row">
              <div class="detail-item" *ngIf="element.properties.type">
                <mat-icon inline="true" style="font-size: 12px;">{{ getConditionTypeIcon() }}</mat-icon>
                <small>{{ getConditionTypeName() }}</small>
              </div>
            </div>

            <div class="detail-row" *ngIf="element.properties.condition_logic && element.properties.condition_logic.length > 0">
              <div class="detail-item">
                <mat-icon inline="true" style="font-size: 12px;">rule</mat-icon>
                <small>{{ element.properties.condition_logic.length }} rule(s)</small>
              </div>
            </div>

            <div class="detail-row" *ngIf="element.properties.to_status">
              <div class="detail-item">
                <mat-icon inline="true" style="font-size: 12px;">arrow_forward</mat-icon>
                <small>To: {{ getStatusName(element.properties.to_status) }}</small>
              </div>
            </div>
          </div>

          <!-- Parallel Group Details -->
          <div *ngSwitchCase="'parallel_group'" class="parallel-group-details">
            <div class="detail-row" *ngIf="element.properties.parallel_groups && element.properties.parallel_groups.length > 0">
              <div class="detail-item">
                <mat-icon inline="true" style="font-size: 12px;">account_tree</mat-icon>
                <small>{{ element.properties.parallel_groups.length }} group(s)</small>
              </div>
            </div>

            <div class="parallel-groups-list">
              <mat-chip-set>
                <mat-chip *ngFor="let groupId of element.properties.parallel_groups">
                  {{ getGroupName(groupId) }}
                </mat-chip>
              </mat-chip-set>
            </div>
          </div>

          <!-- End Details -->
          <div *ngSwitchCase="'end'" class="end-details">
            <div class="detail-row" *ngIf="element.properties.action">
              <div class="detail-item">
                <mat-icon inline="true" style="font-size: 12px;">done</mat-icon>
                <small>Action: {{ element.properties.action }}</small>
              </div>
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
             (mousedown)="$event.stopPropagation()"
             matTooltip="Input connection point">
          <div class="connection-dot"></div>
        </div>

        <!-- Output connection point -->
        <div *ngIf="elementConfig?.canSendConnections"
             class="connection-point output"
             (mousedown)="onConnectionStart($event)"
             matTooltip="Output connection point">
          <div class="connection-dot"></div>
        </div>
      </div>

      <!-- Element Status Indicators -->
      <div class="element-status">
        <mat-icon *ngIf="!isValidElement()"
                  class="status-icon error"
                  matTooltip="Element has validation errors">
          error
        </mat-icon>
        <mat-icon *ngIf="isValidElement() && hasWarnings()"
                  class="status-icon warning"
                  matTooltip="Element has warnings">
          warning
        </mat-icon>
        <mat-icon *ngIf="!element.properties.active_ind"
                  class="status-icon inactive"
                  matTooltip="Element is inactive">
          pause_circle
        </mat-icon>
      </div>

      <!-- Sequence Number Badge (for approval steps) -->
      <div *ngIf="element.type === 'approval_step' && element.properties.seq"
           class="sequence-badge"
           matTooltip="Sequence number: {{ element.properties.seq }}">
        {{ element.properties.seq }}
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
      <button mat-menu-item (click)="onToggleActive()" *ngIf="element.type !== 'start'">
        <mat-icon>{{ element.properties.active_ind ? 'pause' : 'play_arrow' }}</mat-icon>
        <span>{{ element.properties.active_ind ? 'Deactivate' : 'Activate' }}</span>
      </button>
      <mat-divider></mat-divider>
      <button mat-menu-item (click)="onDelete()" [disabled]="element.type === 'start'" class="delete-item">
        <mat-icon>delete</mat-icon>
        <span>Delete</span>
      </button>
    </mat-menu>
  `,
  styles: [`
    .approval-element {
      position: relative;
      width: 240px;
      min-height: 100px;
      border: 2px solid #ddd;
      border-radius: 12px;
      background: white;
      cursor: pointer;
      transition: all 0.2s ease;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      user-select: none;
      overflow: hidden;
    }

    .approval-element:hover {
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      transform: translateY(-2px);
    }

    .approval-element.selected {
      border-color: #2196F3;
      box-shadow: 0 0 0 3px rgba(33, 150, 243, 0.3);
    }

    .approval-element.connecting {
      border-color: #FF9800;
      box-shadow: 0 0 0 3px rgba(255, 152, 0, 0.3);
      animation: pulse 1s ease-in-out infinite alternate;
    }

    .approval-element.dragging {
      cursor: grabbing;
      transform: rotate(2deg);
      box-shadow: 0 8px 20px rgba(0,0,0,0.25);
      z-index: 1000;
    }

    @keyframes pulse {
      from { box-shadow: 0 0 0 3px rgba(255, 152, 0, 0.3); }
      to { box-shadow: 0 0 0 6px rgba(255, 152, 0, 0.1); }
    }

    .element-header {
      display: flex;
      align-items: center;
      padding: 12px 16px;
      background: linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(255, 255, 255, 0.85));
      border-radius: 10px 10px 0 0;
      border-bottom: 1px solid rgba(0,0,0,0.1);
      cursor: grab;
      color: white;
      backdrop-filter: blur(10px);
    }

    .element-header:active {
      cursor: grabbing;
    }

    .element-icon {
      color: white;
      margin-right: 10px;
      font-size: 20px;
      filter: drop-shadow(0 1px 2px rgba(0,0,0,0.3));
    }

    .element-title {
      flex: 1;
      font-weight: 600;
      color: white;
      font-size: 14px;
      text-shadow: 0 1px 2px rgba(0,0,0,0.3);
      line-height: 1.2;
    }

    .element-menu-btn {
      width: 28px;
      height: 28px;
      line-height: 28px;
      color: white;
      background: rgba(255, 255, 255, 0.2);
      border-radius: 50%;
    }

    .element-menu-btn:hover {
      background: rgba(255, 255, 255, 0.3);
    }

    .element-content {
      padding: 12px 16px 16px;
      background: white;
      min-height: 60px;
    }

    .element-description {
      font-size: 11px;
      color: #666;
      margin-bottom: 8px;
      max-height: 32px;
      overflow: hidden;
      text-overflow: ellipsis;
      line-height: 1.3;
    }

    .element-details {
      font-size: 11px;
    }

    .detail-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 6px;
      gap: 8px;
    }

    .detail-item {
      display: flex;
      align-items: center;
      gap: 4px;
      color: #666;
      min-width: 0;
      flex: 1;
    }

    .detail-item small {
      font-size: 10px;
      line-height: 1.2;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .detail-item mat-icon {
      color: #888;
      flex-shrink: 0;
    }

    .priority-groups,
    .parallel-groups-list {
      margin-top: 8px;
    }

    .priority-groups mat-chip-set,
    .parallel-groups-list mat-chip-set {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
    }

    .priority-groups mat-chip,
    .parallel-groups-list mat-chip {
      font-size: 9px;
      height: 18px;
      padding: 0 6px;
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
      width: 18px;
      height: 18px;
      pointer-events: all;
      cursor: crosshair;
      z-index: 10;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .connection-point.input {
      top: 50%;
      left: -9px;
      transform: translateY(-50%);
    }

    .connection-point.output {
      top: 50%;
      right: -9px;
      transform: translateY(-50%);
    }

    .connection-dot {
      width: 14px;
      height: 14px;
      border: 2px solid #007bff;
      background: white;
      border-radius: 50%;
      transition: all 0.2s ease;
      box-shadow: 0 1px 3px rgba(0,0,0,0.2);
    }

    .connection-point:hover .connection-dot {
      background: #007bff;
      transform: scale(1.3);
      box-shadow: 0 2px 6px rgba(0,123,255,0.4);
    }

    .element-status {
      position: absolute;
      top: 8px;
      right: 8px;
      display: flex;
      gap: 4px;
      pointer-events: none;
    }

    .status-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.9);
      padding: 2px;
    }

    .status-icon.error {
      color: #f44336;
    }

    .status-icon.warning {
      color: #ff9800;
    }

    .status-icon.inactive {
      color: #9e9e9e;
    }

    .sequence-badge {
      position: absolute;
      top: -8px;
      left: -8px;
      width: 24px;
      height: 24px;
      background: #2196F3;
      color: white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      font-weight: 600;
      box-shadow: 0 2px 6px rgba(0,0,0,0.2);
      z-index: 5;
    }

    /* Element Type Specific Header Styles */
    .approval-element[style*="#4CAF50"] .element-header { /* Start */
      background: linear-gradient(135deg, #4CAF50, #45a049);
    }

    .approval-element[style*="#2196F3"] .element-header { /* Approval Step */
      background: linear-gradient(135deg, #2196F3, #1976D2);
    }

    .approval-element[style*="#FF9800"] .element-header { /* Action Step */
      background: linear-gradient(135deg, #FF9800, #F57C00);
    }

    .approval-element[style*="#FF5722"] .element-header { /* Condition Step */
      background: linear-gradient(135deg, #FF5722, #D84315);
    }

    .approval-element[style*="#9C27B0"] .element-header { /* Parallel Group */
      background: linear-gradient(135deg, #9C27B0, #7B1FA2);
    }

    .approval-element[style*="#F44336"] .element-header { /* End */
      background: linear-gradient(135deg, #F44336, #D32F2F);
    }

    /* Context Menu Styles */
    .delete-item {
      color: #f44336;
    }

    .delete-item mat-icon {
      color: #f44336;
    }

    @media (max-width: 768px) {
      .approval-element {
        width: 200px;
        min-height: 80px;
      }

      .element-header {
        padding: 10px 12px;
      }

      .element-title {
        font-size: 12px;
      }

      .element-content {
        padding: 10px 12px 12px;
      }

      .element-menu-btn {
        width: 24px;
        height: 24px;
      }

      .detail-item small {
        font-size: 9px;
      }

      .connection-point {
        width: 16px;
        height: 16px;
      }

      .connection-dot {
        width: 12px;
        height: 12px;
      }
    }
  `]
})
export class ApprovalElementComponent implements OnInit, OnDestroy {
  @ViewChild('elementRef') elementRef!: ElementRef<HTMLDivElement>;

  @Input() element!: ApprovalFlowElement;
  @Input() isSelected = false;
  @Input() isConnecting = false;
  @Input() canvasZoom = 1;

  @Output() elementClick = new EventEmitter<MouseEvent>();
  @Output() elementDoubleClick = new EventEmitter<MouseEvent>();
  @Output() positionChanged = new EventEmitter<Position>();
  @Output() connectionStart = new EventEmitter<MouseEvent>();
  @Output() connectionEnd = new EventEmitter<MouseEvent>();
  @Output() deleteElement = new EventEmitter<void>();
  @Output() toggleActiveElement = new EventEmitter<void>();
  @Output() duplicateElement = new EventEmitter<void>();
  @Output() dragStart = new EventEmitter<void>();
  @Output() dragEnd = new EventEmitter<void>();

  elementConfig = APPROVAL_ELEMENT_CONFIGS.find(config => config.type === this.element?.type);

  // Drag state
  isDragging = false;
  dragStartPos = { x: 0, y: 0 };
  elementStartPos = { x: 0, y: 0 };

  // Mock data for display purposes (in real app, would come from services)
  private statusNames: { [key: number]: string } = {
    11: 'Submitted',
    19: 'Emp1 Review',
    20: 'Draft',
    21: 'Return To Applicant',
    43: 'Emp2 Status',
    44: 'Emp3 Status',
    57: 'Completed'
  };

  private groupNames: { [key: number]: string } = {
    1: 'Managers',
    2: 'Public User',
    3: 'Emp1',
    4: 'Emp2',
    5: 'Emp3',
    6: 'Emp4',
    7: 'Emp5',
    8: 'Emp6'
  };

  ngOnInit(): void {
    this.elementConfig = APPROVAL_ELEMENT_CONFIGS.find(config => config.type === this.element.type);
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

  onMouseDown(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (target.closest('.element-menu-btn') || target.closest('.connection-point')) {
      return;
    }

    if (target.closest('.element-header') || target.classList.contains('approval-element')) {
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
    this.duplicateElement.emit();
  }

  onToggleActive(): void {
    this.toggleActiveElement.emit();
  }

  onDelete(): void {
    if (this.element.type !== ApprovalElementType.START) {
      this.deleteElement.emit();
    }
  }

  isValidElement(): boolean {
    switch (this.element.type) {
      case ApprovalElementType.START:
        return !!this.element.properties.name;

      case ApprovalElementType.APPROVAL_STEP:
        return !!(this.element.properties.name &&
          this.element.properties.service_type &&
          this.element.properties.seq &&
          this.element.properties.step_type &&
          this.element.properties.status &&
          this.element.properties.group);

      case ApprovalElementType.ACTION_STEP:
        return !!(this.element.properties.action &&
          this.element.properties.to_status);

      case ApprovalElementType.CONDITION_STEP:
        return !!(this.element.properties.name &&
          this.element.properties.type);

      case ApprovalElementType.PARALLEL_GROUP:
        return !!(this.element.properties.name &&
          this.element.properties.parallel_groups?.length);

      case ApprovalElementType.END:
        return !!this.element.properties.name;

      default:
        return false;
    }
  }

  hasWarnings(): boolean {
    if (this.element.type === ApprovalElementType.APPROVAL_STEP) {
      // Warning if no required approvals specified for parallel approval
      if (this.element.properties.priority_approver_groups &&
        this.element.properties.priority_approver_groups.length > 0 &&
        !this.element.properties.required_approvals) {
        return true;
      }
    }

    if (this.element.type === ApprovalElementType.CONDITION_STEP) {
      // Warning if no condition logic specified
      if (!this.element.properties.condition_logic?.length) {
        return true;
      }
    }

    return false;
  }

  getStepTypeName(): string {
    if (!this.element.properties.step_type) return '';
    return this.element.properties.step_type === StepType.AUTO ? 'Auto' : 'Action Based';
  }

  getStepTypeIcon(): string {
    if (!this.element.properties.step_type) return 'help';
    return this.element.properties.step_type === StepType.AUTO ? 'auto_mode' : 'touch_app';
  }

  getConditionTypeName(): string {
    if (!this.element.properties.type) return '';
    return this.element.properties.type === ConditionType.CONDITION ? 'Condition' : 'Auto Action';
  }

  getConditionTypeIcon(): string {
    if (!this.element.properties.type) return 'help';
    return this.element.properties.type === ConditionType.CONDITION ? 'rule' : 'auto_mode';
  }

  getStatusName(statusId: number | string): string {
    const id = typeof statusId === 'string' ? parseInt(statusId) : statusId;
    return this.statusNames[id] || `Status ${id}`;
  }

  getGroupName(groupId: number | string): string {
    const id = typeof groupId === 'string' ? parseInt(groupId) : groupId;
    return this.groupNames[id] || `Group ${id}`;
  }
}
