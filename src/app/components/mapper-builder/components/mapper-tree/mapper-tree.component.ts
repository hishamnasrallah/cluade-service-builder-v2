// src/app/components/mapper-builder/components/mapper-tree/mapper-tree.component.ts

import { Component, Input, Output, EventEmitter, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CdkTreeModule } from '@angular/cdk/tree';
import { FlatTreeControl } from '@angular/cdk/tree';
import { MatTreeModule, MatTreeFlatDataSource, MatTreeFlattener } from '@angular/material/tree';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatRippleModule } from '@angular/material/core';
import {MatDivider, MatDividerModule} from '@angular/material/divider';
import { DragDropModule, CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { MapperTreeNode } from '../../../../models/mapper.models';

interface FlatNode {
  expandable: boolean;
  name: string;
  level: number;
  id: string;
  model: string;
  rootPath?: string;
  active: boolean;
  node: MapperTreeNode;
}

@Component({
  selector: 'app-mapper-tree',
  standalone: true,
  imports: [
    CommonModule,
    CdkTreeModule,
    MatTreeModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatMenuModule,
    MatRippleModule,
    DragDropModule,
    MatDivider
  ],
  template: `
    <div class="mapper-tree">
      <mat-tree [dataSource]="dataSource" [treeControl]="treeControl" class="tree-container">
        <mat-tree-node
          *matTreeNodeDef="let node"
          matTreeNodePadding
          [class.selected]="node.id === selectedNodeId"
          [class.inactive]="!node.active"
          class="tree-node"
          matRipple
          cdkDrag
          [cdkDragData]="node"
          (click)="selectNode(node)">

          <button mat-icon-button disabled class="node-icon">
            <mat-icon>{{ getNodeIcon(node) }}</mat-icon>
          </button>

          <div class="node-content">
            <span class="node-name">{{ node.name }}</span>
            <span class="node-model">{{ node.model }}</span>
            <mat-icon
              *ngIf="node.rootPath"
              class="list-indicator"
              matTooltip="List mapping: {{ node.rootPath }}">
              format_list_bulleted
            </mat-icon>
          </div>

          <button
            mat-icon-button
            [matMenuTriggerFor]="nodeMenu"
            class="node-menu"
            (click)="$event.stopPropagation()">
            <mat-icon>more_vert</mat-icon>
          </button>

          <mat-menu #nodeMenu="matMenu">
            <button mat-menu-item (click)="addChild(node)">
              <mat-icon>add</mat-icon>
              <span>Add Child Target</span>
            </button>
            <button mat-menu-item (click)="duplicateNode(node)">
              <mat-icon>content_copy</mat-icon>
              <span>Duplicate</span>
            </button>
            <button mat-menu-item (click)="toggleActive(node)">
              <mat-icon>{{ node.active ? 'visibility_off' : 'visibility' }}</mat-icon>
              <span>{{ node.active ? 'Deactivate' : 'Activate' }}</span>
            </button>
            <mat-divider></mat-divider>
            <button mat-menu-item (click)="deleteNode(node)" class="delete-option">
              <mat-icon color="warn">delete</mat-icon>
              <span>Delete</span>
            </button>
          </mat-menu>
        </mat-tree-node>

        <mat-tree-node
          *matTreeNodeDef="let node; when: hasChild"
          matTreeNodePadding
          [class.selected]="node.id === selectedNodeId"
          [class.inactive]="!node.active"
          class="tree-node expandable"
          matRipple
          cdkDrag
          [cdkDragData]="node"
          (click)="selectNode(node)">

          <button
            mat-icon-button
            matTreeNodeToggle
            [attr.aria-label]="'Toggle ' + node.name"
            class="toggle-button">
            <mat-icon>
              {{ treeControl.isExpanded(node) ? 'expand_more' : 'chevron_right' }}
            </mat-icon>
          </button>

          <button mat-icon-button disabled class="node-icon">
            <mat-icon>{{ getNodeIcon(node) }}</mat-icon>
          </button>

          <div class="node-content">
            <span class="node-name">{{ node.name }}</span>
            <span class="node-model">{{ node.model }}</span>
            <mat-icon
              *ngIf="node.rootPath"
              class="list-indicator"
              matTooltip="List mapping: {{ node.rootPath }}">
              format_list_bulleted
            </mat-icon>
          </div>

          <span class="child-count" *ngIf="node.node.children.length > 0">
            {{ node.node.children.length }}
          </span>

          <button
            mat-icon-button
            [matMenuTriggerFor]="nodeMenu"
            class="node-menu"
            (click)="$event.stopPropagation()">
            <mat-icon>more_vert</mat-icon>
          </button>

          <mat-menu #nodeMenu="matMenu">
            <button mat-menu-item (click)="addChild(node)">
              <mat-icon>add</mat-icon>
              <span>Add Child Target</span>
            </button>
            <button mat-menu-item (click)="duplicateNode(node)">
              <mat-icon>content_copy</mat-icon>
              <span>Duplicate</span>
            </button>
            <button mat-menu-item (click)="toggleActive(node)">
              <mat-icon>{{ node.active ? 'visibility_off' : 'visibility' }}</mat-icon>
              <span>{{ node.active ? 'Deactivate' : 'Activate' }}</span>
            </button>
            <mat-divider></mat-divider>
            <button mat-menu-item (click)="deleteNode(node)" class="delete-option">
              <mat-icon color="warn">delete</mat-icon>
              <span>Delete</span>
            </button>
          </mat-menu>
        </mat-tree-node>
      </mat-tree>

      <div class="empty-state" *ngIf="!nodes || nodes.length === 0">
        <mat-icon>folder_open</mat-icon>
        <p>No targets defined</p>
        <button mat-raised-button color="primary" (click)="addRootTarget()">
          <mat-icon>add</mat-icon>
          Add First Target
        </button>
      </div>
    </div>
  `,
  styles: [`
    .mapper-tree {
      height: 100%;
      overflow-y: auto;
    }

    .tree-container {
      background: transparent;
    }

    .tree-node {
      display: flex;
      align-items: center;
      padding: 8px 12px;
      margin: 2px 0;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s ease;
      position: relative;
      min-height: 48px;
    }

    .tree-node:hover {
      background-color: rgba(0, 0, 0, 0.04);
    }

    .tree-node.selected {
      background-color: rgba(25, 118, 210, 0.12);
      border-left: 3px solid #1976d2;
    }

    .tree-node.inactive {
      opacity: 0.6;
    }

    .tree-node.cdk-drag-preview {
      box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
      background: white;
      border-radius: 8px;
    }

    .tree-node.cdk-drag-placeholder {
      opacity: 0.2;
    }

    .tree-node.cdk-drag-animating {
      transition: transform 250ms cubic-bezier(0, 0, 0.2, 1);
    }

    .toggle-button {
      margin-right: 4px;
    }

    .node-icon {
      margin-right: 8px;
      color: #666;
    }

    .node-content {
      flex: 1;
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 0;
    }

    .node-name {
      font-weight: 500;
      color: #333;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .node-model {
      font-size: 12px;
      color: #666;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .list-indicator {
      font-size: 16px;
      color: #1976d2;
    }

    .child-count {
      background-color: #e3f2fd;
      color: #1976d2;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 500;
      margin-right: 8px;
    }

    .node-menu {
      opacity: 0;
      transition: opacity 0.2s ease;
    }

    .tree-node:hover .node-menu {
      opacity: 1;
    }

    .delete-option {
      color: #f44336;
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      padding: 32px;
      text-align: center;
    }

    .empty-state mat-icon {
      font-size: 64px;
      width: 64px;
      height: 64px;
      color: #ccc;
      margin-bottom: 16px;
    }

    .empty-state p {
      color: #666;
      margin-bottom: 24px;
    }

    /* Drag and drop styles */
    .cdk-drop-list-dragging .tree-node:not(.cdk-drag-placeholder) {
      transition: transform 250ms cubic-bezier(0, 0, 0.2, 1);
    }

    .drop-above {
      border-top: 2px solid #1976d2;
    }

    .drop-below {
      border-bottom: 2px solid #1976d2;
    }

    .drop-inside {
      background-color: rgba(25, 118, 210, 0.1);
      border: 2px dashed #1976d2;
    }
  `]
})
export class MapperTreeComponent {
  @Input() nodes: MapperTreeNode[] | null = [];
  @Input() selectedNodeId: string | null | undefined = null;

  @Output() nodeSelected = new EventEmitter<string>();
  @Output() nodeDropped = new EventEmitter<any>();
  @Output() nodeDeleted = new EventEmitter<string>();
  @Output() nodeAdded = new EventEmitter<string>();

  private transformer = (node: MapperTreeNode, level: number): FlatNode => {
    return {
      expandable: !!node.children && node.children.length > 0,
      name: node.name,
      level: level,
      id: node.id,
      model: node.model,
      rootPath: node.rootPath,
      active: node.active,
      node: node
    };
  };

  treeControl = new FlatTreeControl<FlatNode>(
    node => node.level,
    node => node.expandable
  );

  treeFlattener = new MatTreeFlattener(
    this.transformer,
    node => node.level,
    node => node.expandable,
    node => node.children
  );

  dataSource = new MatTreeFlatDataSource(this.treeControl, this.treeFlattener);

  hasChild = (_: number, node: FlatNode) => node.expandable;

  ngOnChanges(): void {
    if (this.nodes) {
      this.dataSource.data = this.nodes;
    }
  }

  getNodeIcon(node: FlatNode): string {
    if (node.rootPath) {
      return 'list_alt';
    }
    if (node.expandable) {
      return 'folder';
    }
    return 'description';
  }

  selectNode(node: FlatNode): void {
    this.nodeSelected.emit(node.id);
  }

  addChild(node: FlatNode): void {
    this.nodeAdded.emit(node.id);
  }

  addRootTarget(): void {
    this.nodeAdded.emit('');
  }

  duplicateNode(node: FlatNode): void {
    // TODO: Implement duplication logic
    console.log('Duplicate node:', node);
  }

  toggleActive(node: FlatNode): void {
    // TODO: Implement toggle active logic
    console.log('Toggle active:', node);
  }

  deleteNode(node: FlatNode): void {
    this.nodeDeleted.emit(node.id);
  }

  onDrop(event: CdkDragDrop<FlatNode[]>): void {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex
      );
    }

    // Emit the drop event with details
    this.nodeDropped.emit({
      node: event.item.data,
      previousIndex: event.previousIndex,
      currentIndex: event.currentIndex,
      previousContainer: event.previousContainer,
      container: event.container
    });
  }
}
