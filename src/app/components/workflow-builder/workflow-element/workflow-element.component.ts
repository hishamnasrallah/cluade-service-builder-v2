import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, ElementRef, ViewChild, ViewContainerRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule, MatMenuTrigger } from '@angular/material/menu';
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
  templateUrl: 'workflow-element.component.html',
  styleUrl:'workflow-element.component.scss'
})
export class WorkflowElementComponent implements OnInit, OnDestroy {
  @ViewChild('elementRef') elementRef!: ElementRef<HTMLDivElement>;
  @ViewChild('menuTrigger', { static: false }) menuTrigger!: MatMenuTrigger;

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

  // Menu position
  menuPosition = { x: 0, y: 0 };

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

  constructor(private viewContainerRef: ViewContainerRef) {}

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

    // Allow dragging from anywhere on the element
    this.isDragging = true;
    this.dragStartPos = { x: event.clientX, y: event.clientY };
    this.elementStartPos = { ...this.element.position };

    this.dragStart.emit();
    event.preventDefault();
    event.stopPropagation();
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

  onRightClick(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();

    // Update menu position
    this.menuPosition = {
      x: event.clientX,
      y: event.clientY
    };

    // Use setTimeout to ensure the menu trigger is ready
    setTimeout(() => {
      if (this.menuTrigger) {
        this.menuTrigger.openMenu();
      }
    }, 0);
  }
  onEdit(): void {
    this.elementDoubleClick.emit(new MouseEvent('dblclick'));
  }

  onDuplicate(): void {
    // TODO: Implement duplicate functionality
    console.log('Duplicate element');
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
