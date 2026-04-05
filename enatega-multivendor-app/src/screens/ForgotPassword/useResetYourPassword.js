import { useState, useContext } from 'react'
import ThemeContext from '../../ui/ThemeContext/ThemeContext'
import { theme } from '../../utils/themeColors'
import { FlashMessage } from '../../ui/FlashMessage/FlashMessage'
import { useNavigation, useRoute } from '@react-navigation/native'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../lib/supabase'

export const useResetYourPassword = () => {
  const { t, i18n } = useTranslation()
  const navigation = useNavigation()
  const route = useRoute()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState(null)
  const [confirmPasswordError, setConfirmPasswordError] = useState(null)
  const [showPassword, setShowPassword] = useState(true)
  const [showConfirmPassword, setShowConfirmPassword] = useState(true)
  const [loading, setLoading] = useState(false)

  const themeContext = useContext(ThemeContext)
  const currentTheme = { isRTL: i18n.dir() === 'rtl', ...theme[themeContext.ThemeValue] }

  function validateCredentials() {
    let result = true
    setPasswordError(null)
    setConfirmPasswordError(null)

    if (!password) {
      setPasswordError(t('passErr1'))
      result = false
    } else {
      const passRegex = /^(?=.*[0-9])(?=.*[a-zA-Z]).{6,20}$/
      if (passRegex.test(password) !== true) {
        setPasswordError(t('passErr2'))
        result = false
      }
    }
    if (!confirmPassword) {
      setConfirmPasswordError(t('passErr1'))
      result = false
    } else if (password !== confirmPassword) {
      setConfirmPasswordError(t('passmatchErr'))
      result = false
    }
    return result
  }

  async function resetPassword() {
    if (!validateCredentials()) return

    try {
      setLoading(true)

      // Supabase natively allows you to update the user's password once they are logged in via OTP
      // or magic link reset URL
      const { error } = await supabase.auth.updateUser({
        password
      })

      if (error) throw error

      FlashMessage({
        message: t('passReset')
      })
      navigation.navigate('Login')
    } catch (error) {
      FlashMessage({
        message: error.message || t('somethingWentWrong')
      })
    } finally {
      setLoading(false)
    }
  }

  return {
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    passwordError,
    confirmPasswordError,
    resetPassword,
    showPassword,
    setShowPassword,
    showConfirmPassword,
    setShowConfirmPassword,
    themeContext,
    currentTheme,
    loading
  }
}
