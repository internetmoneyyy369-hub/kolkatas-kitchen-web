import React, { useState, useEffect, useContext } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase } from '../lib/supabase'
import { v1 as uuidv1 } from 'uuid'
import { LocationContext } from './Location'
import AuthContext from './Auth'

import analytics from '../utils/analytics'

import { useTranslation } from 'react-i18next'

const v1options = {
  random: [0x10, 0x91, 0x56, 0xbe, 0xc4, 0xfb, 0xc1, 0xea, 0x71, 0xb4, 0xef, 0xe1, 0x67, 0x1c, 0x58, 0x36]
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

const UserContext = React.createContext({})

export const UserProvider = (props) => {
  const Analytics = analytics()

  const { t } = useTranslation()

  const { token, setToken } = useContext(AuthContext)
  const { location, setLocation } = useContext(LocationContext)
  const [cart, setCart] = useState([])
  const [restaurant, setRestaurant] = useState(null)
  const [isPickup, setIsPickup] = useState(false)
  const [instructions, setInstructions] = useState('')
  const [coupon, setCoupon] = useState(null)

  const [dataProfile, setDataProfile] = useState(null)
  const [loadingProfile, setLoadingProfile] = useState(false)
  const [errorProfile, setErrorProfile] = useState(null)
  const [calledProfile, setCalledProfile] = useState(false)
  const networkStatus = loadingProfile ? 1 : 7

  const refetchProfile = async() => {
    if (!token) {
      setDataProfile(null)
      return
    }
    try {
      setLoadingProfile(true)
      setCalledProfile(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: prof, error } = await supabase
          .from('profiles')
          .select('*, favorites:user_favorites(restaurant:restaurants(*)), addresses(*)')
          .eq('id', user.id)
          .single()

        if (error) throw error

        const transformedAddresses = (prof.addresses || []).map((address) => ({
          ...address,
          _id: address.id,
          deliveryAddress: address.delivery_address,
          location: normalizePointLocation(address.location),
          createdAt: address.created_at,
          updatedAt: address.updated_at
        }))

        const finalProfile = {
          ...prof,
          _id: prof.id,
          phoneIsVerified: prof.phone_is_verified,
          emailIsVerified: prof.email_is_verified,
          notificationToken: prof.notification_token,
          isOrderNotification: prof.is_order_notification,
          isOfferNotification: prof.is_offer_notification,
          createdAt: prof.created_at,
          updatedAt: prof.updated_at,
          addresses: transformedAddresses,
          userFavourite: prof.favorites?.map(f => ({ ...f.restaurant, _id: f.restaurant.id })) || []
        }
        setDataProfile({ profile: finalProfile })
        onCompleted({ profile: finalProfile })
      }
    } catch (error) {
      setErrorProfile(error)
      onError(error)
    } finally {
      setLoadingProfile(false)
    }
  }

  useEffect(() => {
    refetchProfile()
  }, [token])
  useEffect(() => {
    let isSubscribed = true
    ;(async() => {
      const restaurant = await AsyncStorage.getItem('restaurant')

      const cart = await AsyncStorage.getItem('cartItems')
      const savedCoupon = await AsyncStorage.getItem('coupon')
      isSubscribed && setRestaurant(restaurant || null)
      isSubscribed && setCart(cart ? JSON.parse(cart) : [])
      isSubscribed && setCoupon(savedCoupon ? JSON.parse(savedCoupon) : null)
    })()
    return () => {
      isSubscribed = false
    }
  }, [])

  function onError(error) {
    console.log('error context user', error.message)
  }
  async function onCompleted(data) {
    const { _id: userId, name, email, phone } = data?.profile
    await Analytics.identify(
      {
        userId,
        name,
        email,
        phone
      },
      userId
    )
    await Analytics.track(Analytics.events.USER_RECONNECTED, {
      userId: data?.profile?._id
    })
  }

  const logout = async() => {
    try {
      await AsyncStorage.removeItem('token')
      setToken(null)
      if (location._id) {
        setLocation({
          label: t('selectedLocation'),
          latitude: location.latitude,
          longitude: location.longitude,
          deliveryAddress: location.deliveryAddress
        })
      }
      // Removed Apollo cache evict
    } catch (error) {
      console.log('error on logout', error)
    }
  }

  const clearCart = async() => {
    setCart([])
    setRestaurant(null)
    setInstructions('')
    await saveCoupon(null)
    await AsyncStorage.removeItem('cartItems')
    await AsyncStorage.removeItem('restaurant')
  }

  const addQuantity = async(key, quantity = 1) => {
    const cartIndex = cart.findIndex((c) => c.key === key)
    cart[cartIndex].quantity += quantity
    setCart([...cart])
    await AsyncStorage.setItem('cartItems', JSON.stringify([...cart]))
  }

  const deleteItem = async(key) => {
    const cartIndex = cart.findIndex((c) => c.key === key)
    if (cartIndex > -1) {
      cart.splice(cartIndex, 1)
      const items = [...cart.filter((c) => c.quantity > 0)]
      setCart(items)
      if (items.length === 0) setRestaurant(null)
      await AsyncStorage.setItem('cartItems', JSON.stringify(items))
    }
  }

  const removeQuantity = async(key) => {
    const cartIndex = cart.findIndex((c) => c.key === key)
    cart[cartIndex].quantity -= 1
    const items = [...cart.filter((c) => c.quantity > 0)]
    setCart(items)
    if (items.length === 0) setRestaurant(null)
    await AsyncStorage.setItem('cartItems', JSON.stringify(items))
  }

  const checkItemCart = (itemId) => {
    const cartIndex = cart.findIndex((c) => c._id === itemId)
    if (cartIndex < 0) {
      return {
        exist: false,
        quantity: 0
      }
    } else {
      return {
        exist: true,
        quantity: cart[cartIndex].quantity,
        key: cart[cartIndex].key
      }
    }
  }
  const numberOfCartItems = () => {
    return cart
      .map((c) => c.quantity)
      .reduce(function(a, b) {
        return a + b
      }, 0)
  }

  const addCartItem = async(_id, variation, quantity = 1, addons = [], clearFlag, specialInstructions = '') => {
    const cartItems = clearFlag ? [] : cart
    cartItems.push({
      key: uuidv1(v1options),
      _id,
      quantity,
      variation: {
        _id: variation
      },
      addons,
      specialInstructions
    })

    await AsyncStorage.setItem('cartItems', JSON.stringify([...cartItems]))
    setCart([...cartItems])
  }

  const updateCart = async(cart) => {
    setCart(cart)
    await AsyncStorage.setItem('cartItems', JSON.stringify(cart))
  }

  const setCartRestaurant = async(id) => {
    setRestaurant(id)
    await AsyncStorage.setItem('restaurant', id)
  }

  const saveCoupon = async(couponData) => {
    setCoupon(couponData)
    if (couponData) {
      await AsyncStorage.setItem('coupon', JSON.stringify(couponData))
    } else {
      await AsyncStorage.removeItem('coupon')
    }
  }

  return (
    <UserContext.Provider
      value={{
        isLoggedIn: !!token && dataProfile && !!dataProfile?.profile,
        loadingProfile: loadingProfile && calledProfile,
        errorProfile,
        profile: dataProfile && dataProfile?.profile ? dataProfile?.profile : null,
        logout,
        cart,
        cartCount: numberOfCartItems(),
        clearCart,
        updateCart,
        addQuantity,
        removeQuantity,
        addCartItem,
        checkItemCart,
        deleteItem,
        restaurant,
        setCartRestaurant,
        refetchProfile,
        networkStatus,
        isPickup,
        setIsPickup,
        instructions,
        setInstructions,
        coupon,
        setCoupon: saveCoupon
      }}
    >
      {props.children}
    </UserContext.Provider>
  )
}
export const useUserContext = () => useContext(UserContext)
export const UserConsumer = UserContext.Consumer
export default UserContext
