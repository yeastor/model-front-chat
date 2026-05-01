# AGENTS.md - Mihon Model Front Chat

## Project Overview
Angular 21 standalone application with Material Design UI. Frontend chat interface that communicates with a backend AI model API.

## Build, Lint, and Test Commands

### Development
```bash
npm start              # Start dev server (ng serve)
make local-start       # Same as above via Makefile
npm run watch          # Watch mode for development builds
```

### Building
```bash
npm run build          # Production build
npm run build:prod     # Explicit production build
```

### Linting
```bash
npm run lint           # Run ESLint on entire project
```

### Testing
```bash
npm test               # Run all tests (Karma + Jasmine)
```

### Running a Single Test
To run a specific test file, modify `karma.conf.js` or use grep-style filtering. By default, Angular runs all `*.spec.ts` files in `src/`. To run a single spec:
```bash
npx karma start --single-run --include "**/chat.component.spec.ts"
```
Alternatively, use VSCode Angular test runner or WebStorm configurations.

### E2E Testing
```bash
npm run e2e            # Run end-to-end tests
```

## Code Style Guidelines

### General
- **Indentation**: 4 spaces (no tabs)
- **Quotes**: Single quotes for strings preferred
- **Semicolons**: Required
- **Line Length**: No strict limit, but prefer readable lines
- All logic for local storage always do in service src/app/core/services/local-storage.service.ts

### TypeScript
- **Strict Mode**: Always enabled (`strict: true` in tsconfig.json)
- **Types**: Use explicit types; avoid `any` when possible
- **Interfaces**: Use for object shapes
```typescript
// Good
export interface ChatMessage {
    id: string;
    content: string;
    sender: 'user' | 'ai';
}

// Avoid
const message: any = getMessage();
```

### Angular Components (Standalone)
- Use standalone components with `imports` array
- Prefer inline templates for simple components, `templateUrl` for complex ones
- Always specify `selector`, `template`/`templateUrl`, `imports`, `styleUrls`
```typescript
@Component({
    selector: 'app-my-component',
    template: `<div>Content</div>`,
    imports: [RouterOutlet],
    styleUrls: ['./my-component.component.scss']
})
export class MyComponent {}
```

### Naming Conventions
| Type | Convention | Example |
|------|------------|---------|
| Components | kebab-case | `chat-input.component.ts` |
| Component selectors | kebab-case with `app-` prefix | `app-chat-input` |
| Directive selectors | camelCase with `app` prefix | `appHighlight` |
| Classes | PascalCase | `ChatService` |
| Interfaces | PascalCase (no "I" prefix) | `ChatMessage` |
| Variables/Methods | camelCase | `chatId`, `sendMessage()` |
| Constants | camelCase or SCREAMING_SNAKE | `API_URL` or `apiUrl` |
| Files | kebab-case | `message-bubble.component.ts` |
| SCSS files | kebab-case | `chat-input.component.scss` |

### Imports
- Group imports in this order:
  1. Angular core (e.g., `@angular/core`, `@angular/common`)
  2. Angular Material (e.g., `@angular/material`)
  3. Third-party libraries (e.g., `rxjs`)
  4. Local application imports (e.g., `./services`, `../../models`)
- Use absolute paths for Angular imports, relative for local
```typescript
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { Observable, firstValueFrom } from 'rxjs';
import { ChatService } from './services/chat.service';
import { ChatMessage } from '../models/chat.model';
```

### Angular Patterns
- **Services**: Use `@Injectable({ providedIn: 'root' })` for app-wide services
- **Dependency Injection**: Constructor injection preferred
```typescript
constructor(
    private chatService: ChatService,
    private cdr: ChangeDetectorRef
) {}
```
- **Lifecycle Hooks**: Implement `OnInit`, `OnDestroy`, `AfterViewChecked` as needed
- **Reactive Forms**: Use `FormControl` with validators for form inputs
- **RxJS**: Use `Observable` with operators; prefer `firstValueFrom` for promises

### Error Handling
- Use try-catch for async/await operations
- Use `.catchError()` or `error` callback in Observable subscriptions
```typescript
// Observable error handling
this.http.get<T>('/api').subscribe({
    next: (data) => this.handleData(data),
    error: (error) => console.error('Error:', error)
});

// Async/await error handling
try {
    const result = await this.someAsyncMethod();
} catch (error) {
    console.error('Error:', error);
}
```

### Template Guidelines
- Use Angular control flow syntax (`@if`, `@for`, `@switch`)
- Use property binding `[prop]` and event binding `(event)`
- Prefer `ng generate component` for component creation
- HTML selectors in templates: kebab-case

### SCSS Guidelines
- Use SCSS features (variables, nesting, mixins)
- Global styles in `src/styles.scss`
- Component-specific styles in component `.scss` files
- Follow BEM-like naming for component CSS classes
```scss
.chat-container {
    .chat-header {
        padding: 16px;
    }
    &.is-loading {
        opacity: 0.7;
    }
}
```

### Testing
- Test files: `*.spec.ts` suffix
- Use Jasmine/Karma (configured in `karma.conf.js`)
- Group related tests with `describe()` blocks
- Use `it()` for individual test cases
```typescript
describe('ChatComponent', () => {
    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
```

## Project Structure
```
src/
├── app/
│   ├── core/              # Singleton services, interceptors
│   │   ├── interceptors/
│   │   └── services/
│   ├── features/          # Feature modules (chat, etc.)
│   │   └── chat/
│   │       ├── components/
│   │       ├── models/
│   │       └── services/
│   ├── shared/            # Reusable components, pipes
│   │   └── components/
│   ├── app.component.ts   # Root component
│   ├── app.config.ts       # App configuration
│   └── app.routes.ts      # Routing configuration
├── environments/         # Environment-specific configs
├── styles.scss            # Global styles
└── main.ts                # Bootstrap file
```

## ESLint Configuration
- Extends: `eslint:recommended`, `@typescript-eslint/recommended`, `@angular-eslint/recommended`
- Component selectors: `app` prefix, kebab-case
- Directive selectors: `app` prefix, camelCase
- Run `npm run lint` to check

## Key Dependencies
- Angular 21 (standalone components)
- Angular Material 21
- RxJS 7.8+
- TypeScript 5.9+
- Jasmine + Karma (testing)

## Environment Configuration
Environment files in `src/environments/`:
- `environment.ts`: Development/production settings
- `environment.prod.ts`: Production overrides

API URL is configured via `environment.apiUrl`.
