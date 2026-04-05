"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import useUser from "@/lib/hooks/useUser";
import { useCallback } from "react";
import {
  ActiveOrders,
  PastOrders,
} from "@/lib/ui/screen-components/protected/profile";
import { IOrder } from "@/lib/utils/interfaces/orders.interface";
import { useTranslations } from "next-intl";
import ErrorDisplay from "@/lib/ui/useable-components/slider-error-display";

export default function OrderHistoryScreen() {
  const [page, setPage] = useState(1);
  const [activeOrders, setActiveOrders] = useState<IOrder[]>([]);
  const [pastOrders, setPastOrders] = useState<IOrder[]>([]);
  const [activeOrderHasMore, setActiveOrderHasMore] = useState(true);
  const [pastOrderHasMore, setPastOrderHasMore] = useState(true);
  const limit = 5;
  const t = useTranslations();

  const { profile } = useUser();

  const [activeOrderLoading, setActiveOrderLoading] = useState(false);
  const [pastOrderLoading, setPastOrderLoading] = useState(false);
  const [activeOrderError, setActiveOrderError] = useState<any>(null);
  const [pastOrderError, setPastOrderError] = useState<any>(null);

  const fetchActiveOrders = useCallback(async (pageNum: number) => {
    if (!profile?._id) return;
    try {
      setActiveOrderLoading(true);
      const from = (pageNum - 1) * limit;
      const to = from + limit - 1;

      const { data, error } = await supabase
        .from('orders')
        .select('*, restaurant:restaurants(*)')
        .eq('profile_id', profile._id)
        .in('order_status', ['PENDING', 'ACCEPTED', 'PICKED', 'STARTED', 'PREPARED', 'DISPATCHED'])
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;

      setActiveOrders((prev) => {
        const newOrders = (data || []).map((o: any) => ({ ...o, _id: o.id }));
        const filtered = newOrders.filter(o => !prev.some(p => p._id === o._id));
        return [...prev, ...filtered];
      });

      if ((data || []).length < limit) setActiveOrderHasMore(false);
    } catch (err) {
      setActiveOrderError(err);
    } finally {
      setActiveOrderLoading(false);
    }
  }, [profile?._id, limit]);

  const fetchPastOrders = useCallback(async (pageNum: number) => {
    if (!profile?._id) return;
    try {
      setPastOrderLoading(true);
      const from = (pageNum - 1) * limit;
      const to = from + limit - 1;

      const { data, error } = await supabase
        .from('orders')
        .select('*, restaurant:restaurants(*)')
        .eq('profile_id', profile._id)
        .in('order_status', ['DELIVERED', 'COMPLETED', 'CANCELLED', 'REJECTED'])
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;

      setPastOrders((prev) => {
        const newOrders = (data || []).map((o: any) => ({ ...o, _id: o.id }));
        const filtered = newOrders.filter(o => !prev.some(p => p._id === o._id));
        return [...prev, ...filtered];
      });

      if ((data || []).length < limit) setPastOrderHasMore(false);
    } catch (err) {
      setPastOrderError(err);
    } finally {
      setPastOrderLoading(false);
    }
  }, [profile?._id, limit]);

  useEffect(() => {
    if (profile?._id) {
      fetchActiveOrders(1);
      fetchPastOrders(1);
    }
  }, [profile?._id, fetchActiveOrders, fetchPastOrders]);

  // Merging is now handled in fetch functions

  const loadMore = () => {
    if (!activeOrderHasMore && !pastOrderHasMore) return;
    const nextPage = page + 1;
    setPage(nextPage);
    if (activeOrderHasMore) fetchActiveOrders(nextPage);
    if (pastOrderHasMore) fetchPastOrders(nextPage);
  };

  
  const retryInitialLoad = () => {
    setPage(1);
    setActiveOrderHasMore(true);
    setPastOrderHasMore(true);
    setActiveOrders([]);
    setPastOrders([]);
    fetchActiveOrders(1);
    fetchPastOrders(1);
  };


  if (activeOrderError || pastOrderError) {
  return (
    <div className="flex flex-col items-center justify-center h-full">
      <ErrorDisplay
        message={activeOrderError?.message || pastOrderError?.message}
        onRetry={retryInitialLoad}
      />
    </div>
  );
}


  return (
    <div className="flex flex-col space-y-10 my-10">
      {/* Active Orders */}
      <ActiveOrders
        activeOrders={activeOrders}
        isOrdersLoading={activeOrderLoading && activeOrders.length === 0} // initial load only
      />

      {/* Past Orders */}
      <PastOrders
        pastOrders={pastOrders}
        isOrdersLoading={pastOrderLoading && pastOrders.length === 0} // initial load only
      />

      {/* Load More Button */}
      {(activeOrderHasMore || pastOrderHasMore) && (
        <div className="flex justify-center">
          <button
            onClick={loadMore}
            disabled={activeOrderLoading || pastOrderLoading}
            className="flex items-center space-x-2 px-6 py-3 bg-primary-color dark:text-black text-white font-semibold rounded-full shadow-md hover:bg-primary-color transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {activeOrderLoading || pastOrderLoading ? (
              <>
                <svg
                  className="animate-spin h-5 w-5 dark:text-black text-white"
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
                    d="M4 12a8 8 0 018-8v8H4z"
                  ></path>
                </svg>
                <span>{t("loading_orders")}</span>
              </>
            ) : (
              <span>{t("show_more_orders")}</span>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
