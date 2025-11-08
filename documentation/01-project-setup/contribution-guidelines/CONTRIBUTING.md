# Contributing to TheAutoDoctor

**Guidelines for contributing to the TheAutoDoctor project**

---

## Welcome! 👋

Thank you for considering contributing to TheAutoDoctor. This document provides guidelines and instructions for contributing to the project.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Documentation](#documentation)
- [Testing](#testing)
- [Questions](#questions)

---

## Code of Conduct

### Our Standards

- ✅ Be respectful and inclusive
- ✅ Accept constructive criticism gracefully
- ✅ Focus on what's best for the project
- ✅ Show empathy towards other contributors
- ✅ Maintain professional communication

### Unacceptable Behavior

- ❌ Harassment or discriminatory language
- ❌ Personal attacks or trolling
- ❌ Publishing others' private information
- ❌ Other unprofessional conduct

---

## Getting Started

### Prerequisites

Before contributing, ensure you have:

- Node.js 18.x or higher
- pnpm 8.x or higher
- Git configured with your identity
- Access to required third-party services (Stripe, Supabase, LiveKit)

### Initial Setup

1. **Fork the repository**
   ```bash
   # Click the "Fork" button on GitHub
   ```

2. **Clone your fork**
   ```bash
   git clone https://github.com/YOUR_USERNAME/theautodoctor.git
   cd theautodoctor
   ```

3. **Add upstream remote**
   ```bash
   git remote add upstream https://github.com/ORIGINAL_OWNER/theautodoctor.git
   ```

4. **Install dependencies**
   ```bash
   pnpm install
   ```

5. **Set up environment**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your configuration
   ```

6. **Run database migrations**
   ```bash
   npm run db:migrate
   ```

7. **Start development server**
   ```bash
   pnpm dev
   ```

### Staying in Sync

Keep your fork updated with the main repository:

```bash
# Fetch latest changes
git fetch upstream

# Merge changes into your local main branch
git checkout main
git merge upstream/main

# Push to your fork
git push origin main
```

---

## Development Workflow

### 1. Create a Feature Branch

```bash
# Update your main branch first
git checkout main
git pull upstream main

# Create a new feature branch
git checkout -b feature/your-feature-name

# Or for bug fixes
git checkout -b fix/bug-description
```

**Branch Naming Conventions:**
- `feature/` - New features
- `fix/` - Bug fixes
- `refactor/` - Code refactoring
- `docs/` - Documentation updates
- `test/` - Test additions or updates
- `chore/` - Maintenance tasks

### 2. Make Your Changes

- Write clean, maintainable code
- Follow the [Coding Standards](#coding-standards)
- Add tests for new functionality
- Update documentation as needed

### 3. Test Your Changes

```bash
# Run type checking
pnpm typecheck

# Run tests
pnpm test

# Run linter
pnpm lint

# Build to verify
pnpm build
```

### 4. Commit Your Changes

Follow [Commit Guidelines](#commit-guidelines):

```bash
git add .
git commit -m "feat: add user preference settings

- Add settings page component
- Create API endpoint for preferences
- Update user profile schema"
```

### 5. Push to Your Fork

```bash
git push origin feature/your-feature-name
```

### 6. Create a Pull Request

- Go to GitHub and create a Pull Request
- Fill out the PR template completely
- Link any related issues
- Request review from maintainers

---

## Coding Standards

### TypeScript

**✅ DO:**
```typescript
// Use explicit types
interface User {
  id: string;
  name: string;
  email: string;
}

// Use async/await instead of promises
async function getUser(id: string): Promise<User> {
  const user = await db.users.findUnique({ where: { id } });
  return user;
}

// Use optional chaining
const userName = user?.name ?? 'Guest';

// Use const for immutable values
const API_URL = 'https://api.example.com';
```

**❌ DON'T:**
```typescript
// Avoid any type
function processData(data: any) { ... }

// Don't use var
var count = 0;

// Avoid nested promises
getData().then(data => {
  processData(data).then(result => {
    saveResult(result).then(...);
  });
});
```

### React Components

**✅ DO:**
```typescript
// Use functional components with TypeScript
interface ButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

export function Button({ label, onClick, disabled = false }: ButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="px-4 py-2 bg-blue-500 text-white rounded"
    >
      {label}
    </button>
  );
}

// Use hooks appropriately
export function UserProfile({ userId }: { userId: string }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUser(userId).then(setUser).finally(() => setLoading(false));
  }, [userId]);

  if (loading) return <LoadingSpinner />;
  if (!user) return <ErrorMessage />;

  return <div>{user.name}</div>;
}
```

### File Organization

```
src/
├── app/                    # Next.js app directory
│   ├── (auth)/            # Route groups
│   ├── api/               # API routes
│   └── [role]/            # Dynamic routes
├── components/            # React components
│   ├── ui/               # Reusable UI components
│   ├── mechanic/         # Mechanic-specific components
│   └── customer/         # Customer-specific components
├── lib/                  # Utility functions
│   ├── supabase/        # Supabase client
│   ├── stripe/          # Stripe utilities
│   └── utils/           # General utilities
├── hooks/               # Custom React hooks
├── types/               # TypeScript type definitions
└── styles/              # Global styles
```

### Naming Conventions

**Files:**
- Components: `PascalCase.tsx` (e.g., `UserProfile.tsx`)
- Utilities: `camelCase.ts` (e.g., `formatDate.ts`)
- Hooks: `use*.ts` (e.g., `useAuth.ts`)
- Types: `*.types.ts` (e.g., `user.types.ts`)

**Variables:**
```typescript
// Use camelCase for variables and functions
const userName = 'John';
function getUserById(id: string) { ... }

// Use PascalCase for components and classes
class UserManager { ... }
function UserProfile() { ... }

// Use UPPER_CASE for constants
const API_BASE_URL = 'https://api.example.com';
const MAX_RETRY_ATTEMPTS = 3;

// Use descriptive names
// ✅ Good
const sessionExpirationTime = 3600;
const isUserAuthenticated = true;

// ❌ Avoid
const t = 3600;
const flag = true;
```

### Comments

```typescript
// ✅ Good comments explain "why", not "what"

// Retry failed requests to handle temporary network issues
const maxRetries = 3;

/**
 * Validates user session and refreshes token if expired.
 * This prevents users from being logged out during active sessions.
 *
 * @param sessionId - The current session identifier
 * @returns Updated session with fresh token
 */
async function validateSession(sessionId: string): Promise<Session> {
  // Implementation...
}

// ❌ Avoid obvious comments

// Set count to 0
const count = 0;

// Call the function
getData();
```

---

## Commit Guidelines

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification.

### Commit Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, missing semicolons, etc.)
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks (dependencies, build config, etc.)
- `perf:` - Performance improvements
- `ci:` - CI/CD changes

### Scope (Optional)

The area of the codebase affected:
- `auth` - Authentication
- `api` - API routes
- `ui` - User interface
- `db` - Database
- `mechanic` - Mechanic features
- `customer` - Customer features

### Examples

```bash
# Simple commit
git commit -m "feat: add user preference settings"

# With scope
git commit -m "fix(auth): resolve session timeout issue"

# With body
git commit -m "feat(chat): implement file upload

- Add file upload component
- Create upload API endpoint
- Update chat UI to display files"

# Breaking change
git commit -m "feat(api)!: change authentication endpoint

BREAKING CHANGE: /api/auth endpoint now requires API key header"
```

### Commit Best Practices

- ✅ Write in imperative mood ("add feature" not "added feature")
- ✅ Keep subject line under 50 characters
- ✅ Capitalize subject line
- ✅ No period at end of subject
- ✅ Separate subject from body with blank line
- ✅ Wrap body at 72 characters
- ✅ Explain what and why, not how

---

## Pull Request Process

### Before Submitting

- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex code
- [ ] Documentation updated
- [ ] Tests added/updated
- [ ] All tests passing
- [ ] No console errors or warnings
- [ ] Type checking passes (`pnpm typecheck`)
- [ ] Lint checks pass (`pnpm lint`)
- [ ] Build succeeds (`pnpm build`)

### PR Title Format

Use the same format as commits:

```
feat(scope): add new feature
fix(scope): resolve bug
docs: update README
```

### PR Description Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix (non-breaking change fixing an issue)
- [ ] New feature (non-breaking change adding functionality)
- [ ] Breaking change (fix or feature causing existing functionality to change)
- [ ] Documentation update

## How Has This Been Tested?
Describe testing performed

## Checklist
- [ ] My code follows the project style guidelines
- [ ] I have performed a self-review
- [ ] I have commented my code where needed
- [ ] I have updated the documentation
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix/feature works
- [ ] New and existing tests pass locally

## Screenshots (if applicable)
Add screenshots for UI changes

## Related Issues
Closes #123
Related to #456
```

### Review Process

1. **Automated checks** must pass
   - TypeScript type checking
   - ESLint
   - Tests
   - Build verification

2. **Code review** by maintainers
   - Reviewers will provide feedback
   - Address feedback and push updates
   - Request re-review when ready

3. **Approval** required from at least one maintainer

4. **Merge** by maintainer after approval

---

## Documentation

### When to Update Documentation

Update documentation when you:

- Add new features
- Change existing behavior
- Fix bugs affecting documented behavior
- Add new environment variables
- Update dependencies
- Change API endpoints

### Documentation Checklist

- [ ] Update relevant README files
- [ ] Update [documentation/](../../../documentation/) if needed
- [ ] Add inline code comments for complex logic
- [ ] Update API documentation
- [ ] Add examples for new features
- [ ] Update migration guides for breaking changes

### Documentation Style

Follow the [Documentation Standards](./DOCUMENTATION_STANDARDS.md) guide.

---

## Testing

### Writing Tests

```typescript
// Example test structure
describe('UserProfile', () => {
  it('should display user name', () => {
    const user = { id: '1', name: 'John Doe', email: 'john@example.com' };
    render(<UserProfile user={user} />);
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('should handle loading state', () => {
    render(<UserProfile user={null} loading={true} />);
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('should handle error state', () => {
    render(<UserProfile user={null} error="User not found" />);
    expect(screen.getByText(/error/i)).toBeInTheDocument();
  });
});
```

### Test Coverage

- Aim for 80%+ coverage on new code
- Prioritize testing critical paths
- Test edge cases and error states
- Test user interactions

### Running Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage
```

---

## Questions?

### Getting Help

- 📚 Check the [documentation](../../../documentation/README.md)
- 💬 Ask in team discussions
- 📧 Contact the maintainers
- 🐛 Open an issue for bugs

### Reporting Bugs

When reporting bugs, include:

1. **Description** - Clear description of the bug
2. **Steps to Reproduce** - Step-by-step instructions
3. **Expected Behavior** - What should happen
4. **Actual Behavior** - What actually happens
5. **Screenshots** - If applicable
6. **Environment** - OS, browser, Node version, etc.
7. **Additional Context** - Any other relevant information

### Suggesting Features

When suggesting features:

1. **Use Case** - Describe the problem this solves
2. **Proposed Solution** - Your suggested implementation
3. **Alternatives** - Other solutions you've considered
4. **Additional Context** - Screenshots, mockups, examples

---

## License

By contributing to TheAutoDoctor, you agree that your contributions will be licensed under the same license as the project.

---

## Recognition

Contributors will be recognized in:
- Project README
- Release notes
- Git history

Thank you for contributing to TheAutoDoctor! 🚗✨

---

**Last Updated**: November 7, 2025
**Maintained By**: Development Team
