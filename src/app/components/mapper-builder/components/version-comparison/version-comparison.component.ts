// src/app/components/mapper-builder/components/version-comparison/version-comparison.component.ts

import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { DiffEditorModel, MonacoEditorModule } from 'ngx-monaco-editor';

import { MapperVersion } from '../../../../models/mapper.models';

@Component({
  selector: 'app-version-comparison',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    MonacoEditorModule
  ],
  templateUrl: './version-comparison.component.html',
  styleUrls: ['./version-comparison.component.scss']
})
export class VersionComparisonComponent {
  originalModel: DiffEditorModel;
  modifiedModel: DiffEditorModel;

  editorOptions = {
    theme: 'vs-light',
    language: 'json',
    readOnly: true,
    automaticLayout: true
  };

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { v1: MapperVersion; v2: MapperVersion },
    public dialogRef: MatDialogRef<VersionComparisonComponent>
  ) {
    this.originalModel = {
      code: JSON.stringify(data.v1, null, 2),
      language: 'json'
    };

    this.modifiedModel = {
      code: JSON.stringify(data.v2, null, 2),
      language: 'json'
    };
  }

  close(): void {
    this.dialogRef.close();
  }
}
