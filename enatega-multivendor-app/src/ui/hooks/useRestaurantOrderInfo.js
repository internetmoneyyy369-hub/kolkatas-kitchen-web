import { useState, useEffect, useContext } from 'react'
import { supabase } from '../../lib/supabase'
import { LocationContext } from '../../context/Location'
import UserContext from '../../context/User'

export default function useHomeRestaurants() {
  const { location } = useContext(LocationContext)
  const { isLoggedIn, profile } = useContext(UserContext)
  const [orderData, setOrderData] = useState({
    recentOrderRestaurants: [],
    mostOrderedRestaurants: []
  })
  const [orderLoading, setOrderLoading] = useState(false)
  const [orderError, setOrderError] = useState(null)

  useEffect(() => {
    if (!isLoggedIn || !profile) return

    const fetchOrderData = async() => {
      try {
        setOrderLoading(true)

        // Fetch recent restaurants ordered from
        const { data: recentOrders, error: recentError } = await supabase
          .from('orders')
          .select('restaurant:restaurants(*)')
          .eq('user_id', profile._id)
          .order('created_at', { ascending: false })
          .limit(20)

        if (recentError) throw recentError

        // Deduplicate restaurants
        const uniqueRecent = []
        const recentIds = new Set()
        recentOrders?.forEach(item => {
          if (item.restaurant && !recentIds.has(item.restaurant.id)) {
            recentIds.add(item.restaurant.id)
            uniqueRecent.push({ ...item.restaurant, _id: item.restaurant.id })
          }
        })

        // Fetch most ordered restaurants
        const { data: mostOrdered, error: mostError } = await supabase
          .rpc('get_most_ordered_restaurants', { p_user_id: profile._id })

        if (mostError) {
          console.log('Error fetching most ordered (might not have RPC):', mostError)
          // Fallback or just ignore
        }

        setOrderData({
          recentOrderRestaurants: uniqueRecent,
          mostOrderedRestaurants: mostOrdered?.map(r => ({ ...r, _id: r.id })) || []
        })
      } catch (err) {
        console.error('Error in useHomeRestaurants:', err)
        setOrderError(err)
      } finally {
        setOrderLoading(false)
      }
    }

    fetchOrderData()
  }, [isLoggedIn, profile])

  return {
    orderLoading,
    orderError,
    orderData
  }
}
