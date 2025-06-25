// element-palette.component.ts - Updated with hierarchy indicators
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DragDropModule } from '@angular/cdk/drag-drop';

import {
  ElementType,
  ElementTypeConfig,
  canBeContained,
  canContainChildren
} from '../../../models/workflow.models';

@Component({
  selector: 'app-element-palette',
  standalone: true,
  imports: [
    CommonModule,
    MatListModule,
    MatIconModule,
    MatDividerModule,
    MatTooltipModule,
    DragDropModule
  ],
  template: `
    <div class="element-palette">
      <h3>Elements</h3>

      <div class="palette-content">
        <!-- Container Elements -->
        <div class="palette-section">
          <div class="section-header">Container Elements</div>
          <div *ngFor="let elementType of containerElements; trackBy: trackElement"
               class="palette-item container-element"
               [class]="elementType.type"
               (click)="selectElement(elementType.type)"
               draggable="true"
               (dragstart)="onDragStart($event, elementType.type)"
               [matTooltip]="getElementTooltip(elementType)"
               matTooltipPosition="right">

            <mat-icon [style.color]="elementType.color">{{ elementType.icon }}</mat-icon>
            <span>{{ elementType.name }}</span>
            <mat-icon class="container-indicator">folder_open</mat-icon>
          </div>
        </div>

        <mat-divider></mat-divider>

        <!-- Child Elements -->
        <div class="palette-section">
          <div class="section-header">Child Elements</div>
          <div class="info-message">
            <mat-icon>info</mat-icon>
            <span>These must be placed inside a container</span>
          </div>
          <div *ngFor="let elementType of childElements; trackBy: trackElement"
               class="palette-item child-element"
               [class]="elementType.type"
               (click)="selectElement(elementType.type)"
               draggable="true"
               (dragstart)="onDragStart($event, elementType.type)"
               [matTooltip]="getElementTooltip(elementType)"
               matTooltipPosition="right">

            <mat-icon [style.color]="elementType.color">{{ elementType.icon }}</mat-icon>
            <span>{{ elementType.name }}</span>
            <mat-icon class="child-indicator">subdirectory_arrow_right</mat-icon>
          </div>
        </div>

        <mat-divider></mat-divider>

        <!-- Standalone Elements -->
        <div class="palette-section">
          <div class="section-header">Flow Elements</div>
          <div *ngFor="let elementType of standaloneElements; trackBy: trackElement"
               class="palette-item"
               [class]="elementType.type"
               (click)="selectElement(elementType.type)"
               draggable="true"
               (dragstart)="onDragStart($event, elementType.type)"
               [matTooltip]="getElementTooltip(elementType)"
               matTooltipPosition="right">

            <mat-icon [style.color]="elementType.color">{{ elementType.icon }}</mat-icon>
            <span>{{ elementType.name }}</span>
          </div>
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

    .palette-section {
      margin-bottom: 20px;
    }

    .section-header {
      font-size: 12px;
      font-weight: 600;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 10px;
      padding: 0 5px;
    }

    .info-message {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px;
      background: #e3f2fd;
      border-radius: 4px;
      margin-bottom: 10px;
      font-size: 11px;
      color: #1565c0;

      mat-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
      }
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
      position: relative;
      border: 2px solid transparent;
    }

    .palette-item:hover {
      background: #f0f0f0;
      transform: translateX(3px);
      border-color: #e0e0e0;
    }

    .palette-item.container-element {
      background: #f3f7ff;
      border-color: #d0e3ff;
    }

    .palette-item.container-element:hover {
      background: #e3f2fd;
      border-color: #bbdefb;
    }

    .palette-item.child-element {
      background: #fff8f3;
      border-color: #ffe0cc;
      padding-left: 25px;
    }

    .palette-item.child-element:hover {
      background: #fff3e0;
      border-color: #ffccbc;
    }

    .palette-item mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    .palette-item span {
      font-weight: 400;
      flex: 1;
    }

    .container-indicator,
    .child-indicator {
      font-size: 16px !important;
      width: 16px !important;
      height: 16px !important;
      color: #999;
    }

    .container-indicator {
      color: #2196f3;
    }

    .child-indicator {
      color: #ff9800;
    }

    mat-divider {
      margin: 15px 0;
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

      .info-message {
        font-size: 10px;
      }
    }
  `]
})
export class ElementPaletteComponent {
  @Input() availableElements: ElementTypeConfig[] = [];
  @Output() elementSelected = new EventEmitter<ElementType>();

  get containerElements(): ElementTypeConfig[] {
    return this.availableElements.filter(el =>
      canContainChildren(el.type) && el.type !== ElementType.START && el.type !== ElementType.END
    );
  }

  get childElements(): ElementTypeConfig[] {
    return this.availableElements.filter(el => canBeContained(el.type));
  }

  get standaloneElements(): ElementTypeConfig[] {
    return this.availableElements.filter(el =>
      !canContainChildren(el.type) && !canBeContained(el.type)
    );
  }

  selectElement(elementType: ElementType): void {
    this.elementSelected.emit(elementType);
  }

  onDragStart(event: DragEvent, elementType: ElementType): void {
    if (event.dataTransfer) {
      event.dataTransfer.setData('text/plain', elementType);
      event.dataTransfer.effectAllowed = 'copy';
    }
  }

  getElementTooltip(elementType: ElementTypeConfig): string {
    let tooltip = `${elementType.name}`;

    if (canContainChildren(elementType.type)) {
      tooltip += '\nCan contain: ';
      if (elementType.type === ElementType.PAGE) {
        tooltip += 'Categories';
      } else if (elementType.type === ElementType.CATEGORY) {
        tooltip += 'Fields';
      }
    }

    if (canBeContained(elementType.type)) {
      tooltip += '\nMust be placed inside: ';
      if (elementType.type === ElementType.CATEGORY) {
        tooltip += 'Page';
      } else if (elementType.type === ElementType.FIELD) {
        tooltip += 'Category';
      }
    }

    if (elementType.maxInstances === 1) {
      tooltip += '\nOnly one allowed';
    }

    return tooltip;
  }

  trackElement(index: number, element: ElementTypeConfig): string {
    return element.type;
  }
}
