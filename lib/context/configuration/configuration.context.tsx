"use client";

import getEnv from "@/environment";
import { supabase } from "@/lib/supabase";
import { ENV } from "@/lib/utils/constants";

// Interfaces
import { IConfigProps } from "@/lib/utils/interfaces";

// Supabase & Interface
import { Libraries } from "@react-google-maps/api";

// Core
import React, { ReactNode, useContext } from "react";

const ConfigurationContext = React.createContext({} as IConfigProps);

export const ConfigurationProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const [configuration, setConfiguration] = React.useState({
    currency: "USD",
    currencySymbol: "$",
    deliveryRate: 0,
    costType: "perKM",
  } as any);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchConfig = async () => {
      try {
        const { data, error } = await supabase
          .from('configuration')
          .select('*')
          .single();

        if (error) throw error;
        if (data) {
          // Map snake_case to camelCase if needed, or use as is
          setConfiguration({
            ...data,
            webClientID: data.web_client_id || data.publishable_key,
            publishableKey: data.publishable_key,
            clientId: data.paypal_client_id || data.secret_key,
            googleApiKey: data.google_api_key,
            webAmplitudeApiKey: data.web_amplitude_api_key,
            googleColor: data.google_color,
            webSentryUrl: data.web_sentry_url,
            skipEmailVerification: data.skip_email_verification,
            skipMobileVerification: data.skip_mobile_verification,
            testOtp: data.test_otp,
            deliveryRate: data.delivery_rate,
            costType: data.cost_type,
            currency: data.currency,
            currencySymbol: data.currency_symbol,
            firebaseKey: data.firebase_key,
            projectId: data.firebase_project_id,
            storageBucket: data.firebase_storage_bucket,
            msgSenderId: data.firebase_msg_sender_id,
            appId: data.firebase_app_id,
            measurementId: data.firebase_measurement_id,
            vapidKey: data.firebase_vapid_key,
            authDomain: data.firebase_auth_domain
          });
        }
      } catch (err) {
        console.error("Error fetching config:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchConfig();
  }, []);

  
  const GOOGLE_CLIENT_ID = configuration.webClientID;
  const STRIPE_PUBLIC_KEY = configuration.publishableKey;
  const PAYPAL_KEY = configuration.clientId;
  const GOOGLE_MAPS_KEY = configuration.googleApiKey;
  const AMPLITUDE_API_KEY = configuration.webAmplitudeApiKey;
  const LIBRARIES = "places,drawing,geometry".split(",") as Libraries;
  const COLORS = {
    GOOGLE: configuration.googleColor as string,
  };
  const SENTRY_DSN = configuration.webSentryUrl;
  const SKIP_EMAIL_VERIFICATION = configuration.skipEmailVerification;
  const SKIP_MOBILE_VERIFICATION = configuration.skipMobileVerification;
  const CURRENCY = configuration.currency;
  const CURRENCY_SYMBOL = configuration.currencySymbol;
  const DELIVERY_RATE = configuration.deliveryRate;
  const COST_TYPE = configuration.costType;
  const TEST_OTP = configuration.testOtp;

  const FIREBASE_KEY = configuration?.firebaseKey;
  const FIREBASE_PROJECT_ID = configuration?.projectId;
  const FIREBASE_STORAGE_BUCKET = configuration?.storageBucket;
  const FIREBASE_MSG_SENDER_ID = configuration?.msgSenderId;
  const FIREBASE_APP_ID = configuration?.appId;
  const FIREBASE_MEASUREMENT_ID = configuration?.measurementId;
  const FIREBASE_VAPID_KEY = configuration?.vapidKey;
  const FIREBASE_AUTH_DOMAIN = configuration?.authDomain;

  const { SERVER_URL } = getEnv(ENV);

  return (
    <ConfigurationContext.Provider
      value={{
        GOOGLE_CLIENT_ID,
        STRIPE_PUBLIC_KEY,
        PAYPAL_KEY,
        GOOGLE_MAPS_KEY,
        AMPLITUDE_API_KEY,
        LIBRARIES,
        COLORS,
        SENTRY_DSN,
        SKIP_EMAIL_VERIFICATION,
        SKIP_MOBILE_VERIFICATION,
        CURRENCY,
        CURRENCY_SYMBOL,
        DELIVERY_RATE,
        COST_TYPE,
        TEST_OTP,
        SERVER_URL,
        FIREBASE_KEY,
        FIREBASE_APP_ID,
        FIREBASE_VAPID_KEY,
        FIREBASE_MEASUREMENT_ID,
        FIREBASE_MSG_SENDER_ID,
        FIREBASE_PROJECT_ID,
        FIREBASE_STORAGE_BUCKET,
        FIREBASE_AUTH_DOMAIN

      }}
    >
      {children}
    </ConfigurationContext.Provider>
  );
};
export const ConfigurationConsumer = ConfigurationContext.Consumer;
export const useConfig = () => useContext(ConfigurationContext);
