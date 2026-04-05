import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Marker } from "@react-google-maps/api";
import RiderMarker from "../../../../../assets/rider_icon.png";

interface TrackingRiderProps {
  id: string;
  onLocationUpdate?: (location: { lat: number; lng: number }) => void;
}

const TrackingRider = ({ id, onLocationUpdate }: TrackingRiderProps) => {
  const [riderLocation, setRiderLocation] = useState<{ lat: number; lng: number } | null>(null);

  // Load initial location and subscribe to updates
  useEffect(() => {
    const fetchInitialLocation = async () => {
      try {
        const { data, error } = await supabase
          .from('riders')
          .select('current_location')
          .eq('id', id)
          .single();

        if (error) throw error;
        if (data?.current_location) {
          // current_location is a PostGIS point
          // In Supabase it's often returned as a GeoJSON-like object or a string
          const loc = data.current_location;
          if (loc.coordinates) {
             const newLoc = {
               lat: loc.coordinates[1],
               lng: loc.coordinates[0]
             };
             setRiderLocation(newLoc);
             if (onLocationUpdate) onLocationUpdate(newLoc);
          }
        }
      } catch (err) {
        console.error("Error fetching rider location:", err);
      }
    };

    fetchInitialLocation();

    // Subscribe to rider location updates
    const channel = supabase
      .channel(`rider-location-${id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'riders',
          filter: `id=eq.${id}`,
        },
        (payload) => {
          const newLoc = payload.new.current_location;
          if (newLoc?.coordinates) {
            const loc = {
              lat: newLoc.coordinates[1],
              lng: newLoc.coordinates[0]
            };
            setRiderLocation(loc);
            if (onLocationUpdate) onLocationUpdate(loc);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, onLocationUpdate]);

  if (!riderLocation) return null;

  return (
    <Marker
      position={riderLocation}
      icon={{
        url: RiderMarker.src,
        scaledSize: new window.google.maps.Size(40, 40),
      }}
    />
  );
};

export default TrackingRider;
