import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

export default function useRestaurant(id) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchRestaurant = async() => {
    try {
      setLoading(true)

      const { data: restaurant, error: resError } = await supabase
        .from('restaurants')
        .select(`
          *,
          categories (*, foods (*, variations:food_variations (*))),
          addons (*, options (*)),
          options (*)
        `)
        .eq('id', id)
        .single()

      if (resError) throw resError

      // Recursive helper to map id -> _id
      const mapIdToUnderscoreId = (obj) => {
        if (Array.isArray(obj)) {
          return obj.map(mapIdToUnderscoreId)
        } else if (obj !== null && typeof obj === 'object') {
          const newObj = {}
          for (const key in obj) {
            newObj[key] = mapIdToUnderscoreId(obj[key])
          }
          if (newObj.id && !newObj._id) {
            newObj._id = newObj.id
          }
          return newObj
        }
        return obj
      }

      const mappedRestaurant = mapIdToUnderscoreId(restaurant)
      setData({ restaurant: mappedRestaurant })
    } catch (e) {
      console.error('useRestaurant error:', e)
      setError(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (id) {
      fetchRestaurant()
    }
  }, [id])

  return {
    data,
    refetch: fetchRestaurant,
    networkStatus: loading ? 1 : 7,
    loading,
    error
  }
}
