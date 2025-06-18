// src/app/components/mapper-builder/components/toolbar/toolbar.component.ts
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialog } from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';

import { CaseMapper } from '../../../../models/mapper.models';
import { NewMapperDialogComponent } from '../dialogs/new-mapper-dialog/new-mapper-dialog.component';
import { OpenMapperDialogComponent } from '../dialogs/open-mapper-dialog/open-mapper-dialog.component';
import { SaveMapperDialogComponent } from '../dialogs/save-mapper-dialog/save-mapper-dialog.component';
import { ImportMapperDialogComponent } from '../dialogs/import-mapper-dialog/import-mapper-dialog.component';
import { ExportMapperDialogComponent } from '../dialogs/export-mapper-dialog/export-mapper-dialog.component';
import { HelpDialogComponent } from '../dialogs/help-dialog/help-dialog.component';
import { SettingsDialogComponent } from '../dialogs/settings-dialog/settings-dialog.component';

@Component({
  selector: 'app-toolbar',
  standalone: true,
  imports: [
    CommonModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatDividerModule,
    MatFormFieldModule,
    MatInputModule,
    MatMenuModule,
    FormsModule
  ],
  templateUrl:"toolbar.component.html",
  styleUrl:'toolbar.component.scss'
})
export class ToolbarComponent {
  @Input() currentMapper: CaseMapper | null = null;
  @Input() isDirty = false;
  @Input() canUndo = false;
  @Input() canRedo = false;

  @Output() newMapper = new EventEmitter<void>();
  @Output() openMapper = new EventEmitter<void>();
  @Output() saveMapper = new EventEmitter<void>();
  @Output() saveAsNewVersion = new EventEmitter<void>();
  @Output() validate = new EventEmitter<void>();
  @Output() undo = new EventEmitter<void>();
  @Output() redo = new EventEmitter<void>();
  @Output() searchChanged = new EventEmitter<string>();

  showSearch = false;
  searchQuery = '';

  constructor(private dialog: MatDialog) {}

  handleNewMapper(): void {
    if (this.isDirty) {
      if (!confirm('You have unsaved changes. Do you want to continue?')) {
        return;
      }
    }

    const dialogRef = this.dialog.open(NewMapperDialogComponent, {
      width: '500px',
      disableClose: true
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.newMapper.emit();
      }
    });
  }

  handleOpenMapper(): void {
    const dialogRef = this.dialog.open(OpenMapperDialogComponent, {
      width: '800px',
      maxHeight: '80vh'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.openMapper.emit();
      }
    });
  }

  handleSaveAs(): void {
    const dialogRef = this.dialog.open(SaveMapperDialogComponent, {
      width: '500px',
      data: { mapper: this.currentMapper }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.saveAsNewVersion.emit();
      }
    });
  }

  handleImport(): void {
    const dialogRef = this.dialog.open(ImportMapperDialogComponent, {
      width: '600px',
      maxHeight: '80vh'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        // Handle import
      }
    });
  }

  handleExport(): void {
    const dialogRef = this.dialog.open(ExportMapperDialogComponent, {
      width: '500px',
      data: { mapper: this.currentMapper }
    });
  }

  showPreview(): void {
    // Emit event or open preview in dialog
  }

  runMapper(): void {
    // Handled by menu
  }

  runDryRun(): void {
    // Emit dry run event
  }

  runActual(): void {
    if (confirm('This will execute the mapper and create/update records. Continue?')) {
      // Emit run event
    }
  }

  toggleSearch(): void {
    this.showSearch = true;
    setTimeout(() => {
      const input = document.querySelector('.search-field input') as HTMLInputElement;
      if (input) input.focus();
    }, 100);
  }

  closeSearch(): void {
    this.showSearch = false;
    this.searchQuery = '';
    this.searchChanged.emit('');
  }

  onSearchChange(query: string): void {
    this.searchChanged.emit(query);
  }

  showHelp(): void {
    this.dialog.open(HelpDialogComponent, {
      width: '800px',
      maxHeight: '80vh'
    });
  }

  showSettings(): void {
    this.dialog.open(SettingsDialogComponent, {
      width: '600px'
    });
  }
}
