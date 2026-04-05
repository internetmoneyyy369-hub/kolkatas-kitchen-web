
"use client";

import { useEffect } from "react";
import { getToken } from "@/lib/config/firebase";
import { supabase } from "@/lib/supabase";
import { useConfig } from "@/lib/context/configuration/configuration.context";
import { setupFirebase } from "@/lib/config/firebase";

export default function NotificationInitializer() {

  const {
    FIREBASE_KEY,
    FIREBASE_AUTH_DOMAIN,
    FIREBASE_PROJECT_ID,
    FIREBASE_MSG_SENDER_ID,
    FIREBASE_APP_ID,
    FIREBASE_STORAGE_BUCKET,
    FIREBASE_VAPID_KEY,
  } = useConfig();

  useEffect( () => {
   
    const firebaseConfig = {
      apiKey: FIREBASE_KEY,
      authDomain: FIREBASE_AUTH_DOMAIN,
      projectId: FIREBASE_PROJECT_ID,
      storageBucket: FIREBASE_STORAGE_BUCKET,
      messagingSenderId: FIREBASE_MSG_SENDER_ID,
      appId: FIREBASE_APP_ID,
    };

    const initNotifications = async () => {
      const localToken = localStorage.getItem("token");
      const userId = localStorage.getItem("userId");
    
      if (
        Notification.permission === "default" &&
        localToken &&
        userId
      ) {
        const permission = await Notification.requestPermission();


        if (permission == "granted") {
          await supabase
            .from('profiles')
            .update({
              is_order_notification: true,
              is_offer_notification: true,
            })
            .eq('id', userId);

          const { messaging } = setupFirebase(firebaseConfig);
          const registration = await navigator.serviceWorker.ready;

          const fcmToken = await getToken(messaging, {
            vapidKey: FIREBASE_VAPID_KEY,
            serviceWorkerRegistration: registration,
          });
          
          if (fcmToken) {
            await supabase
              .from('profiles')
              .update({ notification_token: fcmToken })
              .eq('id', userId);
          } else {
            console.warn("❌ Failed to get FCM token");
          }
        } else {
          console.warn("🔕 Notification permission denied");
        }
      }
    };

    initNotifications();
  }, [
    FIREBASE_KEY,
    FIREBASE_AUTH_DOMAIN,
    FIREBASE_PROJECT_ID,
    FIREBASE_MSG_SENDER_ID,
    FIREBASE_APP_ID,
    FIREBASE_STORAGE_BUCKET,
    FIREBASE_VAPID_KEY,
  ]);

  return null;
}
