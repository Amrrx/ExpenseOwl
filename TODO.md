# ExpenseOwl TODO

## In Progress
- [ ] Final testing and bug fixes
- [x] Make mobile API URL configurable (app.config.js)
- [ ] Android rebuild needed (expo-image-manipulator, google-signin)
- [ ] Google OAuth - need to create Google Cloud OAuth clientId and set EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID

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

## Priority 4 - Agentic Features
- [x] Batch voice parsing (multiple expenses from one recording)
- [x] Receipt photo scanning (camera → AI extracts merchant, amount, date, category)
- [ ] Natural language queries ("How much did I spend on food this month?")
- [ ] Quick expense templates (tap to log frequent expenses)
- [ ] Smart suggestions ("Add as recurring?" for weekly patterns)
- [ ] AI spending insights (weekly summary with trends)
- [ ] Anomaly alerts ("Unusual expense detected")

## Zero-Friction Capture (Goal: minimum effort expense logging)

### Clear - Ready to Implement
- [x] Home screen widget (voice + camera buttons - opens app with popup)
- [ ] Minimal form mode (only amount required, auto-detect category from time/patterns)
- [x] Share Sheet integration (receive shared images from other apps → parse as receipt)
- [ ] Text paste input (paste any text → AI extracts expense details)

### Discussion Needed
- [ ] **Notification Listener (Android)** - Capture banking app notifications passively
  - Needs: Research Expo support, native module requirements
  - Pro: Zero friction, real-time capture
  - Con: Android only, may need ejecting from Expo
- [ ] **SMS Parsing (Android)** - Read bank transaction SMS
  - Needs: READ_SMS permission, Play Store policy review
  - Pro: Works offline, catches all bank SMS
  - Con: Sensitive permission, privacy concerns, bank format varies
- [ ] **Bank API Integration (Plaid/Open Banking)** - Direct transaction sync
  - Needs: Plaid account (~$0.50/connection), regulatory compliance
  - Pro: Highest accuracy, automatic sync
  - Con: Cost, complexity, not all banks supported
- [ ] **Email Parsing** - Scan inbox for receipt emails
  - Needs: OAuth email access, email provider integration
  - Pro: Catches online purchases automatically
  - Con: Privacy concerns, complex parsing
- [ ] **Voice Assistant Integration** - "Hey Siri/Google, log expense 15 dollars for lunch"
  - Needs: Siri Shortcuts (iOS), Google Assistant Actions
  - Pro: Hands-free, works without opening app
  - Con: Platform-specific implementation

## Priority 5 - Data & Analytics
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

## Mobile App (React Native/Expo)
- [x] Basic app structure with expo-router
- [x] Authentication flow (login/register screens)
- [x] Auth guard (redirect to login when unauthenticated)
- [x] Dashboard with donut chart and bar chart
- [x] Expense form with category selection
- [x] Development build (expo-dev-client) for Android
- [x] Disabled New Architecture to fix navigation crash
- [x] Voice expense entry UI (VoiceRecorder component with expo-audio)
- [x] Sync status indicator (SyncIndicator component in header)
- [x] Offline support with local storage (offlineStore with caching and queue)
- [x] Microphone permission configured in app.json
- [x] Make API URL configurable (app.config.js with EXPO_PUBLIC_API_URL)
- [x] Voice input UX (FAB opens voice, processing overlay, error handling)
- [x] AI config (server-controlled via env vars, no UI needed)
- [x] Receipt photo scanning (camera button, AI parsing via backend)
- [x] Home screen widget (QuickExpense with voice + camera buttons)
- [x] Share Sheet integration (expo-share-intent for receiving shared images)
- [x] Image compression for shared receipts (expo-image-manipulator, 60s API timeout)
- [x] Google Sign-In button and integration (@react-native-google-signin)
- [ ] iOS build and testing
- [ ] Production APK build
- [ ] App Store / Play Store submission

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
