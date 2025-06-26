// workflow-element.component.ts - Complete file with fixes
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
  @Input() isSelected: boolean = false;
  @Input() isConnecting: boolean = false;
  @Input() canvasZoom: number = 1;
  @Input() allElements: WorkflowElement[] = [];
  @Input() selectedElementId?: string;
  @Input() canvasState?: { zoom: number; panX: number; panY: number };

  @Output() elementClick = new EventEmitter<MouseEvent>();
  @Output() elementDoubleClick = new EventEmitter<MouseEvent>();
  @Output() positionChanged = new EventEmitter<Position>();
  @Output() connectionStart = new EventEmitter<MouseEvent>();
  @Output() connectionEnd = new EventEmitter<MouseEvent>();
  @Output() deleteElement = new EventEmitter<void>();
  @Output() dragStart = new EventEmitter<void>();
  @Output() dragEnd = new EventEmitter<void>();
  @Output() expandToggled = new EventEmitter<string>();
  @Output() childElementSelected = new EventEmitter<string>();
  @Output() childElementDoubleClicked = new EventEmitter<string>();

  // Public properties for template access
  public elementConfig: any;
  public dimensions: any;
  public isDragging: boolean = false;
  public dragStartPos = { x: 0, y: 0 };
  public elementStartPos = { x: 0, y: 0 };
  public menuPosition = { x: 0, y: 0 };

  // Getters for template
  public get canContainChildren(): boolean {
    return this.element ? canContainChildren(this.element.type) : false;
  }

  public get hasChildren(): boolean {
    return this.element ? (this.element.children?.length || 0) > 0 : false;
  }

  public get childElements(): WorkflowElement[] {
    if (!this.element || !this.element.children || !this.allElements) return [];
    return this.element.children
      .map(childId => this.allElements.find(el => el.id === childId))
      .filter(el => el !== undefined) as WorkflowElement[];
  }

  ngOnInit(): void {
    if (this.element) {
      this.elementConfig = ELEMENT_CONFIGS.find(config => config.type === this.element.type);
      this.dimensions = ELEMENT_DIMENSIONS[this.element.type] || ELEMENT_DIMENSIONS[ElementType.PAGE];
    }
  }

  public getElementWidth(): number {
    if (!this.element || !this.dimensions) return 100;
    return this.element.isExpanded
      ? this.dimensions.expanded.width
      : this.dimensions.collapsed.width;
  }

  public getElementHeight(): number {
    if (!this.element || !this.dimensions) return 60;
    if (this.element.isExpanded && this.hasChildren) {
      const childrenHeight = Math.ceil(this.childElements.length / 2) * 120 + 80;
      return Math.max(this.dimensions.expanded.height, childrenHeight);
    }
    return this.element.isExpanded
      ? this.dimensions.expanded.height
      : this.dimensions.collapsed.height;
  }

  public getBackgroundColor(): string {
    if (!this.element) return '#2196F3';
    if (this.element.isExpanded) {
      const color = this.elementConfig?.color || '#2196F3';
      return color + '26'; // 15% opacity
    }
    return this.elementConfig?.color || '#2196F3';
  }

  public getBorderStyle(): string {
    return this.element?.isExpanded ? 'dashed' : 'solid';
  }

  public toggleExpand(event?: MouseEvent): void {
    if (event) {
      event.stopPropagation();
    }
    if (this.canContainChildren && this.element) {
      this.expandToggled.emit(this.element.id);
    }
  }

  public onMouseDown(event: MouseEvent): void {
    // Only prevent dragging of child elements, not expanded parents
    if (this.element.parentId) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    const target = event.target as HTMLElement;

    // Don't start drag if clicking on connection points, expand button, or child elements
    if (target.closest('.connection-point') ||
      target.closest('.expand-button-svg') ||  // Fixed: was '.expand-button'
      target.closest('.children-container')) {
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
    if (!this.isDragging || !this.element) return;

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

  public onElementClick(event: MouseEvent): void {
    if (!this.isDragging) {
      event.stopPropagation();
      this.elementClick.emit(event);
    }
  }

  public onElementDoubleClick(event: MouseEvent): void {
    event.stopPropagation();
    this.elementDoubleClick.emit(event);
  }

  public onConnectionStart(event: MouseEvent): void {
    event.stopPropagation();
    event.preventDefault();
    this.connectionStart.emit(event);
  }

  public onConnectionEnd(event: MouseEvent): void {
    event.stopPropagation();
    event.preventDefault();

    // Ensure we emit the connection end event
    if (this.elementConfig?.canReceiveConnections) {
      this.connectionEnd.emit(event);
    }
  }

  public onRightClick(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();

    // Get the element's bounding rect to find its position on screen
    const elementRect = this.elementRef.nativeElement.getBoundingClientRect();

    // Calculate the click position relative to the element
    const relativeX = event.clientX - elementRect.left;
    const relativeY = event.clientY - elementRect.top;

    // The menu should appear at the actual screen coordinates
    this.menuPosition = {
      x: event.clientX,
      y: event.clientY
    };

    // Use setTimeout to ensure the position is updated before opening
    setTimeout(() => {
      if (this.menuTrigger) {
        this.menuTrigger.openMenu();
      }
    }, 0);
  }

  public onEdit(): void {
    this.elementDoubleClick.emit(new MouseEvent('dblclick'));
  }

  public onDuplicate(): void {
    console.log('Duplicate element');
  }

  public onDelete(): void {
    if (this.element && this.element.type !== ElementType.START) {
      this.deleteElement.emit();
    }
  }

  // Child element event handlers
  public onChildClick(event: MouseEvent, child: WorkflowElement): void {
    event.stopPropagation();
    // Emit a custom event with the child's ID
    this.childElementSelected.emit(child.id);
  }

  public onChildDoubleClick(event: MouseEvent, child: WorkflowElement): void {
    event.stopPropagation();
    // Emit a custom event with the child's ID
    this.childElementDoubleClicked.emit(child.id);
  }

  public onChildPositionChanged(childId: string, position: Position): void {
    // Child positions are relative to parent, no action needed
  }

  public onChildConnectionStart(event: MouseEvent, child: WorkflowElement): void {
    this.connectionStart.emit(event);
  }

  public onChildConnectionEnd(event: MouseEvent, child: WorkflowElement): void {
    this.connectionEnd.emit(event);
  }

  public onChildDelete(child: WorkflowElement): void {
    this.deleteElement.emit();
  }

  public onChildExpandToggled(childId: string): void {
    this.expandToggled.emit(childId);
  }

  public getEmptyIcon(): string {
    if (!this.element) return 'add_circle_outline';

    switch (this.element.type) {
      case ElementType.PAGE:
        return 'category';
      case ElementType.CATEGORY:
        return 'input';
      default:
        return 'add_circle_outline';
    }
  }

  public getEmptyMessage(): string {
    if (!this.element) return 'Drag elements here';

    switch (this.element.type) {
      case ElementType.PAGE:
        return 'Drag categories here';
      case ElementType.CATEGORY:
        return 'Drag fields here';
      default:
        return 'Drag elements here';
    }
  }

  public getZIndex(): number {
    // Child elements should not have z-index set (inherit from parent)
    if (this.element.parentId) {
      return 'auto' as any;
    }

    // Dragging elements should be on top
    if (this.isDragging) {
      return 1000;
    }

    // Selected elements should be higher than normal
    if (this.isSelected) {
      return 100;
    }

    // Expanded elements should be above collapsed ones
    if (this.element.isExpanded) {
      return 50;
    }

    // Default z-index for collapsed elements
    return 10;
  }
}
