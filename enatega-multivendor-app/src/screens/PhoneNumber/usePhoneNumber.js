import { useState, useContext } from 'react'
import ThemeContext from '../../ui/ThemeContext/ThemeContext'
import { theme } from '../../utils/themeColors'
import { FlashMessage } from '../../ui/FlashMessage/FlashMessage'
import { phoneRegex } from '../../utils/regex'
import { useNavigation, useRoute, useIsFocused } from '@react-navigation/native'
import UserContext from '../../context/User'
import ConfigurationContext from '../../context/Configuration'
import { useTranslation } from 'react-i18next'
import { useCountryFromIP } from '../../utils/useCountryFromIP'
import { supabase } from '../../lib/supabase'

const useRegister = () => {
  const { t, i18n } = useTranslation()
  const navigation = useNavigation()
  const route = useRoute()
  const [phone, setPhone] = useState('')
  const [phoneError, setPhoneError] = useState(null)
  const configuration = useContext(ConfigurationContext)
  const isFocused = useIsFocused()
  const { name } = route?.params

  const {
    country,
    setCountry,
    currentCountry: countryCode,
    setCurrentCountry: setCountryCode,
    isLoading: isCountryLoading
  } = useCountryFromIP()

  const onCountrySelect = country => {
    setCountryCode(country.cca2)
    setCountry(country)
  }
  const { profile } = useContext(UserContext)
  const { refetchProfile } = useContext(UserContext)
  const themeContext = useContext(ThemeContext)
  const currentTheme = { isRTL: i18n.dir() === 'rtl', ...theme[themeContext.ThemeValue] }

  const [loading, setLoading] = useState(false)

  function validateCredentials() {
    let result = true

    if (!phone) {
      setPhoneError(t('mobileErr1'))
      result = false
    } else if (!phoneRegex.test(phone)) {
      setPhoneError(t('mobileErr2'))
      result = false
    }
    return result
  }

  async function onCompleted() {
    const concatPhone = '+'.concat(country.callingCode[0] ?? '').concat(phone ?? '')
    if (navigation && route && profile) {
      if (configuration.twilioEnabled) {
        FlashMessage({
          message: 'Phone number has been added successfully!'
        })
        await refetchProfile()
        navigation.navigate({
          name: 'PhoneOtp',
          merge: true,
          params: { name, phone: concatPhone, screen: route?.params?.screen }
        })
      } else {
        try {
          setLoading(true)
          const { data: { user } } = await supabase.auth.getUser()
          if (!user) throw new Error('Not authenticated')

          const { error } = await supabase
            .from('profiles')
            .update({
              name: profile.name,
              phone: concatPhone,
              phone_is_verified: true
            })
            .eq('id', user.id)

          if (error) throw error
          await refetchProfile()
        } catch (error) {
          onError(error)
          return
        } finally {
          setLoading(false)
        }

        if (isFocused) {
          navigation.navigate({
            name: 'Profile'
          })
        }
      }
    }
  }
  function onError(error) {
    FlashMessage({
      message: error?.message || t('somethingWentWrong')
    })
  }

  async function registerAction() {
    if (validateCredentials()) {
      await onCompleted()
    }
  }
  return {
    phone,
    setPhone,
    phoneError,
    country,
    countryCode,
    onCountrySelect,
    themeContext,
    currentTheme,
    loading,
    registerAction,
    setPhoneError,
    isCountryLoading
  }
}

export default useRegister
