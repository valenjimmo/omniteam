# OmniTeam product structure

This is the canonical product and feature hierarchy provided by the owner. Edit this file when the product structure changes. Module and feature names here take precedence over names in the UI, README, or implementation notes.

```text
OmniTeam
├── OmniAthlete
│   ├── Swimmers
│   ├── Families
│   ├── Groups
│   ├── Attendance
│   ├── OmniSchedule
│   │   ├── Practices
│   │   ├── Pool schedules
│   │   ├── Team calendar
│   │   └── Events
│   ├── OmniVolunteer
│   │   ├── Volunteer jobs
│   │   ├── Shifts
│   │   ├── Family signups
│   │   ├── Hour requirements
│   │   └── Service-hour reporting
│   └── OmniConnect
│       ├── Announcements
│       ├── Email
│       ├── SMS
│       └── Notifications
├── OmniMeet (standalone hosted-meet software)
│   ├── Online meet registration
│   │   ├── Hosted meet setup, announcements, and configuration
│   │   ├── Qualifying standards and entry rules
│   │   ├── Individual and team entry and event selection
│   │   ├── Entry fees, integrated payment, refunds, and adjustments
│   │   └── Entry exports and reports
│   └── Standalone downloadable meet software
│       ├── Installed application for meet hosts
│       └── Integration to receive hosted-meet registration information
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

OmniTeam is the platform. OmniPay is no longer a customer module or standalone SKU; payment capabilities are shared platform infrastructure surfaced by the product that owns the charge. OmniMeet is standalone software for organizations hosting a meet. OmniMeet has two connected features: online registration modeled on the FastSwims meet-entry workflow, and standalone downloadable software that receives information from that registration. Both belong to OmniMeet; this does not define separate products or entitlements. Operating systems, transfer mechanism, and offline behavior remain unspecified. OmniSite can be purchased alone. Team-management capabilities can integrate with an existing external website, and integrations between purchased products activate only when relevant.

OmniSchedule, OmniVolunteer, and OmniConnect are integrated capability areas within OmniAthlete, not separate customer products. Their existing internal entitlement keys remain during the transition so deployed subscriptions and authorization continue to work safely.

Current packaging direction, pending final pricing: **OmniSite** for website-only customers; **OmniTeam Manager** bundling OmniAthlete and OmniInsights; **OmniMeet Host** for hosted-meet entry workflows; and a **Website + Team Management** bundle. Payment processing is included as a capability where a purchased workflow needs it rather than displayed as a separate product.

This file defines product ownership, not a required filesystem layout. Architecture and implementation findings live in `PRODUCT_STRUCTURE.md`.
