import express from 'express';
import { getAuth } from '@clerk/express';
import {
  cancelServiceAppointment,
  confirmServicePayment,
  createServiceAppointment,
  getServiceAppointmentById,
  getServiceAppointments,
  getServiceAppointmentsByPatient,
  getServiceAppointmentStats,
  updateServiceAppointment
} from '../controllers/serviceAppointmentController.js';

const serviceAppointmentRouter = express.Router();

// Authentication guard using modern getAuth
const protect = (req, res, next) => {
  const { userId } = getAuth(req);
  if (!userId) {
    return res.status(401).json({ success: false, message: "Unauthorized access" });
  }
  req.auth = { userId };
  next();
};

// Public & General Routes
serviceAppointmentRouter.get("/", getServiceAppointments);
serviceAppointmentRouter.get("/confirm", confirmServicePayment);
serviceAppointmentRouter.get("/stats/summary", getServiceAppointmentStats);

// Authenticated Routes
serviceAppointmentRouter.post("/", protect, createServiceAppointment);
serviceAppointmentRouter.get("/me", protect, getServiceAppointmentsByPatient);

// ID-Specific Routes
serviceAppointmentRouter.get("/:id", getServiceAppointmentById);
serviceAppointmentRouter.put("/:id", updateServiceAppointment);
serviceAppointmentRouter.post("/:id/cancel", cancelServiceAppointment);

export default serviceAppointmentRouter;