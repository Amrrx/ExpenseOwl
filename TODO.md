# ExpenseOwl TODO

## In Progress
- [ ] Testing and bug fixes for the new React frontend

## Priority 1 - Polish
- [ ] Add loading states/skeleton screens during data fetches
- [ ] Add toast notification system for success/error feedback
- [ ] Improve form validation with inline error messages
- [ ] Add confirmation before logout
- [ ] Handle session expiry gracefully (redirect to login)

## Priority 2 - Features
- [ ] Category drag-and-drop reordering in Settings
- [ ] AI Voice configuration UI (provider, API key, model selection)
- [ ] Import from old ExpenseOwl format (pre-v4.0)
- [ ] PWA service worker for offline support
- [ ] Recurring expense edit modal with "Update Future" / "Update All" options
- [ ] Recurring expense delete with "Delete Future" / "Delete All" options

## Priority 3 - UX Improvements
- [ ] Keyboard shortcuts (Ctrl+N for new expense, etc.)
- [ ] Expense search/filter functionality
- [ ] Mobile swipe gestures for navigation
- [ ] Pull-to-refresh on mobile
- [ ] Haptic feedback on mobile actions

## Priority 4 - Data & Analytics
- [ ] Line chart for expense trends over time
- [ ] Monthly comparison view
- [ ] Category spending limits/budgets
- [ ] Export to PDF format
- [ ] Export to Excel format

## Priority 5 - Technical Debt
- [ ] Add unit tests for utility functions
- [ ] Add integration tests for API service
- [ ] Add E2E tests with Playwright
- [ ] Optimize bundle size
- [ ] Add error boundary components

## Completed
- [x] React frontend with TypeScript and Vite
- [x] Tailwind CSS with dark mode support
- [x] JWT authentication with token refresh
- [x] Dashboard with pie chart and expense form
- [x] Table page with CRUD operations
- [x] Settings page (theme, categories, currency, start date, recurring, import/export)
- [x] Voice recording for expense input
- [x] Backend UPSERT fix for settings persistence
- [x] Backend pq.Array fix for categories storage
