const express = require("express");
const router  = express.Router();
const db      = require("../config/db");
const { verifyToken, requireRole } = require("../middleware/authMiddleware");

// GET all members (search + pagination)
router.get("/", verifyToken, (req, res) => {
    const page   = parseInt(req.query.page)  || 1;
    const limit  = parseInt(req.query.limit) || 10;
    const search = req.query.search || "";
    const offset = (page - 1) * limit;
    const q      = `%${search}%`;

    db.query(
        "SELECT COUNT(*) AS total FROM members WHERE full_name LIKE ? OR email LIKE ? OR phone LIKE ? OR membership_type LIKE ?",
        [q, q, q, q],
        (err, countRes) => {
            if (err) return res.status(500).json({ success: false, message: "DB Error" });
            const total = countRes[0].total;
            db.query(
                "SELECT * FROM members WHERE full_name LIKE ? OR email LIKE ? OR phone LIKE ? OR membership_type LIKE ? ORDER BY created_at DESC LIMIT ? OFFSET ?",
                [q, q, q, q, limit, offset],
                (err, rows) => {
                    if (err) return res.status(500).json({ success: false, message: "DB Error" });
                    res.json({ success: true, data: rows, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } });
                }
            );
        }
    );
});

// GET single member
router.get("/:id", verifyToken, (req, res) => {
    db.query("SELECT * FROM members WHERE id = ?", [req.params.id], (err, rows) => {
        if (err) return res.status(500).json({ success: false, message: "DB Error" });
        if (!rows.length) return res.status(404).json({ success: false, message: "Not found" });
        res.json({ success: true, data: rows[0] });
    });
});

// ADD member
router.post("/", verifyToken, (req, res) => {
    const { full_name, email, phone, address, gender, date_of_birth, membership_type, membership_start, membership_end, status } = req.body;
    if (!full_name || !email || !phone || !membership_type)
        return res.status(400).json({ success: false, message: "Name, email, phone, membership_type required" });

    db.query(
        "INSERT INTO members (full_name,email,phone,address,gender,date_of_birth,membership_type,membership_start,membership_end,status) VALUES (?,?,?,?,?,?,?,?,?,?)",
        [full_name, email, phone, address||null, gender||null, date_of_birth||null, membership_type, membership_start||null, membership_end||null, status||"active"],
        (err, result) => {
            if (err) {
                if (err.code === "ER_DUP_ENTRY") return res.status(400).json({ success: false, message: "Email already exists" });
                return res.status(500).json({ success: false, message: "DB Error" });
            }
            res.status(201).json({ success: true, message: "Member added", id: result.insertId });
        }
    );
});

// UPDATE member
router.put("/:id", verifyToken, (req, res) => {
    const { full_name, email, phone, address, gender, date_of_birth, membership_type, membership_start, membership_end, status } = req.body;
    db.query(
        "UPDATE members SET full_name=?,email=?,phone=?,address=?,gender=?,date_of_birth=?,membership_type=?,membership_start=?,membership_end=?,status=? WHERE id=?",
        [full_name, email, phone, address, gender, date_of_birth, membership_type, membership_start, membership_end, status, req.params.id],
        (err, result) => {
            if (err) return res.status(500).json({ success: false, message: "DB Error" });
            if (!result.affectedRows) return res.status(404).json({ success: false, message: "Not found" });
            res.json({ success: true, message: "Updated" });
        }
    );
});

// DELETE member (super_admin only via RBAC)
router.delete("/:id", verifyToken, requireRole("super_admin"), (req, res) => {
    db.query("DELETE FROM members WHERE id = ?", [req.params.id], (err, result) => {
        if (err) return res.status(500).json({ success: false, message: "DB Error" });
        if (!result.affectedRows) return res.status(404).json({ success: false, message: "Not found" });
        res.json({ success: true, message: "Deleted" });
    });
});

module.exports = router;