import { supabase } from "@/lib/supabase";
import { useState, useEffect, useCallback } from "react";

export default function useRestaurant(id: string, slug?: string) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  const fetchRestaurantData = useCallback(async () => {
    if (!id && !slug) return;
    try {
      setLoading(true);
      
      // 1. Fetch Restaurant & Zone & Opening Times
      let query = supabase
        .from('restaurants')
        .select(`
          *,
          zone:zones(*),
          opening_times(*)
        `);
      
      if (id) query = query.eq('id', id);
      else if (slug) query = query.eq('slug', slug);

      const { data: restaurant, error: restError } = await query.single();
      if (restError) throw restError;

      // 2. Fetch Menu (Categories -> Foods -> Variations)
      const { data: categories, error: catError } = await supabase
        .from('categories')
        .select(`
          *,
          foods(*, variations:food_variations(*))
        `)
        .eq('restaurant_id', restaurant.id)
        .eq('is_active', true);
      
      if (catError) throw catError;

      // 3. Fetch Options and Addons
      const { data: options, error: optError } = await supabase
        .from('options')
        .select('*')
        .eq('restaurant_id', restaurant.id)
        .eq('is_active', true);
      
      if (optError) throw optError;

      const { data: addons, error: addonError } = await supabase
        .from('addons')
        .select('*')
        .eq('restaurant_id', restaurant.id)
        .eq('is_active', true);

      if (addonError) throw addonError;

      // 4. Fetch Reviews
      const { data: reviews, error: revError } = await supabase
        .from('reviews')
        .select('*, profile:profiles(id, name)')
        .eq('restaurant_id', restaurant.id)
        .limit(10);
      
      if (revError) throw revError;

      // Map Supabase data to the expected GraphQL interface structure
      const mappedData = {
        restaurant: {
          ...restaurant,
          _id: restaurant.id,
          shopType: restaurant.shop_type,
          deliveryTime: restaurant.delivery_time,
          minimumOrder: restaurant.minimum_order,
          commissionRate: restaurant.commission_rate,
          isActive: restaurant.is_active,
          isAvailable: restaurant.is_available,
          reviewCount: restaurant.review_count,
          reviewAverage: restaurant.review_average,
          openingTimes: (restaurant.opening_times || []).reduce((acc: any[], curr: any) => {
            const day = curr.day;
            const existing = acc.find(item => item.day === day);
            const timeSlot = {
              startTime: curr.start_time?.split(':') || ["00", "00"],
              endTime: curr.end_time?.split(':') || ["00", "00"]
            };
            if (existing) {
              existing.times.push(timeSlot);
            } else {
              acc.push({ day, times: [timeSlot] });
            }
            return acc;
          }, []),
          categories: (categories || []).map(cat => ({
            ...cat,
            _id: cat.id,
            foods: (cat.foods || [])
              .filter((food: any) => food?.is_active !== false && food?.is_out_of_stock !== true)
              .map((food: any) => ({
                ...food,
                _id: food.id,
                subCategory: food.sub_category,
                isOutOfStock: food.is_out_of_stock,
                variations: (food.variations || [])
                  .filter((v: any) => v?.is_active !== false)
                  .map((v: any) => ({
                    ...v,
                    _id: v.id
                  }))
              }))
          }))
          .filter((cat: any) => (cat.foods || []).length > 0),
          options: (options || []).map(opt => ({ ...opt, _id: opt.id })),
          addons: (addons || []).map(addon => ({ ...addon, _id: addon.id })),
          reviewData: {
            total: restaurant.review_count || 0,
            ratings: restaurant.review_average || 0,
            reviews: (reviews || []).map(rev => ({
              ...rev,
              _id: rev.id,
              order: { user: rev.profile }
            }))
          },
          location: {
            coordinates: [
              Number(restaurant.location?.coordinates?.[0] || 0),
              Number(restaurant.location?.coordinates?.[1] || 0)
            ]
          }
        }
      };

      setData(mappedData);
    } catch (err) {
      setError(err);
      console.error("Error fetching restaurant:", err);
    } finally {
      setLoading(false);
    }
  }, [id, slug]);

  useEffect(() => {
    fetchRestaurantData();
  }, [fetchRestaurantData]);

  return { data, refetch: fetchRestaurantData, networkStatus: 7, loading, error };
}
