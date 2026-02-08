import express from "express";
import { query } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

router.get("/", requireAuth, async (req, res) => {
  const result = await query(
    `SELECT l.id,
            l.accessed_at,
            r.name AS report_name,
            u.email AS user_email
     FROM report_access_logs l
     JOIN reports r ON r.id = l.report_id
     JOIN users u ON u.id = l.user_id
     WHERE l.user_id = $1
     ORDER BY l.accessed_at DESC
     LIMIT 200`,
    [req.user.id]
  );

  return res.json({ history: result.rows });
});

router.post("/", requireAuth, async (req, res) => {
  const { reportId } = req.body || {};
  if (!reportId) {
    return res.status(400).json({ error: "Missing fields" });
  }

  const result = await query(
    `WITH selected_report AS (
       SELECT r.id AS report_id,
              u.company_id,
              u.id AS user_id
       FROM reports r
       JOIN users u ON u.id = $2
       WHERE r.id = $1
         AND r.user_id = u.id
     )
     INSERT INTO report_access_logs (company_id, user_id, report_id)
     SELECT company_id, user_id, report_id
     FROM selected_report
     RETURNING id, accessed_at`,
    [reportId, req.user.id]
  );

  if (!result.rows.length) {
    return res.status(404).json({ error: "Reporte no encontrado" });
  }

  return res.status(201).json({ log: result.rows[0] });
});

export default router;
