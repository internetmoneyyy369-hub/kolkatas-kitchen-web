import React, { useState, useEffect, useContext, useLayoutEffect } from 'react'
import ThemeContext from '../../ui/ThemeContext/ThemeContext'
import { theme } from '../../utils/themeColors'
import { Ionicons, Entypo } from '@expo/vector-icons'
import { callNumber } from '../../utils/callNumber'
import { Alert, Platform, StatusBar, View } from 'react-native'
import { useUserContext } from '../../context/User'
import { useTranslation } from 'react-i18next'
import { alignment } from '../../utils/alignment'
import { useFocusEffect } from '@react-navigation/native'
import { supabase } from '../../lib/supabase'

export const useChatScreen = ({ navigation, route }) => {
  const { id: orderId, orderNo, total, riderPhone } = route.params
  const { t } = useTranslation()
  const { profile } = useUserContext()

  const [messages, setMessages] = useState([])
  const [inputMessage, setInputMessage] = useState(null)
  const [image, setImage] = useState([])
  const themeContext = useContext(ThemeContext)
  const currentTheme = {
    isRTL: false, // will update below
    ...theme[themeContext.ThemeValue]
  }

  useFocusEffect(() => {
    if (Platform.OS === 'android') {
      StatusBar.setBackgroundColor(currentTheme.themeBackground)
    }
    StatusBar.setBarStyle(themeContext.ThemeValue === 'Dark' ? 'light-content' : 'dark-content')
  })

  useLayoutEffect(() => {
    navigation.setOptions({
      headerStyle: {
        backgroundColor: currentTheme.headerMenuBackground
      },
      headerTitleStyle: {
        fontSize: 14,
        color: currentTheme.fontFourthColor
      },
      headerLeft: () => (
        <View style={{ borderRadius: 30, borderWidth: 1, borderColor: currentTheme.fontFourthColor, ...alignment.MLmedium }}>
          <Entypo name="cross" size={20} color={currentTheme.fontFourthColor} onPress={() => navigation.goBack()} />
        </View>
      ),
      headerRight: () => (
        <View style={{ ...alignment.MRmedium }}>
          <Ionicons name="call-outline" size={24} color={currentTheme.fontFourthColor} onPress={() => callNumber(riderPhone)} />
        </View>
      ),
      headerTitle: t('contactYourRider')
    })
  }, [navigation])

  useEffect(() => {
    const fetchMessages = async() => {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: false })

      if (error) {
        Alert.alert('Error', error.message)
      } else if (data) {
        setMessages(
          data.map(message => ({
            _id: message.id,
            text: message.message,
            createdAt: message.created_at,
            user: { _id: message.sender_id, name: message.sender_name }
          }))
        )
      }
    }
    fetchMessages()
  }, [orderId])

  useEffect(() => {
    const channel = supabase.channel(`public:chat_messages:order_id=eq.${orderId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `order_id=eq.${orderId}`
      }, (payload) => {
        const message = payload.new
        setMessages(prev => {
          if (prev.find(m => m._id === message.id)) return prev
          return [{
            _id: message.id,
            text: message.message,
            createdAt: message.created_at,
            user: { _id: message.sender_id, name: message.sender_name }
          }, ...prev]
        })
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [orderId])

  const onSend = async() => {
    if (!inputMessage?.trim()) return

    const plainText = inputMessage.trim()
    const tempId = Date.now().toString()

    const newMessage = {
      _id: tempId,
      text: plainText,
      createdAt: new Date(),
      user: { _id: profile._id, name: profile.name }
    }
    setMessages(prev => [newMessage, ...prev])
    setInputMessage('')
    setImage([])

    const { data, error } = await supabase.from('chat_messages').insert({
      order_id: orderId,
      sender_id: profile._id,
      sender_name: profile.name,
      message: plainText
    }).select().single()

    if (error) {
      Alert.alert('Error', error.message)
      setMessages(prev => prev.filter(m => m._id !== tempId))
    } else if (data) {
      setMessages(prev => prev.map(m => m._id === tempId ? { ...m, _id: data.id, createdAt: data.created_at } : m))
    }
  }

  return {
    messages,
    onSend,
    currentTheme,
    image,
    setImage,
    inputMessage,
    setInputMessage,
    profile,
    orderNo,
    total
  }
}
