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
  templateUrl:'mapper-tree.component.html',
  styleUrl:'mapper-tree.component.scss'
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
