import { useState, useContext, useEffect } from 'react'
import ThemeContext from '../../../ui/ThemeContext/ThemeContext'
import { theme } from '../../../utils/themeColors'
import { FlashMessage } from '../../../ui/FlashMessage/FlashMessage'
import { useRoute, useNavigation } from '@react-navigation/native'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../../lib/supabase'

export const useForgotPasswordOtp = () => {
  const { t, i18n } = useTranslation()
  const route = useRoute()
  const navigation = useNavigation()
  const [otp, setOtp] = useState('')
  const [otpError, setOtpError] = useState(false)
  const [email] = useState(route?.params.email)
  const themeContext = useContext(ThemeContext)
  const currentTheme = { isRTL: i18n.dir() === 'rtl', ...theme[themeContext.ThemeValue] }
  const [seconds, setSeconds] = useState(30)
  const [loading, setLoading] = useState(false)

  function onCompleted() {
    FlashMessage({
      message: t('otpResentToEmail')
    })
  }

  function onError(error) {
    FlashMessage({
      message: error?.message || t('somethingWentWrong')
    })
  }

  const onCodeFilled = async(code) => {
    try {
      setLoading(true)
      setOtpError(false)
      const { error } = await supabase.auth.verifyOtp({
        email: email ?? '',
        token: code,
        type: 'recovery'
      })

      if (error) {
        throw error
      }

      navigation.navigate('SetYourPassword', { email })
    } catch (error) {
      onError(error)
      setOtpError(true)
    } finally {
      setLoading(false)
    }
  }

  const resendOtp = async() => {
    try {
      setLoading(true)
      const { error } = await supabase.auth.resetPasswordForEmail(
        email.toLowerCase().trim()
      )
      if (error) throw error

      onCompleted()
      setSeconds(30)
    } catch (error) {
      onError(error)
    } finally {
      setLoading(false)
    }
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

  return {
    otp,
    setOtp,
    otpError,
    setOtpError,
    seconds,
    setSeconds,
    currentTheme,
    loading,
    onCodeFilled,
    email,
    themeContext,
    resendOtp
  }
}
