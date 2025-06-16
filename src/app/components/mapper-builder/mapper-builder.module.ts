// src/app/components/mapper-builder/mapper-builder.module.ts

import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';

// Material imports - comprehensive list
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatBadgeModule } from '@angular/material/badge';
import { MatTreeModule } from '@angular/material/tree';
import { MatRippleModule } from '@angular/material/core';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatRadioModule } from '@angular/material/radio';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatSortModule } from '@angular/material/sort';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatListModule } from '@angular/material/list';

// CDK imports
import { DragDropModule } from '@angular/cdk/drag-drop';
import { CdkTreeModule } from '@angular/cdk/tree';

// Components
import { MapperBuilderComponent } from './mapper-builder.component';
import { MapperTreeComponent } from './components/mapper-tree/mapper-tree.component';
import { MapperCanvasComponent } from './components/mapper-canvas/mapper-canvas.component';
import { PreviewPanelComponent } from './components/preview-panel/preview-panel.component';
import { MapperToolbarComponent } from './components/mapper-toolbar/mapper-toolbar.component';
import { FieldRuleEditorComponent } from './components/field-rule-editor/field-rule-editor.component';

// Dialogs
import { SaveMapperDialogComponent } from './dialogs/mapper-dialogs/save-mapper-dialog/save-mapper-dialog.component';
import { LoadMapperDialogComponent } from './dialogs/mapper-dialogs/load-mapper-dialog/load-mapper-dialog.component';
import { NewMapperDialogComponent, ValidationErrorsDialogComponent } from './dialogs/mapper-dialogs/new-mapper-dialog/new-mapper-dialog.component';

// Services
import { MapperApiService } from '../../services/mapper-api.service';
import { MapperStateService } from '../../services/mapper-state.service';
import { MapperValidationService } from '../../services/mapper-validation.service';

// Routes
const routes: Routes = [
  {
    path: '',
    component: MapperBuilderComponent
  }
];

@NgModule({
  declarations: [
    // All components are standalone, so no declarations needed
  ],
  imports: [
    CommonModule,
    HttpClientModule,
    RouterModule.forChild(routes),

    // Material Modules
    MatSidenavModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatSnackBarModule,
    MatDialogModule,
    MatTooltipModule,
    MatMenuModule,
    MatDividerModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatTableModule,
    MatChipsModule,
    MatExpansionModule,
    MatTabsModule,
    MatSlideToggleModule,
    MatProgressSpinnerModule,
    MatBadgeModule,
    MatTreeModule,
    MatRippleModule,
    MatAutocompleteModule,
    MatRadioModule,
    MatButtonToggleModule,
    MatSortModule,
    MatPaginatorModule,
    MatListModule,

    // CDK Modules
    DragDropModule,
    CdkTreeModule,

    // Standalone Components
    MapperBuilderComponent,
    MapperTreeComponent,
    MapperCanvasComponent,
    PreviewPanelComponent,
    MapperToolbarComponent,
    FieldRuleEditorComponent,
    SaveMapperDialogComponent,
    LoadMapperDialogComponent,
    NewMapperDialogComponent,
    ValidationErrorsDialogComponent
  ],
  providers: [
    MapperApiService,
    MapperStateService,
    MapperValidationService
  ]
})
export class MapperBuilderModule { }

// Also create a barrel export file for easier imports
// src/app/components/mapper-builder/index.ts
export * from './mapper-builder.module';
export * from './mapper-builder.component';
export * from './components/mapper-tree/mapper-tree.component';
export * from './components/mapper-canvas/mapper-canvas.component';
export * from './components/preview-panel/preview-panel.component';
export * from './components/mapper-toolbar/mapper-toolbar.component';
export * from './components/field-rule-editor/field-rule-editor.component';
export * from './dialogs/mapper-dialogs/save-mapper-dialog/save-mapper-dialog.component';
export * from './dialogs/mapper-dialogs/load-mapper-dialog/load-mapper-dialog.component';
export * from './dialogs/mapper-dialogs/new-mapper-dialog/new-mapper-dialog.component';
