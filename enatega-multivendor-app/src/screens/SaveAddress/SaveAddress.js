import React, { useContext, useLayoutEffect, useState } from 'react'
import {
  View,
  TouchableOpacity,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  StatusBar,
  Alert
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import styles from './styles'
import { scale } from '../../utils/scaling'
import ThemeContext from '../../ui/ThemeContext/ThemeContext'
import { theme } from '../../utils/themeColors'
import TextDefault from '../../components/Text/TextDefault/TextDefault'
import { LocationContext } from '../../context/Location'
import { MaterialIcons } from '@expo/vector-icons'
import { HeaderBackButton } from '@react-navigation/elements'
import navigationService from '../../routes/navigationService'
import { useTranslation } from 'react-i18next'
import CustomOtherIcon from '../../assets/SVG/imageComponents/CustomOtherIcon'
import CustomHomeIcon from '../../assets/SVG/imageComponents/CustomHomeIcon'
import CustomWorkIcon from '../../assets/SVG/imageComponents/CustomWorkIcon'
import {
  StackActions,
  useFocusEffect,
  useNavigation
} from '@react-navigation/native'
import { FlashMessage } from '../../ui/FlashMessage/FlashMessage'
import Spinner from '../../components/Spinner/Spinner'
import CustomApartmentIcon from '../../assets/SVG/imageComponents/CustomApartmentIcon'
import { supabase } from '../../lib/supabase'
import UserContext from '../../context/User'

function SaveAddress(props) {
  const navigation = useNavigation()
  const { t, i18n } = useTranslation()
  const { locationData } = props?.route.params
  const { setLocation } = useContext(LocationContext)
  const { refetchProfile } = useContext(UserContext)
  const themeContext = useContext(ThemeContext)
  const currentTheme = { isRTL: i18n.dir() === 'rtl', ...theme[themeContext.ThemeValue] }
  const [selectedLabel, setSelectedLabel] = useState('')
  const inset = useSafeAreaInsets()
  const [loading, setLoading] = useState(false)

  function onCompleted(address) {
    FlashMessage({
      message: t('addressUpdated')
    })

    setLocation({
      _id: address._id,
      label: address.label,
      deliveryAddress: address.deliveryAddress,
      latitude: locationData.latitude,
      longitude: locationData.longitude,
      city: locationData.city
    })

    if (locationData.prevScreen) {
      navigation.navigate(locationData.prevScreen)
    } else {
      navigation.navigate('Main')
      // navigation.dispatch(StackActions.popToTop())
    }
  }

  function onError(error) {
    FlashMessage({
      message: `${t('errorOccured')} ${error?.message || error}`
    })
  }

  useFocusEffect(() => {
    if (Platform.OS === 'android') {
      StatusBar.setBackgroundColor(currentTheme.menuBar)
    }
    StatusBar.setBarStyle(
      themeContext.ThemeValue === 'Dark' ? 'light-content' : 'dark-content'
    )
  })

  useLayoutEffect(() => {
    props?.navigation.setOptions({
      headerRight: null,
      title: t('saveAddress'),
      headerTitleStyle: {
        color: currentTheme.newFontcolor,
        fontWeight: 'bold'
      },
      headerTitleContainerStyle: {
        marginTop: '2%',
        paddingLeft: scale(25),
        paddingRight: scale(25),
        height: '75%',
        marginLeft: 0
      },
      headerStyle: {
        backgroundColor: currentTheme.newheaderBG,
        elevation: 0
      },
      headerTitleAlign: 'center',
      headerLeft: () => (
        <HeaderBackButton
          truncatedLabel=''
          backImage={() => (
            <View>
              <MaterialIcons name='arrow-back' size={30} color={currentTheme.newIconColor} />
            </View>
          )}
          onPress={() => {
            navigationService.goBack()
          }}
        />
      )
    })
  })

  const onSelectLocation = async() => {
    if (!selectedLabel) {
      Alert.alert('Alert', t('alertLocation'))
      return
    }

    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      await supabase
        .from('addresses')
        .update({ selected: false })
        .eq('user_id', user.id)

      const payload = {
        user_id: user.id,
        delivery_address: locationData.deliveryAddress,
        details: locationData.deliveryAddress,
        label: selectedLabel === 'Apartment' ? 'Other' : selectedLabel,
        selected: true,
        location: {
          type: 'Point',
          coordinates: [parseFloat(`${locationData.longitude}`), parseFloat(`${locationData.latitude}`)]
        }
      }

      let result
      if (locationData.id) {
        const { data, error } = await supabase
          .from('addresses')
          .update(payload)
          .eq('id', locationData.id)
          .select('*')
          .single()
        if (error) throw error
        result = data
      } else {
        const { data, error } = await supabase
          .from('addresses')
          .insert(payload)
          .select('*')
          .single()
        if (error) throw error
        result = data
      }

      await refetchProfile()
      onCompleted({
        ...result,
        _id: result.id,
        deliveryAddress: result.delivery_address
      })
    } catch (error) {
      onError(error)
    } finally {
      setLoading(false)
    }
  }

  const handleLabelSelection = (label) => {
    setSelectedLabel(label)
  }

  return (
    <>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'android' ? 20 : 0}
        style={styles(currentTheme).flex}
      >
        <View style={styles(currentTheme).flex}>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ flexGrow: 1 }}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles(currentTheme).subContainer}>
              <View style={styles().upperContainer}>
                <View style={styles(currentTheme).addressContainer}>
                  <View style={styles(currentTheme).addressTag}>
                    <TextDefault
                      H4
                      bolder
                      textColor={currentTheme.newFontcolor}
                      isRTL
                    >
                      {t('address')}
                    </TextDefault>
                  </View>
                  <View style={styles().address}>
                    <View style={styles().addressTag}>
                      <TextDefault
                        H5
                        bold
                        textColor={currentTheme.newFontcolor}
                        isRTL
                      >
                        {locationData.city}
                      </TextDefault>
                    </View>
                    <View style={styles().addressDetails}>
                      <TextDefault bold textColor={currentTheme.gray600} isRTL>
                        {locationData.deliveryAddress}
                      </TextDefault>
                    </View>
                  </View>
                  <View style={styles().address}>
                    <View style={styles().addressTag}>
                      <TextDefault
                        H5
                        bold
                        textColor={currentTheme.newFontcolor}
                        isRTL
                      >
                        {t('locationType')}
                      </TextDefault>
                    </View>
                    <View style={styles().addressDetails}>
                      <TextDefault bold textColor={currentTheme.gray600} isRTL>
                        {t('locationTypeDetails')}
                      </TextDefault>
                    </View>
                  </View>
                  <View style={styles(currentTheme).locationContainer}>
                    <View style={styles(currentTheme).locationRow}>
                      <View style={styles().locationIcon}>
                        <TouchableOpacity
                          style={styles().locationIconStyles}
                          onPress={() => handleLabelSelection('Apartment')}
                        >
                          <CustomApartmentIcon
                            iconColor={
                              selectedLabel === 'Apartment'
                                ? currentTheme.newheaderColor
                                : currentTheme.darkBgFont
                            }
                          />
                        </TouchableOpacity>
                      </View>
                      <View style={styles().locationTypes}>
                        <TouchableOpacity
                          style={styles().locationStyles}
                          onPress={() => handleLabelSelection('Apartment')}
                        >
                          <TextDefault
                            H5
                            bolder
                            textColor={
                              selectedLabel === 'Apartment'
                                ? currentTheme.newheaderColor
                                : currentTheme.darkBgFont
                            }
                            isRTL
                          >
                            {t('Apartment')}
                          </TextDefault>
                        </TouchableOpacity>
                      </View>
                    </View>
                    <View style={styles(currentTheme).locationRow}>
                      <View style={styles().locationIcon}>
                        <TouchableOpacity
                          style={styles().locationIconStyles}
                          onPress={() => handleLabelSelection('House')}
                        >
                          <CustomHomeIcon
                            iconColor={
                              selectedLabel === 'House'
                                ? currentTheme.newheaderColor
                                : currentTheme.darkBgFont
                            }
                          />
                        </TouchableOpacity>
                      </View>
                      <View style={styles().locationTypes}>
                        <TouchableOpacity
                          style={styles().locationStyles}
                          onPress={() => handleLabelSelection('House')}
                        >
                          <TextDefault
                            H5
                            bolder
                            textColor={
                              selectedLabel === 'House'
                                ? currentTheme.newheaderColor
                                : currentTheme.darkBgFont
                            }
                            isRTL
                          >
                            {t('House')}
                          </TextDefault>
                        </TouchableOpacity>
                      </View>
                    </View>
                    <View style={styles(currentTheme).locationRow}>
                      <View style={styles().locationIcon}>
                        <TouchableOpacity
                          style={styles().locationIconStyles}
                          onPress={() => handleLabelSelection('Office')}
                        >
                          <CustomWorkIcon
                            iconColor={
                              selectedLabel === 'Office'
                                ? currentTheme.newheaderColor
                                : currentTheme.darkBgFont
                            }
                          />
                        </TouchableOpacity>
                      </View>
                      <View style={styles().locationTypes}>
                        <TouchableOpacity
                          style={styles().locationStyles}
                          onPress={() => handleLabelSelection('Office')}
                        >
                          <TextDefault
                            H5
                            bolder
                            textColor={
                              selectedLabel === 'Office'
                                ? currentTheme.newheaderColor
                                : currentTheme.darkBgFont
                            }
                            isRTL
                          >
                            {t('Office')}
                          </TextDefault>
                        </TouchableOpacity>
                      </View>
                    </View>
                    <View style={styles(currentTheme).lastLocationRow}>
                      <View style={styles().locationIcon}>
                        <TouchableOpacity
                          style={styles().locationIconStyles}
                          onPress={() => handleLabelSelection('Other')}
                        >
                          <CustomOtherIcon
                            iconColor={
                              selectedLabel === 'Other'
                                ? currentTheme.newheaderColor
                                : currentTheme.darkBgFont
                            }
                          />
                        </TouchableOpacity>
                      </View>
                      <View style={styles().locationTypes}>
                        <TouchableOpacity
                          style={styles().locationStyles}
                          onPress={() => handleLabelSelection('Other')}
                        >
                          <TextDefault
                            H5
                            bolder
                            textColor={
                              selectedLabel === 'Other'
                                ? currentTheme.newheaderColor
                                : currentTheme.darkBgFont
                            }
                            isRTL
                          >
                            {t('Other')}
                          </TextDefault>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                </View>
              </View>
            </View>
            <View>
              <TouchableOpacity
                disabled={loading}
                onPress={onSelectLocation}
                activeOpacity={0.5}
                style={styles(currentTheme).saveBtnContainer}
              >
                {!loading && (
                  <TextDefault textColor={currentTheme.black} H5 bold>
                    {t('saveAddress')}
                  </TextDefault>
                )}
                {loading && <Spinner backColor={'transparent'} />}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
      <View
        style={{
          paddingBottom: inset.bottom,
          backgroundColor: currentTheme.themeBackground
        }}
      />
    </>
  )
}

export default SaveAddress
