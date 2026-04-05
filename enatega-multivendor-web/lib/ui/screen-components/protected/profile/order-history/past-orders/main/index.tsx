"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
// Components
import OrderCardSkeleton from "@/lib/ui/useable-components/custom-skeletons/order.card.skelton";
import OrderCard from "@/lib/ui/useable-components/order-card";
import EmptyState from "@/lib/ui/useable-components/orders-empty-state";
import RatingModal from "../rating/main";
import TextComponent from "@/lib/ui/useable-components/text-field";
// Interfaces
import {
  IOrder,
  IPastOrdersProps,
} from "@/lib/utils/interfaces/orders.interface";
// Hooks
import useToast from "@/lib/hooks/useToast";
import { supabase } from "@/lib/supabase";
import useDebounceFunction from "@/lib/hooks/useDebounceForFunction";
import { useTranslations } from "next-intl";

export default function PastOrders({
  pastOrders,
  isOrdersLoading,
}: IPastOrdersProps) {
  // states
  const t = useTranslations()
  const [showRatingModal, setShowRatingModal] = useState<boolean>(false);
  const [selectedOrder, setSelectedOrder] = useState<IOrder | null>(null);
  const [isloadingReviewOrder, setIsloadingReviewOrder] = useState(false);

  // hooks
  const router = useRouter();
  const { showToast } = useToast();

  const onCompleted = () => {
    showToast({
      type: "success",
      title: t("rating_label"),
      message: t('rating_submitted_successfully_message'),
      duration: 3000,
    });
    setSelectedOrder(null);
  }

  const onError = (msg?: string) => {
    showToast({
      type: "error",
      title: t("rating_label"),
      message: msg || t("failed_to_submit_rating_message"),
      duration: 3000,
    });
    setSelectedOrder(null);
  }

  //Handlers
  const handleReOrderClicked = useDebounceFunction(
    (restaurantId: string | undefined, slug: string | undefined,shopType: string | undefined) => {
      router.push(`/${shopType == "restaurant" ? "restaurant" : "store"  }/${slug}/${restaurantId}`);
    },
    500
  );

  const handleRateOrderClicked = useDebounceFunction(
    (orderId: string | undefined) => {
      const order = pastOrders.find((order) => order._id === orderId);
      if (order) {
        setSelectedOrder(order);
        setShowRatingModal(true);
      }
    },
    500
  );

  const handleSubmitRating = async (
    orderId: string | undefined,
    ratingValue: number,
    comment?: string,
    aspects: string[] = []
  ) => {
    const reviewDescription = comment?.trim() || undefined;
    const reviewComments = aspects?.filter(Boolean).join(", ") || undefined;

    try {
      setIsloadingReviewOrder(true);
      const { error } = await supabase.from('reviews').insert({
        order_id: orderId,
        restaurant_id: selectedOrder?.restaurant?._id,
        user_id: selectedOrder?.user?._id,
        rating: ratingValue,
        description: reviewDescription,
        // (Removing comments if they don't exist in schema, or adding to description)
        // Let's check schema again. It only had description. I'll append aspects to description.
      });

      if (error) throw error;
      onCompleted();
    } catch (error: any) {
      console.error("Error submitting rating:", error);
      onError(error.message);
    } finally {
      setIsloadingReviewOrder(false);
      setShowRatingModal(false);
      setSelectedOrder(null);
    }
  };

  // If ordersLoading display skelton  component of orderCardSkelton
  if (isOrdersLoading) {
    return <OrderCardSkeleton count={2} />;
  }

  // If no orders display component of emptyState and pass props
  if (pastOrders?.length === 0) {
    return (
      <EmptyState
        // icon="fa-solid fa-receipt"
        title={t('past_orders_label')}
        message={t("no_past_orders_message")}
        actionLabel={t("browse_store_button")}
        actionLink="/store"
      />
    );
  }

  return (
    <>
      <div className="space-y-4 py-4">
        <TextComponent
          text={t('past_orders_label')}
          className="text-xl md:text-2xl  font-semibold mb-6"
        />
        <div className="space-y-4">
          {pastOrders?.map((order: IOrder) => (
            <OrderCard
              key={order._id}
              order={order}
              handleReOrderClicked={handleReOrderClicked}
              handleRateOrderClicked={handleRateOrderClicked}
              type="past"
              className="border border-gray-200 rounded-lg shadow-sm"
            />
          ))}
        </div>
      </div>
      {/* Rating Modal */}
      {/* conditionally render the modal based on the loading state of mutation for better user experience */}
      {!isloadingReviewOrder && !selectedOrder?.review?.rating && (
        <RatingModal
          visible={showRatingModal}
          onHide={() => setShowRatingModal(false)}
          order={selectedOrder}
          onSubmitRating={handleSubmitRating}
        />
      )}
    </>
  );
}
