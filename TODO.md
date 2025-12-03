# ExpenseOwl TODO

## In Progress
- [ ] Final testing and bug fixes

## Priority 1 - Polish
- [x] Add loading states/skeleton screens during data fetches
- [x] Add toast notification system for success/error feedback
- [x] Improve form validation with inline error messages
- [x] Add confirmation before logout
- [x] Handle session expiry gracefully (redirect to login)
- [x] Add smooth page transitions between routes

## Priority 2 - Features
- [x] Category drag-and-drop reordering in Settings
- [x] AI Voice configuration UI (provider, API key, model selection)
- [x] Import from old ExpenseOwl format (pre-v4.0)
- [x] PWA service worker for offline support
- [x] Recurring expense edit modal with "Update Future" / "Update All" options
- [x] Recurring expense delete with "Delete Future" / "Delete All" options

## Priority 3 - UX Improvements
- [x] Keyboard shortcuts (Ctrl+N for new expense, Escape to close, Arrow keys for navigation)
- [x] Expense search/filter functionality
- [x] Mobile swipe gestures for chart carousel
- [x] Pull-to-refresh on mobile
- [x] Haptic feedback on mobile actions

## Priority 4 - Data & Analytics
- [x] Donut chart with center total (replaced pie chart)
- [x] 6-month spending trend bar chart
- [x] Spending trend indicator (% change vs previous month)
- [x] Top 5 expenses list
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
- [x] Dashboard with donut chart, trend chart, and expense form
- [x] Table page with CRUD operations and search/filter
- [x] Settings page (theme, categories, currency, start date, recurring, import/export)
- [x] Voice recording for expense input
- [x] Backend UPSERT fix for settings persistence
- [x] Backend pq.Array fix for categories storage
- [x] Mobile-first UX redesign with swipeable chart carousel
- [x] FAB with React Portal for fixed positioning
