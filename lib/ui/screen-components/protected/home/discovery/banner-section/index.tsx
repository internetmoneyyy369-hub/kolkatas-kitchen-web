import { Carousel } from "primereact/carousel";
import { supabase } from "@/lib/supabase";
// loading skeleton
import DiscoveryBannerSkeleton from "@/lib/ui/useable-components/custom-skeletons/banner.skeleton";
// banner card
import BannerCard from "./banner-card";
import { useEffect, useState } from "react";

export default function DiscoveryBannerSection() {
  const [banners, setBanners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    const fetchBanners = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('banners')
          .select('*')
          .eq('is_active', true);

        if (error) throw error;
        setBanners(data || []);
      } catch (err) {
        console.error("Error fetching banners:", err);
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchBanners();
  }, []);

   // Check if RTL (client-side only)
   const [isRTL, setIsRTL] = useState(false);
   useEffect(() => {
     setIsRTL(document.documentElement.dir === "rtl");
   }, []);
  
  if (loading) {
    return <DiscoveryBannerSkeleton />;
  }
  if (error) {
    return;
  }

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="mt-10 sm:mt-0">
    <Carousel
      className={`discovery-carousel ${isRTL ? "rtl-carousel" : ""}`} // Add RTL class
      value={banners}
      numVisible={2}
      numScroll={1}
      circular
      style={{ width: "100%" }}
      showNavigators
      showIndicators={false}
      itemTemplate={(item) => <BannerCard item={item} />}
      autoplayInterval={5000}
      responsiveOptions={[
        { breakpoint: "768px", numVisible: 1, numScroll: 1 }, // Mobile
        { breakpoint: "1024px", numVisible: 2, numScroll: 1 }, // Tablets
      ]}
    />
    </div>
  );
}
