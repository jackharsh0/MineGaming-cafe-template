<div align="center">
  <img src="https://img.shields.io/badge/PHP-777BB4?style=for-the-badge&logo=php&logoColor=white" alt="PHP">
  <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js">
  <img src="https://img.shields.io/badge/MySQL-4479A1?style=for-the-badge&logo=mysql&logoColor=white" alt="MySQL">
  <img src="https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white" alt="Express">
  <img src="https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind CSS">
  <img src="https://img.shields.io/badge/WhatsApp-25D366?style=for-the-badge&logo=whatsapp&logoColor=white" alt="WhatsApp">
</div>

<br>

<div align="center">
  <h1>🎮 MineGaming — Gaming Cafe Management Template</h1>
  <p><strong>Everything you need to run a gaming lounge, LAN center, or e-sport cafe.</strong></p>
  <p>Station tracking · Session timers · POS billing · Player loyalty · WhatsApp receipts · Revenue analytics · 70+ customizable settings</p>

  <p>
    <a href="#features">Features</a> •
    <a href="#admin-modules">Admin Panels</a> •
    <a href="#settings">Customization</a> •
    <a href="#quick-start">Quick Start</a> •
    <a href="#tech-stack">Tech Stack</a>
  </p>

  <br>

  <p>
    <img src="https://img.shields.io/github/license/jackharsh0/gaming-zone?style=flat-square" alt="License">
    <img src="https://img.shields.io/github/last-commit/jackharsh0/gaming-zone?style=flat-square" alt="Last Commit">
    <img src="https://img.shields.io/github/repo-size/jackharsh0/gaming-zone?style=flat-square" alt="Repo Size">
    <img src="https://img.shields.io/github/stars/jackharsh0/gaming-zone?style=flat-square" alt="Stars">
    <img src="https://img.shields.io/badge/PRs-welcome-brightgreen?style=flat-square" alt="PRs Welcome">
  </p>
</div>

---

## <span id="features">✨ Feature Overview</span>

<table>
<tr>
<td width="33%">

### 🖥️ Station Management
- Live status board — Available / Occupied / Maintenance
- Real-time occupancy tracking & SSE auto-refresh
- Filter by type: PS5, PS4, Xbox, PC, Pool, VR, Dining
- Naming patterns, display name overrides, drag-and-drop grid
- Station CRUD with soft delete

</td>
<td width="33%">

### ⏱️ Session & Gameplay
- Start / Pause / Resume / Stop / Transfer sessions
- Prepaid & postpaid billing with auto-lock
- Bill splitting across consoles and dining tables
- Play hours wallet system for cashless play
- Grace period, warnings, max duration caps

</td>
<td width="33%">

### 🧾 POS & Billing
- Full point-of-sale with category management
- Inventory tracking & low-stock alerts
- Coupon codes with discount % or flat amount
- Tax label & rate config (GST, VAT, HST, IVA)
- Service charge, rounding mode, decimal places

</td>
</tr>
<tr>
<td width="33%">

### 👥 Players & Loyalty
- Membership with Bronze / Silver / Gold tiers
- Auto-earn points per play hour & per ₹ spent
- Tier threshold customization
- Session history & cafe purchase logs
- Player blacklisting & notes

</td>
<td width="33%">

### 📞 WhatsApp Integration
- Automated digital billing via WhatsApp Web
- Queue-based anti-ban delivery with pacing
- Live chat messenger connected to WhatsApp
- Send PDF invoices & text receipts
- Booking notifications & staff alerts

</td>
<td width="33%">

### 📊 Revenue Analytics
- Daily / Weekly / Monthly revenue metrics
- 14-day revenue trend chart (Chart.js)
- Peak hour heatmap for staffing insights
- Shift logs with cash-in-drawer tracking
- Itemized receipt viewer

</td>
</tr>
<tr>
<td width="33%">

### 📅 Bookings & Appointments
- Public booking form on landing page
- Admin appointment scheduler with conflict detection
- Auto-confirm toggle, deposit %, cancel window
- Max days advance & min notice hours
- Guest count limits per booking

</td>
<td width="33%">

### 🔐 Security & Access
- Role-based access (SuperAdmin / Manager / Attendant)
- Session timeout, max login attempts
- Maintenance IP whitelist
- Maintenance mode with custom message
- Data retention policies & auto-backup

</td>
<td width="33%">

### 🎨 Brand Customization
- 70+ settings across 10 admin tabs
- Color pickers, font selection, logo upload
- Custom favicon, invoice prefix, receipt footer
- Social media links, announcement banner
- Custom footer HTML, cookie consent bar

</td>
</tr>
</table>

---

## <span id="admin-modules">📋 Admin Modules</span>

| Module | File | What it does |
|--------|------|-------------|
| **Seating Status** | `dashboard.php` | Live station grid, session management, food ordering |
| **Live Sessions** | `sessions.php` | Active session list, pause/resume/extend/transfer/checkout |
| **Station Config** | `stations.php` | CRUD for stations, batch create, maintenance mode |
| **Billing & Rates** | `billing.php` | Hourly rates per station type, coupons, type visibility |
| **Point of Sale** | `pos.php` | Cafe POS with categories, inventory, cart, checkout |
| **Food Tables** | `food_tables.php` | Dining table management, merge sessions |
| **Player Roster** | `players.php` | Player search, loyalty, play hours, blacklist |
| **Appointments** | `appointments.php` | Booking scheduler with drag-and-drop |
| **Revenue Analytics** | `revenue.php` | Daily/weekly/monthly metrics, charts, heatmap |
| **WhatsApp Dashboard** | `whatsapp.php` | QR connect, anti-ban queue, live messenger |
| **System Settings** | `settings.php` | 10-tab settings panel — see below |
| **Staff Accounts** | `manage_users.php` | User CRUD with role assignment |
| **Security Logs** | `staff.php` | Audit trails, database backup & download |

---

## <span id="settings">⚙️ 10 Settings Tabs — 70+ Customizable Options</span>

Every aspect of the business can be configured from a single settings dashboard — no code editing required.

<details>
<summary><strong>🏪 Brand</strong> — Business info, colors, fonts, logo</summary>

| Setting | Description |
|---------|-------------|
| Business Name, Tagline, Address | Public-facing identity |
| Phone, Email, Year Est. | Contact details |
| Currency Symbol, Invoice Prefix | Billing format |
| Primary / Secondary Color | Dashboard & site accent colors |
| Font Family | Inter, Poppins, Roboto, Montserrat + more |
| Logo Upload (PNG/JPG) | Brand logo everywhere |
| Favicon URL | Browser tab icon |
| Receipt Footer, Copyright | Legal text |
| WhatsApp Phone, Cover Image | Contact & receipts |

</details>

<details>
<summary><strong>🌐 Website</strong> — Hero, sections, social links, opening hours</summary>

| Setting | Description |
|---------|-------------|
| Hero Title, Subtitle, About Text | Landing page content |
| Fuel Bar / Cafe Description | Menu section text |
| Theme Mode | Dark / Light / Auto |
| Hero Video URL, Overlay Opacity | Background media |
| Contact Form Email | Inquiry destination |
| Announcement Banner + Toggle | Top bar promos |
| Cookie Consent Banner | GDPR compliance |
| Social Links (IG, FB, X, YT) | Footer icons |
| Section Visibility | Toggle Hero, Live Status, Pricing, Booking, Loyalty, Cafe |
| Opening Hours | Per-day open/close times |
| Loyalty Tier Descriptions | Bronze/Silver/Gold text |
| Default Food Items | Quick-order modal items |
| Show Live Status / Pricing | Per-section visibility |
| Custom Footer HTML | Scripts or embed code |

</details>

<details>
<summary><strong>🖥️ Stations</strong> — Naming, behavior, refresh rate</summary>

| Setting | Description |
|---------|-------------|
| Display Name Overrides | Per-type public labels |
| Naming Pattern | e.g. `{type}-{n:02d}` |
| Default Hourly Rate (₹) | Fallback rate |
| Min Billing Minutes | Minimum charge |
| Rounding Interval (min) | Billable time rounding |
| Occupancy Refresh (seconds) | SSE push frequency |
| Auto-lock Toggle | Prepaid auto-complete |

</details>

<details>
<summary><strong>💰 Billing</strong> — Tax, currency, rounding, discounts</summary>

| Setting | Description |
|---------|-------------|
| Tax Label | GST / VAT / Sales Tax / IVA / HST |
| Currency Position | Before (₹100) or After (100 ₹) |
| Decimal Places | 0 or 2 |
| Rounding Mode | Nearest / Up / Down |
| Service Charge % | Optional fee on all bills |
| Max Discount % | Cap on manual discount |
| Tax-Inclusive Pricing | Toggle |
| Min Cafe Order (₹) | Delivery threshold |
| Invoice Due Days | Credit/tab period |

</details>

<details>
<summary><strong>🔔 Notifications</strong> — Sounds, Slack, email, SMS</summary>

| Setting | Description |
|---------|-------------|
| Sound Effects | Enable/disable all sounds |
| Checkout Bell | Audible alert on payment |
| Timer End Sound URL | Custom MP3 for expiry |
| Slack Webhook URL | Low-stock & alert channel |
| Daily Report Email | End-of-day summary |
| SMS API Key | Booking confirmations |

</details>

<details>
<summary><strong>🛡️ Security</strong> — Timeouts, lockouts, IP whitelist</summary>

| Setting | Description |
|---------|-------------|
| Session Timeout (min) | Auto-logout idle users |
| Max Login Attempts | Lockout threshold |
| Maintenance IP Whitelist | Bypass during downtime |

</details>

<details>
<summary><strong>🧾 Receipt</strong> — Print layout, logo, auto-print</summary>

| Setting | Description |
|---------|-------------|
| Show Logo on Receipts | Brand in header |
| Show Tax Breakdown | Line-item visibility |
| Auto-print Dialog | Open on checkout |
| Custom Footer Message | Thank-you note |

</details>

<details>
<summary><strong>📅 Bookings</strong> — Auto-confirm, deposits, limits</summary>

| Setting | Description |
|---------|-------------|
| Auto-confirm Minutes | 0 = manual review |
| Max Days Advance | Booking horizon |
| Min Notice Hours | Last-minute cutoff |
| Deposit Required % | Prepayment % |
| Free Cancel Window (hrs) | Full refund period |
| Max Guests Per Booking | Group size cap |
| Staff Notify on Booking | Toggle alert |

</details>

<details>
<summary><strong>⏱️ Sessions</strong> — Duration, grace period, features</summary>

| Setting | Description |
|---------|-------------|
| Default Session Type | Prepaid / Postpaid |
| Max Duration Hours | 0 = unlimited |
| Grace Period Minutes | Time before auto-lock |
| Warning Before End (min) | Player alert |
| Allow Pause / Transfer | Feature toggles |
| Min Postpaid Minutes | Floor charge |
| Extra Controller Rate | Add-on pricing |

</details>

<details>
<summary><strong>👥 Players</strong> — Auto-register, loyalty points, tiers</summary>

| Setting | Description |
|---------|-------------|
| Auto-register on Phone | First-time creation |
| Points Per Play Hour | Earning rate |
| Points Per ₹ Spent | Cafe purchase rate |
| Bronze / Silver / Gold Thresholds | Tier unlock levels |
| Tier Descriptions | Custom per-tier text |

</details>

<details>
<summary><strong>⚙️ System</strong> — SEO, timezone, backup, maintenance</summary>

| Setting | Description |
|---------|-------------|
| Page Title, Meta Description | SEO tags |
| OG Image URL | Social share preview |
| Timezone, Date/Time Format | Regional display |
| Data Retention (days) | Log auto-purge |
| Backup Time | Scheduled hour |
| Auto-backup Toggle | Daily dump |
| Maintenance Mode + Message | Offline notice |

</details>

---

## <span id="tech-stack">🔧 Tech Stack</span>

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | PHP 8+, Tailwind CSS, Vanilla JS | Dashboards & public site |
| **Backend API** | Node.js, Express.js | REST endpoints |
| **Database** | MySQL / MariaDB | All persistent data |
| **Realtime** | Server-Sent Events (SSE) | Live station/session updates |
| **Messaging** | whatsapp-web.js | Automated billing via WhatsApp |
| **Payments** | PhonePe Gateway | UPI payments |
| **Auth** | JWT + bcrypt | Role-based access control |
| **Scheduling** | Flatpickr | DateTime pickers |
| **Charts** | Chart.js | Revenue graphs & heatmaps |

---

## <span id="quick-start">🚀 Quick Start</span>

### Prerequisites
- PHP 8.0+
- Node.js 18+
- MySQL 8.0+
- npm

### 1. Database
```bash
mysql -u root -p -e "CREATE DATABASE gaming_zone"
mysql -u root -p gaming_zone < database/schema.sql
```

### 2. Backend
```bash
cd backend
cp .env.example .env     # Edit with your DB credentials
npm install
npm start                # Runs on port 8000
```

### 3. Frontend
```bash
php -S localhost:1000
```

Open **http://localhost:1000** — the frontend auto-detects the backend URL.

### Default Dev Logins
| Role | Username | Password |
|------|----------|----------|
| SuperAdmin | `admin` | `admin123` |
| Manager | `manager` | `manager123` |
| Attendant | `attendant` | `attendant123` |
| Customer | Register on login page | — |

> Quick-login buttons appear automatically on localhost. Change the business name in Settings → Brand.

---

## <span id="environment">🔐 Environment Variables</span>

| Variable | Default | Required | Description |
|----------|---------|----------|-------------|
| `PORT` | `8000` | No | Backend server port |
| `DB_HOST` | `127.0.0.1` | No | MySQL host |
| `DB_PORT` | `3306` | No | MySQL port |
| `DB_USER` | `root` | No | MySQL user |
| `DB_PASS` | — | **Yes** | MySQL password |
| `DB_NAME` | `gaming_zone` | No | Database name |
| `JWT_SECRET` | — | **Yes** | JWT signing secret |
| `CORS_ORIGIN` | `http://localhost:1000` | No | Frontend URL for CORS |
| `TAX_PERCENT` | `10.00` | No | Default tax rate |

---

## <span id="directory">📁 Directory Structure</span>

```
├── index.php                    # Public landing page
├── config.php                   # Smart frontend config (auto-detects backend URL)
├── pages/                       # Admin & customer panels (13 modules)
│   ├── dashboard.php            # Seating status & session controls
│   ├── sessions.php             # Live session management
│   ├── stations.php             # Station CRUD & maintenance
│   ├── billing.php              # Pricing rules, coupons, type visibility
│   ├── pos.php                  # Point of sale, categories, inventory
│   ├── appointments.php         # Booking scheduler
│   ├── revenue.php              # Revenue analytics & charts
│   ├── players.php              # Player management & loyalty
│   ├── food_tables.php          # Dining table management
│   ├── settings.php             # 10-tab system settings (70+ options)
│   ├── whatsapp.php             # WhatsApp connection & messaging
│   ├── staff.php                # Audit logs & database backup
│   └── manage_users.php         # Staff account management
├── js/                          # 15 frontend JavaScript modules
├── css/                         # Tailwind-based stylesheet
├── database/
│   └── schema.sql               # Complete database schema
└── backend/
    ├── server.js                # Express entry with auto-migrations
    ├── routes/                  # 15 API route modules
    ├── middleware/               # JWT auth, validation, role guards
    ├── utils/                   # Helper utilities, WhatsApp client
    └── config/                  # Database pool, app settings
```

---

## 🤝 Contributing

Contributions are welcome! Open an issue first to discuss changes.

1. Fork the repo
2. Create your branch (`git checkout -b feature/amazing-feature`)
3. Commit (`git commit -m 'Add amazing feature'`)
4. Push (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

<div align="center">
  <h3>⭐ Star this repo if you find it useful</h3>
  <p>Built for gaming lounge operators, by operators.</p>
  <p>
    <a href="https://github.com/jackharsh0/gaming-zone/issues">Report Bug</a> •
    <a href="https://github.com/jackharsh0/gaming-zone/issues">Request Feature</a> •
    <a href="https://github.com/jackharsh0/gaming-zone">GitHub</a>
  </p>
  <br>
  <p>
    <img src="https://img.shields.io/github/license/jackharsh0/gaming-zone?style=flat-square" alt="MIT">
    <img src="https://img.shields.io/github/last-commit/jackharsh0/gaming-zone?style=flat-square" alt="Last Commit">
    <img src="https://img.shields.io/github/repo-size/jackharsh0/gaming-zone?style=flat-square" alt="Size">
  </p>
</div>
