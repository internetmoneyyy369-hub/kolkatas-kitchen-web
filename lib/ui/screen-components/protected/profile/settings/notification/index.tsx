"use client"

import type React from "react"
import { useState } from "react"
import { useAuth } from "@/lib/context/auth/auth.context";
import { supabase } from "@/lib/supabase";
import useToast from "@/lib/hooks/useToast";
import CustomInputSwitch from "@/lib/ui/useable-components/custom-input-switch";
import TextComponent from "@/lib/ui/useable-components/text-field";
import { useTranslations } from "next-intl";

export default function NotificationSection() {
  const { user, setRefetchProfileData } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState<string | null>(null);

  // Handle push notifications toggle
  const handlePushNotificationsChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user?.id) return;
    const newValue = e.target.checked;
    try {
      setLoading('push');
      const { error } = await supabase
        .from('profiles')
        .update({ is_order_notification: newValue })
        .eq('id', user.id);

      if (error) throw error;
      setRefetchProfileData(true);
    } catch (error: any) {
      showToast({
        type: "error",
        title: "Error",
        message: error.message,
      });
    } finally {
      setLoading(null);
    }
  };

  // Handle email notifications toggle
  const handleEmailNotificationsChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user?.id) return;
    const newValue = e.target.checked;
    try {
      setLoading('offer');
      const { error } = await supabase
        .from('profiles')
        .update({ is_offer_notification: newValue })
        .eq('id', user.id);

      if (error) throw error;
      setRefetchProfileData(true);
    } catch (error: any) {
      showToast({
        type: "error",
        title: "Error",
        message: error.message,
      });
    } finally {
      setLoading(null);
    }
  };
  const t = useTranslations()

  return (
    <div className="w-full mx-auto">
      <TextComponent text={t('NotificationSection_title')} className=" font-semibold text-gray-700 text-xl md:text-2xl   mb-4" />

      {/* Push Notifications */}
      <div className="py-4 border-b">
        <div className="flex justify-between items-center">
          <TextComponent text={t('NotificationSection_push')} className="font-normal text-gray-700 text-base md:text-lg " />
          <CustomInputSwitch
            loading={loading === 'push'}
            isActive={user?.is_order_notification ?? true}
            onChange={handlePushNotificationsChange}
          />
        </div>
      </div>

      {/* Email Notifications */}
      <div className="py-4 border-b">
        <div className="flex justify-between items-center">
        <TextComponent text={t('NotificationSection_email')} className="font-normal text-gray-700 text-base md:text-lg   " />
          <CustomInputSwitch
            loading={loading === 'offer'}
            isActive={user?.is_offer_notification ?? true}
            onChange={handleEmailNotificationsChange}
          />
        </div>
      </div>
    </div>
  )
}