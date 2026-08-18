import axios from "axios";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const API_BASE = "https://hospital-management-system-alpha-lime.vercel.app";

const VerifyPaymentPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const verifyPayment = async () => {
      const params = new URLSearchParams(location.search || "");
      const sessionId = params.get("session_id");

      console.log("VerifyPaymentPage mounted! SessionId:", sessionId);

      if (!sessionId) {
        if (!cancelled) navigate("/appointments?payment_status=Failed", { replace: true });
        return;
      }

      try {
        // Updated route path to match your backend confirmPayment route
        const res = await axios.get(`${API_BASE}/api/appointments/confirm`, {
          params: { session_id: sessionId },
          timeout: 15000,
        });

        console.log("API Verification response:", res?.data);

        if (cancelled) return;

        if (res?.data?.success) {
          navigate("/appointments?payment_status=Paid", { replace: true });
        } else {
          navigate("/appointments?payment_status=Failed", { replace: true });
        }
      } catch (error) {
        console.error("Payment verification failed:", error);
        if (!cancelled) navigate("/appointments?payment_status=Failed", { replace: true });
      }
    };

    verifyPayment();

    return () => {
      cancelled = true;
    };
  }, [location, navigate]);

  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "60vh" }}>
      <h2>{loading ? "Verifying your payment..." : "Redirecting..."}</h2>
    </div>
  );
};

export default VerifyPaymentPage;