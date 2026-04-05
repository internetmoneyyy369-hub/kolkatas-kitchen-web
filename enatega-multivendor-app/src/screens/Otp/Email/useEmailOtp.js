import { useState, useContext, useEffect, useRef } from 'react'
import Constants from 'expo-constants'
import ThemeContext from '../../../ui/ThemeContext/ThemeContext'
import { theme } from '../../../utils/themeColors'
import { FlashMessage } from '../../../ui/FlashMessage/FlashMessage'
import UserContext from '../../../context/User'
import { useNavigation, useRoute } from '@react-navigation/native'
import * as Device from 'expo-device'
import * as Notifications from 'expo-notifications'
import analytics from '../../../utils/analytics'
import AuthContext from '../../../context/Auth'
import { useTranslation } from 'react-i18next'
import ConfigurationContext from '../../../context/Configuration'
import useEnvVars from '../../../../environment'
import { supabase } from '../../../lib/supabase'

const useEmailOtp = (isPhoneExists) => {
  const { TEST_OTP } = useEnvVars()
  const Analytics = analytics()

  const { t } = useTranslation()
  const navigation = useNavigation()
  const configuration = useContext(ConfigurationContext)
  const route = useRoute()
  const [otp, setOtp] = useState('')
  const [otpError, setOtpError] = useState(false)
  const [seconds, setSeconds] = useState(5)
  const [user] = useState(route.params?.user)
  const { setTokenAsync } = useContext(AuthContext)
  const { profile } = useContext(UserContext)
  const themeContext = useContext(ThemeContext)
  const currentTheme = theme[themeContext.ThemeValue]

  const [loading, setLoading] = useState(false)
  const [updateUserLoading, setUpdateUserLoading] = useState(false)

  async function mutateRegister() {
    try {
      setUpdateUserLoading(true)
      let notificationToken = null
      if (Device.isDevice) {
        try {
          const { status } = await Notifications.requestPermissionsAsync()
          if (status === 'granted') {
            notificationToken = (await Notifications.getExpoPushTokenAsync({ projectId: Constants.expoConfig.extra.eas.projectId })).data
          }
        } catch (error) {
          console.log('Error catched in notificationToken:', error)
        }
      }

      // Supabase Signup
      const { data, error } = await supabase.auth.signUp({
        email: user.email,
        password: user.password,
        options: {
          data: {
            name: user.name,
            phone: user.phone || ''
          }
        }
      })

      if (error) {
        throw error
      }

      // If sign up succeeds, save notification token if present
      if (data.user && notificationToken) {
        await supabase.from('profiles').update({ notification_token: notificationToken }).eq('id', data.user.id)
      }

      FlashMessage({
        message: t('accountCreated')
      })

      if (data.user) {
        await Analytics.identify({ userId: data.user.id }, data.user.id)
        await Analytics.track(Analytics.events.USER_CREATED_ACCOUNT, {
          userId: data.user.id,
          name: user.name,
          email: user.email,
          type: 'email'
        })
      }

      // Navigate to PhoneOtp logically, or Main
      navigation.navigate('PhoneOtp', {
        name: user.name,
        phone: user.phone
      })
    } catch (error) {
      FlashMessage({ message: error.message || t('somethingWentWrong') })
    } finally {
      setUpdateUserLoading(false)
    }
  }

  const onCodeFilled = async(otp_code) => {
    // With Supabase migration, we rely on signIn OTP or bypass entirely since
    // we use standard email/password user creation.
    // In this MVP step for migration, we simulate successful OTP verify -> Register User
    // If you enable Supabase Auth OTP, replace this with supabase.auth.verifyOtp()
    await mutateRegister()
  }

  const resendOtp = () => {
    // If using natively Supabase Email OTP:
    // supabase.auth.signInWithOtp({ email: user.email })
    setSeconds(30)
  }

  useEffect(() => {
    const myInterval = setInterval(() => {
      if (seconds > 0) {
        setSeconds(seconds - 1)
      }
      if (seconds === 0) {
        clearInterval(myInterval)
      }
    }, 1000)
    return () => {
      clearInterval(myInterval)
    }
  })

  useEffect(() => {
    let timer = null
    if (!configuration) return
    if (configuration.skipEmailVerification) {
      setOtp(TEST_OTP)
      timer = setTimeout(async() => {
        await onCodeFilled(TEST_OTP)
      }, 3000)
    }
    return () => {
      timer && clearTimeout(timer)
    }
  }, [configuration])

  return {
    otp,
    setOtp,
    otpError,
    seconds,
    profile,
    loading,
    updateUserLoading,
    onCodeFilled,
    resendOtp,
    currentTheme,
    themeContext
  }
}

export default useEmailOtp
