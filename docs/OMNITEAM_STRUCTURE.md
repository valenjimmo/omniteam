# OmniTeam product structure

This is the canonical product and feature hierarchy provided by the owner. Edit this file when the product structure changes. Module and feature names here take precedence over names in the UI, README, or implementation notes.

```text
OmniTeam
├── OmniAthlete
│   ├── Swimmers
│   ├── Families
│   ├── Groups
│   └── Attendance
├── OmniSchedule
│   ├── Practices
│   ├── Pool schedules
│   ├── Team calendar
│   └── Events
├── OmniMeet
│   ├── Meet calendar
│   ├── Meet registration
│   ├── Event selection
│   ├── Entry fees
│   └── Meet entries
├── OmniVolunteer
│   ├── Volunteer jobs
│   ├── Shifts
│   ├── Family signups
│   ├── Hour requirements
│   └── Service-hour reporting
├── OmniPay
│   ├── Membership dues
│   ├── Meet fees
│   ├── Invoices
│   ├── Payments
│   └── Financial reports
├── OmniConnect
│   ├── Announcements
│   ├── Email
│   ├── SMS
│   └── Notifications
├── OmniSite
│   ├── Team website
│   ├── Templates
│   ├── Page builder
│   ├── News
│   ├── Events
│   └── Custom domain
└── OmniInsights
    ├── Membership
    ├── Financial
    ├── Meet
    ├── Volunteer
    └── Operational analytics
```

OmniTeam is the platform. Swim teams may purchase modules individually or as bundles. Each purchased module should remain usable on its own; integrations between modules should activate when the relevant modules are available.

This file defines product ownership, not a required filesystem layout. Architecture and implementation findings live in `PRODUCT_STRUCTURE.md`.
