import { supabase } from "@/lib/supabase";
import { useState, useEffect } from "react";
// interfaces
import { ICuisinesResponse, ICuisinesData } from "@/lib/utils/interfaces";
// context
import { useUserAddress } from "../context/address/address.context";
import { toFloatIfNeeded } from "../utils/methods/helpers";

const useGetCuisines = (enabled = true, shoptype?: string) => {
  const { userAddress } = useUserAddress();
  const userLongitude = userAddress?.location?.coordinates[0] || 0;
  const userLatitude = userAddress?.location?.coordinates[1] || 0;

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  const fetchCuisines = async () => {
    if (!enabled) return;
    try {
      setLoading(true);
      const { data: cuisines, error: fetchError } = await supabase
        .from("cuisines")
        .select("*")
        .eq("is_active", true);

      if (fetchError) throw fetchError;
      const mappedCuisines = (cuisines || []).map((item: any) => ({
        ...item,
        _id: item.id,
        shopType: item.shopType || item.shop_type,
      }));
      setData({ nearByRestaurantsCuisines: mappedCuisines });
    } catch (err) {
      setError(err);
      console.error("Error fetching cuisines:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCuisines();
  }, [enabled]);

  let queryData = data?.nearByRestaurantsCuisines;

  let restaurantCuisinesData: ICuisinesData[] = Array.isArray(
    data?.nearByRestaurantsCuisines
  )
    ? data.nearByRestaurantsCuisines.filter(
      (item) => item.shopType?.toLowerCase() === "restaurant"
      )
    : [];

  let groceryCuisinesData: ICuisinesData[] = Array.isArray(
    data?.nearByRestaurantsCuisines
  )
    ? data.nearByRestaurantsCuisines.filter(
      (item) => item.shopType?.toLowerCase() === "grocery"
      )
    : [];
  return {
    queryData,
    loading,
    error,
    networkStatus: 7,
    restaurantCuisinesData,
    groceryCuisinesData,
  };
};

export default useGetCuisines;
