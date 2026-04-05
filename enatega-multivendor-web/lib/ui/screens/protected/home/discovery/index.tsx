"use client";
import {
  DiscoveryBannerSection,
  CommingSoonScreen,
  OutletPicker,
} from "@/lib/ui/screen-components/protected/home";
import SliderSkeleton from "@/lib/ui/useable-components/custom-skeletons/slider.loading.skeleton";
import { useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import useNearByRestaurantsPreview from "@/lib/hooks/useNearByRestaurantsPreview";
import { isRestaurantOpen } from "@/lib/utils/constants/isRestaurantOpen";
import { IRestaurant } from "@/lib/utils/interfaces";

export default function DiscoveryScreen() {
  const {
    loading: restaurantsLoading,
    restaurantsData = [],
    error: restaurantsError,
  } = useNearByRestaurantsPreview(true, 1, 6);

  const router = useRouter();
  const hasRedirectedRef = useRef(false);

  const sortedOutlets = useMemo(() => {
    return [...restaurantsData].sort((a: IRestaurant, b: IRestaurant) => {
      const left = Number(a.distanceWithCurrentLocation ?? Number.MAX_SAFE_INTEGER);
      const right = Number(b.distanceWithCurrentLocation ?? Number.MAX_SAFE_INTEGER);
      return left - right;
    });
  }, [restaurantsData]);

  const selectedOutlet = useMemo(() => {
    if (!sortedOutlets.length) return null;
    const openOutlets = sortedOutlets.filter((outlet) => isRestaurantOpen(outlet as any));
    if (openOutlets.length) return openOutlets[0];

    const availableOutlets = sortedOutlets.filter((outlet) => outlet.isActive && outlet.isAvailable);
    if (availableOutlets.length) return availableOutlets[0];

    return sortedOutlets[0];
  }, [sortedOutlets]);

  useEffect(() => {
    if (restaurantsLoading || hasRedirectedRef.current || !selectedOutlet) return;
    hasRedirectedRef.current = true;
    router.replace(
      `/${selectedOutlet.shopType === "restaurant" ? "restaurant" : "store"}/${selectedOutlet.slug}/${selectedOutlet._id}`,
    );
  }, [restaurantsLoading, router, selectedOutlet]);

  if (restaurantsData.length === 0 && !restaurantsLoading) {
    return <CommingSoonScreen />;
  }

  if (!restaurantsLoading && selectedOutlet) {
    const distance = Number(selectedOutlet.distanceWithCurrentLocation ?? 0);
    return (
      <div className="flex min-h-[65vh] flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="rounded-full bg-primary-light px-4 py-2 text-xs font-semibold uppercase tracking-widest text-primary-dark">
          Kolkatas Kitchen Delhi Launch
        </p>
        <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white">
          Auto-selecting your nearest open outlet
        </h1>
        <p className="max-w-xl text-sm text-gray-600 dark:text-gray-300">
          We found the best branch for quick delivery in New Delhi.
          {distance > 0 ? ` Approx ${distance.toFixed(1)} km away.` : ""}
        </p>
        <SliderSkeleton />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4">
      <div className="mt-8 rounded-2xl bg-gradient-to-r from-[#FC8019] via-[#FD9A47] to-[#FDBA74] px-6 py-8 text-white shadow-lg">
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest">Kolkatas Kitchen</p>
        <h2 className="mb-2 text-2xl font-extrabold sm:text-3xl">
          One Brand. Two Karol Bagh Outlets. Kolkata Taste Delivered.
        </h2>
        <p className="text-sm sm:text-base">
          We auto-pick the nearest open outlet and only show in-stock menu items for a faster checkout funnel.
        </p>
      </div>

      <DiscoveryBannerSection />

      <OutletPicker data={sortedOutlets} loading={restaurantsLoading} error={!!restaurantsError} />
    </div>
  );
}
