# CRS Pulse — Manual QA Checklist

## Auth Flow

- [ ] Register with valid email/password → lands on Dashboard
- [ ] Register with duplicate email → shows validation error
- [ ] Register with mismatched passwords → shows error
- [ ] Register with password < 8 chars → shows error
- [ ] Login with correct credentials → lands on Dashboard
- [ ] Login with wrong password → shows error message
- [ ] Forgot password → success screen after valid email
- [ ] Token persists after app backgrounded + reopened
- [ ] Logout → lands on Login, all data cleared

## Dashboard

- [ ] Dashboard loads with user score, latest draw, difference
- [ ] Score difference shows correct sign (+/-) and color (green/yellow/red)
- [ ] Prediction card shows correct strength (strong/moderate/weak)
- [ ] Pull-to-refresh fetches latest data
- [ ] Skeleton shows during initial load
- [ ] Error state shown if API fails (with retry button)
- [ ] Empty state if no profile set up

## Draw History

- [ ] Draw list loads with pagination
- [ ] Filter by "Last Month" / "Last Year" / "All" works
- [ ] Infinite scroll loads next page
- [ ] Each card shows: draw #, date, category, cutoff, invitations
- [ ] Score gap shown per draw when user has profile
- [ ] Empty state for empty filter results
- [ ] Offline: cached draws shown with toast

## Analytics

- [ ] Stats grid shows: avg, highest, lowest, total draws
- [ ] Trend badge correct (rising/falling/stable)
- [ ] Chart renders with 6 data points
- [ ] Category filter changes chart data
- [ ] Period filter (3M/6M/1Y/All) changes data
- [ ] Empty state when no draws

## Notifications

- [ ] Notification list loads
- [ ] Unread count shows in tab badge
- [ ] Tap notification marks it read
- [ ] "Mark all read" works
- [ ] FCM push received in foreground shows in-app notification
- [ ] FCM push tapped in background navigates to notifications tab
- [ ] Permission denied → no crash

## Profile

- [ ] Profile shows current CRS score + category
- [ ] Update score → saves + dashboard refreshes
- [ ] Update category → saves + prediction updates
- [ ] Invalid CRS score (>1200) → shows error
- [ ] Category buttons are selectable

## Settings

- [ ] Draw notification toggle works
- [ ] Weekly summary toggle works
- [ ] Sign out → clears session

## Offline

- [ ] No internet → toast shows "No Internet Connection"
- [ ] Dashboard shows cached data offline
- [ ] Draw list shows cached data offline
- [ ] Reconnect → toast "Back Online" → data refreshes

## Performance

- [ ] Cold start < 2 seconds on mid-range Android
- [ ] Smooth scroll (no jank) in draws list with 50+ items
- [ ] Chart renders without frame drops
- [ ] Pull-to-refresh completes in < 1 second on WiFi

## Accessibility

- [ ] All buttons have accessibilityLabel
- [ ] Form inputs have accessibilityLabel matching label
- [ ] Error messages read by screen reader
- [ ] Badge status readable via accessibilityRole
- [ ] Switch states announced by TalkBack

## Edge Cases

- [ ] 0 draws in DB → all screens show empty state
- [ ] CRS score = 0 → dashboard still renders
- [ ] Very long draw list (500+) → performance OK
- [ ] JWT expired → auto-logout, navigate to login
- [ ] Network timeout → error state with retry
- [ ] Device token registration failure → no crash, silent fail

## Admin Panel (Filament)

- [ ] Admin can log into /admin
- [ ] Admin can create a new draw
- [ ] Admin can publish draw → notifications dispatched
- [ ] Admin can view user list
- [ ] Stats overview widget shows correct counts
- [ ] Non-admin user cannot access /admin

## Play Store Readiness

- [ ] App icon renders on Android (adaptive icon)
- [ ] Splash screen shows on cold start
- [ ] App does not request unnecessary permissions
- [ ] Privacy policy URL accessible
- [ ] App version in app.json matches eas.json
- [ ] AAB build succeeds (eas build --platform android --profile production)
