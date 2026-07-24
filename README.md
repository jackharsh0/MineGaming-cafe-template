<div align="center">
  <img src="https://img.shields.io/badge/PHP-777BB4?style=for-the-badge&logo=php&logoColor=white" alt="PHP">
  <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js">
  <img src="https://img.shields.io/badge/MySQL-4479A1?style=for-the-badge&logo=mysql&logoColor=white" alt="MySQL">
  <img src="https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white" alt="Express">
  <img src="https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind CSS">
</div>

<br>

<div align="center">
  <h1>🎮 Soleila — Gaming Lounge Management System</h1>
  <p><strong>All-in-one platform for gaming lounges, LAN centers, and e-sport cafes.</strong></p>
  <p>Track stations · Manage sessions · POS billing · Player loyalty · WhatsApp receipts</p>

  <p>
    <a href="#features">Features</a> •
    <a href="#demo">Demo</a> •
    <a href="#quick-start">Quick Start</a> •
    <a href="#screenshots">Screenshots</a> •
    <a href="#tech-stack">Tech Stack</a>
  </p>

  <br>

  <p>
    <img src="https://img.shields.io/github/license/jackharsh0/gaming-zone?style=flat-square" alt="License">
    <img src="https://img.shields.io/github/last-commit/jackharsh0/gaming-zone?style=flat-square" alt="Last Commit">
    <img src="https://img.shields.io/github/repo-size/jackharsh0/gaming-zone?style=flat-square" alt="Repo Size">
    <img src="https://img.shields.io/github/stars/jackharsh0/gaming-zone?style=flat-square" alt="Stars">
  </p>
</div>

---

## <span id="features">✨ Features</span>

<table>
<tr>
<td width="50%">

### 🖥️ Station Management
- Live station status board (Available / Occupied / Maintenance)
- Real-time seat occupancy tracking
- Station type filters (PS5, PS4, Xbox, PC, Pool, Dining)
- Interactive drag-and-drop station grid

### ⏱️ Session Tracking
- Start / Pause / Stop / Transfer sessions
- Prepaid & postpaid billing modes
- Auto-lock when prepaid time expires
- Bill splitting across consoles and dining tables
- Play hours wallet system

### 🧾 POS & Billing
- Point-of-sale with inventory management
- Coupon codes & discount support
- Tax/GST configuration
- Multiple payment methods (Cash, Play Hours, Card, Split)
- Itemized digital receipts

</td>
<td width="50%">

### 👥 Player Management
- Membership registration & loyalty program
- Bronze / Silver / Gold tier discounts
- Play hours tracking
- Session history & cafe purchase logs
- Player blacklisting

### 📞 WhatsApp Integration
- Automated digital billing via WhatsApp Web
- Queue-based anti-ban delivery system
- Message pacing controls
- Live chat messenger

### 📊 Revenue Analytics
- Daily / Weekly / Monthly revenue metrics
- 14-day revenue trend chart
- Peak hour heatmap
- Low stock inventory alerts
- Shift logs & audit trails

### 📅 Bookings & Appointments
- Public booking form on landing page
- Admin appointment scheduler
- Double-booking conflict detection
- WhatsApp booking notifications

</td>
</tr>
</table>

## <span id="tech-stack">🔧 Tech Stack</span>

| Layer | Technology |
|-------|-----------|
| **Frontend** | PHP, Tailwind CSS, Vanilla JavaScript, Flatpickr |
| **Backend** | Node.js, Express.js, REST API |
| **Database** | MySQL / MariaDB |
| **Realtime** | Server-Sent Events (SSE) for live updates |
| **Messaging** | whatsapp-web.js for automated billing |
| **Payments** | PhonePe gateway integration |
| **Auth** | JWT tokens with role-based access control |

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
cp .env.example .env
# Edit .env with your database credentials
npm install
npm start
```

### 3. Frontend
```bash
php -S localhost:1000
```

Open **http://localhost:1000** — the frontend auto-detects the backend.

### Default Logins (development only)
| Role | Username | Password |
|------|----------|----------|
| SuperAdmin | `admin` | `admin123` |
| Manager | `manager` | `manager123` |
| Attendant | `attendant` | `attendant123` |
| Customer | Register via login page | — |

> Quick-login buttons appear automatically when running on localhost.

## <span id="environment">🔐 Environment Variables</span>

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8000` | Backend server port |
| `DB_HOST` | `127.0.0.1` | MySQL host |
| `DB_PORT` | `3306` | MySQL port |
| `DB_USER` | `root` | MySQL user |
| `DB_PASS` | — | MySQL password |
| `DB_NAME` | `gaming_zone` | Database name |
| `JWT_SECRET` | — | JWT signing secret |
| `CORS_ORIGIN` | `http://localhost:1000` | Frontend URL |
| `TAX_PERCENT` | `10.00` | Default tax rate |

## <span id="directory">📁 Directory Structure</span>

```
├── index.php                 # Public landing page
├── config.php                # Frontend settings
├── pages/                    # Admin & customer dashboards
│   ├── dashboard.php         # Operator dashboard
│   ├── customer_dashboard.php# Player portal
│   ├── billing.php           # Pricing & billing config
│   ├── revenue.php           # Revenue analytics
│   ├── sessions.php          # Live session management
│   ├── stations.php          # Station CRUD
│   ├── players.php           # Player management
│   ├── pos.php               # Point of sale
│   ├── appointments.php      # Booking scheduler
│   ├── settings.php          # System settings
│   ├── whatsapp.php          # WhatsApp dashboard
│   ├── staff.php             # Audit logs
│   ├── food_tables.php       # Food table management
│   └── manage_users.php      # Staff accounts
├── js/                       # Frontend scripts
├── css/                      # Stylesheets
├── database/
│   └── schema.sql            # Database schema
└── backend/
    ├── server.js             # Express entry point
    ├── routes/               # API routes
    ├── middleware/            # Auth & validation
    ├── utils/                # Helpers & WhatsApp
    └── config/               # DB & app config
```

## <span id="screenshots">📸 Screenshots</span>

> *(Add screenshots of your deployment here)*

| Dashboard | Station Grid | POS |
|-----------|-------------|-----|
| ![](https://via.placeholder.com/400x250?text=Dashboard) | ![](https://via.placeholder.com/400x250?text=Stations) | ![](https://via.placeholder.com/400x250?text=POS) |

## 🤝 Contributing

Contributions are welcome! Please open an issue first to discuss changes.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

MIT — see [LICENSE](LICENSE) for details.

---

<div align="center">
  <p>Built for gaming lounge operators, by operators.</p>
  <p>
    <a href="https://github.com/jackharsh0/gaming-zone/issues">Report Bug</a> •
    <a href="https://github.com/jackharsh0/gaming-zone/issues">Request Feature</a>
  </p>
</div>
