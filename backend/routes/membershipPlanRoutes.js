// routes/membershipPlanRoutes.js
const express = require("express");
const router  = express.Router();
const ctrl    = require("../controllers/membershipPlanController");

router.get("/",           ctrl.getAll);
router.get("/stats",      ctrl.getStats);
router.get("/:id",        ctrl.getOne);
router.post("/",          ctrl.create);
router.put("/:id",        ctrl.update);
router.delete("/:id",     ctrl.remove);

// Assign a plan to a member
router.post("/assign",    ctrl.assignToMember);

module.exports = router;