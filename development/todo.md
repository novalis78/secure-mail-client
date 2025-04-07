# Secure Mail Client - Development TODO

## Current Status
The application has a beautiful, zen-like interface matching the target aesthetic with dark theme and green accents. The three-panel layout works well, and the encryption-focused UI elements provide a distinct security-oriented appearance. We've implemented YubiKey integration, robust PGP encryption/decryption, and credential storage with multi-layered security.

## High Priority Tasks

### Email Functionality
- [x] **Fix Gmail PGP/GPG email search**: Make IMAP search for encrypted emails work properly
- [x] **Improve email rendering**: Enhance the design of loaded emails in the detail view
- [ ] **Add actual SMTP sending**: Implement real email sending functionality
- [ ] **Basic email operations**: Implement reply, forward, delete functionality 
- [ ] **Email threading**: Group related emails into conversations

### Settings & UI
- [x] **Fix settings dialog layout**: Correct the disproportionate/cut-off settings screens
- [x] **Streamline UI**: Maintain zen-like simplicity with focused controls
- [x] **Responsive design**: Support different screen sizes
- [x] **Error handling**: Add better error reporting and recovery

### Encryption & Security
- [x] **YubiKey integration**: Connect to physical YubiKey when plugged in
- [ ] **Key server integration**: Add automatic key lookup from public key servers
- [x] **Real PGP encryption/decryption**: PGP functions work with real messages
- [x] **Key management**: Implement key creation and basic workflow
- [ ] **Multi-factor authentication**: Add support for additional authentication methods
- [ ] **Fix configuration storage**: Replace electron-store with more robust storage system

## Medium Priority Tasks

### User Experience
- [ ] **Email templates**: Add templates for common secure communications
- [ ] **Drag and drop**: Implement drag and drop for attachments and email organization
- [ ] **Keyboard shortcuts**: Add comprehensive keyboard shortcuts for power users
- [ ] **Search improvements**: Enhance search with filters and advanced options
- [ ] **Contact management**: Build a contact system with PGP key associations
- [ ] **Dark/light theme**: Add theme toggle while maintaining the secure aesthetic

### Advanced Features
- [ ] **Folder management**: Add custom folders and rules for email organization
- [ ] **Scheduled sending**: Allow emails to be scheduled for future delivery
- [ ] **Self-destructing messages**: Implement expiring message functionality
- [ ] **Message read receipts**: Add secure read receipts for encrypted messages
- [ ] **Offline mode**: Ensure functionality when disconnected from internet
- [ ] **Email aliases**: Support for disposable/temporary addresses
- [ ] **Advanced YubiKey operations**: Support signing operations and advanced crypto functions
- [ ] **YubiKey-based access control**: Implement per-folder encryption with YubiKey

### Infrastructure
- [ ] **Test suite**: Create comprehensive tests for email and encryption functions
- [ ] **Deployment**: Create installable packages for Windows, macOS, and Linux
- [x] **Configuration resilience**: Implement robust file-based storage with error handling
- [ ] **Auto-updates**: Implement secure application update mechanism
- [ ] **Telemetry/analytics**: Add optional, privacy-respecting usage analytics

## Low Priority / Future Features

- [ ] **Mobile companion**: Create mobile app with cross-device synchronization
- [ ] **Calendar integration**: Add secure calendar invites and management
- [ ] **Encryption for attachments**: Add special handling for secure attachments
- [ ] **Secure address book**: Build encrypted contact management
- [ ] **Integration with other secure tools**: Connect with password managers, etc.
- [ ] **Plugin system**: Allow extensibility while maintaining security
- [ ] **Translation/localization**: Support multiple languages

## Principles to Maintain

1. **Security First**: All features must be implemented with security as the top priority
2. **Minimal Design**: Keep the interface zen-like and uncluttered
3. **Performance**: Ensure the application remains responsive even with large email stores
4. **Privacy**: No data should leave the user's control without explicit permission
5. **Transparency**: Make security features visible and understandable

## Styling Best Practices (CRITICAL)

### Key Styling Rules (LAW)

1. **Never Mix Styling Methods**:
   - Choose either Tailwind classes OR inline styles - NEVER BOTH
   - Mixing approaches creates conflicts where some styles override others
   - Example of BAD practice (DO NOT DO THIS):
     ```jsx
     <div 
       className="w-48 bg-secondary-dark" 
       style={{ width: '12rem', backgroundColor: '#0F172A' }}
     >
     ```

2. **Use Semantically Correct HTML**:
   - Use proper HTML structure: `nav`, `ul`, `li` for navigation
   - Use `button` elements for interactive elements (not `div`)
   - Ensure parent-child relationships are maintained
   - This improves accessibility and prevents layout bugs

3. **Follow CSS Specificity Rules**:
   - Be aware of CSS specificity overrides
   - More specific selectors win over less specific ones
   - Inline styles > ID selectors > Class selectors > Tag selectors
   - If styles aren't applying, check for conflicting higher specificity styles

4. **CSS Loading Order Matters**:
   - Later styles override earlier ones with the same specificity
   - Import order in JS matters (last import wins)
   - Keep global CSS overrides at the end of the import chain
   - Ensure global.css is imported AFTER framework styles (like Tailwind)

5. **Consistent Responsive Approach**:
   - Use the same responsive system throughout (e.g., Tailwind breakpoints)
   - Don't mix media query systems
   - Test all components at multiple screen sizes

### Common Styling Problems

1. **Disappearing Elements**: Often caused by:
   - Conflicting width/height (one says 0, one says auto)
   - Negative margins pushing elements offscreen
   - z-index issues (element is behind others)
   - Display property conflicts (flex vs block vs none)

2. **Inconsistent Layouts**:
   - Different styling methods creating inconsistencies
   - Mixing unit types (px, rem, em, %) unpredictably
   - Parent element constraints restricting children
   - Overlapping specificity rules

3. **Style Leakage**:
   - Global styles affecting components unexpectedly
   - Parent styles cascading down to children
   - Multiple overlapping utility classes
   - CSS reset conflicts

### Debugging Style Issues

1. **Browser Dev Tools**:
   - Inspect elements to see which styles are applied
   - Look for styles with strikethrough (they're being overridden)
   - Check the full CSS cascade to find conflicting rules
   - Temporarily disable styles to isolate issues

2. **Component Isolation**:
   - Test components in isolation
   - Add temporary borders to visualize layout
   - Use background colors to see element boundaries
   - Add `outline: 1px solid red` to problematic elements

3. **Progressive Enhancement**:
   - Start with minimal styling and add incrementally
   - Test each styling change before adding more
   - When something breaks, revert to last working state
   - Document style dependencies between components

### Style Architecture Best Practices

1. **Component-Based Styling**:
   - Keep styles close to components they affect
   - Avoid global styles for component-specific issues
   - Use consistent class naming patterns (BEM, etc.)
   - Minimize style dependencies between components

2. **Tailwind Usage Guidelines**:
   - Follow Tailwind's utility-first approach consistently
   - Group related utilities (positioning, sizing, spacing, etc.)
   - Extract common patterns to custom components
   - Use Tailwind's responsive and state variants predictably

3. **Responsive Design**:
   - Mobile-first approach - design for smallest then scale up
   - Test UI at multiple breakpoints during development
   - Use consistent breakpoint definitions across the app
   - Consider text size, spacing, and layout at all sizes

### Framework Specific Notes

1. **React + Tailwind**:
   - Extract reusable UI components with consistent styling
   - Consider component composition over style inheritance
   - Use clsx/classnames for conditional styling
   - Avoid style props when using Tailwind (redundant)

2. **Electron Specifics**:
   - Test on the actual runtime environment
   - Be aware of OS-specific rendering differences
   - Account for window size changes and responsiveness
   - Use OS-native elements when appropriate

## Tasks for Next Release (v0.1.0)

1. ✅ Fix Gmail PGP search to pull in real encrypted emails
2. ✅ Fix settings screen layout issues
3. ✅ Implement real YubiKey detection and basic key operations
4. ✅ Implement real PGP encryption/decryption with actual emails
5. ✅ Fix configuration storage issues

## UI Improvement Todo List (URGENT)

### Email List Improvements
1. [x] Fix maillist entries being cut off by the detail pane
2. [x] Fix the resizable panel slider not working properly
3. [x] Increase contrast for selected items in the email list
4. [x] Make date formatting consistent throughout the application
5. [x] Replace text labels like "MESSAGE VIEWED" with appropriate icons
6. [ ] Fix/remove the green blob underneath the Compose button
7. [x] Ensure email list properly shows PGP/encrypted status of emails

### Detail View Improvements
1. [x] Fix empty state messaging to be clearer ("No encrypted emails found" is confusing)
2. [x] Always show encrypted content in mail detail, even if not decrypted yet
3. [ ] Remove stray ">" character appearing in mail detail
4. [x] Improve header formatting for consistency 
5. [x] Match TV show sample UI design more closely for encryption visuals
6. [x] Fix "NOT ENCRYPTED" badge - everything should be treated as encrypted

### General UI/UX Improvements
1. [x] Add auto-refresh on startup to pull in emails automatically
2. [x] Add a refresh button to the top bar for manual refresh
3. [x] Display decryption status more clearly (partially decrypted, fully encrypted, etc.)
4. [x] Fix responsive layout for better display across different screen sizes

## Tasks for Next Release (v0.2.0)

1. Add key server lookup for recipient emails
2. Implement SMTP sending functionality
3. Add reply, forward functionality for emails
4. Enhance YubiKey integration with signing operations
5. Add comprehensive error recovery for network operations