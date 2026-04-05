"use client";

import CuisinesSliderCard from "@/lib/ui/useable-components/cuisines-slider-card";
import CuisinesSliderSkeleton from "@/lib/ui/useable-components/custom-skeletons/cuisines.slider.skeleton";
import { useTranslations } from "next-intl";
import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";

function ShopTypes() {
  const t = useTranslations();
  const [shopTypes, setShopTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchShopTypes = async () => {
      try {
        setLoading(true);
        setError(null);
        const { data, error: fetchError } = await supabase
          .from("shop_types")
          .select("*")
          .eq("is_active", true)
          .order("created_at", { ascending: true });

        if (fetchError) throw fetchError;

        const mappedShopTypes = (data || []).map((shopType: any) => {
          const normalizedName = String(shopType.name || "").trim();
          return {
            ...shopType,
            _id: shopType.id,
            name: normalizedName,
            slug: normalizedName.toLowerCase().replace(/\s+/g, "-"),
          };
        });

        setShopTypes(mappedShopTypes);
      } catch (fetchError: any) {
        setError(fetchError);
      } finally {
        setLoading(false);
      }
    };

    fetchShopTypes();
  }, []);

  if (loading) {
    return <CuisinesSliderSkeleton />;
  }

  if (error) {
    return (
      <div className="mt-7 px-4">
        <div className="flex justify-start mb-4">
          <h2 className="font-inter font-bold text-xl sm:text-2xl text-gray-900 dark:text-white">
            {t("shop-types")}
          </h2>
        </div>

        <div className="flex flex-col items-center justify-center py-10 border border-red-400  rounded-md ">
          <p className="text-red-400 text-center mb-3">
            Unable to fetch shop types.
          </p>

        </div>
      </div>
    );
  }

  return (
    <CuisinesSliderCard
      title="shop-types"
      data={shopTypes}
      showLogo={false}
      cuisines={false}
      shopTypes={true}
    />
  );
}

export default ShopTypes;
