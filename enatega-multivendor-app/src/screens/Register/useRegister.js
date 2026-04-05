import { useState, useContext } from 'react'
import ThemeContext from '../../ui/ThemeContext/ThemeContext'
import { theme } from '../../utils/themeColors'
import { emailRegex, passRegex, nameRegex, phoneRegex } from '../../utils/regex'
import { useNavigation, useRoute } from '@react-navigation/native'
import { useTranslation } from 'react-i18next'
import { FlashMessage } from '../../ui/FlashMessage/FlashMessage'
import { Alert } from 'react-native'
import { useCountryFromIP } from '../../utils/useCountryFromIP'
import { supabase } from '../../lib/supabase'
import * as Device from 'expo-device'
import * as Notifications from 'expo-notifications'
import Constants from 'expo-constants'
import analytics from '../../utils/analytics'

const useRegister = () => {
  const navigation = useNavigation()
  const { t, i18n } = useTranslation()
  const Analytics = analytics()
  const route = useRoute()
  const [firstname, setFirstname] = useState('')
  const [lastname, setLastname] = useState('')
  const [email, setEmail] = useState(route.params?.email || '')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(true)
  const [firstnameError, setFirstnameError] = useState(null)
  const [lastnameError, setLastnameError] = useState(null)
  const [emailError, setEmailError] = useState(null)
  const [passwordError, setPasswordError] = useState(null)
  const [phoneError, setPhoneError] = useState(null)
  const [loading, setLoading] = useState(false)

  const {
    country,
    setCountry,
    currentCountry: countryCode,
    setCurrentCountry: setCountryCode,
    ipAddress,
    isLoading: isCountryLoading,
    error: countryError,
    refetch
  } = useCountryFromIP()

  const onCountrySelect = (country) => {
    setCountryCode(country.cca2)
    setCountry(country)
  }

  const themeContext = useContext(ThemeContext)
  const currentTheme = { isRTL: i18n.dir() === 'rtl', ...theme[themeContext.ThemeValue] }

  function validateCredentials() {
    let result = true

    setEmailError(null)
    setPasswordError(null)
    setPhoneError(null)
    setFirstnameError(null)
    setLastnameError(null)

    if (!email) {
      setEmailError(t('emailErr1'))
      result = false
    } else if (!emailRegex.test(email.trim())) {
      setEmailError(t('emailErr2'))
      result = false
    }

    if (!password) {
      setPasswordError(t('passErr1'))
      result = false
    } else if (passRegex.test(password) !== true) {
      setPasswordError(t('passErr2'))
      result = false
    }

    if (!phone) {
      setPhoneError(t('mobileErr1'))
      result = false
    } else if (!phoneRegex.test(phone)) {
      setPhoneError(t('mobileErr2'))
      result = false
    }

    if (!firstname) {
      setFirstnameError(t('firstnameErr1'))
      result = false
    } else if (!nameRegex.test(firstname)) {
      setFirstnameError(t('firstnameErr2'))
      result = false
    }

    if (!lastname) {
      setLastnameError(t('lastnameErr1'))
      result = false
    } else if (!nameRegex.test(lastname)) {
      setLastnameError(t('lastnameErr2'))
      result = false
    }
    return result
  }

  async function completeRegistration(formattedPhone) {
    try {
      setLoading(true)
      let notificationToken = null

      if (Device.isDevice) {
        try {
          const { status } = await Notifications.requestPermissionsAsync()
          if (status === 'granted') {
            notificationToken = (
              await Notifications.getExpoPushTokenAsync({
                projectId: Constants.expoConfig.extra.eas.projectId
              })
            ).data
          }
        } catch (notificationError) {
          console.log('Error catched in notificationToken:', notificationError)
        }
      }

      const fullName = `${firstname} ${lastname}`.trim()
      const normalizedEmail = email.toLowerCase().trim()
      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: {
            name: fullName,
            phone: formattedPhone
          }
        }
      })

      if (error) {
        throw error
      }

      if (data.user && notificationToken) {
        await supabase
          .from('profiles')
          .update({ notification_token: notificationToken })
          .eq('id', data.user.id)
      }

      FlashMessage({
        message: t('accountCreated')
      })

      if (data.user) {
        await Analytics.identify({ userId: data.user.id }, data.user.id)
        await Analytics.track(Analytics.events.USER_CREATED_ACCOUNT, {
          userId: data.user.id,
          name: fullName,
          email: normalizedEmail,
          type: 'email'
        })
      }

      navigation.navigate('PhoneOtp', {
        name: fullName,
        phone: formattedPhone
      })
    } catch (err) {
      FlashMessage({
        message: err.message || t('somethingWentWrong')
      })
    } finally {
      setLoading(false)
    }
  }

  async function registerAction() {
    if (validateCredentials()) {
      try {
        setLoading(true)
        const formattedPhone = ''.concat('+', country.callingCode[0], phone)
        const { data: phoneExists, error } = await supabase.rpc('check_phone_exists', { lookup_phone: formattedPhone })

        if (error) {
          throw error
        }

        if (phoneExists) {
          Alert.alert(
            '',
            t('AlreadyExsistsAlert'),
            [
              { text: t('close'), onPress: () => {}, style: 'cancel' },
              {
                text: t('Confirm'),
                onPress: () => {
                  completeRegistration(formattedPhone)
                }
              }
            ],
            { cancelable: true }
          )
        } else {
          await completeRegistration(formattedPhone)
        }
      } catch (err) {
        FlashMessage({
          message: err.message || t('phoneCheckingError')
        })
      } finally {
        setLoading(false)
      }
    }
  }

  return {
    email,
    setEmail,
    emailError,
    firstname,
    setFirstname,
    firstnameError,
    lastname,
    setLastname,
    lastnameError,
    password,
    setPassword,
    passwordError,
    phone,
    setPhone,
    phoneError,
    showPassword,
    setShowPassword,
    country,
    countryCode,
    registerAction,
    onCountrySelect,
    themeContext,
    currentTheme,
    setPhoneError,
    isCountryLoading,
    loading
  }
}

export default useRegister
