// src/app/components/mapper-builder/exercise-runner/exercise-runner.component.ts

import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatStepperModule } from '@angular/material/stepper';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { FormsModule } from '@angular/forms';
import { MapperApiService } from '../../../services/mapper-api.service';
import { MapperStateService } from '../../../services/mapper-state.service';

interface Exercise {
  id: string;
  title: string;
  difficulty: number;
  time: string;
  description: string;
  objectives: string[];
  steps: ExerciseStep[];
  testData?: any;
  validation?: () => boolean;
  completed?: boolean;
}

interface ExerciseStep {
  title: string;
  instruction: string;
  action?: string;
  hint?: string;
  completed?: boolean;
}

@Component({
  selector: 'app-exercise-runner',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatExpansionModule,
    MatChipsModule,
    MatProgressBarModule,
    MatStepperModule,
    MatCheckboxModule,
    MatDialogModule,
    MatSnackBarModule,
    FormsModule
  ],
  template: `
    <div class="exercise-runner">
      <mat-card class="exercise-header">
        <mat-card-header>
          <mat-card-title>
            <mat-icon>school</mat-icon>
            Case Mapper Exercises
          </mat-card-title>
          <mat-chip-listbox class="progress-chips">
            <mat-chip color="primary">
              <mat-icon>check_circle</mat-icon>
              {{ getCompletedCount() }} / {{ exercises.length }} Completed
            </mat-chip>
            <mat-chip>
              <mat-icon>timer</mat-icon>
              {{ getTotalTime() }} min
            </mat-chip>
          </mat-chip-listbox>
        </mat-card-header>

        <mat-card-content>
          <mat-progress-bar
            mode="determinate"
            [value]="getProgress()"
            color="primary">
          </mat-progress-bar>
        </mat-card-content>
      </mat-card>

      <div class="exercise-grid">
        <!-- Exercise Set A: Basic Mapping -->
        <mat-expansion-panel
          [expanded]="currentExercise?.id === 'A1'"
          class="exercise-panel">
          <mat-expansion-panel-header>
            <mat-panel-title>
              <div class="exercise-title">
                <mat-icon [class.completed]="isCompleted('A1')">
                  {{ isCompleted('A1') ? 'check_circle' : 'radio_button_unchecked' }}
                </mat-icon>
                <span>Exercise A1: Simple User Mapping</span>
              </div>
            </mat-panel-title>
            <mat-panel-description>
              <mat-chip-listbox>
                <mat-chip>⭐ Beginner</mat-chip>
                <mat-chip>20 min</mat-chip>
              </mat-chip-listbox>
            </mat-panel-description>
          </mat-expansion-panel-header>

          <div class="exercise-content">
            <div class="exercise-info">
              <h4>Objectives:</h4>
              <ul>
                <li>Create a CaseMapper for case_type "USER_REG"</li>
                <li>Map to Django User model</li>
                <li>Split full_name into first_name and last_name</li>
                <li>Test with dry_run</li>
              </ul>

              <div class="test-data-preview">
                <h5>Test Data:</h5>
                <pre>{{ exerciseA1Data | json }}</pre>
              </div>
            </div>

            <mat-stepper linear #stepperA1>
              <mat-step *ngFor="let step of exerciseA1Steps; let i = index"
                        [completed]="step.completed">
                <ng-template matStepLabel>{{ step.title }}</ng-template>

                <div class="step-content">
                  <p>{{ step.instruction }}</p>

                  <div class="step-actions">
                    <button mat-raised-button
                            color="primary"
                            (click)="executeStep('A1', i)"
                            [disabled]="step.completed">
                      <mat-icon>play_arrow</mat-icon>
                      {{ step.action || 'Execute' }}
                    </button>

                    <button mat-button
                            *ngIf="step.hint"
                            (click)="showHint(step.hint)">
                      <mat-icon>lightbulb</mat-icon>
                      Hint
                    </button>
                  </div>

                  <mat-checkbox [(ngModel)]="step.completed"
                                (change)="updateProgress()">
                    Mark as completed
                  </mat-checkbox>
                </div>

                <div>
                  <button mat-button matStepperPrevious>Back</button>
                  <button mat-button matStepperNext>Next</button>
                </div>
              </mat-step>
            </mat-stepper>

            <div class="exercise-validation">
              <button mat-raised-button
                      color="accent"
                      (click)="validateExercise('A1')"
                      [disabled]="!allStepsCompleted('A1')">
                <mat-icon>fact_check</mat-icon>
                Validate Solution
              </button>
            </div>
          </div>
        </mat-expansion-panel>

        <!-- Exercise B2: Array Processing -->
        <mat-expansion-panel
          [expanded]="currentExercise?.id === 'B2'"
          class="exercise-panel">
          <mat-expansion-panel-header>
            <mat-panel-title>
              <div class="exercise-title">
                <mat-icon [class.completed]="isCompleted('B2')">
                  {{ isCompleted('B2') ? 'check_circle' : 'radio_button_unchecked' }}
                </mat-icon>
                <span>Exercise B2: Array Processing</span>
              </div>
            </mat-panel-title>
            <mat-panel-description>
              <mat-chip-listbox>
                <mat-chip>⭐⭐⭐ Intermediate</mat-chip>
                <mat-chip>45 min</mat-chip>
              </mat-chip-listbox>
            </mat-panel-description>
          </mat-expansion-panel-header>

          <div class="exercise-content">
            <div class="exercise-info">
              <h4>Objectives:</h4>
              <ul>
                <li>Create Order model record</li>
                <li>Create OrderItem records for each item in array</li>
                <li>Calculate total order value</li>
                <li>Apply 10% discount if total > $500</li>
              </ul>

              <div class="features-used">
                <h5>Features to Practice:</h5>
                <mat-chip-listbox>
                  <mat-chip color="primary">Parent-Child Mapping</mat-chip>
                  <mat-chip color="primary">Array Processing</mat-chip>
                  <mat-chip color="primary">Transform Functions</mat-chip>
                  <mat-chip color="primary">Conditional Logic</mat-chip>
                </mat-chip-listbox>
              </div>
            </div>

            <div class="visual-guide">
              <button mat-raised-button (click)="showVisualGuide('B2')">
                <mat-icon>visibility</mat-icon>
                Show Visual Guide
              </button>

              <button mat-raised-button (click)="loadTemplate('B2')">
                <mat-icon>file_copy</mat-icon>
                Load Exercise Template
              </button>
            </div>
          </div>
        </mat-expansion-panel>

        <!-- Exercise C1: Complex Business Rules -->
        <mat-expansion-panel
          [expanded]="currentExercise?.id === 'C1'"
          class="exercise-panel">
          <mat-expansion-panel-header>
            <mat-panel-title>
              <div class="exercise-title">
                <mat-icon [class.completed]="isCompleted('C1')">
                  {{ isCompleted('C1') ? 'check_circle' : 'radio_button_unchecked' }}
                </mat-icon>
                <span>Exercise C1: Employee Benefits Calculator</span>
              </div>
            </mat-panel-title>
            <mat-panel-description>
              <mat-chip-listbox>
                <mat-chip>⭐⭐⭐⭐ Advanced</mat-chip>
                <mat-chip>60 min</mat-chip>
              </mat-chip-listbox>
            </mat-panel-description>
          </mat-expansion-panel-header>

          <div class="exercise-content">
            <div class="exercise-info">
              <h4>Business Rules:</h4>
              <ul>
                <li>Base bonus = 10% if rating > 4.0, else 5%</li>
                <li>Add 2% for each year of service (max 20%)</li>
                <li>Health subsidy: $500/month for premium + $100 per dependent</li>
                <li>Company matches retirement up to 6%</li>
                <li>Life insurance = salary × multiplier (max 5x)</li>
              </ul>

              <div class="complexity-meter">
                <h5>Complexity Level:</h5>
                <mat-progress-bar mode="determinate" [value]="80" color="warn"></mat-progress-bar>
                <p>This exercise uses advanced features including expression conditions,
                   post-processors, and complex business logic.</p>
              </div>
            </div>

            <div class="guided-mode">
              <mat-slide-toggle [(ngModel)]="guidedMode">
                Enable Guided Mode
              </mat-slide-toggle>
              <p *ngIf="guidedMode">
                Guided mode will highlight the UI elements you need to interact with
                and provide step-by-step instructions.
              </p>
            </div>
          </div>
        </mat-expansion-panel>
      </div>

      <!-- Exercise Helper Panel -->
      <mat-card class="helper-panel" *ngIf="showHelper">
        <mat-card-header>
          <mat-card-title>
            <mat-icon>assistant</mat-icon>
            Exercise Assistant
          </mat-card-title>
          <button mat-icon-button (click)="showHelper = false">
            <mat-icon>close</mat-icon>
          </button>
        </mat-card-header>

        <mat-card-content>
          <div class="helper-content">
            <div class="current-task" *ngIf="currentTask">
              <h4>Current Task:</h4>
              <p>{{ currentTask }}</p>

              <div class="task-hints">
                <button mat-button (click)="showNextHint()">
                  <mat-icon>lightbulb</mat-icon>
                  Need a hint?
                </button>
              </div>
            </div>

            <div class="common-issues">
              <h4>Common Issues:</h4>
              <mat-accordion>
                <mat-expansion-panel *ngFor="let issue of commonIssues">
                  <mat-expansion-panel-header>
                    <mat-panel-title>{{ issue.title }}</mat-panel-title>
                  </mat-expansion-panel-header>
                  <p>{{ issue.solution }}</p>
                </mat-expansion-panel>
              </mat-accordion>
            </div>
          </div>
        </mat-card-content>
      </mat-card>

      <!-- Floating Action Button -->
      <button mat-fab
              color="accent"
              class="help-fab"
              (click)="showHelper = !showHelper"
              matTooltip="Toggle Exercise Assistant">
        <mat-icon>{{ showHelper ? 'close' : 'help' }}</mat-icon>
      </button>
    </div>
  `,
  styles: [`
    .exercise-runner {
      padding: 24px;
      max-width: 1200px;
      margin: 0 auto;
    }

    .exercise-header {
      margin-bottom: 24px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;

      mat-card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      mat-card-title {
        display: flex;
        align-items: center;
        gap: 12px;
        color: white;
      }

      mat-icon {
        font-size: 28px;
      }

      .progress-chips {
        mat-chip {
          background-color: rgba(255, 255, 255, 0.2);
          color: white;
        }
      }

      mat-progress-bar {
        margin-top: 16px;
        height: 8px;
        border-radius: 4px;
      }
    }

    .exercise-grid {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .exercise-panel {
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);

      &.mat-expanded {
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
      }
    }

    .exercise-title {
      display: flex;
      align-items: center;
      gap: 12px;

      mat-icon {
        &.completed {
          color: #4caf50;
        }
      }
    }

    .exercise-content {
      padding: 24px;
    }

    .exercise-info {
      margin-bottom: 24px;

      h4, h5 {
        margin-top: 16px;
        margin-bottom: 8px;
        color: #424242;
      }

      ul {
        margin: 0;
        padding-left: 20px;
      }
    }

    .test-data-preview {
      background-color: #f5f5f5;
      padding: 16px;
      border-radius: 8px;
      margin-top: 16px;

      pre {
        margin: 0;
        font-size: 12px;
        overflow-x: auto;
      }
    }

    .step-content {
      padding: 24px 0;

      p {
        margin-bottom: 16px;
        font-size: 15px;
        line-height: 1.6;
      }

      .step-actions {
        display: flex;
        gap: 12px;
        margin-bottom: 16px;
      }
    }

    .features-used {
      margin-top: 16px;

      mat-chip {
        font-size: 12px;
      }
    }

    .visual-guide {
      display: flex;
      gap: 12px;
      margin-top: 24px;
    }

    .complexity-meter {
      margin-top: 16px;
      padding: 16px;
      background-color: #fff3cd;
      border-radius: 8px;

      mat-progress-bar {
        margin: 12px 0;
      }

      p {
        margin: 8px 0 0 0;
        font-size: 13px;
        color: #856404;
      }
    }

    .guided-mode {
      margin-top: 24px;
      padding: 16px;
      background-color: #e3f2fd;
      border-radius: 8px;

      mat-slide-toggle {
        margin-bottom: 8px;
      }

      p {
        margin: 0;
        font-size: 13px;
        color: #1565c0;
      }
    }

    .exercise-validation {
      margin-top: 24px;
      padding-top: 24px;
      border-top: 1px solid #e0e0e0;
      text-align: center;
    }

    .helper-panel {
      position: fixed;
      bottom: 80px;
      right: 24px;
      width: 320px;
      max-height: 400px;
      overflow-y: auto;
      z-index: 100;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);

      mat-card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      mat-card-title {
        display: flex;
        align-items: center;
        gap: 8px;
      }
    }

    .helper-content {
      .current-task {
        margin-bottom: 24px;
        padding: 16px;
        background-color: #f5f5f5;
        border-radius: 8px;

        h4 {
          margin: 0 0 8px 0;
          color: #424242;
        }

        p {
          margin: 0 0 12px 0;
        }
      }

      .common-issues {
        h4 {
          margin: 0 0 12px 0;
          color: #424242;
        }
      }
    }

    .help-fab {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 99;
    }

    // Responsive
    @media (max-width: 768px) {
      .exercise-runner {
        padding: 16px;
      }

      .helper-panel {
        width: calc(100vw - 48px);
        right: 24px;
        left: 24px;
      }
    }
  `]
})
export class ExerciseRunnerComponent implements OnInit {
  @Output() loadExercise = new EventEmitter<string>();
  @Output() showGuide = new EventEmitter<string>();

  exercises: Exercise[] = [];
  currentExercise: Exercise | null = null;
  showHelper = false;
  guidedMode = false;
  currentTask = '';

  // Exercise A1 specific data
  exerciseA1Data = {
    id: 301,
    case_type: "USER_REG",
    case_data: {
      username: "johndoe",
      email: "john@example.com",
      full_name: "John Doe",
      is_active: true
    }
  };

  exerciseA1Steps: ExerciseStep[] = [
    {
      title: 'Create Mapper',
      instruction: 'Click "New" in the toolbar and create a mapper named "User Registration Mapper" with case type "USER_REG"',
      action: 'Create Mapper',
      hint: 'Look for the "New" button in the top toolbar'
    },
    {
      title: 'Add Target',
      instruction: 'Add a target for the Django User model (auth.User)',
      action: 'Add Target',
      hint: 'Right-click in the tree or click the + button to add a target'
    },
    {
      title: 'Create Username Rule',
      instruction: 'Add a field rule to map "username" to "username" (direct mapping)',
      action: 'Add Rule',
      hint: 'Click on the target in the tree, then "Add Field Rule" in the canvas'
    },
    {
      title: 'Create Email Rule',
      instruction: 'Add a field rule to map "email" to "email" (direct mapping)',
      action: 'Add Rule'
    },
    {
      title: 'Create First Name Rule',
      instruction: 'Add a field rule to map "full_name" to "first_name" with the "extract_first_name" transform',
      action: 'Add Transform Rule',
      hint: 'Use the transform function dropdown in the field rule editor'
    },
    {
      title: 'Test with Dry Run',
      instruction: 'Use the preview panel to test with case ID 301',
      action: 'Run Preview',
      hint: 'Open the preview panel using the eye icon button'
    }
  ];

  commonIssues = [
    {
      title: 'Transform function not found',
      solution: 'Make sure the transform function path is correct. It should be in the format "module.function", e.g., "exercises.transforms.extract_first_name"'
    },
    {
      title: 'Model not in dropdown',
      solution: 'The model list is loaded from the API. Make sure you\'re connected to the backend. Try refreshing the page.'
    },
    {
      title: 'Preview shows error',
      solution: 'Check that the case ID exists and the mapper is properly configured. All required fields must have rules.'
    }
  ];

  constructor(
    private apiService: MapperApiService,
    private stateService: MapperStateService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.initializeExercises();
  }

  initializeExercises(): void {
    // Initialize all exercises
    this.exercises = [
      {
        id: 'A1',
        title: 'Simple User Mapping',
        difficulty: 1,
        time: '20',
        description: 'Learn basic field mapping and transforms',
        objectives: [
          'Create a CaseMapper',
          'Map fields directly',
          'Use transform functions',
          'Test with dry run'
        ],
        steps: this.exerciseA1Steps
      },
      // Add more exercises...
    ];
  }

  getCompletedCount(): number {
    return this.exercises.filter(e => e.completed).length;
  }

  getTotalTime(): string {
    return this.exercises.reduce((sum, e) => sum + parseInt(e.time), 0).toString();
  }

  getProgress(): number {
    return (this.getCompletedCount() / this.exercises.length) * 100;
  }

  isCompleted(exerciseId: string): boolean {
    const exercise = this.exercises.find(e => e.id === exerciseId);
    return exercise?.completed || false;
  }

  allStepsCompleted(exerciseId: string): boolean {
    if (exerciseId === 'A1') {
      return this.exerciseA1Steps.every(step => step.completed);
    }
    return false;
  }

  executeStep(exerciseId: string, stepIndex: number): void {
    if (exerciseId === 'A1') {
      const step = this.exerciseA1Steps[stepIndex];

      switch (stepIndex) {
        case 0: // Create Mapper
          this.highlightElement('.toolbar-action:contains("New")');
          this.stateService.createNewMapper('USER_REG');
          break;

        case 1: // Add Target
          this.highlightElement('.tree-container');
          break;

        case 2: // Create Username Rule
        case 3: // Create Email Rule
        case 4: // Create First Name Rule
          this.highlightElement('.field-rules-card button:contains("Add Field Rule")');
          break;

        case 5: // Test with Dry Run
          this.highlightElement('.fab-container button[mattooltip*="preview"]');
          break;
      }

      // Mark step as completed after a delay
      setTimeout(() => {
        step.completed = true;
        this.updateProgress();
      }, 1000);
    }
  }

  showHint(hint: string): void {
    this.snackBar.open(hint, 'Got it!', {
      duration: 5000,
      horizontalPosition: 'end',
      verticalPosition: 'bottom'
    });
  }

  validateExercise(exerciseId: string): void {
    if (exerciseId === 'A1') {
      // Validate the mapper configuration
      const state = this.stateService.getState$().getValue();
      const errors = [];

      // Check mapper exists
      if (!state.currentMapper || state.currentMapper.case_type !== 'USER_REG') {
        errors.push('Mapper not created or wrong case type');
      }

      // Check target exists
      const userTarget = state.targets.find(t => t.model === 'auth.User');
      if (!userTarget) {
        errors.push('User target not found');
      } else {
        // Check field rules
        const rules = userTarget.field_rules || [];
        const requiredRules = ['username', 'email', 'first_name'];

        requiredRules.forEach(field => {
          if (!rules.find(r => r.target_field === field)) {
            errors.push(`Missing rule for ${field}`);
          }
        });

        // Check transform
        const firstNameRule = rules.find(r => r.target_field === 'first_name');
        if (firstNameRule && !firstNameRule.transform_function_path) {
          errors.push('First name rule missing transform function');
        }
      }

      if (errors.length === 0) {
        this.snackBar.open('✅ Exercise completed successfully!', 'Close', {
          duration: 5000,
          panelClass: 'success-snackbar'
        });

        const exercise = this.exercises.find(e => e.id === exerciseId);
        if (exercise) {
          exercise.completed = true;
          this.updateProgress();
        }
      } else {
        this.snackBar.open(`❌ Validation failed: ${errors.join(', ')}`, 'Close', {
          duration: 8000,
          panelClass: 'error-snackbar'
        });
      }
    }
  }

  showVisualGuide(exerciseId: string): void {
    this.showGuide.emit(exerciseId);
  }

  loadTemplate(exerciseId: string): void {
    this.loadExercise.emit(exerciseId);
  }

  showNextHint(): void {
    // Show context-sensitive hint based on current state
    const hint = this.getContextualHint();
    this.showHint(hint);
  }

  getContextualHint(): string {
    // Analyze current state and provide appropriate hint
    const state = this.stateService.getState$().getValue();

    if (!state.currentMapper) {
      return 'Start by creating a new mapper using the "New" button in the toolbar';
    }

    if (state.targets.length === 0) {
      return 'Add a target by right-clicking in the tree area or using the + button';
    }

    if (state.selectedTargetId) {
      const target = state.targets.find(t => t.id === state.selectedTargetId);
      if (target && (!target.field_rules || target.field_rules.length === 0)) {
        return 'Add field rules using the "Add Field Rule" button in the canvas';
      }
    }

    return 'Use the preview panel to test your configuration';
  }

  updateProgress(): void {
    // Update exercise progress
    this.currentTask = this.getCurrentTask();
  }

  getCurrentTask(): string {
    // Return current task based on exercise state
    if (this.currentExercise?.id === 'A1') {
      const nextStep = this.exerciseA1Steps.find(s => !s.completed);
      return nextStep?.instruction || 'All steps completed! Validate your solution.';
    }
    return '';
  }

  highlightElement(selector: string): void {
    // Add visual highlight to guide user
    const element = document.querySelector(selector);
    if (element) {
      element.classList.add('exercise-highlight');
      setTimeout(() => {
        element.classList.remove('exercise-highlight');
      }, 3000);
    }
  }
}

// Add global styles for exercise highlights
const styles = document.createElement('style');
styles.innerHTML = `
  @keyframes exerciseHighlight {
    0% { box-shadow: 0 0 0 0 rgba(255, 193, 7, 0.7); }
    70% { box-shadow: 0 0 0 10px rgba(255, 193, 7, 0); }
    100% { box-shadow: 0 0 0 0 rgba(255, 193, 7, 0); }
  }

  .exercise-highlight {
    animation: exerciseHighlight 2s infinite;
    position: relative;
    z-index: 1000;
  }

  .success-snackbar {
    background-color: #4caf50 !important;
  }

  .error-snackbar {
    background-color: #f44336 !important;
  }
`;
document.head.appendChild(styles);
