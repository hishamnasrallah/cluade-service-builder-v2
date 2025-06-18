// src/app/services/mapper-undo-redo.service.ts

import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { CaseMapper, MapperTarget } from '../models/mapper.models';

interface MapperStateSnapshot {
  timestamp: Date;
  description: string;
  state: {
    currentMapper?: CaseMapper;
    targets: MapperTarget[];
    selectedTargetId?: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class MapperUndoRedoService {
  private readonly MAX_HISTORY_SIZE = 50;
  private history: MapperStateSnapshot[] = [];
  private currentIndex = -1;

  private canUndoSubject = new BehaviorSubject<boolean>(false);
  private canRedoSubject = new BehaviorSubject<boolean>(false);

  canUndo$ = this.canUndoSubject.asObservable();
  canRedo$ = this.canRedoSubject.asObservable();

  constructor() {}

  saveState(state: any, description: string): void {
    // Remove any states after current index (branching history)
    if (this.currentIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.currentIndex + 1);
    }

    // Create deep copy of state
    const snapshot: MapperStateSnapshot = {
      timestamp: new Date(),
      description,
      state: this.deepClone(state)
    };

    // Add to history
    this.history.push(snapshot);

    // Maintain max history size
    if (this.history.length > this.MAX_HISTORY_SIZE) {
      this.history.shift();
    } else {
      this.currentIndex++;
    }

    this.updateCanStates();
  }

  undo(): MapperStateSnapshot | null {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      this.updateCanStates();
      return this.history[this.currentIndex];
    }
    return null;
  }

  redo(): MapperStateSnapshot | null {
    if (this.currentIndex < this.history.length - 1) {
      this.currentIndex++;
      this.updateCanStates();
      return this.history[this.currentIndex];
    }
    return null;
  }

  canUndo(): Observable<boolean> {
    return this.canUndo$;
  }

  canRedo(): Observable<boolean> {
    return this.canRedo$;
  }

  getHistory(): MapperStateSnapshot[] {
    return [...this.history];
  }

  getCurrentState(): MapperStateSnapshot | null {
    if (this.currentIndex >= 0 && this.currentIndex < this.history.length) {
      return this.history[this.currentIndex];
    }
    return null;
  }

  clear(): void {
    this.history = [];
    this.currentIndex = -1;
    this.updateCanStates();
  }

  getUndoDescription(): string | null {
    if (this.currentIndex > 0) {
      return this.history[this.currentIndex].description;
    }
    return null;
  }

  getRedoDescription(): string | null {
    if (this.currentIndex < this.history.length - 1) {
      return this.history[this.currentIndex + 1].description;
    }
    return null;
  }

  private updateCanStates(): void {
    this.canUndoSubject.next(this.currentIndex > 0);
    this.canRedoSubject.next(this.currentIndex < this.history.length - 1);
  }

  private deepClone(obj: any): any {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    if (obj instanceof Date) {
      return new Date(obj.getTime());
    }

    if (obj instanceof Array) {
      return obj.map(item => this.deepClone(item));
    }

    if (obj instanceof Object) {
      const clonedObj: any = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          clonedObj[key] = this.deepClone(obj[key]);
        }
      }
      return clonedObj;
    }
  }

  // Predefined action descriptions
  static readonly ACTIONS = {
    CREATE_MAPPER: 'Create new mapper',
    LOAD_MAPPER: 'Load mapper',
    UPDATE_MAPPER: 'Update mapper properties',
    ADD_TARGET: 'Add target',
    UPDATE_TARGET: 'Update target',
    DELETE_TARGET: 'Delete target',
    MOVE_TARGET: 'Move target',
    ADD_FIELD_RULE: 'Add field rule',
    UPDATE_FIELD_RULE: 'Update field rule',
    DELETE_FIELD_RULE: 'Delete field rule',
    BATCH_UPDATE: 'Batch update',
    IMPORT: 'Import configuration',
    AUTO_MAP: 'Auto-map fields'
  };
}

// Undo/Redo Manager Component
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';

@Component({
  selector: 'app-undo-redo-history',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatDividerModule
  ],
  template: `
    <div class="undo-redo-history">
      <h2 mat-dialog-title>
        <mat-icon>history</mat-icon>
        Action History
      </h2>

      <mat-dialog-content>
        <div class="history-info">
          <p>You can undo or redo up to {{ maxHistorySize }} recent actions.</p>
        </div>

        <mat-list class="history-list">
          <mat-list-item
            *ngFor="let snapshot of history; let i = index"
            [class.current]="i === currentIndex"
            [class.future]="i > currentIndex"
            (click)="jumpToState(i)">

            <mat-icon matListItemIcon [class.future-icon]="i > currentIndex">
              {{ getActionIcon(snapshot.description) }}
            </mat-icon>

            <div matListItemTitle>{{ snapshot.description }}</div>
            <div matListItemLine class="timestamp">
              {{ snapshot.timestamp | date:'short' }}
            </div>

            <div matListItemMeta class="state-indicator">
              <mat-icon *ngIf="i === currentIndex" color="primary">
                radio_button_checked
              </mat-icon>
              <mat-icon *ngIf="i < currentIndex" class="past-icon">
                radio_button_unchecked
              </mat-icon>
              <mat-icon *ngIf="i > currentIndex" class="future-icon">
                radio_button_unchecked
              </mat-icon>
            </div>
          </mat-list-item>
        </mat-list>

        <div class="empty-state" *ngIf="history.length === 0">
          <mat-icon>history</mat-icon>
          <p>No actions to undo or redo</p>
        </div>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button (click)="clearHistory()" [disabled]="history.length === 0">
          <mat-icon>clear</mat-icon>
          Clear History
        </button>
        <button mat-button (click)="close()">Close</button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .undo-redo-history {
      min-width: 500px;
      max-width: 600px;
    }

    h2 {
      display: flex;
      align-items: center;
      gap: 12px;
      margin: 0;
    }

    .history-info {
      margin-bottom: 16px;
      padding: 12px;
      background-color: #e3f2fd;
      border-radius: 4px;
      font-size: 14px;
      color: #1565c0;
    }

    .history-info p {
      margin: 0;
    }

    .history-list {
      max-height: 400px;
      overflow-y: auto;
      border: 1px solid #e0e0e0;
      border-radius: 4px;
    }

    mat-list-item {
      cursor: pointer;
      transition: background-color 0.2s ease;
    }

    mat-list-item:hover {
      background-color: #f5f5f5;
    }

    mat-list-item.current {
      background-color: #e3f2fd;
    }

    mat-list-item.future {
      opacity: 0.6;
    }

    .timestamp {
      font-size: 12px;
      color: #666;
    }

    .state-indicator mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    .past-icon {
      color: #999;
    }

    .future-icon {
      color: #ccc;
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 48px;
      text-align: center;
      color: #999;
    }

    .empty-state mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      margin-bottom: 16px;
    }

    .empty-state p {
      margin: 0;
    }
  `]
})
export class UndoRedoHistoryComponent implements OnInit {
  history: any[] = [];
  currentIndex = -1;
  maxHistorySize = 50;

  private actionIcons: { [key: string]: string } = {
    'Create': 'add_circle',
    'Add': 'add',
    'Update': 'edit',
    'Delete': 'delete',
    'Move': 'open_with',
    'Import': 'upload',
    'Load': 'folder_open',
    'Batch': 'layers',
    'Auto': 'auto_fix_high'
  };

  constructor(
    private dialogRef: MatDialogRef<UndoRedoHistoryComponent>,
    private undoRedoService: MapperUndoRedoService
  ) {}

  ngOnInit(): void {
    this.history = this.undoRedoService.getHistory();
    const currentState = this.undoRedoService.getCurrentState();
    this.currentIndex = currentState ? this.history.indexOf(currentState) : -1;
  }

  getActionIcon(description: string): string {
    for (const [key, icon] of Object.entries(this.actionIcons)) {
      if (description.includes(key)) {
        return icon;
      }
    }
    return 'history';
  }

  jumpToState(index: number): void {
    // Jump to specific state
    if (index !== this.currentIndex) {
      // Implement jump logic
      console.log('Jump to state:', index);
    }
  }

  clearHistory(): void {
    if (confirm('Clear all history? This cannot be undone.')) {
      this.undoRedoService.clear();
      this.history = [];
      this.currentIndex = -1;
    }
  }

  close(): void {
    this.dialogRef.close();
  }
}
