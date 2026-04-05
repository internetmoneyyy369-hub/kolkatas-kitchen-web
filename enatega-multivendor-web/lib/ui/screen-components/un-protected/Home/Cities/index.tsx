"use client";

import { supabase } from "@/lib/supabase";
import ListItem from "@/lib/ui/useable-components/list-item";
import CitiesTiles from "./CitilesTiles/CitiesTiles";
import { CountryItem, City } from "@/lib/utils/interfaces/Home-interfaces";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

const Cities = () => {
  const [toggle, setToggle] = useState(false);
  const [countryId, setCountryId] = useState("");
  const [zones, setZones] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchZones = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('zones')
          .select('*')
          .eq('is_active', true);

        if (error) throw error;
        // Map zones to CountryItem format (or just id/name)
        const mappedZones = data?.map(z => ({
          _id: z.id,
          name: z.title,
        })) || [];
        setZones(mappedZones);
      } catch (err) {
        console.error("Error fetching zones:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchZones();
  }, []);

  const onCountryClick = (item: any) => {
    setToggle(true);
    setCountryId(item._id);
  };

  const AllCountrybuttonClick = () => {
    setToggle(false);
  };
  const t = useTranslations();

  return (
    <div>
      {toggle == false ?
        <>
          <div className="text-[#111827] dark:text-white text-xl font-semibold ">
           {t('selectCity')}
          </div>
          {/* <div className="flex flex-wrap gap-6 items-center  my-[30px]"> */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 items-center my-[30px]">
            {loading ?
              [...Array(8)].map((_, index) => (
                <ListItem key={index} loading={true} />
              ))
            : zones?.map((item: any, index: number) => (
                <ListItem key={index} item={item} onClick={onCountryClick} />
              ))
            }
          </div>
        </>
      : <div className="bg-green">
          <CitiesTiles
            countryId={countryId}
            AllCountries={AllCountrybuttonClick}
          />
        </div>
      }
    </div>
  );
};

export default Cities;
