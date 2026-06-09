const express = require("express");
const router  = express.Router();
const db      = require("../config/db");
const { verifyToken } = require("../middleware/authMiddleware");

// ── REVENUE REPORT ────────────────────────────────────────────────────────────
router.get("/revenue", verifyToken, (req, res) => {
    const year = req.query.year || new Date().getFullYear();

    const queries = {
        monthly: `
            SELECT 
                MONTH(payment_date) AS month,
                SUM(amount) AS total,
                COUNT(*) AS count
            FROM payments
            WHERE status = 'paid' AND YEAR(payment_date) = ?
            GROUP BY MONTH(payment_date)
            ORDER BY month ASC`,

        yearly: `
            SELECT 
                YEAR(payment_date) AS year,
                SUM(amount) AS total,
                COUNT(*) AS count
            FROM payments
            WHERE status = 'paid'
            GROUP BY YEAR(payment_date)
            ORDER BY year ASC`,

        summary: `
            SELECT
                COALESCE(SUM(CASE WHEN YEAR(payment_date) = ? AND status='paid' THEN amount END), 0) AS this_year,
                COALESCE(SUM(CASE WHEN YEAR(payment_date) = ?-1 AND status='paid' THEN amount END), 0) AS last_year,
                COALESCE(SUM(CASE WHEN MONTH(payment_date) = MONTH(CURDATE()) AND YEAR(payment_date) = YEAR(CURDATE()) AND status='paid' THEN amount END), 0) AS this_month,
                COALESCE(SUM(CASE WHEN status='paid' THEN amount END), 0) AS all_time,
                COUNT(CASE WHEN status='pending' THEN 1 END) AS pending_count,
                COALESCE(SUM(CASE WHEN status='pending' THEN amount END), 0) AS pending_amount
            FROM payments`,

        byMethod: `
            SELECT payment_method, COUNT(*) AS count, SUM(amount) AS total
            FROM payments WHERE status = 'paid' AND YEAR(payment_date) = ?
            GROUP BY payment_method`,
    };

    const results = {};
    let pending = Object.keys(queries).length;

    const done = () => { if (--pending === 0) res.json({ success: true, data: results }); };

    db.query(queries.monthly, [year], (err, rows) => { if (!err) results.monthly = rows; done(); });
    db.query(queries.yearly,  [],     (err, rows) => { if (!err) results.yearly  = rows; done(); });
    db.query(queries.summary, [year, year], (err, rows) => { if (!err) results.summary = rows[0]; done(); });
    db.query(queries.byMethod,[year], (err, rows) => { if (!err) results.byMethod = rows; done(); });
});

// ── MEMBER GROWTH REPORT ──────────────────────────────────────────────────────
router.get("/members", verifyToken, (req, res) => {
    const year = req.query.year || new Date().getFullYear();

    const queries = {
        monthly: `
            SELECT
                MONTH(created_at) AS month,
                COUNT(*) AS new_members
            FROM members
            WHERE YEAR(created_at) = ?
            GROUP BY MONTH(created_at)
            ORDER BY month ASC`,

        byType: `
            SELECT membership_type, COUNT(*) AS count
            FROM members
            GROUP BY membership_type`,

        byStatus: `
            SELECT status, COUNT(*) AS count
            FROM members
            GROUP BY status`,

        summary: `
            SELECT
                COUNT(*) AS total,
                SUM(status = 'active') AS active,
                SUM(status = 'inactive') AS inactive,
                SUM(status = 'expired') AS expired,
                COUNT(CASE WHEN MONTH(created_at) = MONTH(CURDATE()) AND YEAR(created_at) = YEAR(CURDATE()) THEN 1 END) AS this_month
            FROM members`,
    };

    const results = {};
    let pending = Object.keys(queries).length;
    const done = () => { if (--pending === 0) res.json({ success: true, data: results }); };

    db.query(queries.monthly,  [year], (err, rows) => { if (!err) results.monthly  = rows; done(); });
    db.query(queries.byType,   [],     (err, rows) => { if (!err) results.byType   = rows; done(); });
    db.query(queries.byStatus, [],     (err, rows) => { if (!err) results.byStatus = rows; done(); });
    db.query(queries.summary,  [],     (err, rows) => { if (!err) results.summary  = rows[0]; done(); });
});

// ── ATTENDANCE REPORT ─────────────────────────────────────────────────────────
router.get("/attendance", verifyToken, (req, res) => {
    const year = req.query.year || new Date().getFullYear();

    const queries = {
        monthly: `
            SELECT
                MONTH(date) AS month,
                COUNT(*) AS total,
                SUM(status = 'present') AS present,
                SUM(status = 'absent') AS absent
            FROM attendance
            WHERE YEAR(date) = ?
            GROUP BY MONTH(date)
            ORDER BY month ASC`,

        weekly: `
            SELECT
                DATE(date) AS day,
                COUNT(*) AS count
            FROM attendance
            WHERE date >= DATE_SUB(CURDATE(), INTERVAL 29 DAY)
            AND status = 'present'
            GROUP BY DATE(date)
            ORDER BY day ASC`,

        summary: `
            SELECT
                COUNT(*) AS total,
                SUM(status = 'present') AS present,
                COUNT(CASE WHEN date = CURDATE() THEN 1 END) AS today,
                COUNT(CASE WHEN MONTH(date) = MONTH(CURDATE()) AND YEAR(date) = YEAR(CURDATE()) THEN 1 END) AS this_month
            FROM attendance`,

        topMembers: `
            SELECT m.full_name, m.membership_type, COUNT(a.id) AS visits
            FROM attendance a
            JOIN members m ON a.member_id = m.id
            WHERE a.status = 'present' AND YEAR(a.date) = ?
            GROUP BY a.member_id, m.full_name, m.membership_type
            ORDER BY visits DESC
            LIMIT 5`,
    };

    const results = {};
    let pending = Object.keys(queries).length;
    const done = () => { if (--pending === 0) res.json({ success: true, data: results }); };

    db.query(queries.monthly,    [year], (err, rows) => { if (!err) results.monthly    = rows; done(); });
    db.query(queries.weekly,     [],     (err, rows) => { if (!err) results.weekly     = rows; done(); });
    db.query(queries.summary,    [],     (err, rows) => { if (!err) results.summary    = rows[0]; done(); });
    db.query(queries.topMembers, [year], (err, rows) => { if (!err) results.topMembers = rows; done(); });
});

module.exports = router;