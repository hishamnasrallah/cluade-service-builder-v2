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
  template: `
    <div class="element-palette">
      <div class="palette-header">
        <h3>Elements</h3>
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
             [title]="getElementTooltip(elementType)">

          <div class="palette-item-content">
            <div class="palette-item-icon" [style.background-color]="elementType.color">
              <mat-icon>{{ elementType.icon }}</mat-icon>
            </div>

            <div class="palette-item-info">
              <div class="palette-item-name">{{ elementType.name }}</div>
              <div class="palette-item-description">{{ getElementDescription(elementType) }}</div>
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

      <mat-divider></mat-divider>

      <div class="palette-footer">
        <div class="palette-help">
          <mat-icon>info</mat-icon>
          <span>Click or drag to add elements</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .element-palette {
      height: 100%;
      display: flex;
      flex-direction: column;
      background: #f8f9fa;
    }

    .palette-header {
      padding: 16px;
      text-align: center;
      background: white;
      border-bottom: 1px solid #e0e0e0;
    }

    .palette-header h3 {
      margin: 0 0 4px 0;
      color: #333;
      font-size: 18px;
    }

    .palette-header p {
      margin: 0;
      color: #666;
      font-size: 12px;
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
      background: #f8f9fa;
    }

    .palette-item:active {
      transform: translateY(0);
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

    .palette-item-icon mat-icon {
      font-size: 20px;
    }

    .palette-item-info {
      flex: 1;
    }

    .palette-item-name {
      font-weight: 500;
      color: #333;
      margin-bottom: 2px;
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
      margin-left: 8px;
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
      font-weight: 500;
    }

    .palette-footer {
      padding: 12px;
      background: white;
      border-top: 1px solid #e0e0e0;
    }

    .palette-help {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #666;
      font-size: 12px;
    }

    .palette-help mat-icon {
      font-size: 16px;
    }

    @media (max-width: 768px) {
      .palette-item {
        padding: 8px;
      }

      .palette-item-icon {
        width: 30px;
        height: 30px;
        margin-right: 8px;
      }

      .palette-item-name {
        font-size: 12px;
      }

      .palette-item-description {
        font-size: 10px;
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
