import { useMemo } from "react";
import useNearByRestaurantsPreview from "./useNearByRestaurantsPreview";
import { IRestaurant } from "../utils/interfaces/restaurants.interface";

const useMostOrderedRestaurants = (
  enabled = true,
  page = 1,
  limit = 10,
  shopType?: "restaurant" | "grocery" | null
) => {
  const { queryData, loading, error, fetchMore } = useNearByRestaurantsPreview(
    enabled,
    page,
    limit,
    shopType
  );

  const sortedData = useMemo(() => {
    return [...(queryData || [])].sort(
      (a: any, b: any) => (b.reviewCount || 0) - (a.reviewCount || 0)
    );
  }, [queryData]);

  return {
    queryData: sortedData,
    loading,
    error,
    networkStatus: 7,
    restaurantsData: sortedData.filter(
      (r: IRestaurant) => r.shopType?.toLowerCase() === "restaurant" || !r.shopType
    ),
    groceriesData: sortedData.filter(
      (r: IRestaurant) => r.shopType?.toLowerCase() === "grocery"
    ),
    fetchMore,
  };
};

export default useMostOrderedRestaurants;
