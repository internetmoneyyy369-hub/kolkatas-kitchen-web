import React, { useEffect, useState, useContext } from 'react'
import { supabase } from '../lib/supabase'
import UserContext from './User'

const OrdersContext = React.createContext()

export const OrdersProvider = ({ children }) => {
  const { profile } = useContext(UserContext)

  const [orders, setOrders] = useState([])
  const [loadingOrders, setLoadingOrders] = useState(true)
  const [errorOrders, setErrorOrders] = useState(null)

  const fetchOrders = async() => {
    if (!profile) return
    try {
      setLoadingOrders(true)
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          restaurant:restaurants(*),
          rider:riders(*),
          delivery_address:addresses(*),
          items:order_items(*)
        `)
        .eq('user_id', profile._id)
        .order('created_at', { ascending: false })

      if (error) throw error
      // format _id for components
      const mappedOrders = data.map(o => ({ ...o, _id: o.id }))
      setOrders(mappedOrders)
    } catch (e) {
      console.log('Orders fetch error', e)
      setErrorOrders(e)
    } finally {
      setLoadingOrders(false)
    }
  }

  useEffect(() => {
    fetchOrders()
  }, [profile])

  useEffect(() => {
    if (!profile) return

    // Supabase Realtime Subscription
    const channel = supabase.channel('public:orders')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'orders',
        filter: `user_id=eq.${profile._id}`
      }, async(payload) => {
        if (payload.eventType === 'INSERT') {
          // Fetch full nested order data
          const { data: newOrder } = await supabase
            .from('orders')
            .select('*, restaurant:restaurants(*), rider:riders(*), delivery_address:addresses(*), items:order_items(*)')
            .eq('id', payload.new.id)
            .single()

          if (newOrder) {
            setOrders(prev => [{ ...newOrder, _id: newOrder.id }, ...prev])
          }
        } else if (payload.eventType === 'UPDATE') {
          const { data: updatedOrder } = await supabase
            .from('orders')
            .select('*, restaurant:restaurants(*), rider:riders(*), delivery_address:addresses(*), items:order_items(*)')
            .eq('id', payload.new.id)
            .single()

          if (updatedOrder) {
            setOrders(prev => prev.map(o => o.id === updatedOrder.id ? { ...updatedOrder, _id: updatedOrder.id } : o))
          }
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [profile])

  return (
    <OrdersContext.Provider
      value={{
        loadingOrders,
        errorOrders,
        orders,
        reFetchOrders: fetchOrders,
        fetchMoreOrdersFunc: () => {},
        networkStatusOrders: loadingOrders ? 1 : 7
      }}>
      {children}
    </OrdersContext.Provider>
  )
}

export const OrdersConsumer = OrdersContext.Consumer
export default OrdersContext
