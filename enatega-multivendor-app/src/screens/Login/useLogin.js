import { useState, useContext, useRef, useEffect } from 'react'
import { Alert } from 'react-native'
import * as Device from 'expo-device'
import Constants from 'expo-constants'
import { supabase } from '../../lib/supabase'
import ThemeContext from '../../ui/ThemeContext/ThemeContext'
import { theme } from '../../utils/themeColors'
import * as Notifications from 'expo-notifications'
import { FlashMessage } from '../../ui/FlashMessage/FlashMessage'
import analytics from '../../utils/analytics'
import AuthContext from '../../context/Auth'
import { useNavigation } from '@react-navigation/native'
import { useTranslation } from 'react-i18next'

export const useLogin = () => {
  const { t, i18n } = useTranslation()
  const Analytics = analytics()

  const navigation = useNavigation()
  const [email, setEmail] = useState('')
  const emailRef = useRef('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(true)
  const [emailError, setEmailError] = useState(null)
  const [passwordError, setPasswordError] = useState(null)
  const [registeredEmail, setRegisteredEmail] = useState(false)
  const themeContext = useContext(ThemeContext)
  const currentTheme = { isRTL: i18n.dir() === 'rtl', ...theme[themeContext.ThemeValue] }

  const [loading, setLoading] = useState(false)
  const [loginLoading, setLoginLoading] = useState(false)

  // Update both state and ref
  const handleSetEmail = (newEmail) => {
    setEmail(newEmail)
    emailRef.current = newEmail
    if (emailError) {
      setEmailError(null)
    }
  }

  // Reset password when registeredEmail becomes true
  useEffect(() => {
    if (registeredEmail) {
      if (emailRef.current === 'demo-customer@enatega.com') {
        setPassword('123123')
      } else {
        setPassword('')
      }
    }
  }, [registeredEmail])

  function validateCredentials() {
    let result = true
    setEmailError(null)
    setPasswordError(null)

    // Use the state value for validation
    if (!email.trim()) {
      setEmailError(t('emailErr1'))
      result = false
    } else {
      const emailRegex = /^\w+([\\.-]?\w+)*@\w+([\\.-]?\w+)*(\.\w{2,3})+$/
      if (emailRegex.test(email) !== true) {
        setEmailError(t('emailErr2'))
        result = false
      }
    }
    if (!password && registeredEmail) {
      setPasswordError(t('passErr1'))
      result = false
    }
    return result
  }

  async function checkEmailExist() {
    if (!validateCredentials()) return

    try {
      setLoading(true)
      const { data: exists, error } = await supabase.rpc('check_email_exists', { lookup_email: emailRef.current })
      if (error) {
        throw error
      }

      if (exists) {
        setRegisteredEmail(true)
      } else {
        navigation.navigate('Register', { email: emailRef.current })
      }
    } catch (e) {
      FlashMessage({
        message: t('mailCheckingError')
      })
    } finally {
      setLoading(false)
    }
  }

  async function loginAction(email, password) {
    if (!validateCredentials()) return

    try {
      setLoginLoading(true)

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) {
        throw error
      }

      if (data.user) {
        let notificationToken = null
        try {
          if (Device.isDevice) {
            const { status: existingStatus } = await Notifications.getPermissionsAsync()
            if (existingStatus === 'granted') {
              notificationToken = (await Notifications.getExpoPushTokenAsync({
                projectId: Constants.expoConfig.extra.eas.projectId
              })).data
            }
          }
          if (notificationToken) {
            await supabase.from('profiles').update({ notification_token: notificationToken }).eq('id', data.user.id)
          }
        } catch (error) {
          console.log('Error getting push token', error)
        }

        try {
          await Analytics.identify({ userId: data.user.id }, data.user.id)
          await Analytics.track(Analytics.events.USER_LOGGED_IN, {
            userId: data.user.id,
            email: data.user.email
          })
        } catch (e) {}

        navigation.navigate({ name: 'Main', merge: true })
      }
    } catch (e) {
      FlashMessage({
        message: e.message || t('errorWhileLogging')
      })
    } finally {
      setLoginLoading(false)
    }
  }

  function onBackButtonPressAndroid() {
    navigation.navigate({
      name: 'Main',
      merge: true
    })
    return true
  }

  return {
    setEmail,
    password,
    setPassword,
    showPassword,
    setShowPassword,
    emailError,
    passwordError,
    registeredEmail,
    currentTheme,
    loading,
    loginLoading,
    loginAction,
    checkEmailExist,
    onBackButtonPressAndroid,
    emailRef,
    themeContext,
    handleSetEmail
  }
}
