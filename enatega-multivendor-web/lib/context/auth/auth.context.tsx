"use client";

// Hooks
import useToast from "@/lib/hooks/useToast";
import { useTranslations } from "next-intl";
import {
  createContext,
  Dispatch,
  ReactNode,
  SetStateAction,
  useContext,
  useEffect,
  useState,
} from "react";

// Context
import { useConfig } from "../configuration/configuration.context";

// Supabase
import { supabase } from "@/lib/supabase";

// Interface & Types
import {
  IAuthContextProps,
  IAuthFormData,
  ICreateUserArguments,
  ICreateUserData,
  ICreateUserResponse,
  IEmailExists,
  IEmailExistsResponse,
  ILoginProfile,
  ILoginProfileResponse,
  IPhoneExistsResponse,
  ISendOtpToEmailResponse,
  ISendOtpToPhoneResponse,
  IUserLoginArguments,
} from "@/lib/utils/interfaces";

// Supabase & Interface
import { PostgrestError } from "@supabase/supabase-js";

// Google API
import { onUseLocalStorage } from "@/lib/utils/methods/local-storage";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { useRouter } from "next/navigation";

const AuthContext = createContext({} as IAuthContextProps);

export default function AuthProvider({ children }: { children: ReactNode }) {
  // States
  const [activePanel, setActivePanel] = useState(0);
  const [authToken, setAuthToken] = useState("");
  const [user, setUser] = useState<ILoginProfile | null>(null);
  const [isAuthModalVisible, setIsAuthModalVisible] = useState(false);
  const [otp, setOtp] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [refetchProfileData, setRefetchProfileData] = useState(false);

  // Hooks
  const {
    GOOGLE_CLIENT_ID,
    SKIP_EMAIL_VERIFICATION,
    SKIP_MOBILE_VERIFICATION,
    TEST_OTP,
  } = useConfig();
  const { showToast } = useToast();
  const t = useTranslations();
  const router = useRouter();


  // Checkers
  async function checkEmailExists(email: string): Promise<IEmailExists> {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('email', email)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      
      return {
        _id: data?.id || null,
        email: data?.email || null,
        emailExist: !!data
      } as any;
    } catch (err) {
      console.error("Error while checking email:", err);
      showToast({
        type: "error",
        title: t("email_check_error"),
        message: t("error_checking_email"),
        duration: 3000
      });
      return {} as any;
    } finally {
      setIsLoading(false);
    }
  }

  async function checkPhoneExists(phone: string): Promise<boolean> {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('phone', phone)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return !!data;
    } catch (err) {
      console.error("Error while checking phone:", err);
      showToast({
        type: "error",
        title: t("phone_check_error"),
        message: t("error_checking_phone"),
        duration: 3000
      });
      return true;
    } finally {
      setIsLoading(false);
    }
  }
  // handlers

  const handlePasswordReset = async (
    password: string,
    email: string,
    setFormData: Dispatch<SetStateAction<IAuthFormData>>
  ) => {
    try {
      setIsLoading(true);
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;

      showToast({
        type: "success",
        title: t("password_reset"),
        message: t("password_reset_sent"),
      });
      setFormData({} as IAuthFormData);
      setActivePanel(0);
    } catch (err) {
      console.error("Error while resetting password:", err);
      showToast({
        type: "error",
        title: t("password_reset_error"),
        message: t("error_resetting_password"),
        duration: 3000
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUserLogin = async (credentials: IUserLoginArguments) => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({
        email: credentials.email || "",
        password: credentials.password || "",
      });

      if (error) throw error;

      const userId = data.user.id;
      const token = data.session.access_token;

      localStorage.setItem("userId", userId);
      localStorage.setItem("token", token);

      // Fetch profile from public.profiles
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      const mappedUser = {
        userId: userId,
        token: token,
        name: profile?.name || '',
        email: data.user.email,
        phone: profile?.phone || '',
        emailIsVerified: !!data.user.email_confirmed_at,
        phoneIsVerified: profile?.phone_is_verified || false,
        ...profile
      };

      setUser(mappedUser as any);
      onLoginCompleted({ login: mappedUser } as any);

      return { login: mappedUser };
    } catch (err) {
      console.error("Login error:", err);
      showToast({
        type: "error",
        title: t("login_error"),
        message: t("invalid_credentials"),
      });
    } finally {
      setIsLoading(false);
      setRefetchProfileData(true);
    }
  };

  const handleCreateUser = async (
    userData: ICreateUserArguments
  ): Promise<ICreateUserData> => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.auth.signUp({
        email: userData.email || "",
        password: userData.password || "",
        options: {
          data: {
            name: userData.name,
          }
        }
      });

      if (error) throw error;

      if (data.user) {
        const userId = data.user.id;
        const token = data.session?.access_token || '';

        localStorage.setItem("token", token);
        localStorage.setItem("userId", userId);

        const newUser = {
          userId,
          email: data.user.email,
          name: userData.name,
          phone: userData.phone,
          token,
          emailIsVerified: !!data.user.email_confirmed_at,
          phoneIsVerified: false,
        };

        setUser(newUser as any);
        showToast({
          type: "success",
          title: t("create_user_label"),
          message: t("registration_success"),
        });
        return newUser as any;
      }
      return {} as any;
    } catch (err) {
      console.error("Signup error:", err);
      showToast({
        type: "error",
        title: t("create_user_label"),
        message: t("registration_error"),
        duration: 3000
      });
      return {} as any;
    } finally {
      setIsLoading(false);
      setRefetchProfileData(true);
    }
  };
  // GQL Handlers
  async function onLoginCompleted(data: ILoginProfileResponse) {
    try {
      setUser(data.login);

      localStorage.setItem("token", data?.login?.token ?? "");
      localStorage.setItem("userId", data?.login?.userId ?? "");
      if (!data.login.emailIsVerified) {
        setActivePanel(5);
      } else if (!data.login.phoneIsVerified) {
        setActivePanel(4);
      } else {
        if (data.login?.phoneIsVerified && data.login?.emailIsVerified) {
          setActivePanel(0);
          setIsAuthModalVisible(false);
          showToast({
            type: "success",
            title: t("login_success"),
            message: t("login_success_message"),
          });
        } else {
          setActivePanel(4);
        }
        router.push("/");
      }
    } catch (err) {
      console.error("Error while logging in:", err);
      showToast({
        type: "error",
        title: t("login_error"),
        message: t("invalid_credentials"),
      });
    }
  }

  function onLoginError(error: any) {
    console.error("Error while logging in:", error);
    if (error.message) {
      showToast({
        type: "error",
        title: t("login_error"),
        message: error.message,
      });
    } else {
      showToast({
        type: "error",
        title: t("login_error"),
        message: t("invalid_credentials"),
      });
    }
  }

  // OTP Handlers
  async function sendOtpToEmailAddress(email: string, type?: string) {
    try {
      setIsLoading(true);
      if (SKIP_EMAIL_VERIFICATION) {
        setOtp(TEST_OTP);
        if (type && type !== "password-recovery") {
          setActivePanel(5);
        }
        return;
      } else {
        const { error } = await supabase.auth.signInWithOtp({
          email: email,
        });
        if (!error) {
          if (type && type !== "password-recovery") {
            setActivePanel(3);
          }
          showToast({
            type: "info",
            title: t("email_verification_label"),
            message: t("please_enter_valid_otp_code_message"),
          });
          return;
        } else {
          showToast({
            type: "error",
            title: t("Error Sending OTP"),
            message: t("An error occurred while sending the OTP"),
            duration: 3000
          });
          return;
        }
      }
    } catch (err) {
      console.error("Error while sending OTP to email:", err);
      showToast({
        type: "error",
        title: t("email_otp_error"),
        message: t("error_sending_otp_to_email"),
        duration: 3000
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function sendOtpToPhoneNumber(phone: string) {
    try {
      setIsLoading(true);
      if (SKIP_MOBILE_VERIFICATION) {
        setOtp(TEST_OTP);
        setActivePanel(6);
        return;
      } else {
        const { error } = await supabase.auth.signInWithOtp({
          phone: phone,
        });
        if (error) {
          showToast({
            type: "error",
            title: t("error_sending_otp"),
            message: t("error_sending_otp_message"),
            duration: 3000
          });
          return;
        } else {
          showToast({
            type: "info",
            title: t("phone_verification_label"),
            message: t(
              `${t("otp_sent_phone_verify_number")} ${phone} ${t("please_verify_your_phone_number")}`
            ),
          });
          setActivePanel(6);
        }
      }
    } catch (err) {
      console.error("Error while sending OTP to phone:", err);
      showToast({
        type: "error",
        title: t("phone_otp_error"),
        message: t("error_sending_otp_to_phone"),
        duration: 3000
      });
    } finally {
      setIsLoading(false);
    }
  }

  // Use Effects
  useEffect(() => {
    if (typeof window === "undefined") return; // ⛔ Prevent SSR execution

    // Local Vars
    const token = localStorage.getItem("token");

    if (token) {
      setAuthToken(token);
    }
  }, [user]);

  useEffect(() => {
    if (typeof user?.token !== "undefined" && !!user?.token) {
      onUseLocalStorage("save", "userToken", user.token);
    }
    if (typeof user?.addresses !== "undefined" && !!user?.addresses) {
      onUseLocalStorage("save", "userAddress", JSON.stringify(user.addresses));
    }
  }, [user]);

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID ?? "not_found"}>
      <AuthContext.Provider
        value={{
          authToken,
          setAuthToken,
          user,
          setUser,
          checkEmailExists,
          checkPhoneExists,
          handleUserLogin,
          activePanel,
          setActivePanel,
          isAuthModalVisible,
          setIsAuthModalVisible,
          otp,
          setOtp,
          sendOtpToEmailAddress,
          sendOtpToPhoneNumber,
          handleCreateUser,
          setIsLoading,
          isLoading,
          isRegistering,
          setIsRegistering,
          refetchProfileData,
          setRefetchProfileData,
          handlePasswordReset,
        }}
      >
        {children}
      </AuthContext.Provider>
    </GoogleOAuthProvider>
  );
}

export const useAuth = () => useContext(AuthContext);
