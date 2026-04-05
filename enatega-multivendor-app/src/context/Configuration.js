import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const ConfigurationContext = React.createContext({})

export const ConfigurationProvider = props => {
  const [config, setConfig] = useState(null)
  const [loading, setLoading] = useState(true)

  const WEB_CLIENT_ID = '967541328677-d46sl62t52g5r3o5m0mnl2hpptr242nl.apps.googleusercontent.com'
  const ANDROID_CLIENT_ID = '967541328677-7264tf7tkdtoufk844rck9mimrve135c.apps.googleusercontent.com'
  const IOS_CLIENT_ID = '967541328677-30n1b9dljqadrr4badeku41980rf2dt1.apps.googleusercontent.com'

  const defaultConfig = {
    currency: 'USD',
    currencySymbol: '$',
    deliveryRate: 10,
    costType: 'perKM',
    expoClientID: WEB_CLIENT_ID,
    androidClientID: ANDROID_CLIENT_ID,
    iOSClientID: IOS_CLIENT_ID
  }

  useEffect(() => {
    const fetchConfig = async() => {
      try {
        const { data, error } = await supabase
          .from('configuration')
          .select('*')
          .limit(1)
          .single()

        if (error) throw error

        if (data) {
          setConfig({
            ...data,
            // Map table fields to context field names if they differ
            expoClientID: data.expo_client_id || WEB_CLIENT_ID,
            androidClientID: data.android_client_id || ANDROID_CLIENT_ID,
            iOSClientID: data.ios_client_id || IOS_CLIENT_ID,
            currencySymbol: data.currency_symbol || '$',
            deliveryRate: data.delivery_rate || 10,
            costType: data.cost_type || 'perKM'
          })
        } else {
          setConfig(defaultConfig)
        }
      } catch (err) {
        console.error('Error fetching configuration:', err)
        setConfig(defaultConfig)
      } finally {
        setLoading(false)
      }
    }

    fetchConfig()
  }, [])

  const configuration = loading ? defaultConfig : config

  return (
    <ConfigurationContext.Provider value={configuration}>
      {props?.children}
    </ConfigurationContext.Provider>
  )
}
export const ConfigurationConsumer = ConfigurationContext.Consumer
export default ConfigurationContext
