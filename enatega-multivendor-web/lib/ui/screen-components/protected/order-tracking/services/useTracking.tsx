import { supabase } from "@/lib/supabase";
import { useState, useEffect, useCallback } from "react";
function useTracking({ orderId }: { orderId: string }) {
  const [orderDetails, setOrderDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchOrderDetails = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('orders')
        .select('*, restaurant:restaurants(*), rider:riders(*)')
        .eq('id', orderId)
        .single();
      
      if (error) throw error;
      setOrderDetails(data);
    } catch (err) {
      console.error("Error fetching order tracking:", err);
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetchOrderDetails();

    // Subscribe to order updates
    const channel = supabase
      .channel(`order-tracking-${orderId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${orderId}`,
        },
        (payload) => {
          console.log('Order update received:', payload);
          setOrderDetails((prev: any) => ({ ...prev, ...payload.new }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId, fetchOrderDetails]);

  return {
    orderTrackingDetails: orderDetails,
    isOrderTrackingDetailsLoading: loading,
    subscriptionData: orderDetails, // In Supabase, the merged state is simpler
  };
}

export default useTracking;
