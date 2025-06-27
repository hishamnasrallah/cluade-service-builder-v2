import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ConditionBuilderComponent } from '../condition-builder/condition-builder.component';

export interface ConditionDialogData {
  conditionLogic: any[];
  workflow: any;
  targetField?: string;
  elementName?: string;
}

@Component({
  selector: 'app-condition-builder-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    ConditionBuilderComponent
  ],
  template: `
    <div class="condition-dialog">
      <div class="dialog-header">
        <h2>
          <mat-icon>rule</mat-icon>
          {{ data.elementName || 'Configure Conditions' }}
        </h2>
        <button mat-icon-button (click)="close()" class="close-button">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <mat-dialog-content>
        <app-condition-builder
          [conditionLogic]="conditionLogic"
          [workflow]="data.workflow"
          (conditionChanged)="onConditionChanged($event)">
        </app-condition-builder>
      </mat-dialog-content>

      <mat-dialog-actions>
        <button mat-button (click)="close()">Cancel</button>
        <button mat-raised-button color="primary" (click)="save()">
          <mat-icon>save</mat-icon>
          Save Conditions
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .condition-dialog {
      width: 90vw;
      max-width: 1200px;
      height: 85vh;
      display: flex;
      flex-direction: column;
    }

    .dialog-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px 24px;
      border-bottom: 1px solid #e0e0e0;
      background: #f5f5f5;
    }

    .dialog-header h2 {
      margin: 0;
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 20px;
      font-weight: 500;
      color: #333;
    }

    .dialog-header h2 mat-icon {
      color: #007bff;
    }

    .close-button {
      color: #666;
    }

    mat-dialog-content {
      flex: 1;
      padding: 0 !important;
      overflow: hidden;
    }

    ::ng-deep app-condition-builder {
      height: 100%;
      display: block;
    }

    ::ng-deep .condition-builder {
      height: 100%;
      display: flex;
      flex-direction: column;
    }

    ::ng-deep .mat-mdc-tab-body-wrapper {
      flex: 1;
    }

    mat-dialog-actions {
      padding: 16px 24px;
      border-top: 1px solid #e0e0e0;
      gap: 12px;
      justify-content: flex-end;
    }

    @media (max-width: 768px) {
      .condition-dialog {
        width: 100vw;
        max-width: 100vw;
        height: 100vh;
        margin: 0;
        border-radius: 0;
      }
    }
  `]
})
export class ConditionBuilderDialogComponent {
  conditionLogic: any[] = [];

  constructor(
    public dialogRef: MatDialogRef<ConditionBuilderDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ConditionDialogData
  ) {
    this.conditionLogic = [...(data.conditionLogic || [])];
  }

  onConditionChanged(conditions: any[]): void {
    this.conditionLogic = conditions;
  }

  save(): void {
    this.dialogRef.close(this.conditionLogic);
  }

  close(): void {
    this.dialogRef.close();
  }
}
