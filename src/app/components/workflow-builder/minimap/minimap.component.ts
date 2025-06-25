// minimap.component.ts - Updated for hierarchy visualization
import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';

import { WorkflowData, CanvasState, ELEMENT_DIMENSIONS } from '../../../models/workflow.models';

@Component({
  selector: 'app-minimap',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="minimap" (click)="onMinimapClick($event)">
      <div class="minimap-label">Overview</div>

      <div class="minimap-canvas" #minimapCanvas>
        <!-- Elements -->
        <div *ngFor="let element of getTopLevelElements(); trackBy: trackElement"
             class="minimap-element"
             [class]="element.type"
             [class.expanded]="element.isExpanded"
             [style.left.px]="getMinimapX(element.position.x)"
             [style.top.px]="getMinimapY(element.position.y)"
             [style.width.px]="getMinimapWidth(element)"
             [style.height.px]="getMinimapHeight(element)"
             [style.background-color]="getElementColor(element.type)"
             [style.opacity]="element.isExpanded ? 0.3 : 0.8">
        </div>

        <!-- Connections -->
        <svg class="minimap-connections"
             [attr.width]="minimapSize.width"
             [attr.height]="minimapSize.height">
          <line *ngFor="let connection of getTopLevelConnections(); trackBy: trackConnection"
                [attr.x1]="getConnectionX1(connection)"
                [attr.y1]="getConnectionY1(connection)"
                [attr.x2]="getConnectionX2(connection)"
                [attr.y2]="getConnectionY2(connection)"
                stroke="#999"
                stroke-width="1"
                opacity="0.5">
          </line>
        </svg>

        <!-- Viewport indicator -->
        <div class="minimap-viewport"
             [style.left.px]="getViewportX()"
             [style.top.px]="getViewportY()"
             [style.width.px]="getViewportWidth()"
             [style.height.px]="getViewportHeight()">
        </div>
      </div>
    </div>
  `,
  styles: [`
    .minimap {
      width: 100%;
      height: 100%;
      background: white;
      border-radius: 4px;
      overflow: hidden;
      position: relative;
      cursor: pointer;
    }

    .minimap-label {
      position: absolute;
      top: 8px;
      left: 8px;
      font-size: 11px;
      color: #666;
      font-weight: 500;
      z-index: 10;
    }

    .minimap-canvas {
      position: relative;
      width: 100%;
      height: 100%;
      background: #fafafa;
      border: 1px solid #e0e0e0;
    }

    .minimap-element {
      position: absolute;
      border-radius: 1px;
      transition: all 0.3s ease;
    }

    .minimap-element.expanded {
      border: 1px dashed;
    }

    .minimap-element.start,
    .minimap-element.end {
      border-radius: 50%;
    }

    .minimap-element.condition {
      transform: rotate(45deg);
    }

    .minimap-connections {
      position: absolute;
      top: 0;
      left: 0;
      pointer-events: none;
    }

    .minimap-viewport {
      position: absolute;
      border: 1.5px solid #007bff;
      background: rgba(0, 123, 255, 0.1);
      border-radius: 2px;
      pointer-events: none;
    }

    @media (max-width: 768px) {
      .minimap-label {
        font-size: 10px;
      }
    }
  `]
})
export class MinimapComponent implements OnChanges {
  @Input() workflow: WorkflowData = { name: '', elements: [], connections: [] };
  @Input() canvasState: CanvasState = { zoom: 1, panX: 0, panY: 0 };
  @Input() canvasSize = { width: 5000, height: 5000 };

  @Output() viewportChanged = new EventEmitter<CanvasState>();

  minimapSize = { width: 180, height: 120 };
  elementColors: { [key: string]: string } = {
    'start': '#4CAF50',
    'page': '#2196F3',
    'category': '#FF9800',
    'field': '#9C27B0',
    'condition': '#FF5722',
    'end': '#F44336'
  };

  ngOnChanges(changes: SimpleChanges): void {
    // Recalculate minimap when inputs change
    if (changes['workflow'] || changes['canvasSize']) {
      this.updateMinimapSize();
    }
  }

  private updateMinimapSize(): void {
    // Keep the current fixed size for simplicity
  }

  getTopLevelElements() {
    return this.workflow.elements.filter(el => !el.parentId);
  }

  getTopLevelConnections() {
    const topLevelIds = new Set(this.getTopLevelElements().map(el => el.id));
    return this.workflow.connections.filter(conn =>
      topLevelIds.has(conn.sourceId) && topLevelIds.has(conn.targetId)
    );
  }

  getMinimapX(x: number): number {
    return (x / this.canvasSize.width) * this.minimapSize.width;
  }

  getMinimapY(y: number): number {
    return (y / this.canvasSize.height) * this.minimapSize.height;
  }

  getMinimapWidth(element: any): number {
    const dims = ELEMENT_DIMENSIONS[element.type];
    if (!dims) return 6;

    const width = element.isExpanded ? dims.expanded.width : dims.collapsed.width;
    return (width / this.canvasSize.width) * this.minimapSize.width;
  }

  getMinimapHeight(element: any): number {
    const dims = ELEMENT_DIMENSIONS[element.type];
    if (!dims) return 4;

    const height = element.isExpanded ? dims.expanded.height : dims.collapsed.height;
    return (height / this.canvasSize.height) * this.minimapSize.height;
  }

  getElementColor(elementType: string): string {
    return this.elementColors[elementType] || '#999';
  }

  getConnectionX1(connection: any): number {
    const sourceElement = this.workflow.elements.find(el => el.id === connection.sourceId);
    if (!sourceElement) return 0;

    const dims = ELEMENT_DIMENSIONS[sourceElement.type];
    const width = sourceElement.isExpanded ? dims.expanded.width : dims.collapsed.width;

    return this.getMinimapX(sourceElement.position.x + width);
  }

  getConnectionY1(connection: any): number {
    const sourceElement = this.workflow.elements.find(el => el.id === connection.sourceId);
    if (!sourceElement) return 0;

    const dims = ELEMENT_DIMENSIONS[sourceElement.type];
    const height = sourceElement.isExpanded ? dims.expanded.height : dims.collapsed.height;

    return this.getMinimapY(sourceElement.position.y + height / 2);
  }

  getConnectionX2(connection: any): number {
    const targetElement = this.workflow.elements.find(el => el.id === connection.targetId);
    return targetElement ? this.getMinimapX(targetElement.position.x) : 0;
  }

  getConnectionY2(connection: any): number {
    const targetElement = this.workflow.elements.find(el => el.id === connection.targetId);
    if (!targetElement) return 0;

    const dims = ELEMENT_DIMENSIONS[targetElement.type];
    const height = targetElement.isExpanded ? dims.expanded.height : dims.collapsed.height;

    return this.getMinimapY(targetElement.position.y + height / 2);
  }

  getViewportX(): number {
    return (-this.canvasState.panX / this.canvasSize.width) * this.minimapSize.width;
  }

  getViewportY(): number {
    return (-this.canvasState.panY / this.canvasSize.height) * this.minimapSize.height;
  }

  getViewportWidth(): number {
    const visibleWidth = (window.innerWidth * 0.6) / this.canvasState.zoom;
    return (visibleWidth / this.canvasSize.width) * this.minimapSize.width;
  }

  getViewportHeight(): number {
    const visibleHeight = (window.innerHeight * 0.8) / this.canvasState.zoom;
    return (visibleHeight / this.canvasSize.height) * this.minimapSize.height;
  }

  onMinimapClick(event: MouseEvent): void {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;

    const canvasX = (clickX / this.minimapSize.width) * this.canvasSize.width;
    const canvasY = (clickY / this.minimapSize.height) * this.canvasSize.height;

    const newPanX = -(canvasX - (window.innerWidth * 0.3));
    const newPanY = -(canvasY - (window.innerHeight * 0.4));

    this.viewportChanged.emit({
      zoom: this.canvasState.zoom,
      panX: newPanX,
      panY: newPanY
    });
  }

  trackElement(index: number, element: any): string {
    return element.id;
  }

  trackConnection(index: number, connection: any): string {
    return connection.id;
  }
}
