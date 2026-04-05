import { useEffect, useState, useContext } from 'react'
import { StatusBar, Platform } from 'react-native'
import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import Constants from 'expo-constants'
import * as AppleAuthentication from 'expo-apple-authentication'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import * as Linking from 'expo-linking'
import { useTranslation } from 'react-i18next'
import { GoogleSignin } from '@react-native-google-signin/google-signin'
import useEnvVars from '../../../environment'
import ThemeContext from '../../ui/ThemeContext/ThemeContext'
import { theme } from '../../utils/themeColors'
import { FlashMessage } from '../../ui/FlashMessage/FlashMessage'
import analytics from '../../utils/analytics'
import AuthContext from '../../context/Auth'
import { supabase } from '../../lib/supabase'

export const useCreateAccount = () => {
  const Analytics = analytics()
  const navigation = useNavigation()
  const { t, i18n } = useTranslation()
  const [enableApple, setEnableApple] = useState(false)
  const [loginButton, loginButtonSetter] = useState(null)
  const [loading, setLoading] = useState(false)
  const { setTokenAsync } = useContext(AuthContext)
  const themeContext = useContext(ThemeContext)
  const [googleUser, setGoogleUser] = useState(null)
  const currentTheme = { isRTL: i18n.dir() === 'rtl', ...theme[themeContext.ThemeValue] }

  const {
    IOS_CLIENT_ID_GOOGLE,
    ANDROID_CLIENT_ID_GOOGLE,
    EXPO_CLIENT_ID,
    TERMS_AND_CONDITIONS,
    PRIVACY_POLICY
  } = useEnvVars()

  useEffect(() => {
    GoogleSignin.configure({
      webClientId: EXPO_CLIENT_ID,
      androidClientId: ANDROID_CLIENT_ID_GOOGLE,
      iosClientId: IOS_CLIENT_ID_GOOGLE,
      offlineAccess: true,
      forceCodeForRefreshToken: true
    })
  }, [ANDROID_CLIENT_ID_GOOGLE, EXPO_CLIENT_ID, IOS_CLIENT_ID_GOOGLE])

  const navigateToLogin = () => {
    navigation.navigate('Login')
  }

  const navigateToRegister = () => {
    navigation.navigate('Register')
  }

  const navigateToPhone = () => {
    navigation.navigate('PhoneNumber', {
      name: googleUser,
      phone: ''
    })
  }

  const navigateToMain = () => {
    navigation.navigate({
      name: 'Main',
      merge: true
    })
  }

  const saveNotificationToken = async(userId) => {
    if (!Device.isDevice || !userId) return

    try {
      const { status } = await Notifications.getPermissionsAsync()
      if (status !== 'granted') return

      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig?.extra?.eas?.projectId
      })

      if (tokenData?.data) {
        await supabase
          .from('profiles')
          .update({ notification_token: tokenData.data })
          .eq('id', userId)
      }
    } catch (error) {
      console.warn('Notification token setup skipped:', error.message)
    }
  }

  const completeLogin = async(authUser) => {
    try {
      if (!authUser?.id) {
        throw new Error('Missing authenticated user')
      }

      await saveNotificationToken(authUser.id)

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single()

      if (profileError) {
        throw profileError
      }

      if (profile?.is_active === false) {
        await supabase.auth.signOut()
        FlashMessage({ message: t('accountDeactivated') })
        return
      }

      await Analytics.track(Analytics.events.LOGIN, {
        userId: authUser.id,
        email: authUser.email
      })

      FlashMessage({ message: 'Successfully logged in' })

      if (!profile?.phone) {
        navigateToPhone()
      } else {
        navigateToMain()
      }
    } finally {
      setLoading(false)
      loginButtonSetter(null)
    }
  }

  async function mutateLogin(user) {
    try {
      setLoading(true)

      if (user?.type === 'google' && user?.idToken) {
        const { data, error } = await supabase.auth.signInWithIdToken({
          provider: 'google',
          token: user.idToken,
          access_token: user.accessToken
        })

        if (error) throw error
        setGoogleUser(user.name || data?.user?.user_metadata?.full_name || '')
        await completeLogin(data.user)
        return
      }

      throw new Error('Unsupported login method on Android')
    } catch (error) {
      FlashMessage({
        message: error.message || 'Login failed. Please try again.'
      })
      setLoading(false)
      loginButtonSetter(null)
    }
  }

  const signIn = async() => {
    try {
      loginButtonSetter('Google')
      setLoading(true)

      if (Platform.OS === 'android') {
        await GoogleSignin.hasPlayServices()
      }

      const userInfo = await GoogleSignin.signIn()
      const tokenResponse = await GoogleSignin.getTokens()
      const idToken =
        userInfo?.data?.idToken ||
        userInfo?.idToken ||
        tokenResponse?.idToken

      if (!idToken) {
        throw new Error('Google sign in failed')
      }

      const profile = userInfo?.data?.user || userInfo?.user || {}
      await mutateLogin({
        email: profile?.email,
        name: profile?.name,
        type: 'google',
        idToken,
        accessToken: tokenResponse?.accessToken
      })
    } catch (error) {
      if (error.code === 'SIGN_IN_CANCELLED' || error.code === 'ERR_CANCELED') {
        setLoading(false)
        loginButtonSetter(null)
        return
      }

      FlashMessage({
        message: error.message || 'Google sign in failed'
      })
      setLoading(false)
      loginButtonSetter(null)
    }
  }

  useEffect(() => {
    AppleAuthentication.isAvailableAsync()
      .then(setEnableApple)
      .catch(() => setEnableApple(false))
  }, [])

  useFocusEffect(() => {
    if (Platform.OS === 'android') {
      StatusBar.setBackgroundColor(currentTheme.main)
    }
    StatusBar.setBarStyle(
      themeContext.ThemeValue === 'Dark' ? 'light-content' : 'dark-content'
    )
  })

  const openTerms = () => {
    Linking.openURL(TERMS_AND_CONDITIONS)
  }

  const openPrivacyPolicy = () => {
    Linking.openURL(PRIVACY_POLICY)
  }

  return {
    enableApple,
    loginButton,
    loginButtonSetter,
    loading,
    setLoading,
    themeContext,
    mutateLogin,
    currentTheme,
    navigateToLogin,
    navigateToRegister,
    openTerms,
    openPrivacyPolicy,
    navigateToMain,
    navigation,
    signIn,
    setTokenAsync
  }
}
