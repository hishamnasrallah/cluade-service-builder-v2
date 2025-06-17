// src/app/services/keyboard-shortcuts.service.ts

import { Injectable, HostListener } from '@angular/core';
import { Subject, fromEvent } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { KeyboardShortcut } from '../models/mapper.models';

@Injectable({
  providedIn: 'root'
})
export class KeyboardShortcutsService {
  private shortcuts: Map<string, KeyboardShortcut> = new Map();
  private shortcutTriggered$ = new Subject<KeyboardShortcut>();
  private enabled = true;

  constructor() {
    this.initializeGlobalListener();
    this.registerDefaultShortcuts();
  }

  private initializeGlobalListener(): void {
    fromEvent<KeyboardEvent>(document, 'keydown').pipe(
      filter(() => this.enabled),
      filter(event => !this.isInputElement(event.target as Element)),
      map(event => ({ event, key: this.createShortcutKey(event) })), // Preserve event object
      filter(({ key }) => this.shortcuts.has(key))
    ).subscribe(({ event, key }) => {
      const shortcut = this.shortcuts.get(key);
      if (shortcut && shortcut.enabled !== false) {
        event.preventDefault();
        shortcut.action();
        this.shortcutTriggered$.next(shortcut);
      }
    });
  }

  private isInputElement(target: Element): boolean {
    const tagName = target.tagName.toLowerCase();
    return tagName === 'input' ||
      tagName === 'textarea' ||
      tagName === 'select' ||
      target.hasAttribute('contenteditable');
  }

  private createShortcutKey(event: KeyboardEvent): string {
    const parts: string[] = [];

    if (event.ctrlKey || event.metaKey) parts.push('ctrl');
    if (event.altKey) parts.push('alt');
    if (event.shiftKey) parts.push('shift');

    // Handle special keys
    let key = event.key.toLowerCase();
    if (key === ' ') key = 'space';
    if (key === 'arrowup') key = 'up';
    if (key === 'arrowdown') key = 'down';
    if (key === 'arrowleft') key = 'left';
    if (key === 'arrowright') key = 'right';

    parts.push(key);

    return parts.join('+');
  }

  registerShortcut(shortcut: KeyboardShortcut): void {
    const key = this.buildShortcutKey(shortcut.key, shortcut.modifiers);
    this.shortcuts.set(key, shortcut);
  }

  unregisterShortcut(key: string, modifiers?: string[]): void {
    const shortcutKey = this.buildShortcutKey(key, modifiers);
    this.shortcuts.delete(shortcutKey);
  }

  private buildShortcutKey(key: string, modifiers?: string[]): string {
    const parts: string[] = [];

    if (modifiers) {
      if (modifiers.includes('ctrl')) parts.push('ctrl');
      if (modifiers.includes('alt')) parts.push('alt');
      if (modifiers.includes('shift')) parts.push('shift');
    }

    parts.push(key.toLowerCase());

    return parts.join('+');
  }

  enableShortcuts(): void {
    this.enabled = true;
  }

  disableShortcuts(): void {
    this.enabled = false;
  }

  getShortcuts(): KeyboardShortcut[] {
    return Array.from(this.shortcuts.values());
  }

  onShortcutTriggered() {
    return this.shortcutTriggered$.asObservable();
  }

  private registerDefaultShortcuts(): void {
    // Default shortcuts for mapper builder
    const defaultShortcuts: KeyboardShortcut[] = [
      {
        key: 's',
        modifiers: ['ctrl'],
        description: 'Save mapper',
        action: () => console.log('Save mapper shortcut')
      },
      {
        key: 'n',
        modifiers: ['ctrl'],
        description: 'New mapper',
        action: () => console.log('New mapper shortcut')
      },
      {
        key: 'o',
        modifiers: ['ctrl'],
        description: 'Open/Load mapper',
        action: () => console.log('Open mapper shortcut')
      },
      {
        key: 'z',
        modifiers: ['ctrl'],
        description: 'Undo',
        action: () => console.log('Undo shortcut')
      },
      {
        key: 'y',
        modifiers: ['ctrl'],
        description: 'Redo',
        action: () => console.log('Redo shortcut')
      },
      {
        key: 'a',
        modifiers: ['ctrl', 'shift'],
        description: 'Add new target',
        action: () => console.log('Add target shortcut')
      },
      {
        key: 'r',
        modifiers: ['ctrl', 'shift'],
        description: 'Add new field rule',
        action: () => console.log('Add rule shortcut')
      },
      {
        key: 'p',
        modifiers: ['ctrl'],
        description: 'Toggle preview panel',
        action: () => console.log('Toggle preview shortcut')
      },
      {
        key: 'f',
        modifiers: ['ctrl'],
        description: 'Search/Find',
        action: () => console.log('Search shortcut')
      },
      {
        key: '?',
        modifiers: ['shift'],
        description: 'Show keyboard shortcuts',
        action: () => console.log('Show shortcuts dialog')
      }
    ];

    defaultShortcuts.forEach(shortcut => this.registerShortcut(shortcut));
  }

  // Format shortcut for display
  formatShortcut(shortcut: KeyboardShortcut): string {
    const parts: string[] = [];

    if (shortcut.modifiers) {
      if (shortcut.modifiers.includes('ctrl')) {
        parts.push(this.isMac() ? '⌘' : 'Ctrl');
      }
      if (shortcut.modifiers.includes('alt')) {
        parts.push(this.isMac() ? '⌥' : 'Alt');
      }
      if (shortcut.modifiers.includes('shift')) {
        parts.push(this.isMac() ? '⇧' : 'Shift');
      }
    }

    parts.push(this.formatKey(shortcut.key));

    return parts.join(this.isMac() ? '' : '+');
  }

  private formatKey(key: string): string {
    const keyMap: { [key: string]: string } = {
      'space': 'Space',
      'up': '↑',
      'down': '↓',
      'left': '←',
      'right': '→',
      'enter': '↵',
      'escape': 'Esc',
      'delete': 'Del',
      'backspace': '⌫'
    };

    return keyMap[key.toLowerCase()] || key.toUpperCase();
  }

  private isMac(): boolean {
    return navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  }
}

// Dialog component for showing shortcuts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';

@Component({
  selector: 'app-keyboard-shortcuts-dialog',
  template: `
    <h2 mat-dialog-title>
      <mat-icon>keyboard</mat-icon>
      Keyboard Shortcuts
    </h2>

    <mat-dialog-content>
      <table mat-table [dataSource]="shortcuts" class="shortcuts-table">
        <ng-container matColumnDef="shortcut">
          <th mat-header-cell *matHeaderCellDef>Shortcut</th>
          <td mat-cell *matCellDef="let shortcut">
            <mat-chip-listbox>
              <mat-chip class="shortcut-chip">
                {{ formatShortcut(shortcut) }}
              </mat-chip>
            </mat-chip-listbox>
          </td>
        </ng-container>

        <ng-container matColumnDef="description">
          <th mat-header-cell *matHeaderCellDef>Action</th>
          <td mat-cell *matCellDef="let shortcut">
            {{ shortcut.description }}
          </td>
        </ng-container>

        <ng-container matColumnDef="enabled">
          <th mat-header-cell *matHeaderCellDef>Status</th>
          <td mat-cell *matCellDef="let shortcut">
            <mat-icon [class]="shortcut.enabled !== false ? 'enabled' : 'disabled'">
              {{ shortcut.enabled !== false ? 'check_circle' : 'cancel' }}
            </mat-icon>
          </td>
        </ng-container>

        <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
        <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
      </table>

      <div class="shortcuts-info">
        <mat-icon>info</mat-icon>
        <p>Press <strong>Shift + ?</strong> anytime to show this help</p>
      </div>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Close</button>
    </mat-dialog-actions>
  `,
  styles: [`
    h2 {
      display: flex;
      align-items: center;
      gap: 12px;
      margin: 0;
    }

    .shortcuts-table {
      width: 100%;
      margin-bottom: 24px;
    }

    .shortcut-chip {
      font-family: 'Roboto Mono', monospace;
      font-weight: 500;
      background-color: #e3f2fd;
      color: #1976d2;
    }

    .enabled {
      color: #4caf50;
    }

    .disabled {
      color: #f44336;
    }

    .shortcuts-info {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      background-color: #e8f5e9;
      border-radius: 4px;
      color: #424242;
    }

    .shortcuts-info mat-icon {
      color: #4caf50;
    }

    .shortcuts-info p {
      margin: 0;
    }
  `],
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatChipsModule
  ]
})
export class KeyboardShortcutsDialogComponent {
  shortcuts: KeyboardShortcut[];
  displayedColumns = ['shortcut', 'description', 'enabled'];

  constructor(private shortcutsService: KeyboardShortcutsService) {
    this.shortcuts = this.shortcutsService.getShortcuts();
  }

  formatShortcut(shortcut: KeyboardShortcut): string {
    return this.shortcutsService.formatShortcut(shortcut);
  }
}
