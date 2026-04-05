import { supabase } from "@/lib/supabase";
import { useState, useEffect, useCallback } from "react";

export default function useReviews(restaurant: string) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  const fetchReviews = useCallback(async () => {
    if (!restaurant) return;
    try {
      setLoading(true);
      const { data: reviews, error: fetchError } = await supabase
        .from('reviews')
        .select('*, profile:profiles(id, name, email), order:orders(*)')
        .eq('restaurant_id', restaurant)
        .eq('is_active', true);

      if (fetchError) throw fetchError;

      setData({
        reviewsByRestaurant: {
          reviews: reviews.map(r => ({
            ...r,
            _id: r.id,
            order: { ...r.order, user: r.profile }
          })),
          ratings: 0, // Calculated if needed
          total: reviews.length
        }
      });
    } catch (err) {
      setError(err);
      console.error("Error fetching reviews:", err);
    } finally {
      setLoading(false);
    }
  }, [restaurant]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  return { data, refetch: fetchReviews, networkStatus: 7, loading, error };
}
