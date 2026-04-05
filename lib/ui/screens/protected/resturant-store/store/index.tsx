"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Skeleton } from "primereact/skeleton";
import { Dialog } from "primereact/dialog";
import Image from "next/image";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus } from "@fortawesome/free-solid-svg-icons";
import { useTranslations } from "next-intl";

import useRestaurant from "@/lib/hooks/useRestaurant";
import useUser from "@/lib/hooks/useUser";
import { useConfig } from "@/lib/context/configuration/configuration.context";
import { supabase } from "@/lib/supabase";
import { toSlug } from "@/lib/utils/methods";
import { HeartSvg } from "@/lib/utils/assets/svg";
import Loader from "@/app/(localized)/mapview/[slug]/components/Loader";
import FoodItemDetail from "@/lib/ui/useable-components/item-detail";
import FoodCategorySkeleton from "@/lib/ui/useable-components/custom-skeletons/food-items.skeleton";
import EmptySearch from "@/lib/ui/useable-components/empty-search-results";
import { ICategory, IFood } from "@/lib/utils/interfaces";

export default function StoreDetailsScreen() {
  const t = useTranslations();
  const { id, slug }: { id: string; slug: string } = useParams();
  const { CURRENCY_SYMBOL } = useConfig();
  const { profile } = useUser();
  const { data, loading } = useRestaurant(id, decodeURIComponent(slug));

  const [showDialog, setShowDialog] = useState<IFood | null>(null);
  const [isLiked, setIsLiked] = useState(false);
  const [addFavoriteLoading, setAddFavoriteLoading] = useState(false);

  useEffect(() => {
    if (profile?.favourite) {
      setIsLiked(profile.favourite.includes(id));
    }
  }, [profile, id]);

  const deals = useMemo(() => {
    const categories =
      data?.restaurant?.categories?.filter((cat: ICategory) => cat.foods.length) || [];

    return categories
      .map((category: ICategory) => {
        const groupedFoods = category.foods.reduce(
          (acc: Record<string, IFood[]>, food: IFood) => {
            const key =
              typeof food.subCategory === "string" && food.subCategory.trim()
                ? food.subCategory.trim()
                : t("StoresPage.Uncategorized");
            if (!acc[key]) acc[key] = [];
            acc[key].push(food);
            return acc;
          },
          {}
        );

        const subCategories = Object.entries(groupedFoods).map(([title, foods]) => ({
          _id: `${category._id}-${toSlug(title)}`,
          title,
          foods,
        }));

        return {
          ...category,
          subCategories,
        };
      })
      .filter((category) => category.subCategories.length > 0);
  }, [data?.restaurant?.categories, t]);

  const handleFavoriteClick = async () => {
    if (!profile?._id) return;
    try {
      setAddFavoriteLoading(true);
      if (isLiked) {
        const newFavs = (profile.favourite || []).filter((favId: string) => favId !== id);
        const { error } = await supabase
          .from("profiles")
          .update({ favourite: newFavs })
          .eq("id", profile._id);
        if (error) throw error;
        setIsLiked(false);
      } else {
        const newFavs = [...(profile.favourite || []), id];
        const { error } = await supabase
          .from("profiles")
          .update({ favourite: newFavs })
          .eq("id", profile._id);
        if (error) throw error;
        setIsLiked(true);
      }
    } catch (error) {
      console.error("Error toggling favorite:", error);
    } finally {
      setAddFavoriteLoading(false);
    }
  };

  if (loading) {
    return (
      <>
        <Skeleton width="100%" height="20rem" borderRadius="0" />
        <FoodCategorySkeleton />
      </>
    );
  }

  return (
    <div className="pb-10">
      <div className="relative">
        <Image
          src={data?.restaurant?.image || ""}
          alt="Store banner"
          width={1200}
          height={300}
          className="w-full h-72 object-cover"
        />
        <button
          onClick={handleFavoriteClick}
          disabled={addFavoriteLoading}
          className="absolute top-4 right-4 rounded-full bg-white dark:bg-gray-700 h-8 w-8 flex justify-center items-center"
        >
          {addFavoriteLoading ? (
            <Loader style={{ width: "1.5rem", height: "1.5rem" }} />
          ) : (
            <HeartSvg filled={isLiked} />
          )}
        </button>
      </div>

      <div className="px-4 py-4">
        <h1 className="text-2xl font-bold">{data?.restaurant?.name}</h1>
        <p className="text-gray-600 dark:text-gray-300">{data?.restaurant?.address}</p>
      </div>

      {deals.length === 0 && (
        <div className="text-center py-6 text-gray-500 dark:text-gray-400 flex flex-col items-center justify-center">
          <EmptySearch />
        </div>
      )}

      <div className="px-4">
        {deals.map((category: any) => (
          <div key={category._id} className="mb-8" id={toSlug(category.title)}>
            <h2 className="mb-2 font-bold text-2xl">{category.title}</h2>
            {category.subCategories.map((subCategory: any) => (
              <div key={subCategory._id} className="mb-4">
                <h3 className="mb-2 font-semibold text-lg">{subCategory.title}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {subCategory.foods.map((meal: IFood) => (
                    <div
                      key={meal._id}
                      className="flex items-center gap-3 rounded-lg border border-gray-200 dark:border-gray-700 p-3 bg-white dark:bg-gray-800 cursor-pointer"
                      onClick={() => setShowDialog({ ...meal, restaurant: data?.restaurant?._id })}
                    >
                      <div className="flex-grow">
                        <p className="font-semibold">{meal.title}</p>
                        <p className="text-sm text-gray-500 line-clamp-2">{meal.description}</p>
                        <p className="text-secondary-color font-semibold">
                          {CURRENCY_SYMBOL} {meal.variations?.[0]?.price}
                        </p>
                      </div>
                      <div className="relative w-24 h-24">
                        <Image
                          alt={meal.title}
                          className="w-full h-full rounded-md object-cover"
                          src={meal.image}
                          width={96}
                          height={96}
                        />
                        <button
                          type="button"
                          className="absolute top-1 right-1 rounded-full w-6 h-6 bg-secondary-color text-white"
                        >
                          <FontAwesomeIcon icon={faPlus} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      <Dialog
        visible={!!showDialog}
        contentClassName="dark:bg-gray-800 dark:text-gray-300"
        headerClassName="dark:bg-gray-800 dark:text-gray-300"
        className="mx-3 sm:mx-4 md:mx-0"
        onHide={() => setShowDialog(null)}
        showHeader={false}
        contentStyle={{
          borderTopLeftRadius: "4px",
          borderTopRightRadius: "4px",
          padding: "0px",
        }}
        style={{ borderRadius: "1rem" }}
      >
        {showDialog && (
          <FoodItemDetail
            foodItem={showDialog}
            addons={data?.restaurant?.addons}
            options={data?.restaurant?.options}
            onClose={() => setShowDialog(null)}
          />
        )}
      </Dialog>
    </div>
  );
}
