import { supabase } from "@/lib/supabase";
import { useState } from "react";

export default function useVerifyOtp() {
  const [error, setError] = useState<any>(null);

  const verifyOTP = async (
    payload:
      | { phone?: string; email?: string; otp: string }
      | { variables: { phone?: string; email?: string; otp: string } }
  ) => {
    try {
      const variables = "variables" in payload ? payload.variables : payload;
      const isPhoneOtp = !!variables.phone;

      const { data, error: verifyError } = await supabase.auth.verifyOtp(
        isPhoneOtp
          ? {
              phone: variables.phone || "",
              token: variables.otp,
              type: "sms",
            }
          : {
              email: variables.email || "",
              token: variables.otp,
              type: "email",
            }
      );

      if (verifyError) throw verifyError;
      return {
        data: {
          ...data,
          verifyOtp: {
            result: data?.user ? "verified" : "",
          },
        },
      };
    } catch (err) {
      setError(err);
      throw err;
    }
  };

  return {
    verifyOTP,
    error,
  };
}
