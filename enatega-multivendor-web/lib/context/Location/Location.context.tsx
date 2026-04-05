import { supabase } from "@/lib/supabase";
import useNetworkStatus from "@/lib/hooks/useNetworkStatus";
import {
  IArea,
  ILocation,
  ILocationContext,
  ILocationProvider,
  IMapZone,
} from "@/lib/utils/interfaces";
import React, { useContext, useEffect, useRef, useState } from "react";

export const LocationContext = React.createContext({} as ILocationContext);

export const LocationProvider = ({ children }: ILocationProvider) => {
  // State
  const [location, setLocation] = useState<ILocation | null>(null);

  const [cities, setCities] = useState<IArea[] | []>([]);

  // Ref
  const isInitialRender = useRef(true);

  // Hooks
  const isOnline = useNetworkStatus();

  // API
  // API
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);
  const [data, setData] = useState<any>(null);

  const fetchZones = async () => {
    try {
      setLoading(true);
      const { data: zones, error: fetchError } = await supabase
        .from('zones')
        .select('*')
        .eq('is_active', true);

      if (fetchError) throw fetchError;
      setData({ zones });
    } catch (err) {
      setError(err);
      console.error("Error fetching zones:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchZones();
  }, []);

  // Effects

  useEffect(() => {
    if (!loading && !error && data) {
      const fetchedZones = data.zones || [];

      // Function to calculate centroid of a polygon
      const calculateCentroid = (coordinates: number[][][]) => {
        let x = 0,
          y = 0,
          area = 0;

        const points = coordinates[0]; // Assuming the first array contains the coordinates

        for (let i = 0; i < points?.length - 1; i++) {
          const x0 = points[i][0];
          const y0 = points[i][1];
          const x1 = points[i + 1][0];
          const y1 = points[i + 1][1];
          const a = x0 * y1 - x1 * y0;
          area += a;
          x += (x0 + x1) * a;
          y += (y0 + y1) * a;
        }

        area /= 2;
        x = x / (6 * area);
        y = y / (6 * area);

        return { latitude: y, longitude: x };
      };

      // Calculate centroids for each zone
      const centroids = fetchedZones.map((zone: any) => {
        // Handle Supabase geography (Point/Polygon)
        // If it's Polygon, it will be in GeoJSON format if queried as such, 
        // or we might need to parse it. For now assuming it's compatible or we'll wrap it.
        const coords = zone.location?.coordinates || [[[]]];
        const centroid = calculateCentroid(coords);
        return {
          id: zone.id,
          name: zone.title,
          ...centroid,
          location: zone.location,
        };
      });

      // Set this as the cities or the midpoint
      setCities(centroids);
    }
  }, [loading, error, data]);

  useEffect(() => {
    if (isOnline) {
      fetchZones(); // Refetch the data when the internet is back
    }
  }, [isOnline]);

  useEffect(() => {
    if (isInitialRender.current) {
      isInitialRender.current = false;
      return;
    }
    if (location) localStorage.setItem("location", JSON.stringify(location));
  }, [location]);

  useEffect(() => {
    const locationStr = localStorage.getItem("location");

    if (locationStr && locationStr !== "undefined") {
      setLocation(JSON.parse(locationStr));
    }
  }, []);

  return (
    <LocationContext.Provider value={{ location, setLocation, cities }}>
      {children}
    </LocationContext.Provider>
  );
};

export const useLocationContext = () => useContext(LocationContext);
