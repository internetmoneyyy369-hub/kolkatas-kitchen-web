import { useState, useContext, useEffect } from 'react'
import ThemeContext from '../../../ui/ThemeContext/ThemeContext'
import { theme } from '../../../utils/themeColors'
import { FlashMessage } from '../../../ui/FlashMessage/FlashMessage'
import UserContext from '../../../context/User'
import { useNavigation, useRoute } from '@react-navigation/native'

import useEnvVars from '../../../../environment'
import { useTranslation } from 'react-i18next'
import ConfigurationContext from '../../../context/Configuration'
import { supabase } from '../../../lib/supabase'

const usePhoneOtp = () => {
  const { TEST_OTP } = useEnvVars()
  const { t } = useTranslation()
  const navigation = useNavigation()
  const configuration = useContext(ConfigurationContext)
  const route = useRoute()
  const [otp, setOtp] = useState('')
  const [otpError, setOtpError] = useState(false)
  const { profile, loadingProfile } = useContext(UserContext)
  const themeContext = useContext(ThemeContext)
  const currentTheme = theme[themeContext.ThemeValue]
  const [seconds, setSeconds] = useState(30)
  const { name, phone, screen } = route?.params || {}

  const [loading, setLoading] = useState(false)
  const [updateUserLoading, setUpdateUserLoading] = useState(false)
  const targetPhone = phone ?? profile?.phone

  async function mutateUser({ phoneIsVerified, phone, name }) {
    try {
      setUpdateUserLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from('profiles').update({
          phone_is_verified: phoneIsVerified,
          phone,
          name
        }).eq('id', user.id)

        FlashMessage({
          message: t('numberVerified')
        })

        if (!profile?.name && !name) {
          navigation.navigate('Profile', { editName: true })
        } else if (screen === 'Checkout') {
          navigation.navigate('Checkout')
        } else {
          route.params?.prevScreen
            ? navigation.navigate(route.params.prevScreen)
            : navigation.navigate({
              name: 'Main',
              merge: true
            })
        }
      }
    } catch (e) {
      FlashMessage({
        message: e.message || 'Error updating user'
      })
    } finally {
      setUpdateUserLoading(false)
    }
  }

  const onCodeFilled = async(otp_code) => {
    try {
      setOtpError(false)

      if (!configuration?.skipMobileVerification) {
        const { error } = await supabase.auth.verifyOtp({
          phone: targetPhone,
          token: otp_code,
          type: 'sms'
        })

        if (error) {
          throw error
        }
      }

      await mutateUser({
        name: name ?? profile?.name,
        phone: targetPhone,
        phoneIsVerified: true
      })
    } catch (err) {
      setOtpError(true)
      FlashMessage({
        message: err.message || t('wrongOtp')
      })
    }
  }

  const onSendOTPHandler = async() => {
    try {
      if (!targetPhone) {
        FlashMessage({
          message: t('mobileErr1')
        })
        return
      }

      setLoading(true)

      if (configuration?.skipMobileVerification) {
        return
      }

      const { error } = await supabase.auth.signInWithOtp({
        phone: targetPhone,
        options: {
          shouldCreateUser: false
        }
      })

      if (error) {
        throw error
      }
    } catch (err) {
      FlashMessage({
        message: err.message || t('somethingWentWrong')
      })
    } finally {
      setLoading(false)
    }
  }

  const resendOtp = async() => {
    await onSendOTPHandler()
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
    if (!configuration) return
    if (!configuration.skipMobileVerification) {
      onSendOTPHandler()
    }
  }, [configuration, phone])

  useEffect(() => {
    let timer = null
    if (!configuration || !profile) return
    if (configuration.skipMobileVerification) {
      setOtp(TEST_OTP)
      timer = setTimeout(() => {
        onCodeFilled(TEST_OTP)
      }, 3000)
    }

    return () => {
      timer && clearTimeout(timer)
    }
  }, [configuration, profile])

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
    themeContext,
    loadingProfile
  }
}

export default usePhoneOtp
