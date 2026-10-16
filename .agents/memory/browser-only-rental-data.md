---
name: Browser-only rental data
description: The product's storage and sync boundary for the rental ledger.
---

Rental records stay in browser storage. Do not add a server API or cross-device/user sync unless the user changes this scope.

**Why:** The user chose browser-only storage when deciding how the rental workflows should work after removing the Express API.

**How to apply:** Keep rental data features local to the browser, and make device/profile isolation clear when discussing persistence, backup, or recovery.
