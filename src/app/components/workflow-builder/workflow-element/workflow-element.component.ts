// workflow-element.component.ts - Updated with hierarchy support
import { Component, Input, Output, EventEmitter, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule, MatMenuTrigger } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';

import {
  WorkflowElement,
  ElementType,
  ELEMENT_CONFIGS,
  ELEMENT_DIMENSIONS,
  Position,
  canContainChildren
} from '../../../models/workflow.models';

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
export class WorkflowElementComponent implements OnInit {
  @ViewChild('elementRef') elementRef!: ElementRef<HTMLDivElement>;
  @ViewChild('menuTrigger', { static: false }) menuTrigger!: MatMenuTrigger;

  @Input() element!: WorkflowElement;
  @Input() isSelected = false;
  @Input() isConnecting = false;
  @Input() canvasZoom = 1;
  @Input() allElements: WorkflowElement[] = []; // NEW: Pass all elements
  @Input() selectedElementId?: string; // NEW: Pass selected element ID

  @Output() elementClick = new EventEmitter<MouseEvent>();
  @Output() elementDoubleClick = new EventEmitter<MouseEvent>();
  @Output() positionChanged = new EventEmitter<Position>();
  @Output() connectionStart = new EventEmitter<MouseEvent>();
  @Output() connectionEnd = new EventEmitter<MouseEvent>();
  @Output() deleteElement = new EventEmitter<void>();
  @Output() dragStart = new EventEmitter<void>();
  @Output() dragEnd = new EventEmitter<void>();
  @Output() expandToggled = new EventEmitter<string>(); // NEW: Emit when expanded

  elementConfig = ELEMENT_CONFIGS.find(config => config.type === this.element?.type);
  dimensions = ELEMENT_DIMENSIONS[this.element?.type] || ELEMENT_DIMENSIONS[ElementType.PAGE];

  // Drag state
  isDragging = false;
  dragStartPos = { x: 0, y: 0 };
  elementStartPos = { x: 0, y: 0 };

  // Menu position
  menuPosition = { x: 0, y: 0 };

  get canContainChildren(): boolean {
    return canContainChildren(this.element.type);
  }

  get hasChildren(): boolean {
    return (this.element.children?.length || 0) > 0;
  }

  get childElements(): WorkflowElement[] {
    if (!this.element.children || !this.allElements) return [];
    return this.element.children
      .map(childId => this.allElements.find(el => el.id === childId))
      .filter(el => el !== undefined) as WorkflowElement[];
  }

  ngOnInit(): void {
    this.elementConfig = ELEMENT_CONFIGS.find(config => config.type === this.element.type);
    this.dimensions = ELEMENT_DIMENSIONS[this.element.type] || ELEMENT_DIMENSIONS[ElementType.PAGE];
  }

  getElementWidth(): number {
    return this.element.isExpanded
      ? this.dimensions.expanded.width
      : this.dimensions.collapsed.width;
  }

  getElementHeight(): number {
    if (this.element.isExpanded && this.hasChildren) {
      // Calculate height based on children
      const childrenHeight = Math.ceil(this.childElements.length / 2) * 120 + 80;
      return Math.max(this.dimensions.expanded.height, childrenHeight);
    }
    return this.element.isExpanded
      ? this.dimensions.expanded.height
      : this.dimensions.collapsed.height;
  }

  getBackgroundColor(): string {
    if (this.element.isExpanded) {
      // Use semi-transparent version of the color
      const color = this.elementConfig?.color || '#2196F3';
      return color + '26'; // 15% opacity
    }
    return this.elementConfig?.color || '#2196F3';
  }

  getBorderStyle(): string {
    return this.element.isExpanded ? 'dashed' : 'solid';
  }

  toggleExpand(event?: MouseEvent): void {
    if (event) {
      event.stopPropagation();
    }
    if (this.canContainChildren) {
      this.expandToggled.emit(this.element.id);
    }
  }

  onMouseDown(event: MouseEvent): void {
    if (this.element.isExpanded || this.element.parentId) return;

    const target = event.target as HTMLElement;
    if (target.closest('.connection-point') || target.closest('.expand-button')) {
      return;
    }

    this.isDragging = true;
    this.dragStartPos = { x: event.clientX, y: event.clientY };
    this.elementStartPos = { ...this.element.position };

    this.dragStart.emit();

    // Add global listeners
    document.addEventListener('mousemove', this.onMouseMove);
    document.addEventListener('mouseup', this.onMouseUp);

    event.preventDefault();
    event.stopPropagation();
  }

  private onMouseMove = (event: MouseEvent): void => {
    if (!this.isDragging) return;

    const deltaX = (event.clientX - this.dragStartPos.x) / this.canvasZoom;
    const deltaY = (event.clientY - this.dragStartPos.y) / this.canvasZoom;

    const newPosition: Position = {
      x: Math.max(0, this.elementStartPos.x + deltaX),
      y: Math.max(0, this.elementStartPos.y + deltaY)
    };

    this.positionChanged.emit(newPosition);
  }

  private onMouseUp = (event: MouseEvent): void => {
    if (this.isDragging) {
      this.isDragging = false;
      this.dragEnd.emit();

      document.removeEventListener('mousemove', this.onMouseMove);
      document.removeEventListener('mouseup', this.onMouseUp);
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

    this.menuPosition = {
      x: event.clientX,
      y: event.clientY
    };

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
    console.log('Duplicate element');
  }

  onDelete(): void {
    if (this.element.type !== ElementType.START) {
      this.deleteElement.emit();
    }
  }

  // Child element event handlers
  onChildClick(event: MouseEvent, child: WorkflowElement): void {
    this.elementClick.emit(event);
  }

  onChildDoubleClick(event: MouseEvent, child: WorkflowElement): void {
    this.elementDoubleClick.emit(event);
  }

  onChildPositionChanged(childId: string, position: Position): void {
    // Child positions are relative to parent, no action needed
  }

  onChildConnectionStart(event: MouseEvent, child: WorkflowElement): void {
    this.connectionStart.emit(event);
  }

  onChildConnectionEnd(event: MouseEvent, child: WorkflowElement): void {
    this.connectionEnd.emit(event);
  }

  onChildDelete(child: WorkflowElement): void {
    this.deleteElement.emit();
  }

  onChildExpandToggled(childId: string): void {
    this.expandToggled.emit(childId);
  }
}
