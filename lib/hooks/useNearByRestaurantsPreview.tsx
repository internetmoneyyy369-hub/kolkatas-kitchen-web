import { supabase } from "@/lib/supabase";
import { useCallback, useEffect, useState } from "react";
import { INearByRestaurantsPreviewData, IRestaurant } from "../utils/interfaces/restaurants.interface";
import { useUserAddress } from "../context/address/address.context";

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
    distanceWithCurrentLocation:
      item?.distanceWithCurrentLocation ?? item?.distance_km ?? 0,
    location: { coordinates: [Number(coords[0]) || 0, Number(coords[1]) || 0] },
  };
};

const useNearByRestaurantsPreview = (
  enabled = true,
  page = 1,
  limit = 10,
  shopType?: string | null
) => {
  const { userAddress } = useUserAddress();
  const userLongitude = Number(userAddress?.location?.coordinates[0]) || 0;
  const userLatitude = Number(userAddress?.location?.coordinates[1]) || 0;

  const [data, setData] = useState<INearByRestaurantsPreviewData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<any>(null);

  const fetchNearby = useCallback(
    async (queryVars?: { page?: number; limit?: number; shopType?: string | null }) => {
      if (!enabled) return { data: { nearByRestaurantsPreview: { restaurants: [] } } };

      const currentPage = queryVars?.page ?? page;
      const currentLimit = queryVars?.limit ?? limit;
      const currentShopType = queryVars?.shopType ?? shopType ?? null;

      try {
        setLoading(true);
        const { data: response, error: funcError } = await supabase.functions.invoke(
          "near-by-restaurants",
          {
            body: {
              latitude: userLatitude,
              longitude: userLongitude,
              shopType: currentShopType,
              page: currentPage,
              limit: currentLimit,
            },
          }
        );

        if (funcError) throw funcError;

        const restaurants = Array.isArray(response?.restaurants)
          ? response.restaurants.map(normalizeRestaurant)
          : [];

        if (currentPage === page) {
          setData({ nearByRestaurantsPreview: { restaurants } });
        }

        return { data: { nearByRestaurantsPreview: { restaurants } } };
      } catch (err) {
        setError(err);
        console.error("Error fetching nearby restaurants:", err);
        return { data: { nearByRestaurantsPreview: { restaurants: [] } } };
      } finally {
        setLoading(false);
      }
    },
    [enabled, userLatitude, userLongitude, page, limit, shopType]
  );

  useEffect(() => {
    fetchNearby();
  }, [fetchNearby]);

  const queryData: IRestaurant[] = data?.nearByRestaurantsPreview?.restaurants ?? [];

  const groceriesData: IRestaurant[] = queryData.filter(
    (item) => item?.shopType?.toLowerCase() === "grocery"
  );

  const restaurantsData: IRestaurant[] = queryData.filter(
    (item) => item?.shopType?.toLowerCase() === "restaurant"
  );

  const fetchMore = async (vars?: any) => {
    const variables = vars?.variables || vars || {};
    return fetchNearby({
      page: variables.page ?? page + 1,
      limit: variables.limit ?? limit,
      shopType: variables.shopType ?? shopType ?? null,
    });
  };

  return {
    queryData,
    loading,
    error,
    networkStatus: 7,
    groceriesData,
    restaurantsData,
    fetchMore,
  };
};

export default useNearByRestaurantsPreview;
