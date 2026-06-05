const express   = require("express");
const router    = express.Router();
const db        = require("../config/db");
const { verifyToken, requireRole } = require("../middleware/authMiddleware");

// ── Safe email import (won't crash if files missing) ─────────────────────────
let sendEmail, welcomeEmail;
try {
  sendEmail    = require("../utils/sendEmail");
  welcomeEmail = require("../utils/emailTemplates").welcomeEmail;
} catch (e) {
  console.warn("⚠️  Email utils not found — emails disabled:", e.message);
  sendEmail    = async () => ({ success: false, error: "Email not configured" });
  welcomeEmail = () => ({});
}

// ── GET all members (search + pagination) ─────────────────────────────────────
router.get("/", verifyToken, (req, res) => {
  const page   = parseInt(req.query.page)   || 1;
  const limit  = parseInt(req.query.limit)  || 10;
  const search = req.query.search           || "";
  const offset = (page - 1) * limit;
  const q      = `%${search}%`;

  db.query(
    "SELECT COUNT(*) AS total FROM members WHERE full_name LIKE ? OR email LIKE ? OR phone LIKE ? OR membership_type LIKE ?",
    [q, q, q, q],
    (err, countRes) => {
      if (err) {
        console.error("GET members count error:", err.message);
        return res.status(500).json({ success: false, message: "DB Error: " + err.message });
      }
      const total = countRes[0].total;
      db.query(
        "SELECT * FROM members WHERE full_name LIKE ? OR email LIKE ? OR phone LIKE ? OR membership_type LIKE ? ORDER BY created_at DESC LIMIT ? OFFSET ?",
        [q, q, q, q, limit, offset],
        (err, rows) => {
          if (err) {
            console.error("GET members fetch error:", err.message);
            return res.status(500).json({ success: false, message: "DB Error: " + err.message });
          }
          res.json({
            success: true, data: rows,
            pagination: { total, page, limit, totalPages: Math.ceil(total / limit) }
          });
        }
      );
    }
  );
});

// ── GET single member ─────────────────────────────────────────────────────────
router.get("/:id", verifyToken, (req, res) => {
  db.query("SELECT * FROM members WHERE id = ?", [req.params.id], (err, rows) => {
    if (err) return res.status(500).json({ success: false, message: "DB Error: " + err.message });
    if (!rows.length) return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, data: rows[0] });
  });
});

// ── ADD member ────────────────────────────────────────────────────────────────
router.post("/", verifyToken, (req, res) => {
  console.log("ADD MEMBER body:", JSON.stringify(req.body));

  const {
    full_name, email, phone, address, gender,
    date_of_birth, membership_type, membership_start, membership_end, status
  } = req.body;

  if (!full_name || !email || !phone)
    return res.status(400).json({ success: false, message: "Name, email, and phone are required" });

  // Clean empty strings to null
  const clean = (d) => (d && String(d).trim() !== "") ? d : null;

  const values = [
    full_name,
    email,
    phone,
    clean(address),
    clean(gender),
    clean(date_of_birth),
    clean(membership_type),
    clean(membership_start),
    clean(membership_end),
    status || "active"
  ];

  console.log("INSERT values:", values);

  db.query(
    "INSERT INTO members (full_name,email,phone,address,gender,date_of_birth,membership_type,membership_start,membership_end,status) VALUES (?,?,?,?,?,?,?,?,?,?)",
    values,
    (err, result) => {
      if (err) {
        console.error("INSERT member error:", err.message, "| Code:", err.code);
        if (err.code === "ER_DUP_ENTRY")
          return res.status(400).json({ success: false, message: "Email already exists" });
        return res.status(500).json({ success: false, message: "DB Error: " + err.message });
      }

      console.log("Member inserted ID:", result.insertId);

      // Send welcome email (non-blocking)
      if (email) {
        try {
          sendEmail(welcomeEmail({
            full_name, email, phone,
            membership_type, membership_start, membership_end
          }))
            .then(r => console.log("Welcome email:", r.success ? "sent" : r.error))
            .catch(e => console.error("Email error:", e.message));
        } catch (e) {
          console.error("Email setup error:", e.message);
        }
      }

      res.status(201).json({ success: true, message: "Member added", id: result.insertId });
    }
  );
});

// ── UPDATE member ─────────────────────────────────────────────────────────────
router.put("/:id", verifyToken, (req, res) => {
  const {
    full_name, email, phone, address, gender,
    date_of_birth, membership_type, membership_start, membership_end, status
  } = req.body;

  const clean = (d) => (d && String(d).trim() !== "") ? d : null;

  db.query(
    "UPDATE members SET full_name=?,email=?,phone=?,address=?,gender=?,date_of_birth=?,membership_type=?,membership_start=?,membership_end=?,status=? WHERE id=?",
    [
      full_name, email, phone,
      clean(address), clean(gender), clean(date_of_birth),
      clean(membership_type), clean(membership_start), clean(membership_end),
      status || "active",
      req.params.id
    ],
    (err, result) => {
      if (err) {
        console.error("UPDATE member error:", err.message);
        return res.status(500).json({ success: false, message: "DB Error: " + err.message });
      }
      if (!result.affectedRows) return res.status(404).json({ success: false, message: "Not found" });
      res.json({ success: true, message: "Updated" });
    }
  );
});

// ── DELETE member (super_admin only) ──────────────────────────────────────────
router.delete("/:id", verifyToken, requireRole("super_admin"), (req, res) => {
  db.query("DELETE FROM members WHERE id = ?", [req.params.id], (err, result) => {
    if (err) return res.status(500).json({ success: false, message: "DB Error: " + err.message });
    if (!result.affectedRows) return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, message: "Deleted" });
  });
});

// ── GET member plan history ───────────────────────────────────────────────────
router.get("/:id/plan-history", verifyToken, (req, res) => {
  db.query(
    `SELECT mph.*, a.full_name AS changed_by_name
     FROM member_plan_history mph
     LEFT JOIN admins a ON mph.changed_by = a.id
     WHERE mph.member_id = ?
     ORDER BY mph.plan_start DESC`,
    [req.params.id],
    (err, rows) => {
      if (err) return res.status(500).json({ success: false, message: "DB Error: " + err.message });
      res.json({ success: true, data: rows });
    }
  );
});

// ── ADD plan history entry ────────────────────────────────────────────────────
router.post("/:id/plan-history", verifyToken, (req, res) => {
  const { plan_name, plan_start, plan_end, amount_paid, payment_id, notes } = req.body;
  if (!plan_name || !plan_start)
    return res.status(400).json({ success: false, message: "plan_name and plan_start required" });

  db.query(
    `INSERT INTO member_plan_history
     (member_id, plan_name, plan_start, plan_end, amount_paid, payment_id, notes, changed_by)
     VALUES (?,?,?,?,?,?,?,?)`,
    [req.params.id, plan_name, plan_start, plan_end || null,
      amount_paid || 0, payment_id || null, notes || null, req.admin?.id || null],
    (err, result) => {
      if (err) return res.status(500).json({ success: false, message: "DB Error: " + err.message });
      db.query(
        "UPDATE members SET membership_type=?, membership_start=?, membership_end=? WHERE id=?",
        [plan_name, plan_start, plan_end || null, req.params.id],
        () => {}
      );
      res.status(201).json({ success: true, message: "Plan history added", id: result.insertId });
    }
  );
});

// ── UPDATE plan history entry ─────────────────────────────────────────────────
router.put("/:id/plan-history/:hid", verifyToken, (req, res) => {
  const { plan_name, plan_start, plan_end, amount_paid, notes } = req.body;
  db.query(
    `UPDATE member_plan_history SET plan_name=?, plan_start=?, plan_end=?, amount_paid=?, notes=?
     WHERE id=? AND member_id=?`,
    [plan_name, plan_start, plan_end || null, amount_paid || 0, notes || null,
      req.params.hid, req.params.id],
    (err, result) => {
      if (err) return res.status(500).json({ success: false, message: "DB Error: " + err.message });
      if (!result.affectedRows) return res.status(404).json({ success: false, message: "Not found" });
      res.json({ success: true, message: "Plan history updated" });
    }
  );
});

// ── DELETE plan history entry ─────────────────────────────────────────────────
router.delete("/:id/plan-history/:hid", verifyToken, requireRole("super_admin"), (req, res) => {
  db.query(
    "DELETE FROM member_plan_history WHERE id=? AND member_id=?",
    [req.params.hid, req.params.id],
    (err, result) => {
      if (err) return res.status(500).json({ success: false, message: "DB Error: " + err.message });
      if (!result.affectedRows) return res.status(404).json({ success: false, message: "Not found" });
      res.json({ success: true, message: "Deleted" });
    }
  );
});

module.exports = router;