# 🏋️ Gym Management System

A full-stack Gym Management System built using React.js, Node.js, Express.js, and MySQL. This system helps gym administrators manage members, trainers, memberships, attendance, payments, equipment, reports, and analytics from a centralized dashboard.

---

## 🚀 Features

### 🔐 Authentication & Security

* Admin Login
* Secure Authentication
* JWT Authentication (Planned)
* Password Hashing with bcrypt (Planned)
* Protected Routes (Planned)
* Role-Based Access Control (Planned)
* Forgot Password (Planned)

---

### 📊 Dashboard

* Total Members Count
* Active Memberships
* Expired Memberships
* Today's Attendance
* Monthly Revenue Overview
* Trainer Performance Summary
* New Registrations
* Notifications & Alerts

---

### 👥 Member Management

* Add Member
* Edit Member
* Delete Member
* Search Members
* Member Profile Management
* Membership Expiry Tracking

---

### 💪 Trainer Management

* Add Trainer
* Edit Trainer
* Delete Trainer
* Trainer Assignment
* Trainer Performance Monitoring
* Salary Tracking

---

### 📋 Membership Plans

* Create Membership Plans
* Update Membership Plans
* Delete Membership Plans
* Monthly Plans
* Quarterly Plans
* Yearly Plans

---

### ✅ Attendance Management

* Daily Attendance Tracking
* Check-In / Check-Out
* Attendance History
* Attendance Reports

---

### 💳 Payment & Billing System

* Membership Payments
* Payment Tracking
* Pending Payment Alerts
* Invoice Generation (Planned)
* Receipt Download (Planned)

---

### ⚙️ Equipment Management

* Equipment Inventory
* Equipment Status Tracking
* Maintenance Records
* Repair Management

---

### 🔔 Notifications System

* Membership Expiry Alerts
* Payment Due Notifications
* Equipment Maintenance Alerts
* Dashboard Notifications

---

### 📈 Reports & Analytics

* Revenue Reports
* Attendance Reports
* Membership Reports
* Trainer Reports
* Interactive Charts & Graphs

---

## 🛠️ Tech Stack

### Frontend

* React.js
* Vite
* Axios
* React Icons
* React Router DOM

### Backend

* Node.js
* Express.js

### Database

* MySQL

### Tools

* VS Code
* MySQL Workbench
* Git
* GitHub
* Postman

---

## 📂 Project Structure

```bash
GymManagementSystem

├── backend
│
│   ├── config
│   │   └── db.js
│
│   ├── routes
│   │   └── authRoutes.js
│
│   ├── controllers
│   ├── middleware
│
│   ├── .env
│   ├── server.js
│   └── package.json
│
└── frontend
    │
    ├── src
    │
    ├── components
    │   └── Sidebar.jsx
    │
    ├── pages
    │   ├── Login.jsx
    │   └── Dashboard.jsx
    │
    ├── services
    │   └── api.js
    │
    ├── App.jsx
    └── main.jsx
```

---

## 🗄️ Database Schema

### Admins

```sql
admins
```

### Members

```sql
members
```

### Trainers

```sql
trainers
```

### Upcoming Tables

```sql
membership_plans
attendance
payments
equipment
notifications
reports
classes
```

---

## ⚡ Installation

### Clone Repository

```bash
git clone https://github.com/yourusername/gym-management-system.git
```

### Backend Setup

```bash
cd backend

npm install

node server.js
```

### Frontend Setup

```bash
cd frontend

npm install

npm run dev
```

---

## 🔑 Environment Variables

Create a `.env` file inside the backend folder.

```env
PORT=5000

DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=gym_management

JWT_SECRET=YourSecretKey
```

---

## 🌐 API Endpoints

### Authentication

```http
POST /api/auth/login
```

### Upcoming APIs

```http
GET /api/members
POST /api/members
PUT /api/members/:id
DELETE /api/members/:id

GET /api/trainers
POST /api/trainers

GET /api/payments
POST /api/payments

GET /api/attendance
POST /api/attendance
```

---

## 🔒 Security Features

### Implemented

* Admin Authentication
* MySQL Validation

### Planned

* JWT Tokens
* Password Hashing (bcrypt)
* Role-Based Access Control
* Protected Routes
* Session Management
* Email OTP Verification

---

## 📅 Development Roadmap

### Phase 1 ✅

* Database Setup
* Backend Setup
* MySQL Connection
* React Setup
* Login System
* Dashboard UI

### Phase 2 🚧

* Member Management CRUD
* Trainer Management CRUD
* Membership Plans

### Phase 3

* Attendance System
* Payment & Billing

### Phase 4

* Equipment Management
* Notifications

### Phase 5

* Reports & Analytics

### Phase 6

* JWT Authentication
* Role-Based Access

### Phase 7

* Deployment

---

## 🎯 Future Enhancements

* QR Code Attendance
* Member Portal
* Trainer Portal
* Diet Plan Management
* Workout Plan Management
* Invoice PDF Generation
* Excel Export
* Cloud Deployment
* Mobile Responsive Design
* Dark/Light Theme

---

## 👨‍💻 Author

Developed as a Full Stack Gym Management System Project using React.js, Node.js, Express.js, and MySQL.

---

## 📄 License

This project is developed for educational, portfolio, and learning purposes.
