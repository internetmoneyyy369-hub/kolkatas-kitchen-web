import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

const HEADING = {
  orderAgain: 'Order Again',
  topPicks: 'Top Picks',
  topBrands: 'Top Brands',
  grocery: 'All Grocery',
  restaurant: 'All Restaurant'
}

const SUB_HEADING = {
  orderAgain: 'From your previous orders',
  topPicks: 'Top picked restaurants for you',
  topBrands: 'Top brands in your area',
  grocery: 'Most ordered grocery stores',
  restaurant: 'Most ordered restaurants'
}

function normalizePointLocation(location) {
  if (!location) return null

  if (location.coordinates) {
    return location
  }

  if (typeof location === 'string') {
    const match = location.match(/POINT\(([-\d.]+)\s+([-\d.]+)\)/i)
    if (match) {
      return {
        type: 'Point',
        coordinates: [Number(match[1]), Number(match[2])]
      }
    }
  }

  return location
}

function formatDay(day) {
  const mapping = {
    Sunday: 'SUN',
    Monday: 'MON',
    Tuesday: 'TUE',
    Wednesday: 'WED',
    Thursday: 'THU',
    Friday: 'FRI',
    Saturday: 'SAT'
  }
  return mapping[day] || day
}

function formatTimeParts(time) {
  if (!time || typeof time !== 'string') {
    return ['00', '00']
  }
  const [hours = '00', minutes = '00'] = time.split(':')
  return [hours, minutes]
}

function mapOpeningTimes(openingTimes = []) {
  const grouped = openingTimes.reduce((acc, item) => {
    const key = formatDay(item.day)
    const existing = acc[key] || { day: key, times: [] }
    existing.times.push({
      startTime: formatTimeParts(item.start_time),
      endTime: formatTimeParts(item.end_time)
    })
    acc[key] = existing
    return acc
  }, {})

  return Object.values(grouped)
}

function normalizeRestaurant(restaurant, openingTimes = []) {
  const id = restaurant.id || restaurant._id
  return {
    ...restaurant,
    id,
    _id: id,
    location: normalizePointLocation(restaurant.location),
    deliveryTime: restaurant.delivery_time ?? restaurant.deliveryTime ?? 0,
    minimumOrder: restaurant.minimum_order ?? restaurant.minimumOrder ?? 0,
    commissionRate: restaurant.commission_rate ?? restaurant.commissionRate ?? 0,
    shopType: restaurant.shop_type ?? restaurant.shopType ?? 'restaurant',
    reviewCount: restaurant.review_count ?? restaurant.reviewCount ?? 0,
    reviewAverage: Number(restaurant.review_average ?? restaurant.reviewAverage ?? restaurant.rating ?? 0),
    isActive: restaurant.is_active ?? restaurant.isActive ?? true,
    isAvailable: restaurant.is_available ?? restaurant.isAvailable ?? true,
    distanceWithCurrentLocation: restaurant.distance_km ?? restaurant.distanceWithCurrentLocation ?? 0,
    freeDelivery: Number(restaurant.delivery_charges ?? 0) === 0 || restaurant.freeDelivery || false,
    acceptVouchers: restaurant.accept_vouchers ?? restaurant.acceptVouchers ?? false,
    openingTimes: mapOpeningTimes(openingTimes)
  }
}

function sortForQuery(queryType, restaurants) {
  const items = [...restaurants]
  switch (queryType) {
    case 'topBrands':
      return items.sort((a, b) => b.reviewAverage - a.reviewAverage)
    case 'topPicks':
    case 'orderAgain':
      return items.sort((a, b) => b.reviewCount - a.reviewCount)
    default:
      return items
  }
}

export const useRestaurantQueries = (queryType, location, selectedType) => {
  const [restaurantData, setRestaurantData] = useState([])
  const [allData, setAllData] = useState([])
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [networkStatus, setNetworkStatus] = useState(7)

  const loadRestaurants = useCallback(async() => {
    setLoading(true)
    setNetworkStatus(4)
    setError(null)

    try {
      let restaurants = []

      if (location?.latitude && location?.longitude) {
        const { data: nearbyData, error: nearbyError } = await supabase.rpc('nearby_restaurants', {
          p_latitude: location.latitude,
          p_longitude: location.longitude,
          p_shop_type: selectedType || null
        })

        if (nearbyError) throw nearbyError
        restaurants = nearbyData || []
      } else {
        let query = supabase.from('restaurants').select('*').eq('is_active', true)
        if (selectedType) {
          query = query.eq('shop_type', selectedType)
        }
        const { data: restaurantRows, error: restaurantError } = await query
        if (restaurantError) throw restaurantError
        restaurants = restaurantRows || []
      }

      const restaurantIds = restaurants.map((item) => item.id).filter(Boolean)
      let openingTimesByRestaurant = {}

      if (restaurantIds.length) {
        const { data: openingTimes, error: openingTimesError } = await supabase
          .from('opening_times')
          .select('*')
          .in('restaurant_id', restaurantIds)

        if (openingTimesError) throw openingTimesError

        openingTimesByRestaurant = (openingTimes || []).reduce((acc, item) => {
          if (!acc[item.restaurant_id]) {
            acc[item.restaurant_id] = []
          }
          acc[item.restaurant_id].push(item)
          return acc
        }, {})
      }

      const normalizedRestaurants = sortForQuery(
        queryType,
        restaurants.map((item) => normalizeRestaurant(item, openingTimesByRestaurant[item.id] || []))
      )

      const nextData = {
        recentOrderRestaurantsPreview: normalizedRestaurants,
        mostOrderedRestaurantsPreview: normalizedRestaurants,
        topRatedVendorsPreview: normalizedRestaurants,
        nearByRestaurantsPreview: {
          restaurants: normalizedRestaurants
        }
      }

      setAllData(normalizedRestaurants)
      setRestaurantData(normalizedRestaurants)
      setData(nextData)
      setNetworkStatus(7)
      return nextData
    } catch (err) {
      setError(err)
      setNetworkStatus(7)
      return null
    } finally {
      setLoading(false)
    }
  }, [location?.latitude, location?.longitude, queryType, selectedType])

  useEffect(() => {
    loadRestaurants()
  }, [loadRestaurants])

  return {
    restaurantData,
    loading,
    error,
    refetch: loadRestaurants,
    data,
    networkStatus,
    setRestaurantData,
    allData,
    heading: HEADING[queryType],
    subHeading: SUB_HEADING[queryType]
  }
}
