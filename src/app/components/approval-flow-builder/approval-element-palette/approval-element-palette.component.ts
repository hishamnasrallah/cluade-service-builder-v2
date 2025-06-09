// components/approval-flow-builder/approval-element-palette/approval-element-palette.component.ts
import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';

import {
  ApprovalElementType,
  APPROVAL_ELEMENT_CONFIGS,
  ApprovalElementTypeConfig
} from '../../../models/approval-flow.models';

@Component({
  selector: 'app-approval-element-palette',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatDividerModule,
    MatTooltipModule,
    MatChipsModule
  ],
  template: `
    <div class="approval-element-palette">
      <div class="palette-header">
        <h3>Approval Elements</h3>
        <p>Drag elements to the canvas or click to add</p>
      </div>

      <mat-divider></mat-divider>

      <div class="palette-content">
        <div class="element-section">
          <h4 class="section-title">
            <mat-icon>play_circle</mat-icon>
            Flow Control
          </h4>

          <div class="element-list">
            <div *ngFor="let elementType of flowControlElements; trackBy: trackElement"
                 class="palette-item"
                 [style.border-left-color]="elementType.color"
                 [class.disabled]="isElementDisabled(elementType)"
                 (click)="onElementClick(elementType)"
                 draggable="true"
                 (dragstart)="onDragStart($event, elementType.type)"
                 [matTooltip]="getElementTooltip(elementType)"
                 matTooltipPosition="right">

              <div class="palette-item-content">
                <div class="palette-item-icon" [style.background-color]="elementType.color">
                  <mat-icon>{{ elementType.icon }}</mat-icon>
                </div>

                <div class="palette-item-info">
                  <div class="palette-item-name">{{ elementType.name }}</div>
                  <div class="palette-item-description">{{ elementType.description }}</div>
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
        </div>

        <mat-divider></mat-divider>

        <div class="element-section">
          <h4 class="section-title">
            <mat-icon>approval</mat-icon>
            Approval Steps
          </h4>

          <div class="element-list">
            <div *ngFor="let elementType of approvalElements; trackBy: trackElement"
                 class="palette-item"
                 [style.border-left-color]="elementType.color"
                 [class.disabled]="isElementDisabled(elementType)"
                 (click)="onElementClick(elementType)"
                 draggable="true"
                 (dragstart)="onDragStart($event, elementType.type)"
                 [matTooltip]="getElementTooltip(elementType)"
                 matTooltipPosition="right">

              <div class="palette-item-content">
                <div class="palette-item-icon" [style.background-color]="elementType.color">
                  <mat-icon>{{ elementType.icon }}</mat-icon>
                </div>

                <div class="palette-item-info">
                  <div class="palette-item-name">{{ elementType.name }}</div>
                  <div class="palette-item-description">{{ elementType.description }}</div>
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
              </div>
            </div>
          </div>
        </div>

        <mat-divider></mat-divider>

        <div class="element-section">
          <h4 class="section-title">
            <mat-icon>settings</mat-icon>
            Logic & Control
          </h4>

          <div class="element-list">
            <div *ngFor="let elementType of logicElements; trackBy: trackElement"
                 class="palette-item"
                 [style.border-left-color]="elementType.color"
                 [class.disabled]="isElementDisabled(elementType)"
                 (click)="onElementClick(elementType)"
                 draggable="true"
                 (dragstart)="onDragStart($event, elementType.type)"
                 [matTooltip]="getElementTooltip(elementType)"
                 matTooltipPosition="right">

              <div class="palette-item-content">
                <div class="palette-item-icon" [style.background-color]="elementType.color">
                  <mat-icon>{{ elementType.icon }}</mat-icon>
                </div>

                <div class="palette-item-info">
                  <div class="palette-item-name">{{ elementType.name }}</div>
                  <div class="palette-item-description">{{ elementType.description }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Element Usage Tips -->
      <div class="usage-tips">
        <mat-divider></mat-divider>
        <div class="tips-content">
          <h4>
            <mat-icon>lightbulb</mat-icon>
            Usage Tips
          </h4>
          <ul class="tips-list">
            <li>Drag elements from the palette to the canvas</li>
            <li>Click elements to add them directly to the canvas</li>
            <li>Start with an Approval Step and add Actions</li>
            <li>Use Conditions for dynamic routing</li>
            <li>Connect elements to define the flow sequence</li>
          </ul>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .approval-element-palette {
      display: flex;
      flex-direction: column;
      height: 100%;
      background: #f8f9fa;
    }

    .palette-header {
      padding: 16px;
      text-align: center;
      background: white;
      border-bottom: 1px solid #e0e0e0;
    }

    .palette-header h3 {
      margin: 0 0 8px 0;
      color: #333;
      font-weight: 500;
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

    .element-section {
      margin-bottom: 16px;
    }

    .section-title {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0 0 12px 0;
      padding: 8px 12px;
      background: white;
      border-radius: 6px;
      color: #555;
      font-size: 14px;
      font-weight: 500;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }

    .section-title mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    .element-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .palette-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px;
      background: white;
      border-radius: 8px;
      border-left: 4px solid;
      cursor: pointer;
      transition: all 0.2s ease;
      user-select: none;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      position: relative;
    }

    .palette-item:hover:not(.disabled) {
      transform: translateY(-1px);
      box-shadow: 0 2px 6px rgba(0,0,0,0.15);
    }

    .palette-item.disabled {
      opacity: 0.6;
      cursor: not-allowed;
      background: #f5f5f5;
    }

    .palette-item.disabled:hover {
      transform: none;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }

    .palette-item-content {
      display: flex;
      align-items: center;
      flex: 1;
      min-width: 0;
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
      flex-shrink: 0;
    }

    .palette-item-icon mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    .palette-item-info {
      flex: 1;
      min-width: 0;
    }

    .palette-item-name {
      font-weight: 500;
      color: #333;
      font-size: 13px;
      margin-bottom: 2px;
    }

    .palette-item-description {
      color: #666;
      font-size: 11px;
      line-height: 1.3;
      overflow: hidden;
      text-overflow: ellipsis;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
    }

    .palette-item-constraints {
      display: flex;
      align-items: center;
      gap: 4px;
      flex-shrink: 0;
    }

    .constraint-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      color: #999;
    }

    .max-instances {
      background: #e0e0e0;
      color: #666;
      border-radius: 10px;
      padding: 2px 6px;
      font-size: 10px;
      min-width: 16px;
      text-align: center;
    }

    .usage-tips {
      background: white;
      border-top: 1px solid #e0e0e0;
    }

    .tips-content {
      padding: 16px;
    }

    .tips-content h4 {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0 0 12px 0;
      color: #555;
      font-size: 14px;
      font-weight: 500;
    }

    .tips-content h4 mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      color: #ff9800;
    }

    .tips-list {
      margin: 0;
      padding-left: 20px;
      color: #666;
      font-size: 12px;
      line-height: 1.4;
    }

    .tips-list li {
      margin-bottom: 6px;
    }

    .tips-list li:last-child {
      margin-bottom: 0;
    }

    /* Responsive adjustments */
    @media (max-width: 768px) {
      .palette-item {
        padding: 10px;
      }

      .palette-item-icon {
        width: 32px;
        height: 32px;
        margin-right: 10px;
      }

      .palette-item-icon mat-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
      }

      .palette-item-name {
        font-size: 12px;
      }

      .palette-item-description {
        font-size: 10px;
      }
    }

    /* Drag and drop visual feedback */
    .palette-item:active {
      transform: scale(0.98);
      transition: transform 0.1s ease;
    }

    /* Dark mode support */
    @media (prefers-color-scheme: dark) {
      .approval-element-palette {
        background: #424242;
      }

      .palette-header,
      .section-title,
      .palette-item,
      .usage-tips {
        background: #616161;
        color: white;
      }

      .palette-header p,
      .palette-item-description,
      .tips-list {
        color: #e0e0e0;
      }
    }
  `]
})
export class ApprovalElementPaletteComponent {
  @Output() elementSelected = new EventEmitter<ApprovalElementType>();
  @Output() elementDragStart = new EventEmitter<{ event: DragEvent; elementType: ApprovalElementType }>();

  // Group elements by category for better organization
  flowControlElements: ApprovalElementTypeConfig[] = [];
  approvalElements: ApprovalElementTypeConfig[] = [];
  logicElements: ApprovalElementTypeConfig[] = [];

  // Track element counts to enforce constraints
  elementCounts: { [key: string]: number } = {};

  constructor() {
    this.categorizeElements();
  }

  private categorizeElements(): void {
    APPROVAL_ELEMENT_CONFIGS.forEach(config => {
      switch (config.type) {
        case ApprovalElementType.START:
        case ApprovalElementType.END:
          this.flowControlElements.push(config);
          break;
        case ApprovalElementType.APPROVAL_STEP:
        case ApprovalElementType.ACTION_STEP:
        case ApprovalElementType.PARALLEL_GROUP:
          this.approvalElements.push(config);
          break;
        case ApprovalElementType.CONDITION_STEP:
          this.logicElements.push(config);
          break;
      }
    });
  }

  onElementClick(elementType: ApprovalElementTypeConfig): void {
    if (!this.isElementDisabled(elementType)) {
      this.elementSelected.emit(elementType.type);
    }
  }

  onDragStart(event: DragEvent, elementType: ApprovalElementType): void {
    const config = APPROVAL_ELEMENT_CONFIGS.find(c => c.type === elementType);
    if (config && !this.isElementDisabled(config)) {
      this.elementDragStart.emit({ event, elementType });

      if (event.dataTransfer) {
        event.dataTransfer.setData('text/plain', elementType);
        event.dataTransfer.effectAllowed = 'copy';

        // Add visual feedback data
        event.dataTransfer.setData('application/json', JSON.stringify({
          type: elementType,
          name: config.name,
          icon: config.icon,
          color: config.color
        }));
      }
    } else {
      event.preventDefault();
    }
  }

  isElementDisabled(elementType: ApprovalElementTypeConfig): boolean {
    if (!elementType.maxInstances) {
      return false;
    }

    const currentCount = this.elementCounts[elementType.type] || 0;
    return currentCount >= elementType.maxInstances;
  }

  hasConstraints(elementType: ApprovalElementTypeConfig): boolean {
    return !elementType.canReceiveConnections ||
      !elementType.canSendConnections ||
      !!elementType.maxInstances;
  }

  getElementTooltip(elementType: ApprovalElementTypeConfig): string {
    let tooltip = elementType.description;

    if (elementType.maxInstances) {
      const currentCount = this.elementCounts[elementType.type] || 0;
      tooltip += `\n\nLimit: ${currentCount}/${elementType.maxInstances}`;
    }

    const constraints: string[] = [];
    if (!elementType.canReceiveConnections) {
      constraints.push('Cannot receive connections');
    }
    if (!elementType.canSendConnections) {
      constraints.push('Cannot send connections');
    }

    if (constraints.length > 0) {
      tooltip += '\n\nConstraints:\n• ' + constraints.join('\n• ');
    }

    return tooltip;
  }

  // Update element counts from parent component
  updateElementCounts(counts: { [key: string]: number }): void {
    this.elementCounts = { ...counts };
  }

  trackElement(index: number, element: ApprovalElementTypeConfig): string {
    return element.type;
  }
}
