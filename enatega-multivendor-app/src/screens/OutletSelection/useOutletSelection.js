import { useState, useEffect, useContext } from 'react'
import { supabase } from '../../lib/supabase'
import { LocationContext } from '../../context/Location'
import OutletContext from '../../context/Outlet'
import { useNavigation } from '@react-navigation/native'

export const useOutletSelection = () => {
  const [outlets, setOutlets] = useState([])
  const [loading, setLoading] = useState(true)
  const { location } = useContext(LocationContext)
  const { setOutlet } = useContext(OutletContext)
  const navigation = useNavigation()

  const fetchOutlets = async() => {
    try {
      setLoading(true)

      let data = []
      let error = null

      if (location && location.latitude && location.longitude) {
        const res = await supabase.rpc('nearby_restaurants', {
          lat: location.latitude,
          long: location.longitude,
          radius_meters: 500000 // 500km radius as safe bet
        })
        data = res.data
        error = res.error
      } else {
        const res = await supabase.from('restaurants').select('*').limit(50)
        data = res.data
        error = res.error
      }

      if (error) {
        console.error('Error fetching outlets', error)
      } else {
        setOutlets(data || [])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOutlets()
  }, [location])

  const selectOutlet = async(outlet) => {
    await setOutlet(outlet)
    // Once outlet is picked, navigate into the main app.
    // In our single-brand context, the 'Main' app is just the BottomTabNavigator.
    navigation.navigate('Main')
  }

  return {
    outlets,
    loading,
    selectOutlet,
    refresh: fetchOutlets
  }
}
