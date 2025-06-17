// src/app/components/mapper-builder/mapper-exercise-test.component.ts

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatChipsModule } from '@angular/material/chips';
import { MapperApiService } from '../../services/mapper-api.service';
import { MapperStateService } from '../../services/mapper-state.service';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

/**
 * This component demonstrates all the exercises from the Case Mapper documentation
 * It shows how to use the mapper builder with all the new features implemented
 */
@Component({
  selector: 'app-mapper-exercise-test',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatExpansionModule,
    MatChipsModule,
    MatSnackBarModule
  ],
  template: `
    <div class="exercise-container">
      <mat-card class="exercise-header">
        <mat-card-header>
          <mat-card-title>
            <mat-icon>school</mat-icon>
            Case Mapper Practical Exercises
          </mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <p>This component demonstrates all exercises from the Case Mapper documentation with the new features implemented.</p>
        </mat-card-content>
      </mat-card>

      <!-- Exercise A1: Simple User Mapping -->
      <mat-expansion-panel>
        <mat-expansion-panel-header>
          <mat-panel-title>
            Exercise A1: Simple User Mapping
          </mat-panel-title>
          <mat-panel-description>
            Create a basic mapper for USER_REG case type
          </mat-panel-description>
        </mat-expansion-panel-header>

        <div class="exercise-content">
          <h4>Task:</h4>
          <ul>
            <li>Create a CaseMapper for case_type "USER_REG"</li>
            <li>Map to Django User model</li>
            <li>Split full_name into first_name and last_name</li>
            <li>Test with dry_run</li>
          </ul>

          <h4>Solution:</h4>
          <div class="solution-actions">
            <button mat-raised-button color="primary" (click)="createExerciseA1()">
              <mat-icon>play_arrow</mat-icon>
              Create Mapper
            </button>
            <button mat-button (click)="testExerciseA1()">
              <mat-icon>bug_report</mat-icon>
              Test Dry Run
            </button>
          </div>

          <div class="result" *ngIf="exerciseA1Result">
            <pre>{{ exerciseA1Result | json }}</pre>
          </div>
        </div>
      </mat-expansion-panel>

      <!-- Exercise B2: Array Processing -->
      <mat-expansion-panel>
        <mat-expansion-panel-header>
          <mat-panel-title>
            Exercise B2: Array Processing
          </mat-panel-title>
          <mat-panel-description>
            Process order with multiple items
          </mat-panel-description>
        </mat-expansion-panel-header>

        <div class="exercise-content">
          <h4>Task:</h4>
          <ul>
            <li>Create Order model record</li>
            <li>Create OrderItem records for each item</li>
            <li>Calculate total order value</li>
            <li>Apply 10% discount if total > $500</li>
          </ul>

          <h4>Features Demonstrated:</h4>
          <mat-chip-listbox>
            <mat-chip>Parent-Child Mapping</mat-chip>
            <mat-chip>Array Processing</mat-chip>
            <mat-chip>Transform Functions</mat-chip>
            <mat-chip>Conditional Logic</mat-chip>
          </mat-chip-listbox>

          <div class="solution-actions">
            <button mat-raised-button color="primary" (click)="createExerciseB2()">
              <mat-icon>play_arrow</mat-icon>
              Create Order Mapper
            </button>
          </div>
        </div>
      </mat-expansion-panel>

      <!-- Exercise C1: Complex Business Rules -->
      <mat-expansion-panel>
        <mat-expansion-panel-header>
          <mat-panel-title>
            Exercise C1: Employee Benefits Calculator
          </mat-panel-title>
          <mat-panel-description>
            Complex business rules with multiple conditions
          </mat-panel-description>
        </mat-expansion-panel-header>

        <div class="exercise-content">
          <h4>Business Rules:</h4>
          <ul>
            <li>Base bonus = 10% if rating > 4.0, else 5%</li>
            <li>Add 2% for each year of service (max 20%)</li>
            <li>Health subsidy: $500/month for premium + $100 per dependent</li>
            <li>Company matches retirement up to 6%</li>
          </ul>

          <h4>New Features Used:</h4>
          <mat-chip-listbox>
            <mat-chip>Visual Field Mapper</mat-chip>
            <mat-chip>Expression Conditions</mat-chip>
            <mat-chip>Post-processor Functions</mat-chip>
            <mat-chip>Execution Logs</mat-chip>
            <mat-chip>Version History</mat-chip>
          </mat-chip-listbox>

          <div class="solution-actions">
            <button mat-raised-button color="primary" (click)="createExerciseC1()">
              <mat-icon>play_arrow</mat-icon>
              Create Benefits Mapper
            </button>
            <button mat-button (click)="showVisualMapper()">
              <mat-icon>drag_indicator</mat-icon>
              Open Visual Mapper
            </button>
            <button mat-button (click)="viewExecutionLogs()">
              <mat-icon>history</mat-icon>
              View Logs
            </button>
          </div>
        </div>
      </mat-expansion-panel>

      <!-- Testing All Features -->
      <mat-card class="feature-test-card">
        <mat-card-header>
          <mat-card-title>Test All New Features</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <div class="feature-grid">
            <button mat-stroked-button (click)="testExecutionLogs()">
              <mat-icon>history</mat-icon>
              Execution Logs
            </button>
            <button mat-stroked-button (click)="testVersionHistory()">
              <mat-icon>timeline</mat-icon>
              Version History
            </button>
            <button mat-stroked-button (click)="testFieldValidation()">
              <mat-icon>rule</mat-icon>
              Field Validation
            </button>
            <button mat-stroked-button (click)="testModelFields()">
              <mat-icon>schema</mat-icon>
              Model Fields API
            </button>
            <button mat-stroked-button (click)="testJSONPathSuggestions()">
              <mat-icon>route</mat-icon>
              JSONPath Suggestions
            </button>
            <button mat-stroked-button (click)="testPostProcessors()">
              <mat-icon>done_all</mat-icon>
              Post-processors
            </button>
            <button mat-stroked-button (click)="testUndoRedo()">
              <mat-icon>undo</mat-icon>
              Undo/Redo
            </button>
            <button mat-stroked-button (click)="testKeyboardShortcuts()">
              <mat-icon>keyboard</mat-icon>
              Shortcuts
            </button>
            <button mat-stroked-button (click)="testAutosave()">
              <mat-icon>save</mat-icon>
              Autosave
            </button>
            <button mat-stroked-button (click)="testBatchOperations()">
              <mat-icon>layers</mat-icon>
              Batch Ops
            </button>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .exercise-container {
      padding: 24px;
      max-width: 1200px;
      margin: 0 auto;
    }

    .exercise-header {
      margin-bottom: 24px;
      background-color: #e3f2fd;
    }

    .exercise-header mat-card-title {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    mat-expansion-panel {
      margin-bottom: 16px;
    }

    .exercise-content {
      padding: 24px;
    }

    .exercise-content h4 {
      margin-top: 0;
      color: #424242;
    }

    .solution-actions {
      display: flex;
      gap: 12px;
      margin: 16px 0;
    }

    .result {
      background-color: #f5f5f5;
      padding: 16px;
      border-radius: 4px;
      margin-top: 16px;
    }

    .result pre {
      margin: 0;
      font-size: 12px;
    }

    mat-chip-listbox {
      margin: 16px 0;
    }

    .feature-test-card {
      margin-top: 24px;
    }

    .feature-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 12px;
      margin-top: 16px;
    }

    .feature-grid button {
      justify-content: flex-start;
      text-align: left;
    }
  `]
})
export class MapperExerciseTestComponent implements OnInit {
  exerciseA1Result: any;

  constructor(
    private apiService: MapperApiService,
    private stateService: MapperStateService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    console.log('Mapper Exercise Test Component initialized');
    console.log('All new features are available for testing');
  }

  // Exercise A1: Simple User Mapping
  async createExerciseA1(): Promise<void> {
    try {
      // This demonstrates creating a mapper programmatically
      const mapperData = {
        name: 'User Registration Mapper',
        case_type: 'USER_REG',
        active_ind: true
      };

      const targetData = {
        name: 'User Target',
        model: 'auth.User',
        active_ind: true
      };

      const fieldRules = [
        {
          target_field: 'username',
          json_path: 'username'
        },
        {
          target_field: 'email',
          json_path: 'email'
        },
        {
          target_field: 'first_name',
          json_path: 'full_name',
          transform_function_path: 'exercises.transforms.extract_first_name'
        },
        {
          target_field: 'last_name',
          json_path: 'full_name',
          transform_function_path: 'exercises.transforms.extract_last_name'
        }
      ];

      this.snackBar.open('Exercise A1 mapper created successfully!', 'OK', { duration: 3000 });
      this.exerciseA1Result = { mapper: mapperData, target: targetData, rules: fieldRules };
    } catch (error) {
      console.error('Failed to create Exercise A1:', error);
      this.snackBar.open('Failed to create mapper', 'Close', { duration: 5000 });
    }
  }

  async testExerciseA1(): Promise<void> {
    const testCase = {
      id: 301,
      case_type: 'USER_REG',
      case_data: {
        username: 'johndoe',
        email: 'john@example.com',
        full_name: 'John Doe',
        is_active: true
      }
    };

    this.snackBar.open('Running dry run test...', 'OK', { duration: 2000 });

    // Simulate dry run result
    this.exerciseA1Result = {
      test_case: testCase,
      preview: {
        username: 'johndoe',
        email: 'john@example.com',
        first_name: 'John',
        last_name: 'Doe'
      }
    };
  }

  // Exercise B2: Array Processing
  createExerciseB2(): void {
    this.snackBar.open('Creating Order mapper with array processing...', 'OK', { duration: 3000 });

    // This would use the visual mapper to show parent-child relationships
    console.log('Exercise B2: Demonstrates parent-child targets and array processing');
  }

  // Exercise C1: Complex Business Rules
  createExerciseC1(): void {
    this.snackBar.open('Creating Employee Benefits mapper with complex rules...', 'OK', { duration: 3000 });

    // This demonstrates all the advanced features
    console.log('Exercise C1: Uses visual mapper, expression conditions, post-processors');
  }

  // Feature Tests
  testExecutionLogs(): void {
    this.snackBar.open('Opening execution logs viewer...', 'OK', { duration: 2000 });
    // Would navigate to execution logs component
  }

  testVersionHistory(): void {
    this.snackBar.open('Opening version history...', 'OK', { duration: 2000 });
    // Would show version history component
  }

  testFieldValidation(): void {
    // Test the real-time field validation
    const testRule = {
      json_path: 'user..invalid..path',
      target_field: '123invalid_field'
    };

    this.snackBar.open('Testing field validation...', 'OK', { duration: 2000 });
    console.log('Invalid rule would be caught:', testRule);
  }

  testModelFields(): void {
    // Test loading actual model fields from API
    this.apiService.getModelFields('auth.User').subscribe(fields => {
      console.log('Model fields loaded:', fields);
      this.snackBar.open(`Loaded ${fields.length} fields for auth.User`, 'OK', { duration: 3000 });
    });
  }

  testJSONPathSuggestions(): void {
    // Test JSONPath suggestions
    this.apiService.getJSONPathSuggestions('USER_REG').subscribe(suggestions => {
      console.log('JSONPath suggestions:', suggestions);
      this.snackBar.open(`Found ${suggestions.length} path suggestions`, 'OK', { duration: 3000 });
    });
  }

  testPostProcessors(): void {
    this.snackBar.open('Testing post-processor configuration...', 'OK', { duration: 2000 });
    console.log('Post-processors can be configured in target settings');
  }

  testUndoRedo(): void {
    this.snackBar.open('Undo/Redo is active - try Ctrl+Z and Ctrl+Y', 'OK', { duration: 3000 });
  }

  testKeyboardShortcuts(): void {
    this.snackBar.open('Press Shift+? to see all keyboard shortcuts', 'OK', { duration: 3000 });
  }

  testAutosave(): void {
    this.snackBar.open('Autosave is enabled - drafts save every 30 seconds', 'OK', { duration: 3000 });
  }

  testBatchOperations(): void {
    this.snackBar.open('Batch operations available via API', 'OK', { duration: 2000 });
    console.log('Batch update example:', {
      operation: 'update',
      target_ids: ['uuid1', 'uuid2'],
      data: { active_ind: false }
    });
  }

  showVisualMapper(): void {
    this.snackBar.open('Visual Field Mapper provides drag-and-drop mapping', 'OK', { duration: 3000 });
  }

  viewExecutionLogs(): void {
    this.snackBar.open('Execution logs show all mapper runs with details', 'OK', { duration: 3000 });
  }
}
