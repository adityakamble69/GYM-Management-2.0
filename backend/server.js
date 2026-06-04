require("dotenv").config();
const express            = require("express");
const cors               = require("cors");
const path               = require("path");
const db                 = require("./config/db");
const authRoutes         = require("./routes/authRoutes");
const memberRoutes       = require("./routes/memberRoutes");
const attendanceRoutes   = require("./routes/attendanceRoutes");
const trainerRoutes      = require("./routes/trainerRoutes");
const paymentRoutes      = require("./routes/paymentRoutes");
const equipmentRoutes    = require("./routes/equipmentRoutes");
const reportRoutes       = require("./routes/reportRoutes");
const dashboardRoutes    = require("./routes/dashboardRoutes");
const notifRoutes        = require("./routes/notificationRoutes");
const profileRoutes      = require("./routes/profileRoutes");
const inquiryRoutes      = require("./routes/inquiryRoutes");
const membershipPlanRoutes = require("./routes/membershipPlanRoutes");  // ← NEW

const app = express();

app.use(cors());
app.use(express.json());

// ── API Routes ────────────────────────────────────────────────────────────────
app.use("/api/auth",             authRoutes);
app.use("/api/members",          memberRoutes);
app.use("/api/attendance",       attendanceRoutes);
app.use("/api/trainers",         trainerRoutes);
app.use("/api/payments",         paymentRoutes);
app.use("/api/equipment",        equipmentRoutes);
app.use("/api/reports",          reportRoutes);
app.use("/api/dashboard",        dashboardRoutes);
app.use("/api/notifications",    notifRoutes);
app.use("/api/profile",          profileRoutes);
app.use("/api/inquiries",        inquiryRoutes);
app.use("/api/membership-plans", membershipPlanRoutes);                 // ← NEW

// ── Serve Public Inquiry Form ─────────────────────────────────────────────────
app.use("/inquiry", express.static(path.join(__dirname, "public/inquiry")));

app.get("/", (req, res) => res.send("GymPro API Running ⚡"));

app.listen(process.env.PORT, () =>
    console.log(`Server running on port ${process.env.PORT}`)
);