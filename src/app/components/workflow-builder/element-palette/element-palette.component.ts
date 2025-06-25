// components/workflow-builder/element-palette/element-palette.component.ts
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { DragDropModule } from '@angular/cdk/drag-drop';

import { ElementType, ElementTypeConfig } from '../../../models/workflow.models';

@Component({
  selector: 'app-element-palette',
  standalone: true,
  imports: [
    CommonModule,
    MatListModule,
    MatIconModule,
    MatDividerModule,
    DragDropModule
  ],
// element-palette.component.ts - Updated template and styles to match mockup
  template: `
    <div class="element-palette">
      <h3>Elements</h3>

      <div class="palette-content">
        <div *ngFor="let elementType of availableElements; trackBy: trackElement"
             class="palette-item"
             [class]="elementType.type"
             (click)="selectElement(elementType.type)"
             draggable="true"
             (dragstart)="onDragStart($event, elementType.type)"
             [title]="getElementDescription(elementType)">

          <mat-icon [style.color]="elementType.color">{{ elementType.icon }}</mat-icon>
          <span>{{ elementType.name }}</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .element-palette {
      height: 100%;
      display: flex;
      flex-direction: column;
      background: #f5f5f5;
      padding: 20px 15px;
    }

    h3 {
      margin: 0 0 20px 0;
      color: #333;
      font-size: 16px;
      font-weight: 500;
    }

    .palette-content {
      flex: 1;
      overflow-y: auto;
    }

    .palette-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 15px;
      margin-bottom: 8px;
      background: white;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s ease;
      user-select: none;
      font-size: 14px;
      color: #333;
    }

    .palette-item:hover {
      background: #f0f0f0;
      transform: translateX(3px);
    }

    .palette-item mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    .palette-item span {
      font-weight: 400;
    }

    /* Hide constraints and descriptions for cleaner look */
    .palette-item-constraints,
    .palette-item-description {
      display: none;
    }

    @media (max-width: 768px) {
      .element-palette {
        padding: 15px 10px;
      }

      h3 {
        font-size: 14px;
      }

      .palette-item {
        padding: 10px;
        font-size: 12px;
      }

      .palette-item mat-icon {
        font-size: 18px;
      }
    }
  `]
})
export class ElementPaletteComponent {
  @Input() availableElements: ElementTypeConfig[] = [];
  @Output() elementSelected = new EventEmitter<ElementType>();

  selectElement(elementType: ElementType): void {
    this.elementSelected.emit(elementType);
  }

  onDragStart(event: DragEvent, elementType: ElementType): void {
    if (event.dataTransfer) {
      event.dataTransfer.setData('text/plain', elementType);
      event.dataTransfer.effectAllowed = 'copy';
    }
  }

  getElementDescription(elementType: ElementTypeConfig): string {
    const descriptions: { [key: string]: string } = {
      [ElementType.START]: 'Starting point of the workflow',
      [ElementType.PAGE]: 'Form page with fields and categories',
      [ElementType.CATEGORY]: 'Group of related fields',
      [ElementType.FIELD]: 'Input field for data collection',
      [ElementType.CONDITION]: 'Conditional logic and branching',
      [ElementType.END]: 'End point of the workflow'
    };
    return descriptions[elementType.type] || '';
  }

  getElementTooltip(elementType: ElementTypeConfig): string {
    let tooltip = `${elementType.name}: ${this.getElementDescription(elementType)}`;

    if (elementType.maxInstances) {
      tooltip += `\nMax instances: ${elementType.maxInstances}`;
    }

    if (!elementType.canReceiveConnections) {
      tooltip += '\nCannot receive connections';
    }

    if (!elementType.canSendConnections) {
      tooltip += '\nCannot send connections';
    }

    return tooltip;
  }

  hasConstraints(elementType: ElementTypeConfig): boolean {
    return !elementType.canReceiveConnections ||
      !elementType.canSendConnections ||
      !!elementType.maxInstances;
  }

  trackElement(index: number, element: ElementTypeConfig): string {
    return element.type;
  }
}
