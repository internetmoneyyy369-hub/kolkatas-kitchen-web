import React, { createContext, useState, useEffect } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase } from '../lib/supabase'
import NetInfo from '@react-native-community/netinfo'

export const LocationContext = createContext()

export const LocationProvider = ({ children }) => {
  const [location, setLocation] = useState(null)
  const [cities, setCities] = useState([])
  const [permissionState, setPermissionState] = useState(null)
  const [isConnected, setIsConnected] = useState(false)
  const [loading, setLoading] = useState(true)

  const fetchZones = async() => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('zones')
        .select('*')
        .eq('is_active', true)

      if (error) throw error

      if (data) {
        // Function to calculate centroid of a polygon
        const calculateCentroid = (coordinates) => {
          let x = 0; let y = 0; let area = 0
          const points = coordinates[0]

          for (let i = 0; i < points?.length - 1; i++) {
            const x0 = points[i][0]
            const y0 = points[i][1]
            const x1 = points[i + 1][0]
            const y1 = points[i + 1][1]
            const a = x0 * y1 - x1 * y0
            area += a
            x += (x0 + x1) * a
            y += (y0 + y1) * a
          }

          area /= 2
          x = x / (6 * area)
          y = y / (6 * area)

          return { latitude: y, longitude: x }
        }

        const centroids = data.map((zone) => {
          const centroid = calculateCentroid(zone.location.coordinates)
          return {
            id: zone.id,
            _id: zone.id, // for compatibility
            name: zone.title,
            ...centroid,
            location: zone.location
          }
        })
        setCities(centroids)
      }
    } catch (err) {
      console.error('Error fetching zones:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (location) {
      const saveLocation = async() => {
        await AsyncStorage.setItem('location', JSON.stringify(location))
      }
      saveLocation()
    }
  }, [location])

  useEffect(() => {
    const getActiveLocation = async() => {
      try {
        const locationStr = await AsyncStorage.getItem('location')
        if (locationStr) {
          setLocation(JSON.parse(locationStr))
        }
      } catch (err) {
        console.log(err)
      }
    }

    getActiveLocation()
    fetchZones()

    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsConnected(state.isConnected)
    })

    return () => unsubscribe()
  }, [])

  useEffect(() => {
    if (isConnected) {
      fetchZones()
    }
  }, [isConnected])

  return (
    <LocationContext.Provider
      value={{
        location,
        setLocation,
        cities,
        loading,
        isConnected,
        permissionState,
        setPermissionState,
        refetch: fetchZones
      }}
    >
      {children}
    </LocationContext.Provider>
  )
}
