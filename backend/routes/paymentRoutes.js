const express = require("express");
const router  = express.Router();
const db      = require("../config/db");
const { verifyToken, requireRole } = require("../middleware/authMiddleware");

// ── GET ALL PAYMENTS (search + pagination + filters) ──────────────────────────
router.get("/", verifyToken, (req, res) => {
    const page   = parseInt(req.query.page)   || 1;
    const limit  = parseInt(req.query.limit)  || 10;
    const search = req.query.search           || "";
    const status = req.query.status           || "";
    const method = req.query.method           || "";
    const offset = (page - 1) * limit;
    const q      = `%${search}%`;

    let where = "WHERE (m.full_name LIKE ? OR m.email LIKE ? OR m.phone LIKE ?)";
    const params = [q, q, q];

    if (status) { where += " AND p.status = ?";         params.push(status); }
    if (method) { where += " AND p.payment_method = ?"; params.push(method); }

    const countSql = `SELECT COUNT(*) AS total FROM payments p JOIN members m ON p.member_id = m.id ${where}`;
    const dataSql  = `
        SELECT p.*, m.full_name, m.email, m.phone, m.membership_type
        FROM payments p
        JOIN members m ON p.member_id = m.id
        ${where}
        ORDER BY p.created_at DESC
        LIMIT ? OFFSET ?
    `;

    db.query(countSql, params, (err, countRes) => {
        if (err) {
            console.error("PAYMENT COUNT ERROR:", err.message);
            return res.status(500).json({ success: false, message: "DB Error", error: err.message });
        }
        const total = countRes[0].total;
        db.query(dataSql, [...params, limit, offset], (err, rows) => {
            if (err) {
                console.error("PAYMENT FETCH ERROR:", err.message);
                return res.status(500).json({ success: false, message: "DB Error", error: err.message });
            }
            res.json({
                success: true, data: rows,
                pagination: { total, page, limit, totalPages: Math.ceil(total / limit) }
            });
        });
    });
});

// ── GET PAYMENT STATS / SUMMARY ───────────────────────────────────────────────
router.get("/stats/summary", verifyToken, (req, res) => {
    const queries = {
        totalRevenue:    "SELECT COALESCE(SUM(amount),0)      AS val FROM payments WHERE status='paid'",
        thisMonth:       "SELECT COALESCE(SUM(amount),0)      AS val FROM payments WHERE status='paid' AND MONTH(payment_date)=MONTH(CURDATE()) AND YEAR(payment_date)=YEAR(CURDATE())",
        lastMonth:       "SELECT COALESCE(SUM(amount),0)      AS val FROM payments WHERE status='paid' AND MONTH(payment_date)=MONTH(DATE_SUB(CURDATE(),INTERVAL 1 MONTH)) AND YEAR(payment_date)=YEAR(DATE_SUB(CURDATE(),INTERVAL 1 MONTH))",
        pendingCount:    "SELECT COUNT(*)                     AS val FROM payments WHERE status='pending'",
        pendingAmount:   "SELECT COALESCE(SUM(amount),0)      AS val FROM payments WHERE status='pending'",
        todayRevenue:    "SELECT COALESCE(SUM(amount),0)      AS val FROM payments WHERE status='paid' AND payment_date=CURDATE()",
        totalDue:        "SELECT COALESCE(SUM(due_amount),0)  AS val FROM payments WHERE due_amount > 0",
        totalCount:      "SELECT COUNT(*)                     AS val FROM payments WHERE status='paid'",
        methodBreakdown: "SELECT payment_method, COUNT(*) AS count, SUM(amount) AS total FROM payments WHERE status='paid' GROUP BY payment_method",
        monthly6:        `SELECT DATE_FORMAT(MIN(payment_date),'%b %Y') AS label,
                                 MONTH(MIN(payment_date)) AS mo,
                                 YEAR(MIN(payment_date))  AS yr,
                                 SUM(amount)              AS total
                          FROM payments
                          WHERE status='paid'
                            AND payment_date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
                          GROUP BY YEAR(payment_date), MONTH(payment_date)
                          ORDER BY yr ASC, mo ASC`,
    };

    const results = {};
    let pending = Object.keys(queries).length;

    Object.entries(queries).forEach(([key, sql]) => {
        db.query(sql, (err, rows) => {
            if (err) {
                console.error(`STATS ERROR [${key}]:`, err.message);
            } else {
                const multi = ["methodBreakdown", "monthly6"].includes(key);
                results[key] = multi ? rows : (rows[0]?.val ?? 0);
            }
            if (--pending === 0) res.json({ success: true, data: results });
        });
    });
});

// ── GET DUE PAYMENTS (partial payments list) ──────────────────────────────────
router.get("/due/list", verifyToken, (req, res) => {
    const sql = `
        SELECT p.*, m.full_name, m.email, m.phone
        FROM payments p
        JOIN members m ON p.member_id = m.id
        WHERE p.due_amount > 0
        ORDER BY p.payment_date DESC
    `;
    db.query(sql, (err, rows) => {
        if (err) {
            console.error("DUE LIST ERROR:", err.message);
            return res.status(500).json({ success: false, message: "DB Error" });
        }
        res.json({ success: true, data: rows });
    });
});

// ── GET MEMBER PAYMENT HISTORY ────────────────────────────────────────────────
router.get("/member/:memberId", verifyToken, (req, res) => {
    db.query(
        "SELECT * FROM payments WHERE member_id = ? ORDER BY payment_date DESC LIMIT 20",
        [req.params.memberId],
        (err, rows) => {
            if (err) return res.status(500).json({ success: false, message: "DB Error" });
            res.json({ success: true, data: rows });
        }
    );
});

// ── ADD PAYMENT ───────────────────────────────────────────────────────────────
router.post("/", verifyToken, (req, res) => {
    const {
        member_id, amount, paid_amount, payment_date,
        payment_method, payment_for, status,
        months_covered, notes, plan_name, plan_start, plan_end
    } = req.body;

    // ── Validation ────────────────────────────────────────────────────────────
    if (!member_id || !amount || !payment_date)
        return res.status(400).json({ success: false, message: "member_id, amount and payment_date are required" });

    const totalAmt = parseFloat(amount);
    if (isNaN(totalAmt) || totalAmt <= 0)
        return res.status(400).json({ success: false, message: "Amount must be a positive number" });

    // ── BUG FIX: paid_amount "" → treat as full payment ───────────────────────
    const paidAmt = (paid_amount !== "" && paid_amount != null && !isNaN(parseFloat(paid_amount)))
        ? parseFloat(paid_amount)
        : totalAmt;                          // blank = fully paid

    const dueAmt      = parseFloat(Math.max(0, totalAmt - paidAmt).toFixed(2));
    const finalStatus = dueAmt > 0 ? "pending" : (status || "paid");

    // ── BUG FIX: received_by — use req.admin safely ───────────────────────────
    const receivedBy = req.admin?.id ?? null;

    const sql = `
        INSERT INTO payments
            (member_id, amount, paid_amount, due_amount,
             payment_date, payment_method, payment_for,
             status, months_covered, notes, received_by,
             plan_name, plan_start, plan_end)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `;

    const values = [
        member_id,
        totalAmt,
        paidAmt,
        dueAmt,
        payment_date,
        payment_method  || "cash",
        payment_for     || "monthly",
        finalStatus,
        parseInt(months_covered) || 1,
        notes           || null,
        receivedBy,
        plan_name       || null,
        plan_start      || null,
        plan_end        || null
    ];

    db.query(sql, values, (err, result) => {
        if (err) {
            console.error("ADD PAYMENT ERROR:", err.message);
            // ── Return the actual SQL error to frontend for debugging ──────────
            return res.status(500).json({
                success: false,
                message: "DB Error: " + err.message,
                sqlError: err.code
            });
        }
        res.status(201).json({
            success:    true,
            message:    dueAmt > 0 ? `Partial payment recorded. Due: ₹${dueAmt}` : "Payment recorded successfully",
            id:         result.insertId,
            paid_amount: paidAmt,
            due_amount:  dueAmt,
            status:      finalStatus
        });
    });
});

// ── UPDATE PAYMENT ────────────────────────────────────────────────────────────
router.put("/:id", verifyToken, (req, res) => {
    const {
        member_id, amount, paid_amount, payment_date,
        payment_method, payment_for, status,
        months_covered, notes, plan_name, plan_start, plan_end
    } = req.body;

    const totalAmt = parseFloat(amount);
    if (isNaN(totalAmt) || totalAmt <= 0)
        return res.status(400).json({ success: false, message: "Amount must be a positive number" });

    // ── BUG FIX: same blank-string guard for update ───────────────────────────
    const paidAmt = (paid_amount !== "" && paid_amount != null && !isNaN(parseFloat(paid_amount)))
        ? parseFloat(paid_amount)
        : totalAmt;

    const dueAmt      = parseFloat(Math.max(0, totalAmt - paidAmt).toFixed(2));
    const finalStatus = dueAmt > 0 ? "pending" : (status || "paid");

    const sql = `
        UPDATE payments SET
            member_id=?,      amount=?,         paid_amount=?,  due_amount=?,
            payment_date=?,   payment_method=?, payment_for=?,  status=?,
            months_covered=?, notes=?,
            plan_name=?,      plan_start=?,     plan_end=?
        WHERE id=?
    `;

    const values = [
        member_id,
        totalAmt,
        paidAmt,
        dueAmt,
        payment_date,
        payment_method,
        payment_for,
        finalStatus,
        parseInt(months_covered) || 1,
        notes      || null,
        plan_name  || null,
        plan_start || null,
        plan_end   || null,
        req.params.id
    ];

    db.query(sql, values, (err, result) => {
        if (err) {
            console.error("UPDATE PAYMENT ERROR:", err.message);
            return res.status(500).json({
                success: false,
                message: "DB Error: " + err.message,
                sqlError: err.code
            });
        }
        if (!result.affectedRows)
            return res.status(404).json({ success: false, message: "Payment not found" });

        res.json({
            success:    true,
            message:    "Payment updated",
            due_amount: dueAmt,
            status:     finalStatus
        });
    });
});

// ── DELETE PAYMENT (super_admin only) ─────────────────────────────────────────
router.delete("/:id", verifyToken, requireRole("super_admin"), (req, res) => {
    db.query("DELETE FROM payments WHERE id = ?", [req.params.id], (err, result) => {
        if (err) return res.status(500).json({ success: false, message: "DB Error" });
        if (!result.affectedRows) return res.status(404).json({ success: false, message: "Not found" });
        res.json({ success: true, message: "Payment deleted" });
    });
});

module.exports = router;