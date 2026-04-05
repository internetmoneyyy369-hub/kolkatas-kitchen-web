import { supabase } from "@/lib/supabase";
import { useState, useEffect, useCallback } from "react";
import useUser from "./useUser";
import { IRestaurant } from "@/lib/utils/interfaces";

const normalizeRestaurant = (item: any): IRestaurant => {
  const coords = Array.isArray(item?.location?.coordinates)
    ? item.location.coordinates
    : [0, 0];

  return {
    ...item,
    _id: item?._id || item?.id,
    shopType: item?.shopType || item?.shop_type,
    deliveryTime: item?.deliveryTime ?? item?.delivery_time ?? 0,
    minimumOrder: item?.minimumOrder ?? item?.minimum_order ?? 0,
    commissionRate: item?.commissionRate ?? item?.commission_rate ?? 0,
    reviewCount: item?.reviewCount ?? item?.review_count ?? 0,
    reviewAverage: item?.reviewAverage ?? item?.review_average ?? 0,
    isActive: item?.isActive ?? item?.is_active ?? true,
    isAvailable: item?.isAvailable ?? item?.is_available ?? true,
    orderPrefix: item?.orderPrefix ?? item?.order_prefix ?? "",
    location: { coordinates: [Number(coords[0]) || 0, Number(coords[1]) || 0] },
  };
};

function useRecentOrderRestaurants(enabled = true) {
  const { profile } = useUser();
  const [data, setData] = useState<IRestaurant[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<any>(null);

  const fetchRecentRestaurants = useCallback(async () => {
    if (!enabled || !profile?._id) return;
    try {
      setLoading(true);
      const { data: orders, error: fetchError } = await supabase
        .from("orders")
        .select("restaurant:restaurants(*)")
        .eq("user_id", profile._id)
        .order("created_at", { ascending: false })
        .limit(10);

      if (fetchError) throw fetchError;

      const uniqueRestaurants = Array.from(
        new Map((orders || []).map((order: any) => [order.restaurant?.id, order.restaurant])).values()
      ).filter(Boolean);

      setData(uniqueRestaurants.map(normalizeRestaurant));
    } catch (err) {
      setError(err);
      console.error("Error fetching recent restaurants:", err);
    } finally {
      setLoading(false);
    }
  }, [enabled, profile?._id]);

  useEffect(() => {
    fetchRecentRestaurants();
  }, [fetchRecentRestaurants]);

  return {
    queryData: data,
    loading,
    error,
  };
}

export default useRecentOrderRestaurants;
