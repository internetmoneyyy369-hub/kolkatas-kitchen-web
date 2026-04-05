-- ─────────────────────────────────────────────
-- RPC: Get Nearby Restaurants
-- ─────────────────────────────────────────────
create or replace function public.nearby_restaurants(
  p_latitude double precision,
  p_longitude double precision,
  p_radius_km double precision default 50,
  p_shop_type text default null
)
returns table (
  id uuid,
  order_prefix text,
  name text,
  image text,
  logo text,
  address text,
  location geography,
  delivery_time integer,
  minimum_order numeric,
  tax numeric,
  commission_rate numeric,
  shop_type shop_type_enum,
  cuisines text[],
  keywords text[],
  tags text[],
  rating numeric,
  review_count integer,
  review_average numeric,
  is_active boolean,
  is_available boolean,
  slug text,
  delivery_bounds geography,
  distance_km double precision
)
language plpgsql
security definer
as $$
declare
  v_point geography;
begin
  -- create a point for the given latitude and longitude
  -- ST_MakePoint takes (longitude, latitude)
  v_point := st_makepoint(p_longitude, p_latitude)::geography;

  return query
  select
    r.id,
    r.order_prefix,
    r.name,
    r.image,
    r.logo,
    r.address,
    r.location,
    r.delivery_time,
    r.minimum_order,
    r.tax,
    r.commission_rate,
    r.shop_type,
    r.cuisines,
    r.keywords,
    r.tags,
    r.rating,
    r.review_count,
    r.review_average,
    r.is_active,
    r.is_available,
    r.slug,
    r.delivery_bounds,
    (st_distance(r.location, v_point) / 1000)::double precision as distance_km
  from public.restaurants r
  where r.is_active = true
    and (p_shop_type is null or r.shop_type::text = p_shop_type)
    and st_dwithin(r.location, v_point, p_radius_km * 1000);
end;
$$;
