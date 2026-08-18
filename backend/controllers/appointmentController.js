import Appointment from "../models/Appointment.js";
import Doctor from "../models/Doctor.js";
import dotenv from "dotenv";
import Stripe from "stripe";
import { getAuth, clerkClient } from "@clerk/express";

dotenv.config();

const STRIPE_KEY = process.env.STRIPE_SECRET_KEY;
const FRONTEND_URL = process.env.FRONTEND_URL;
const MAJOR_ADMIN_ID = process.env.MAJOR_ADMIN_ID || null;

// Initialize Stripe safely
const stripe = STRIPE_KEY ? new Stripe(STRIPE_KEY) : null;

// Helper: Ensure finite number
const safeNumber = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

// Helper: Build frontend URL safely
const buildFrontendBase = (req) => {
  if (FRONTEND_URL) return FRONTEND_URL.replace(/\/$/, "");
  const origin = req.get("origin") || req.get("referer");
  if (origin) return origin.replace(/\/$/, "");
  const host = req.get("host");
  if (host) return `${req.protocol || "http"}://${host}`.replace(/\/$/, "");
  return null;
};

// Helper: Extract Clerk User ID safely
function resolveClerkUserId(req) {
  try {
    const auth = req.auth || {};
    const fromReq =
      auth?.userId || auth?.user_id || auth?.user?.id || req.user?.id || null;
    if (fromReq) return fromReq;

    const serverAuth = typeof getAuth === "function" ? getAuth(req) : null;
    return serverAuth?.userId || null;
  } catch (e) {
    return null;
  }
}

// 1. Get All Appointments (Admin / Dashboard)
export const getAppointments = async (req, res) => {
  try {
    const {
      doctorId,
      mobile,
      status,
      search = "",
      limit: limitRaw = 50,
      page: pageRaw = 1,
      patientClerkId,
      createdBy,
    } = req.query;

    const limit = Math.min(200, Math.max(1, parseInt(limitRaw, 10) || 50));
    const page = Math.max(1, parseInt(pageRaw, 10) || 1);
    const skip = (page - 1) * limit;

    const filter = {};
    if (doctorId) filter.doctorId = doctorId;
    if (mobile) filter.mobile = mobile;
    if (status) filter.status = status;
    if (patientClerkId) filter.createdBy = patientClerkId;
    if (createdBy) filter.createdBy = createdBy;

    if (search) {
      const re = new RegExp(search, "i");
      filter.$or = [{ patientName: re }, { mobile: re }, { notes: re }];
    }

    const items = await Appointment.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("doctorId", "name specialization speciality owner imageUrl image")
      .lean();

    const total = await Appointment.countDocuments(filter);

    return res.json({
      success: true,
      appointments: items,
      meta: { page, limit, total, count: items.length },
    });
  } catch (err) {
    console.error("getAppointments Error:", err);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

// 2. Get Appointments for Patient
export const getAppointmentsByPatient = async (req, res) => {
  try {
    const queryCreatedBy = req.query.createdBy || null;
    const clerkUserId = resolveClerkUserId(req);
    const resolvedCreatedBy = queryCreatedBy || clerkUserId || null;

    if (!resolvedCreatedBy && !req.query.mobile) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const filter = {};
    if (resolvedCreatedBy) filter.createdBy = resolvedCreatedBy;
    if (req.query.mobile) filter.mobile = req.query.mobile;

    const appointments = await Appointment.find(filter)
      .sort({ date: 1, time: 1 })
      .lean();

    return res.json({
      success: true,
      appointments,
    });
  } catch (err) {
    console.error("getAppointmentsByPatient Error:", err);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

// 3. Create Appointment & Stripe Session
export const createAppointment = async (req, res) => {
  try {
    const {
      doctorId,
      patientName,
      mobile,
      age = "",
      gender = "",
      date,
      time,
      fee,
      fees,
      notes = "",
      email,
      paymentMethod,
      owner: ownerFromBody = null,
      doctorName: doctorNameFromBody,
      speciality: specialityFromBody,
      doctorImageUrl: doctorImageUrlFromBody,
      doctorImagePublicId: doctorImagePublicIdFromBody,
    } = req.body || {};

    const clerkUserId = resolveClerkUserId(req);
    if (!clerkUserId) {
      return res.status(401).json({
        success: false,
        message: "Authentication is required",
      });
    }

    if (!doctorId || !patientName || !date || !time) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    const numericFee = safeNumber(fee ?? fees ?? 0);
    if (numericFee === null || numericFee < 0) {
      return res.status(400).json({
        success: false,
        message: "Fee must be a valid non-negative number",
      });
    }

    // Prevent Duplicate Bookings
    const existingBooking = await Appointment.findOne({
      doctorId,
      createdBy: clerkUserId,
      date: String(date),
      time: String(time),
      status: { $ne: "Canceled" },
    }).lean();

    if (existingBooking) {
      return res.status(409).json({
        success: false,
        message:
          "You already have an appointment with this doctor at the selected slot.",
      });
    }

    // Fetch Doctor Info
    let doctor = null;
    try {
      doctor = await Doctor.findById(doctorId).lean();
    } catch (e) {
      console.warn("Doctor Lookup failed:", e?.message || e);
    }

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found",
      });
    }

    // Resolve Doctor Metadata
    let resolvedOwner = ownerFromBody || doctor.owner || null;
    if (!resolvedOwner) resolvedOwner = MAJOR_ADMIN_ID || String(doctorId);

    const doctorName =
      (doctor.name && String(doctor.name).trim()) ||
      (doctorNameFromBody && String(doctorNameFromBody).trim()) ||
      "";

    const speciality =
      (doctor.specialization && String(doctor.specialization).trim()) ||
      (doctor.speciality && String(doctor.speciality).trim()) ||
      (specialityFromBody && String(specialityFromBody).trim()) ||
      "";

    const doctorImageUrl =
      (doctor.imageUrl && String(doctor.imageUrl).trim()) ||
      (doctor.image && String(doctor.image).trim()) ||
      (doctor.avatarUrl && String(doctor.avatarUrl).trim()) ||
      (doctor.profileImage?.url && String(doctor.profileImage.url).trim()) ||
      (doctorImageUrlFromBody && String(doctorImageUrlFromBody).trim()) ||
      "";

    const doctorImagePublicId =
      (doctor.imagePublicId && String(doctor.imagePublicId).trim()) ||
      (doctor.profileImage?.publicId &&
        String(doctor.profileImage.publicId).trim()) ||
      (doctorImagePublicIdFromBody &&
        String(doctorImagePublicIdFromBody).trim()) ||
      "";

    const baseAppointmentData = {
      doctorId: String(doctor._id || doctorId),
      doctorName,
      speciality,
      doctorImage: { url: doctorImageUrl, publicId: doctorImagePublicId },
      patientName: String(patientName).trim(),
      mobile: String(mobile).trim(),
      age: age ? Number(age) : undefined,
      gender: gender ? String(gender) : "",
      date: String(date),
      time: String(time),
      fees: numericFee,
      status: "Pending",
      payment: {
        method: paymentMethod === "Cash" ? "Cash" : "Online",
        status: "Pending",
        amount: numericFee,
      },
      notes: notes || "",
      createdBy: clerkUserId,
      owner: resolvedOwner,
      sessionId: null,
    };

    // Free Appointment
    if (numericFee === 0) {
      const created = await Appointment.create({
        ...baseAppointmentData,
        status: "Confirmed",
        payment: {
          method: baseAppointmentData.payment.method,
          status: "Paid",
          amount: 0,
        },
        paidAt: new Date(),
      });
      return res
        .status(201)
        .json({ success: true, appointment: created, checkoutUrl: null });
    }

    // Cash Payment
    if (paymentMethod === "Cash") {
      const created = await Appointment.create({
        ...baseAppointmentData,
        status: "Pending",
        payment: { method: "Cash", status: "Pending", amount: numericFee },
      });
      return res
        .status(201)
        .json({ success: true, appointment: created, checkoutUrl: null });
    }

    // Online Payment via Stripe
    if (!stripe) {
      return res
        .status(500)
        .json({ success: false, message: "Stripe not configured on server" });
    }

    const frontBase = buildFrontendBase(req);
    if (!frontBase) {
      return res.status(500).json({
        success: false,
        message:
          "Frontend URL could not be determined. Set FRONTEND_URL or send Origin header.",
      });
    }

    const successUrl = `${frontBase}/appointment/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${frontBase}/appointment/cancel`;

    let session;
    try {
      session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        mode: "payment",
        customer_email: email || undefined,
        line_items: [
          {
            price_data: {
              currency: "inr",
              product_data: {
                name: `Appointment - ${String(patientName).slice(0, 40)}`,
              },
              unit_amount: Math.round(numericFee * 100),
            },
            quantity: 1,
          },
        ],
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          doctorId: String(doctorId),
          doctorName: doctorName || "",
          speciality: speciality || "",
          patientName: baseAppointmentData.patientName,
          mobile: baseAppointmentData.mobile,
          clerkUserId: clerkUserId || "",
        },
      });
    } catch (stripeErr) {
      console.error("Stripe Checkout Error:", stripeErr);
      const message =
        stripeErr?.raw?.message || stripeErr?.message || "Stripe error";
      return res
        .status(502)
        .json({ success: false, message: `Payment provider error: ${message}` });
    }

    try {
      const created = await Appointment.create({
        ...baseAppointmentData,
        sessionId: session.id,
        payment: {
          ...baseAppointmentData.payment,
          providerId:
            typeof session.payment_intent === "string"
              ? session.payment_intent
              : session.payment_intent?.id || null,
        },
        status: "Pending",
      });

      return res.status(201).json({
        success: true,
        appointment: created,
        checkoutUrl: session.url || null,
      });
    } catch (dbErr) {
      console.error("DB error saving appointment after Stripe session:", dbErr);
      return res
        .status(500)
        .json({ success: false, message: "Failed to create appointment record" });
    }
  } catch (err) {
    console.error("createAppointment Unexpected Error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// 4. Confirm Payment Status
// export const confirmPayment = async (req, res) => {
//   try {
//     const { session_id } = req.query;

//     if (!session_id) {
//       return res.status(400).json({
//         success: false,
//         message: "Session ID is required.",
//       });
//     }

//     if (!stripe) {
//       return res.status(500).json({
//         success: false,
//         message: "Stripe is not set up on server",
//       });
//     }

//     let session;
//     try {
//       session = await stripe.checkout.sessions.retrieve(session_id);
//     } catch (err) {
//       console.error("Stripe Retrieve Session Error:", err?.message || err);
//       return res.status(404).json({
//         success: false,
//         message: "Stripe session not found",
//       });
//     }

//     if (!session) {
//       return res.status(404).json({
//         success: false,
//         message: "Invalid session",
//       });
//     }

//     if (session.payment_status !== "paid") {
//       return res.status(400).json({
//         success: false,
//         message: "Payment not completed",
//       });
//     }

//     const paymentIntentId =
//       typeof session.payment_intent === "string"
//         ? session.payment_intent
//         : session.payment_intent?.id || null;

//     // Primary Match: Match directly by Stripe Session ID
//     let appt = await Appointment.findOneAndUpdate(
//       { sessionId: session_id },
//       {
//         "payment.status": "Paid",
//         "payment.providerId": paymentIntentId,
//         status: "Confirmed",
//         paidAt: new Date(),
//       },
//       { new: true }
//     );

//     // Metadata Fallback 1: Match via doctorId + patientName
//     if (!appt) {
//       const meta = session.metadata || {};
//       if (meta.doctorId && meta.patientName) {
//         const filter = {
//           doctorId: meta.doctorId,
//           patientName: meta.patientName,
//           status: { $ne: "Canceled" },
//         };
//         if (meta.mobile) filter.mobile = meta.mobile;

//         appt = await Appointment.findOneAndUpdate(
//           filter,
//           {
//             "payment.status": "Paid",
//             "payment.providerId": paymentIntentId,
//             status: "Confirmed",
//             paidAt: new Date(),
//             sessionId: session_id,
//           },
//           { new: true, sort: { _id: -1 } }
//         );
//       }
//     }

//     // Metadata Fallback 2: Match via Clerk User ID
//     if (!appt) {
//       const meta = session.metadata || {};
//       if (meta.clerkUserId) {
//         appt = await Appointment.findOneAndUpdate(
//           { createdBy: meta.clerkUserId, "payment.status": "Pending" },
//           {
//             "payment.status": "Paid",
//             "payment.providerId": paymentIntentId,
//             status: "Confirmed",
//             paidAt: new Date(),
//             sessionId: session_id,
//           },
//           { new: true, sort: { _id: -1 } }
//         );
//       }
//     }

//     if (!appt) {
//       return res.status(404).json({
//         success: false,
//         message: "Appointment record not found for this payment session",
//       });
//     }

//     return res.status(200).json({
//       success: true,
//       message: "Payment confirmed successfully",
//       appointment: appt,
//     });
//   } catch (err) {
//     console.error("confirmPayment Error:", err);
//     return res.status(500).json({
//       success: false,
//       message: "Server error during payment verification",
//     });
//   }
// };
// Confirm Payment Status
export const confirmPayment = async (req, res) => {
  console.log("👉 HIT /api/appointments/confirm WITH SESSION_ID:", req.query.session_id);
  
  try {
    const { session_id } = req.query;

    if (!session_id) {
      return res.status(400).json({ success: false, message: "Session ID is required." });
    }

    if (!stripe) {
      return res.status(500).json({ success: false, message: "Stripe not configured on server" });
    }

    const session = await stripe.checkout.sessions.retrieve(session_id);

    if (!session || session.payment_status !== "paid") {
      return res.status(400).json({ success: false, message: "Payment not completed on Stripe" });
    }

    const paymentIntentId = typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id || null;

    // 1. Try finding by sessionId
    let appt = await Appointment.findOneAndUpdate(
      { sessionId: session_id },
      {
        "payment.status": "Paid",
        "payment.providerId": paymentIntentId,
        status: "Confirmed",
        paidAt: new Date(),
      },
      { new: true }
    );

    // 2. Fallback: Find most recent pending appointment
    if (!appt) {
      const meta = session.metadata || {};
      const query = { "payment.status": "Pending" };
      if (meta.clerkUserId) query.createdBy = meta.clerkUserId;

      appt = await Appointment.findOneAndUpdate(
        query,
        {
          "payment.status": "Paid",
          "payment.providerId": paymentIntentId,
          sessionId: session_id,
          status: "Confirmed",
          paidAt: new Date(),
        },
        { new: true, sort: { createdAt: -1 } }
      );
    }

    if (!appt) {
      console.error("❌ Appointment document not found in DB for session:", session_id);
      return res.status(404).json({ success: false, message: "Appointment document not found" });
    }

    console.log("✅ Appointment successfully confirmed in DB:", appt._id);
    return res.status(200).json({ success: true, appointment: appt });

  } catch (err) {
    console.error("confirmPayment Server Error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// 5. Update / Reschedule Appointment
export const updateAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body || {};
    const appt = await Appointment.findById(id);

    if (!appt) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }

    const terminal = appt.status === "Completed" || appt.status === "Canceled";
    if (terminal && body.status && body.status !== appt.status) {
      return res.status(400).json({
        success: false,
        message: "Cannot change status of a completed/canceled appointment",
      });
    }

    const update = {};
    if (body.status) update.status = body.status;
    if (body.notes !== undefined) update.notes = body.notes;

    if (body.date && body.time) {
      if (terminal) {
        return res.status(400).json({
          success: false,
          message: "Cannot reschedule completed/canceled appointment",
        });
      }
      update.date = body.date;
      update.time = body.time;
      update.status = "Rescheduled";
      update.rescheduledTo = { date: body.date, time: body.time };
    }

    const updated = await Appointment.findByIdAndUpdate(id, update, {
      new: true,
      runValidators: true,
    })
      .populate({ path: "doctorId", select: "name imageUrl" })
      .lean();

    return res.json({
      success: true,
      appointment: updated,
    });
  } catch (err) {
    console.error("updateAppointment Error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// 6. Cancel Appointment
export const cancelAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const appt = await Appointment.findById(id);

    if (!appt) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }

    appt.status = "Canceled";
    await appt.save();

    return res.json({
      success: true,
      appointment: appt,
    });
  } catch (err) {
    console.error("cancelAppointment Error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// 7. Get Aggregated Analytics Stats
export const getStats = async (req, res) => {
  try {
    const total = await Appointment.countDocuments();
    const paidAgg = await Appointment.aggregate([
      { $match: { "payment.status": "Paid" } },
      { $group: { _id: null, total: { $sum: "$fees" } } },
    ]);

    const revenue = paidAgg[0]?.total || 0;

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recent = await Appointment.countDocuments({
      createdAt: { $gte: sevenDaysAgo },
    });

    return res.json({
      success: true,
      stats: { total, revenue, recentLast7Days: recent },
    });
  } catch (err) {
    console.error("getStats Error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// 8. Get Appointments Filtered by Doctor
export const getAppointmentByDoctor = async (req, res) => {
  try {
    const { doctorId } = req.params;
    if (!doctorId) {
      return res.status(400).json({
        success: false,
        message: "Doctor Id required.",
      });
    }

    const {
      mobile,
      status,
      search = "",
      limit: limitRaw = 50,
      page: pageRaw = 1,
    } = req.query;

    const limit = Math.min(200, Math.max(1, parseInt(limitRaw, 10) || 50));
    const page = Math.max(1, parseInt(pageRaw, 10) || 1);
    const skip = (page - 1) * limit;

    const filter = { doctorId };
    if (mobile) filter.mobile = mobile;
    if (status) filter.status = status;
    if (search) {
      const re = new RegExp(search, "i");
      filter.$or = [{ patientName: re }, { mobile: re }, { notes: re }];
    }

    const items = await Appointment.find(filter)
      .sort({ date: 1, time: 1 })
      .skip(skip)
      .limit(limit)
      .populate("doctorId", "name specialization owner imageUrl image")
      .lean();

    const total = await Appointment.countDocuments(filter);

    return res.json({
      success: true,
      appointments: items,
      meta: { page, limit, total, count: items.length },
    });
  } catch (err) {
    console.error("getAppointmentByDoctor Error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// 9. Get Total Registered Users Count via Clerk
export async function getRegisteredUserCount(req, res) {
  try {
    const totalUsers = await clerkClient.users.getCount();
    return res.json({ success: true, totalUsers });
  } catch (err) {
    console.error("getRegisteredUserCount Error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

export default {
  getAppointments,
  getAppointmentsByPatient,
  createAppointment,
  confirmPayment,
  updateAppointment,
  cancelAppointment,
  getStats,
  getAppointmentByDoctor,
  getRegisteredUserCount,
};