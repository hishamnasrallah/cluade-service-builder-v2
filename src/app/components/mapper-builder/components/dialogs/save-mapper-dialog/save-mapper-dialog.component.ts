// src/app/components/mapper-builder/dialogs/save-mapper-dialog/save-mapper-dialog.component.ts

import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';

import { CaseMapper } from '../../../../models/mapper.models';

@Component({
  selector: 'app-save-mapper-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSlideToggleModule,
    MatDividerModule,
    MatChipsModule
  ],
  templateUrl:'save-mapper-dialog.component.html',
  styleUrl:'save-mapper-dialog.component.scss'
})
export class SaveMapperDialogComponent {
  saveForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<SaveMapperDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: {
      mapper: CaseMapper;
      targetCount: number;
      ruleCount: number;
    }
  ) {
    this.saveForm = this.fb.group({
      name: [data.mapper.name, Validators.required],
      description: [''],
      activate: [true],
      createVersion: [false],
      validateBeforeSave: [true]
    });
  }

  cancel(): void {
    this.dialogRef.close();
  }

  save(): void {
    if (this.saveForm.valid) {
      this.dialogRef.close(this.saveForm.value);
    }
  }
}
