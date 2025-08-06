// app.config.ts - FINAL VERSION
import { ApplicationConfig, importProvidersFrom } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { DragDropModule } from '@angular/cdk/drag-drop';

// Your existing services
import { ApprovalFlowService } from './services/approval-flow.service';
import { ApprovalFlowApiService } from './services/approval-flow-api.service';

// Add these new services for mapper functionality
import { MapperApiService } from './services/mapper-api.service';
import { MapperStateService } from './services/mapper-state.service';
import { MapperAutosaveService } from './services/mapper-autosave.service';
import { MapperValidationService } from './services/mapper-validation.service';
import { KeyboardShortcutsService } from './services/keyboard-shortcuts.service';
import { UndoRedoHistoryComponent } from './services/undo-redo.service';
import { MapperSearchService } from './services/mapper-search.service';
import { StatePresistanceService } from './services/state-presistance.service';

// Routes and interceptors
import { routes } from './app.routes';
import { authInterceptor } from './interceptors/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideAnimationsAsync(),
    importProvidersFrom(DragDropModule),

    // Your existing services
    ApprovalFlowService,
    ApprovalFlowApiService,

    // New mapper services
    MapperApiService,
    MapperStateService,
    MapperAutosaveService,
    MapperValidationService,
    KeyboardShortcutsService,
    UndoRedoHistoryComponent,
    // MapperSearchService,
    StatePresistanceService
  ]
};
