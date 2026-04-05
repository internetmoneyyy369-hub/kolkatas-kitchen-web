"use client";

import React, { useCallback, useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

import Card from "@/lib/ui/useable-components/card";
import SquareCard from "@/lib/ui/useable-components/square-card";
import SliderSkeleton from "@/lib/ui/useable-components/custom-skeletons/slider.loading.skeleton";
import HomeHeadingSection from "@/lib/ui/useable-components/home-heading-section";
import FavouriteCardsGrid from "@/lib/ui/useable-components/favourite-cards-grid";
import FavoritesEmptyState from "@/lib/ui/useable-components/favorites-empty-state";
import CardSkeletonGrid from "@/lib/ui/useable-components/card-skelton-grid";

import { IRestaurant } from "@/lib/utils/interfaces/restaurants.interface";

import useDebounceFunction from "@/lib/hooks/useDebounceForFunction";
import useQueryBySlug from "@/lib/hooks/useQueryBySlug";
import AuthGuard from "@/lib/hoc/auth.guard";
import { supabase } from "@/lib/supabase";
import useUser from "@/lib/hooks/useUser";

const RESTAURANT_SLUGS = new Set(["popular-restaurants", "popular-stores"]);

function SeeAllSection() {
  const router = useRouter();
  const params = useParams();
  const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug;

  const [isModalOpen, setIsModalOpen] = useState({ value: false, id: "" });
  const [items, setItems] = useState<IRestaurant[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [favouriteRestaurants, setFavouriteRestaurants] = useState<any[]>([]);
  const [isFavouriteRestaurantsLoading, setIsFavouriteRestaurantsLoading] =
    useState(true);
  const limit = 10;
  const { profile } = useUser();


  // Title from slug
  const title = slug
    ? slug.replaceAll("-", " ").replace(/^./, (str) => str.toUpperCase())
    : "";

  // --- Main data ---
  const { data, loading, error, fetchMore } = useQueryBySlug(slug, page, limit);

  // Reset when slug changes
  useEffect(() => {
    setItems([]);
    setPage(1);
    setHasMore(true);
  }, [slug]);

  // Append new data when it arrives
  useEffect(() => {
    if (Array.isArray(data) && data.length > 0) {
      setItems((prev) => {
        const ids = new Set(prev.map((i: any) => i._id ?? i.id));
        const appended = (data as any[]).filter(
          (i) => !ids.has(i._id ?? i.id)
        );
        return [...prev, ...appended];
      });

      if (data.length < limit) {
        setHasMore(false);
      }
    }
  }, [data, limit]);

  useEffect(() => {
    const fetchFavourites = async () => {
      if (slug !== "favourites") return;

      if (!profile?._id) {
        setFavouriteRestaurants([]);
        setIsFavouriteRestaurantsLoading(false);
        return;
      }

      try {
        setIsFavouriteRestaurantsLoading(true);

        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("favourite")
          .eq("id", profile._id)
          .single();

        if (profileError) throw profileError;

        if (!profileData?.favourite?.length) {
          setFavouriteRestaurants([]);
          return;
        }

        const { data: restaurants, error: restaurantError } = await supabase
          .from("restaurants")
          .select("*")
          .in("id", profileData.favourite);

        if (restaurantError) throw restaurantError;

        const mapped = (restaurants || []).map((restaurant: any) => ({
          ...restaurant,
          _id: restaurant.id,
          shopType: restaurant.shop_type,
          deliveryTime: restaurant.delivery_time,
          minimumOrder: restaurant.minimum_order,
          reviewAverage: restaurant.review_average,
          reviewCount: restaurant.review_count,
          isAvailable: restaurant.is_available,
          isActive: restaurant.is_active,
        }));

        setFavouriteRestaurants(mapped);
      } catch (fetchError) {
        console.error("Error fetching favourites:", fetchError);
        setFavouriteRestaurants([]);
      } finally {
        setIsFavouriteRestaurantsLoading(false);
      }
    };

    fetchFavourites();
  }, [slug, profile?._id]);

  // Debounced click handler for fav cards
  const handleClickFavRestaurant = useDebounceFunction(
    (
      FavRestaurantId: string | undefined,
      shopType: string | undefined,
      slug: string | undefined
    ) => {
      router.push(
        `/${shopType === "restaurant" ? "restaurant" : "store"}/${slug}/${FavRestaurantId}`
      );
    },
    500
  );

  const handleUpdateIsModalOpen = useCallback(
    (value: boolean, id: string) => {
      if (isModalOpen.value !== value || isModalOpen.id !== id) {
        setIsModalOpen({ value, id });
      }
    },
    [isModalOpen]
  );

  // Infinite scroll
  useEffect(() => {
    if (!fetchMore || !hasMore) return;

    const handleScroll = async () => {
      const scrollTop = document.body.scrollTop;
      const clientHeight = document.body.clientHeight;
      const scrollHeight = document.body.scrollHeight;

      const bottom = scrollTop + clientHeight >= scrollHeight - 200;

      if (bottom && !loading) {
        try {
          const newItems = await fetchMore({
            variables: { page: page + 1, limit },
          });

          if (newItems.length > 0) {
            setPage((p) => p + 1);
          } else {
            setHasMore(false);
          }
        } catch (err) {
          console.error("❌ Error fetching more:", err);
        }
      }
    };

    document.body.addEventListener("scroll", handleScroll);
    return () => document.body.removeEventListener("scroll", handleScroll);
  }, [fetchMore, hasMore, loading, page]);

  // --- Guarded favourites section ---
  const ProtectedLayout = ({ children }: { children: React.ReactNode }) => (
    <div className="protected-container">{children}</div>
  );
  const ProtectedFavRestaurants = AuthGuard(ProtectedLayout);

  if (slug === "favourites") {
    return (
      <ProtectedFavRestaurants>
        <div className="w-full py-6 flex flex-col gap-6">
          <HomeHeadingSection title={title} showFilter={false} />
          {isFavouriteRestaurantsLoading ? (
            <CardSkeletonGrid count={4} />
          ) : favouriteRestaurants.length > 0 ? (
            <FavouriteCardsGrid
              items={favouriteRestaurants}
              handleClickFavRestaurant={handleClickFavRestaurant}
              type={"seeAllFavourites"}
            />
          ) : (
            <FavoritesEmptyState />
          )}
        </div>
      </ProtectedFavRestaurants>
    );
  }

  if (loading && page === 1) return <SliderSkeleton />;
  if (error) return <div>Error loading data</div>;
  if (!items.length) return <div>No items found</div>;

  return (
    <>
      <HomeHeadingSection title={title} showFilter={false} />

      <div className="mb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 mt-4 items-center">
          {Array.isArray(items) &&
            RESTAURANT_SLUGS.has(slug || "") &&
            items.map((item) => (
              <SquareCard key={item._id} item={item} showLogo={true} />
            ))}

          {Array.isArray(items) &&
            !RESTAURANT_SLUGS.has(slug || "") &&
            items.map((item) => (
              <Card
                key={item._id}
                item={item}
                isModalOpen={isModalOpen}
                handleUpdateIsModalOpen={handleUpdateIsModalOpen}
              />
            ))}
        </div>

        {/* Infinite scroll loader */}
        {loading && hasMore && (
          <div className="flex justify-center mt-6">
            <div className="flex items-center gap-2 text-gray-500">
              <svg
                className="animate-spin h-5 w-5 text-primary"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                ></path>
              </svg>
              <span>Loading more...</span>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default SeeAllSection;
