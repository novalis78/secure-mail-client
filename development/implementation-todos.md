# Secure Mail Client - Implementation TODOs

This document outlines features, buttons, and UI elements that exist in the interface but are not yet fully implemented.

## Email Functionality

1. **SMTP Email Sending**
   - Status: Not implemented
   - Details: While UI for composing emails exists, backend SMTP functionality is missing
   - Location: `ComposeEmail.tsx` component has complete UI but lacks full backend support
   - Priority: High

2. **Reply, Forward, Delete Functions**
   - Status: UI only, not functional
   - Details: Buttons exist but have empty click handlers
   - Location: `/src/components/mail/MailDetail.tsx` lines 923-934
   - Priority: High

3. **Email Threading**
   - Status: Not implemented
   - Details: Emails are displayed individually without conversation threading
   - Location: Referenced in `/development/todo.md` line 14
   - Priority: Medium

## Security Features

1. **Public Key Server Integration**
   - Status: Not implemented
   - Details: No automatic lookup of PGP keys from public servers
   - Location: Referenced in `/development/todo.md` line 23
   - Priority: High

2. **Multi-factor Authentication**
   - Status: Not implemented
   - Details: Only YubiKey authentication is partially implemented
   - Location: Referenced in `/development/todo.md` line 26
   - Priority: Medium

3. **Advanced YubiKey Operations**
   - Status: Partially implemented
   - Details: Basic detection works, but advanced crypto operations missing
   - Location: Referenced in `/development/todo.md` line 46
   - Priority: Medium

4. **YubiKey-based Access Control**
   - Status: Not implemented
   - Details: Per-folder encryption with YubiKey not implemented
   - Location: Referenced in `/development/todo.md` line 47
   - Priority: Low

## Contact Management

1. **Contact Management System**
   - Status: Mock implementation only
   - Details: UI complete but uses dummy data
   - Location: `/src/components/contacts/Contacts.tsx` uses mock data (lines 29-85)
   - Priority: Medium

2. **Add Contact Functionality**
   - Status: UI only, not functional
   - Details: Modal with form exists but "Add Contact" button has no implementation
   - Location: `/src/components/contacts/Contacts.tsx` lines 420-503
   - Priority: Medium

## UI/UX Elements

1. **Header Menu Actions**
   - Status: UI only, handlers missing
   - Details: "Mark as Read" and "Move to..." options have empty click handlers
   - Location: `/src/components/layout/HeaderActions.tsx` lines 74-92
   - Priority: Medium

2. **Mail Detail Actions**
   - Status: Not implemented
   - Details: "Reply Securely" and "More Actions" buttons lack implementation
   - Location: `/src/components/mail/MailDetail.tsx` lines 616-632
   - Priority: High

3. **Dark/Light Theme Toggle**
   - Status: Not implemented
   - Details: Only dark theme is available, no toggle function
   - Location: Referenced in `/development/todo.md` line 37
   - Priority: Low

4. **Drag and Drop for Attachments**
   - Status: Not implemented
   - Details: File attachments only through file picker, no drag and drop
   - Location: Referenced in `/development/todo.md` line 33
   - Priority: Low

5. **Email Templates**
   - Status: Not implemented
   - Details: No template system for common email types
   - Location: Referenced in `/development/todo.md` line 32
   - Priority: Low

## Infrastructure Features

1. **Configuration Storage Improvement**
   - Status: Needs enhancement
   - Details: Replace electron-store with more robust storage system
   - Location: Current implementation in `/electron/src/services/PGPService.ts` lines 6-30
   - Priority: Medium

2. **Auto-updates**
   - Status: Not implemented
   - Details: No mechanism for application to update itself
   - Location: Referenced in `/development/todo.md` line 53
   - Priority: Medium

3. **Test Suite**
   - Status: Not implemented
   - Details: No automated testing for application functionality
   - Location: Referenced in `/development/todo.md` line 50
   - Priority: Medium

## Bug Fixes

1. **Stray Character in Mail Detail**
   - Status: Known bug
   - Details: Extraneous ">" character appears in mail detail
   - Location: Referenced in `/development/todo.md` line 208
   - Priority: Low

2. **TypeScript Errors**
   - Status: Known issue
   - Details: TypeScript errors related to YubiKey API
   - Location: `/src/components/mail/ComposeEmail.tsx` line 1 has "@ts-nocheck"
   - Priority: Medium

## Next Steps Implementation Plan

### Phase 1 - Critical Functionality (Next 2 weeks)
- Implement SMTP email sending
- Complete reply, forward, delete functionality
- Fix "Reply Securely" button implementation
- Implement public key server lookup integration

### Phase 2 - User Experience Improvements (2-4 weeks)
- Implement contact management with real data storage
- Complete header menu actions functionality
- Implement email threading
- Fix TypeScript errors

### Phase 3 - Advanced Features (4-8 weeks)
- Implement advanced YubiKey operations
- Add configuration storage improvements
- Implement auto-updates
- Add drag and drop for attachments
- Implement dark/light theme toggle

## Conclusion

This document tracks features that are present in the UI but need backend implementation or further development. It will be updated as features are completed or new requirements emerge.

Last updated: April 11, 2025