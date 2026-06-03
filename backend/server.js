require("dotenv").config();
const express          = require("express");
const cors             = require("cors");
const db               = require("./config/db");
const authRoutes       = require("./routes/authRoutes");
const memberRoutes     = require("./routes/memberRoutes");
const attendanceRoutes = require("./routes/attendanceRoutes");
const trainerRoutes    = require("./routes/trainerRoutes");
const paymentRoutes    = require("./routes/paymentRoutes");
const equipmentRoutes  = require("./routes/equipmentRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const profileRoutes    = require("./routes/profileRoutes");
const reportRoutes     = require("./routes/reportRoutes");

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/auth",          authRoutes);
app.use("/api/members",       memberRoutes);
app.use("/api/attendance",    attendanceRoutes);
app.use("/api/trainers",      trainerRoutes);
app.use("/api/payments",      paymentRoutes);
app.use("/api/equipment",     equipmentRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/profile",       profileRoutes);
app.use("/api/reports",       reportRoutes);

app.get("/", (req, res) => res.send("GymPro API Running ⚡"));

app.listen(process.env.PORT || 5000, () =>
  console.log(`Server running on port ${process.env.PORT || 5000}`)
);