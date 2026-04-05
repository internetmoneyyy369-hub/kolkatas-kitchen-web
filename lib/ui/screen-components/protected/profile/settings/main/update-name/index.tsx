"use client";

import type React from "react";
import { useEffect, useState } from "react";
import { InputText } from "primereact/inputtext";
// Api
import { useAuth } from "@/lib/context/auth/auth.context";
import { supabase } from "@/lib/supabase";
// Components
import CustomDialog from "@/lib/ui/useable-components/custom-dialog";
import CustomButton from "@/lib/ui/useable-components/button";
// Icons
import { LaptopSvg } from "@/lib/utils/assets/svg";
// Hooks
import useToast from "@/lib/hooks/useToast";
import useDebounceFunction from "@/lib/hooks/useDebounceForFunction";
import { useTranslations } from "next-intl";
interface UserFormData {
  firstName: string;
  lastName: string;
}

export default function NameUpdateModal({
  isUpdateNameModalVisible,
  handleUpdateNameModal,
  existedName
}: {
  isUpdateNameModalVisible: boolean;
  handleUpdateNameModal: () => void;
  existedName: string;
}) {

  // States
  const nameParts = existedName?.trim().split(" ") || [];
  const [firstName, ...rest] = nameParts;
  const lastName = rest.join(" ");
  const [formData, setFormData] = useState<UserFormData>({
    firstName: "",
    lastName: "",
  });

  // Hooks    
  const { showToast } = useToast();

  const { user, setRefetchProfileData } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const t = useTranslations();

  const handleUpdateUser = async (fullName: string) => {
    if (!user?.id) return;
    try {
      setIsSubmitting(true);
      const { error } = await supabase
        .from('profiles')
        .update({ name: fullName })
        .eq('id', user.id);

      if (error) throw error;

      setRefetchProfileData(true);
      showToast({
        type: "success",
        title: t("toast_success"),
        message: t('user_profile_updated_successfully'),
      });
      handleUpdateNameModal?.();
    } catch (error: any) {
      showToast({
        type: "error",
        title: t("toast_error"),
        message: error.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // handlers
  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = useDebounceFunction(() => {
    const fullName = `${formData.firstName} ${formData.lastName}`.trim();
    handleUpdateUser(fullName);
  }, 500);

  // Handle cancel
  const handleCancel = () => {
    // Reset form or navigate back
    setFormData({
      firstName: firstName || "",
      lastName: lastName || "",
    });
    handleUpdateNameModal?.()
  };

  // useeffects

  useEffect(() => {
    setFormData({
      firstName: firstName || "",
      lastName: lastName || "",
    });
  }, [existedName]);

  return (
    <CustomDialog
      visible={isUpdateNameModalVisible}
      onHide={handleUpdateNameModal}
      width="600px"
    >
      <div className="flex flex-col  items-center  p-4">
        <div className=" flex items-center justify-center">
          <LaptopSvg width={250} height={250} />
        </div>
        <div className="w-full">
          <div className="">
            <h2 className="text-2xl font-extrabold mb-10 text-black dark:text-white">{t("nameLabel")}</h2>
            <div className="p-float-label mb-6">
              <InputText
                id="firstName"
                name="firstName"
                value={formData.firstName}
                onChange={handleInputChange}
                className="w-full p-3 border-2 border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-md"
              />
              <label className="text-gray-600 dark:text-gray-300" htmlFor="firstName">{t("first_name_label")}</label>
            </div>
            <div className="p-float-label">
              <InputText
                id="lastName"
                name="lastName"
                value={formData.lastName}
                onChange={handleInputChange}
                className="w-full p-3 border-2 border-gray-300 dark:border-gray-600 rounded-md 
                     bg-white dark:bg-gray-800 text-black dark:text-white"

              />
              <label className="text-gray-600 dark:text-gray-300" htmlFor="lastName">{t("last_name_label")}</label>
            </div>
          </div>
        </div>
      </div>
      <div className="flex flex-row w-full justify-between  gap-2 md:gap-0 px-4 ">
        <CustomButton
          label={t('cancel_label')}
          className="bg-white dark:bg-gray-800 flex items-center justify-center rounded-full border border-gray-300 dark:border-gray-600 dark:text-gray-200 p-3 w-full md:w-[268px] h-14 text-lg font-medium"
          onClick={handleCancel}
        />

        <CustomButton
          label={isSubmitting ? t('saving_label') : t('save_label')}
          className="bg-primary-color text-white flex items-center justify-center rounded-full p-3 w-full md:w-[268px] mb-4 h-14 text-lg font-medium"
          onClick={handleSubmit}
          loading={isSubmitting}
        />
      </div>
    </CustomDialog>
  );
}
