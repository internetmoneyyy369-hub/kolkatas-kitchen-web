import React, { useState, useContext, useLayoutEffect, useEffect } from 'react'
import { WebView } from 'react-native-webview'
import { ActivityIndicator, View } from 'react-native'
import { supabase } from '../../lib/supabase'
import UserContext from '../../context/User'
import analytics from '../../utils/analytics'

import { useTranslation } from 'react-i18next'

function Paypal(props) {
  const Analytics = analytics()

  const { SERVER_URL } = useEnvVars()

  const { t } = useTranslation()
  const [loading, loadingSetter] = useState(true)
  const { clearCart } = useContext(UserContext)
  const [_id] = useState(props?.route.params._id ?? null)
  useEffect(() => {
    async function Track() {
      await Analytics.track(Analytics.events.NAVIGATE_TO_PAYPAL)
    }
    Track()
  }, [])
  useLayoutEffect(() => {
    props?.navigation.setOptions({
      headerRight: null,
      title: t('paypalCheckout')
    })
  }, [props?.navigation])

  async function handleResponse(data) {
    if (data.url.includes(SERVER_URL + 'paypal/success')) {
      const { data: orders, error } = await supabase
        .from('orders')
        .select('*')
        .eq('order_id', _id)

      if (error) {
        console.log('Error fetching order after Paypal:', error)
        return
      }

      const order = orders[0]
      await clearCart()
      props?.navigation.reset({
        routes: [
          { name: 'Main' },
          {
            name: 'OrderDetail',
            params: { _id: order.id }
          }
        ]
      })
    } else if (data.url.includes(SERVER_URL + 'paypal/cancel')) {
      props?.navigation.goBack()
      // goBack on Payment Screen
    }
  }

  return (
    <View style={{ flex: 1 }}>
      <WebView
        source={{ uri: `${SERVER_URL}paypal?id=${_id}` }}
        onNavigationStateChange={data => {
          handleResponse(data)
        }}
        onLoad={() => {
          loadingSetter(false)
        }}
      />
      {loading
        ? (
        <ActivityIndicator
          style={{ position: 'absolute', bottom: '50%', left: '50%' }}
        />
          )
        : null}
    </View>
  )
}

export default Paypal
