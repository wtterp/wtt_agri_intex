# Spanish Language

This build adds English / Spanish switching to the existing latest WTT Exhibition project without restoring removed features.

- Language selector is in the header.
- Selection is stored in browser localStorage under `wtt_exhibition_language`.
- Spanish translates static UI, form labels, options, validation messages, scan messages, and sync-status messages.
- Submission payload values remain canonical English values so Google Sheets/WhatsApp integrations are unchanged.
- The current project remains the source of truth; removed features are not restored.
- Localhost does not use the service worker; production does.
