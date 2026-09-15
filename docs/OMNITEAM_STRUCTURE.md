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
├── OmniMeet (standalone hosted-meet software)
│   ├── Hosted meet setup
│   ├── Meet announcement and configuration
│   ├── Qualifying standards and entry rules
│   ├── Individual and team entry
│   ├── Event selection
│   ├── Entry fees and integrated payment
│   ├── Refunds and adjustments
│   └── Entry exports and reports
├── OmniVolunteer
│   ├── Volunteer jobs
│   ├── Shifts
│   ├── Family signups
│   ├── Hour requirements
│   └── Service-hour reporting
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

OmniTeam platform capabilities (included where needed; not standalone products)
├── Identity, tenancy, roles, and permissions
├── Subscriptions and module entitlements
├── Payments and fees
│   ├── Membership dues
│   ├── Meet and entry fees
│   ├── Invoices
│   ├── Payments, refunds, and adjustments
│   └── Financial reporting inputs
└── Audit and platform support
```

OmniTeam is the platform. OmniPay is no longer a customer module or standalone SKU; payment capabilities are shared platform infrastructure surfaced by the product that owns the charge. OmniMeet is standalone software for organizations hosting a meet. OmniSite can be purchased alone. Team-management capabilities can integrate with an existing external website, and integrations between purchased products activate only when relevant.

Current packaging direction, pending final pricing: **OmniSite** for website-only customers; **OmniTeam Manager** bundling OmniAthlete, OmniSchedule, OmniVolunteer, OmniConnect, and OmniInsights; **OmniMeet Host** for hosted-meet entry workflows; and a **Website + Team Management** bundle. Payment processing is included as a capability where a purchased workflow needs it rather than displayed as a separate product.

This file defines product ownership, not a required filesystem layout. Architecture and implementation findings live in `PRODUCT_STRUCTURE.md`.
