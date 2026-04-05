"use client";

import React from "react";
import Card from "@/lib/ui/useable-components/card";
import SliderSkeleton from "@/lib/ui/useable-components/custom-skeletons/slider.loading.skeleton";
import { useTranslations } from "next-intl";
import { IRestaurant } from "@/lib/utils/interfaces/restaurants.interface";
import { isRestaurantOpen } from "@/lib/utils/constants/isRestaurantOpen";

interface OutletPickerProps {
  data: IRestaurant[];
  loading: boolean;
  error: boolean;
}

const OutletPicker: React.FC<OutletPickerProps> = ({ data, loading, error }) => {
  const t = useTranslations();

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mt-8">
        {[...Array(4)].map((_, i) => (
          <SliderSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (error || !data || data.length === 0) {
    return null;
  }

  return (
    <div className="mb-20 mt-12 px-4 md:px-0">
      <div className="mb-8 flex flex-col">
        <h2 className="mb-2 text-3xl font-bold text-gray-900 dark:text-white">
          {t("select_outlet_heading") || "Karol Bagh Outlets"}
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          {t("select_outlet_subheading") ||
            "Outlet selection fallback is available below in case auto-selection fails."}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {data.map((outlet) => {
          const distance = Number(outlet.distanceWithCurrentLocation ?? 0);
          const open = isRestaurantOpen(outlet as any);

          return (
            <div key={outlet._id} className="w-full">
              <div className="mb-2 flex items-center justify-between px-2 text-xs">
                <span
                  className={`rounded-full px-2 py-1 font-semibold ${
                    open
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-rose-100 text-rose-700"
                  }`}
                >
                  {open ? "Open now" : "Closed"}
                </span>
                {distance > 0 && (
                  <span className="rounded-full bg-primary-light px-2 py-1 font-semibold text-primary-dark">
                    {distance.toFixed(1)} km
                  </span>
                )}
              </div>
              <Card
                item={outlet}
                isModalOpen={{ value: false, id: "" }}
                handleUpdateIsModalOpen={() => {}}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default OutletPicker;
