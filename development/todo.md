# Secure Mail Client - Development TODO

## Current Status
The application has a beautiful, zen-like interface matching the TV show aesthetic with dark theme and green accents. The three-panel layout works well, and the encryption-focused UI elements give it a distinct security-oriented appearance.

## High Priority Tasks

### Email Functionality
- [ ] **Fix Gmail PGP/GPG email search**: Make IMAP search for encrypted emails work properly
- [ ] **Improve email rendering**: Enhance the design of loaded emails in the detail view
- [ ] **Add actual SMTP sending**: Implement real email sending functionality
- [ ] **Basic email operations**: Implement reply, forward, delete functionality
- [ ] **Email threading**: Group related emails into conversations

### Settings & UI
- [ ] **Fix settings dialog layout**: Correct the disproportionate/cut-off settings screens
- [ ] **Streamline UI**: Reduce non-functional buttons to maintain zen-like simplicity
- [ ] **Responsive design**: Ensure proper rendering on different screen sizes
- [ ] **Error handling**: Add better error reporting and recovery

### Encryption & Security
- [ ] **YubiKey integration**: Connect to physical YubiKey when plugged in
- [ ] **Key server integration**: Add automatic key lookup from public key servers
- [ ] **Real PGP encryption/decryption**: Ensure the PGP functions work with real messages
- [ ] **Key management**: Implement key creation, backup, and rotation workflows
- [ ] **Multi-factor authentication**: Add support for additional authentication methods

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

### Infrastructure
- [ ] **Test suite**: Create comprehensive tests for email and encryption functions
- [ ] **Deployment**: Create installable packages for Windows, macOS, and Linux
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

## Tasks for Next Release (v0.1.0)

1. Fix Gmail PGP search to pull in real encrypted emails
2. Fix settings screen layout issues
3. Implement real YubiKey detection and basic key operations
4. Add key server lookup for recipient emails
5. Implement real PGP encryption/decryption with actual emails