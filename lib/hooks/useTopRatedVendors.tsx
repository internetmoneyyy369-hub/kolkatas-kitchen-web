import { useMemo } from "react";
import useNearByRestaurantsPreview from "./useNearByRestaurantsPreview";

function useTopRatedVendors(enabled = true) {
  const { queryData, loading, error } = useNearByRestaurantsPreview(enabled, 1, 100);

  const sortedData = useMemo(() => {
    return [...(queryData || [])].sort(
      (a: any, b: any) => Number(b.reviewAverage || b.rating || 0) - Number(a.reviewAverage || a.rating || 0)
    );
  }, [queryData]);

  return {
    queryData: sortedData,
    error,
    loading,
  };
}

export default useTopRatedVendors;
