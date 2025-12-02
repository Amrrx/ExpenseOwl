# ExpenseOwl UI Conversion Plan

## Completed

### Core Infrastructure
- ✅ Created `utils/currency.ts` - Currency formatting with all 30 currencies
- ✅ Created `utils/dates.ts` - Date utilities and month bounds calculation
- ✅ Created `services/api.ts` - API service with JWT auth and token refresh
- ✅ Created `stores/authStore.ts` - Zustand auth state management

### Shared Components
- ✅ `components/Layout.tsx` - Main layout with header and bottom nav
- ✅ `components/Header.tsx` - App header with theme toggle and logout
- ✅ `components/BottomNav.tsx` - Bottom navigation (Dashboard, Table, Settings)
- ✅ `components/Card.tsx` - Card, CardHeader, CardBody, CardTitle
- ✅ `components/Button.tsx` - Button with variants (primary, secondary, ghost, danger)
- ✅ `components/Input.tsx` - Styled input component
- ✅ `components/Select.tsx` - Styled select dropdown
- ✅ `components/TagInput.tsx` - Tag input with autocomplete
- ✅ `components/Modal.tsx` - Base modal component
- ✅ `components/ConfirmModal.tsx` - Confirmation dialog
- ✅ `components/VoiceModal.tsx` - Voice recording review modal

### Hooks
- ✅ `hooks/useVoiceRecording.ts` - Voice recording with API integration

### Pages
- ✅ `pages/Login.tsx` - Login form with JWT auth
- ✅ `pages/Register.tsx` - Registration form
- ✅ `pages/Dashboard.tsx` - Pie chart, expense form, voice recording, cashflow cards
- ✅ `pages/Table.tsx` - Expense table with edit/delete, month navigation
- ✅ `pages/Settings.tsx` - All settings: theme, categories, currency, start date, recurring expenses, import/export

### Styling
- ✅ Modern Tailwind CSS configuration with custom colors
- ✅ Dark mode support with theme toggle
- ✅ Glass morphism effects
- ✅ Responsive mobile-first design

### Backend Fixes
- ✅ Fixed `postgresStore.go` - UPSERT for settings, pq.Array for categories

## Remaining Tasks

### Priority 1 - Polish
- [ ] Add loading states/skeletons
- [ ] Improve error handling with toast notifications
- [ ] Add form validation feedback
- [ ] Mobile swipe gestures for navigation

### Priority 2 - Features
- [ ] Category drag-and-drop reordering
- [ ] AI Voice configuration (provider, API key, model)
- [ ] Import from old ExpenseOwl format
- [ ] PWA service worker for offline support

### Priority 3 - Nice to Have
- [ ] Keyboard shortcuts
- [ ] Expense search/filter
- [ ] Data visualization improvements
- [ ] Export to different formats (PDF, Excel)

## Tech Stack
- React 19 + TypeScript
- Vite 7.2
- Tailwind CSS 3.4
- Chart.js + react-chartjs-2
- Zustand (state)
- Axios (HTTP)
- React Router DOM
- Lucide React (icons)
