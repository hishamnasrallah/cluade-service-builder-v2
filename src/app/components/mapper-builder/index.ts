// src/app/components/mapper-builder/index.ts
// Barrel export file - separate from the module to avoid circular dependencies

export { MapperBuilderModule } from './mapper-builder.module';
export { MapperBuilderComponent } from './mapper-builder.component';

// Main components
export { MapperTreeComponent } from './components/mapper-tree/mapper-tree.component';
export { MapperCanvasComponent } from './components/mapper-canvas/mapper-canvas.component';
export { PreviewPanelComponent } from './components/preview-panel/preview-panel.component';
export { MapperToolbarComponent } from './components/mapper-toolbar/mapper-toolbar.component';
export { FieldRuleEditorComponent } from './components/field-rule-editor/field-rule-editor.component';

// Utility components
export { LogsViewerComponent } from './components/logs-viewer/logs-viewer.component';
export { BatchOperationsComponent } from './components/batch-operations/batch-operations.component';
export { FieldRuleListComponent } from './field-rule-list/field-rule-list.component';
export { FunctionBrowserComponent } from './function-browser/function-browser.component';
export { ModelBrowserComponent } from './model-browser/model-browser.component';

// Dialogs
export { NewMapperDialogComponent } from './components/dialogs/new-mapper-dialog/new-mapper-dialog.component';
export { SaveMapperDialogComponent } from './components/dialogs/save-mapper-dialog/save-mapper-dialog.component';
export { LoadMapperDialogComponent } from './components/dialogs/load-mapper-dialog/load-mapper-dialog.component';
export { ImportMapperDialogComponent } from './components/dialogs/import-mapper-dialog/import-mapper-dialog.component';
export { ExportMapperDialogComponent } from './components/dialogs/export-mapper-dialog/export-mapper-dialog.component';
