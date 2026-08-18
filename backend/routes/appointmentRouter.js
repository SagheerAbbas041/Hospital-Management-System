import express from "express";
import { getAuth } from "@clerk/express";
import {
  cancelAppointment,
  confirmPayment,
  createAppointment,
  getAppointmentByDoctor,
  getAppointments,
  getAppointmentsByPatient,
  getRegisteredUserCount,
  getStats,
  updateAppointment,
} from "../controllers/appointmentController.js";

const appointmentRouter = express.Router();

// Custom authentication guard using @clerk/express getAuth
const protect = (req, res, next) => {
  const { userId } = getAuth(req);
  if (!userId) {
    return res.status(401).json({ success: false, message: "Unauthorized access" });
  }
  req.auth = { userId };
  next();
};

// Public & General Routes
appointmentRouter.get("/", getAppointments);
appointmentRouter.get("/confirm", confirmPayment);
appointmentRouter.get("/stats/summary", getStats);
appointmentRouter.get("/patients/count", getRegisteredUserCount);
appointmentRouter.get("/doctor/:doctorId", getAppointmentByDoctor);

// Authenticated Routes (Protected by getAuth guard)
appointmentRouter.post("/", protect, createAppointment);
appointmentRouter.get("/me", protect, getAppointmentsByPatient);

// Appointment Action Routes
appointmentRouter.post("/:id/cancel", cancelAppointment);
appointmentRouter.put("/:id", updateAppointment);

export default appointmentRouter;