import { useMemo } from 'react'
import useRestaurant from './useRestaurant'

export const useRestaurantQueries = (restaurantId) => {
  const { data, loading, error, refetch } = useRestaurant(restaurantId)

  const categoriesData = useMemo(() => {
    return (data?.restaurant?.categories || []).map((category) => ({
      id: category._id,
      _id: category._id,
      category_name: category.title,
      title: category.title,
      url: category?.foods?.find((food) => food?.image)?.image || null
    }))
  }, [data?.restaurant?.categories])

  const popularItemsData = useMemo(() => {
    return (data?.restaurant?.categories || [])
      .flatMap((category) => category?.foods || [])
      .slice(0, 10)
  }, [data?.restaurant?.categories])

  return {
    popularItems: {
      data: popularItemsData,
      loading,
      error,
      refetch
    },
    categories: {
      data: categoriesData,
      loading,
      error,
      refetch
    }
  }
}
