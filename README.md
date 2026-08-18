# 🏥 MediCare+ | Modern MERN Healthcare Solution

<p align="center">
  <img src="https://img.shields.io/badge/Stack-MERN-green?style=for-the-badge&logo=mongodb" alt="MERN Stack" />
  <img src="https://img.shields.io/badge/Auth-Clerk-6C47FF?style=for-the-badge&logo=clerk" alt="Clerk Auth" />
  <img src="https://img.shields.io/badge/Payments-Stripe-008CDD?style=for-the-badge&logo=stripe" alt="Stripe" />
  <img src="https://img.shields.io/badge/Deployment-Vercel-000000?style=for-the-badge&logo=vercel" alt="Vercel" />
</p>

**MediCare+** is an end-to-end hospital management platform designed to streamline doctor consultations, medical service bookings, online payments, and administrative workflows.

---

## 🌐 Live Deployments

| Component | Platform | Live URL |
| :--- | :--- | :--- |
| **User Application** | Vercel | [hospital-management-system-frontend-lemon.vercel.app](https://hospital-management-system-frontend-lemon.vercel.app/) |
| **Admin Panel** | Vercel | [hospital-management-system-admin-six.vercel.app](https://hospital-management-system-admin-six.vercel.app/) |
| **Backend API** | Vercel | [hospital-management-system-alpha-lime.vercel.app](https://hospital-management-system-alpha-lime.vercel.app/) |

---

## 🎨 Application Screenshots & System Layout

### 👤 Patient Portal
> Complete booking experience with certified specialists, 24/7 availability checking, and instant appointment confirmation.

* **Home Navigation:** Direct links to Doctors, Services, My Appointments, and Contact.
* **Smart Search:** Find specialists by medical field or availability.
* **Instant Checkout:** Pay for consultations online securely via Stripe.

---

### 🛡️ Admin Control Panel
> Centralized management dashboard for hospital operations, doctor scheduling, and service analytics.

* **Key Metrics:** Overview of total appointments, patients, and financial records.
* **Doctor Management:** Add new specialists, toggle availability, and set fee structures.
* **Services Portal:** Manage lab tests (e.g., Blood Sugar, ECG, Diagnostics) and service appointments.

---

## ✨ Full Feature Comparison

| Feature | User App | Admin Panel |
| :--- | :---: | :---: |
| Account Creation & Authentication (Clerk) | ✅ | ✅ |
| Book Doctor Consultations | ✅ | ❌ |
| Book Medical Diagnostic Services | ✅ | ❌ |
| Online Stripe Payment Checkout | ✅ | ❌ |
| View Personal Appointment History | ✅ | ❌ |
| Add / Remove Doctor Profiles | ❌ | ✅ |
| Add / Remove Hospital Services | ❌ | ✅ |
| Manage System Appointments & Statuses | ❌ | ✅ |
| System Performance & Analytics Dashboard | ❌ | ✅ |

---

## 🛠️ Technology Stack

* **Frontend Framework:** React.js + Vite
* **Styling & UI:** Tailwind CSS, Lucide React Icons, Framer Motion
* **Authentication:** `@clerk/clerk-react` & `@clerk/express`
* **Backend:** Node.js, Express.js
* **Database:** MongoDB Atlas (Mongoose)
* **Payment Processing:** Stripe Node SDK
* **Hosting & CDN:** Vercel

---

## 📁 Repository Structure

```text
├── backend/
│   ├── config/              # MongoDB connection & Stripe configuration
│   ├── controllers/         # Logic for Appointments, Doctors, and Services
│   ├── models/              # Mongoose database schemas
│   ├── routes/              # Express API route endpoints
│   └── server.js            # Main Express application entry
│
├── frontend/                # Patient Web Application (React + Vite)
│   ├── src/
│   │   ├── components/      # UI Header, Footer, Hero, Modals
│   │   ├── pages/           # Home, Doctors, Services, Appointments
│   │   └── App.jsx          # React Router setup
│   └── vercel.json          # Vercel SPA route rewrite rules
│
└── admin/                   # Admin Dashboard Application (React + Vite)
    ├── src/
    │   ├── components/      # Sidebar, Navbar, Stat Cards
    │   └── pages/           # Dashboard, AddDoctor, ServiceDashboard
    └── vercel.json          # Vercel SPA route rewrite rules
