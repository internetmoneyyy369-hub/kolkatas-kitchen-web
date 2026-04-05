"use client";

import { supabase } from "@/lib/supabase";
import ListItem from "@/lib/ui/useable-components/list-item";
import { useRouter } from "next/navigation";
import {
  CitiesTilesProps,
  City,
  CountryItem,
} from "@/lib/utils/interfaces/Home-interfaces";

// Assets
import { CircleCrossSvg } from "@/lib/utils/assets/svg";
import { onUseLocalStorage } from "@/lib/utils/methods/local-storage";
import { useUserAddress } from "@/lib/context/address/address.context";
import { USER_CURRENT_LOCATION_LS_KEY } from "@/lib/utils/constants";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

const CitiesTiles: React.FC<CitiesTilesProps> = ({
  countryId,
  AllCountries,
}) => {
  const router = useRouter();
  const { setUserAddress } = useUserAddress();
  const [outlets, setOutlets] = useState<any[]>([]);
  const [zoneName, setZoneName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Get zone name
        const { data: zoneData } = await supabase
          .from('zones')
          .select('title')
          .eq('id', countryId)
          .single();
        if (zoneData) setZoneName(zoneData.title);

        // Get restaurants (outlets) in this zone
        const { data: restaurantData, error } = await supabase
          .from('restaurants')
          .select('*')
          .eq('zone_id', countryId)
          .eq('is_active', true);

        if (error) throw error;
        
        const mappedOutlets = restaurantData?.map(r => ({
          ...r,
          _id: r.id,
          name: r.name,
          // Extract lat/lng from PostGIS point if available
          latitude: r.location?.coordinates?.[1] || 0,
          longitude: r.location?.coordinates?.[0] || 0,
        })) || [];
        
        setOutlets(mappedOutlets);
      } catch (err) {
        console.error("Error fetching outlets for zone:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [countryId]);

  const t = useTranslations();

  const onCityClick = (item: City | CountryItem | void) => {
    if (!item || !("latitude" in item)) return;

    const city = item as City;

    onUseLocalStorage(
      "save",
      USER_CURRENT_LOCATION_LS_KEY,
      JSON.stringify({
        label: "Home",
        location: {
          coordinates: [city.longitude, city.latitude],
        },
        _id: "",

        deliveryAddress: `${city.name}`,
      })
    );

    setUserAddress({
      _id: "",
      label:"Home" ,
      location: {
        coordinates: [city.longitude, city.latitude],
      },
      deliveryAddress: `${city.name}`,
      details: `Selected from Cities List`,
    });

    router.push("/discovery");
  };

  return (
    <div>
      <div className="flex w-full justify-start items-center gap-x-2">
        <p className="text-[#111827] font-semibold text-xl"> {t("explore_cities")}</p>
        {zoneName && (
          <div className="relative flex gap-x-2">
            <p className="text-primary-color border-2 border-primary-color px-2 rounded">
              {zoneName}
            </p>

            {/* <button onClick={AllCountries}>All Countries</button> */}
            <div
              className="absolute -right-2 -top-2 cursor-pointer"
              onClick={AllCountries}
            >
              <CircleCrossSvg color="#ff0000" height={22} width={22} />
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-6 items-center justify-start my-[30px]">
        {loading ?
          [...Array(8)].map((_, index) => (
            <ListItem key={index} loading={true} onClick={() => {}} />
          ))
        : outlets?.map((item, index) => (
            <ListItem key={index} item={item} onClick={onCityClick} />
          ))
        }
      </div>
    </div>
  );
};

export default CitiesTiles;
