import React, { useEffect, useState } from 'react'
import { Marker } from 'react-native-maps'
import RiderMarker from '../../../assets/SVG/rider-marker'
import { supabase } from '../../../lib/supabase'

const TrackingRider = ({ id }) => {
  const [rider, setRider] = useState(null)

  useEffect(() => {
    const fetchRider = async() => {
      if (!id) return
      const { data, error } = await supabase.from('riders').select('*').eq('id', id).single()
      if (data) setRider(data)
    }
    fetchRider()
  }, [id])

  useEffect(() => {
    if (!id) return
    const channel = supabase.channel(`public:riders:id=eq.${id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'riders',
        filter: `id=eq.${id}`
      }, (payload) => {
        setRider(prev => ({ ...prev, ...payload.new }))
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [id])

  if (!rider || !rider.current_location || !rider.current_location.coordinates) return null

  return (
    <Marker
      coordinate={{
        latitude: parseFloat(rider.current_location.coordinates[1]),
        longitude: parseFloat(rider.current_location.coordinates[0])
      }}>
      <RiderMarker />
    </Marker>
  )
}

export default TrackingRider
