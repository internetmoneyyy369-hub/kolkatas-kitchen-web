"use client";

import type React from "react";
import { useRouter } from "next/navigation";
// Queries

import { supabase } from "@/lib/supabase";
import useUser from "@/lib/hooks/useUser";
import { useEffect, useState } from "react";
// Components
import FavouriteCardsGrid from "@/lib/ui/useable-components/favourite-cards-grid";
import CardSkeletonGrid from "@/lib/ui/useable-components/card-skelton-grid";
import HeaderFavourite from "../header";
import FavoritesEmptyState from "@/lib/ui/useable-components/favorites-empty-state";
//Methods
import useDebounceFunction from "@/lib/hooks/useDebounceForFunction";
import { useTranslations } from "next-intl";

const FavouriteProducts = () => {
  const router= useRouter()
  const t = useTranslations()
  const { profile } = useUser()
  const [favouriteRestaurants, setFavouriteRestaurants] = useState<any[]>([]);
  const [isFavouriteRestaurantsLoading, setIsFavouriteRestaurantsLoading] = useState(true);

  useEffect(() => {
    const fetchFavourites = async () => {
      if (!profile?._id) {
        setIsFavouriteRestaurantsLoading(false);
        return;
      }

      try {
        setIsFavouriteRestaurantsLoading(true);
        // 1. Get favourite IDs from profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('favourite')
          .eq('id', profile._id)
          .single();

        if (profileError) throw profileError;

        if (profileData?.favourite && profileData.favourite.length > 0) {
          // 2. Fetch restaurants by IDs
          const { data: restaurantData, error: restaurantError } = await supabase
            .from('restaurants')
            .select('*')
            .in('id', profileData.favourite);

          if (restaurantError) throw restaurantError;
          setFavouriteRestaurants(restaurantData || []);
        } else {
          setFavouriteRestaurants([]);
        }
      } catch (err) {
        console.error("Error fetching favourites:", err);
      } finally {
        setIsFavouriteRestaurantsLoading(false);
      }
    };

    fetchFavourites();
  }, [profile?._id]);
  
  //Handlers
  // Handle See All Click
  const handleSeeAllClick = useDebounceFunction(() => {
    // use route state to handle fetching all favourites Restaurants on that page
    router.push("/see-all/favourites");
  }, 500);

  // use debouncefunction if user click multiple times at once it will call function only 1 time
  const handleClickFavRestaurant = useDebounceFunction(
    (FavRestaurantId: string | undefined, shopType: string | undefined, slug: string | undefined) => {
      router.push( `/${shopType === "restaurant" ? "restaurant" : "store"}/${slug}/${FavRestaurantId}`);
    },
    500 // Debounce time in milliseconds
  );

  return (
    <div className="w-full py-6 flex flex-col gap-6">
      <HeaderFavourite
        title={t('your_fav')}
        onSeeAllClick={handleSeeAllClick}
      />
      {isFavouriteRestaurantsLoading ? (
        <CardSkeletonGrid count={4} />
      ) : favouriteRestaurants && favouriteRestaurants.length > 0 ? (
        <FavouriteCardsGrid items={favouriteRestaurants}
        handleClickFavRestaurant={handleClickFavRestaurant}
        />
      ) : (
        <FavoritesEmptyState/>
      )}
    </div>
  );
};

export default FavouriteProducts;
