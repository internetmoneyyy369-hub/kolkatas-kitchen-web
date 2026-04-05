import { useState, useContext } from 'react'
import ThemeContext from '../../ui/ThemeContext/ThemeContext'
import { theme } from '../../utils/themeColors'
import { FlashMessage } from '../../ui/FlashMessage/FlashMessage'
import { useNavigation, useRoute } from '@react-navigation/native'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../lib/supabase'

export const useForgotPassword = () => {
  const { t, i18n } = useTranslation()
  const navigation = useNavigation()
  const route = useRoute()
  const [email, setEmail] = useState(route.params?.email || '')
  const [emailError, setEmailError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [otp] = useState(Math.floor(100000 + Math.random() * 900000).toString())

  const themeContext = useContext(ThemeContext)
  const currentTheme = { isRTL: i18n.dir() === 'rtl', ...theme[themeContext.ThemeValue] }

  function validateCredentials() {
    let result = true
    setEmailError(null)
    if (!email) {
      setEmailError(t('emailErr1'))
      result = false
    } else {
      const emailRegex = /^\w+([\\.-]?\w+)*@\w+([\\.-]?\w+)*(\.\w{2,3})+$/
      if (emailRegex.test(email) !== true) {
        setEmailError(t('emailErr2'))
        result = false
      }
    }
    return result
  }

  async function forgotPassword() {
    if (!validateCredentials()) return

    try {
      setLoading(true)

      // 1. Check if email exists using our previously deployed RPC
      const { data: exists, error: checkError } = await supabase.rpc('check_email_exists', { lookup_email: email.toLowerCase().trim() })
      if (checkError) throw checkError

      if (!exists) {
        FlashMessage({
          message: t('Account not found, Please create your account.')
        })
        return
      }

      // 2. Trigger Supabase Password Reset Email
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.toLowerCase().trim(), {
        // Here you would supply the redirect URL to link back to the app ResetPassword screen.
        // redirectTo: 'enatega://reset-password'
      })

      if (resetError) throw resetError

      onCompleted()
    } catch (error) {
      FlashMessage({
        message: error.message || t('somethingWentWrong')
      })
    } finally {
      setLoading(false)
    }
  }

  function onCompleted() {
    FlashMessage({
      message: t('otpForResetPassword') // Depending on Supabase settings, this will be an email.
    })
    navigation.navigate('ForgotPasswordOtp', { email })
  }

  function onError(error) {
    FlashMessage({
      message: error.message || t('somethingWentWrong')
    })
  }

  return {
    email,
    setEmail,
    emailError,
    otp,
    onError,
    onCompleted,
    forgotPassword,
    themeContext,
    currentTheme,
    loading
  }
}
