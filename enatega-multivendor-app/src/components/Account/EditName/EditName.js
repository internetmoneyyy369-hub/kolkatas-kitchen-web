import React, { useContext, useEffect, useState } from 'react'
import { TouchableOpacity, View, TextInput } from 'react-native'
import Spinner from '../../Spinner/Spinner'
import styles from './styles.js'
import ThemeContext from '../../../ui/ThemeContext/ThemeContext.js'
import { theme } from '../../../utils/themeColors.js'
import TextDefault from '../../Text/TextDefault/TextDefault.js'
import { MaterialIcons } from '@expo/vector-icons'
import { useTranslation } from 'react-i18next'
import { HeaderBackButton } from '@react-navigation/elements'
import { scale } from '../../../utils/scaling.js'
import navigationService from '../../../routes/navigationService.js'
import { useRoute, useFocusEffect } from '@react-navigation/native'
import { FlashMessage } from '../../../ui/FlashMessage/FlashMessage.js'
import { supabase } from '../../../lib/supabase.js'
import UserContext from '../../../context/User.js'

const EditName = (props) => {
  const { t, i18n } = useTranslation()
  const themeContext = useContext(ThemeContext)
  const currentTheme = { isRTL: i18n.dir() === 'rtl', ...theme[themeContext.ThemeValue] }
  const route = useRoute()
  const { name: initialName } = route?.params
  const { refetchProfile } = useContext(UserContext)
  const [loadingMutation, setLoadingMutation] = useState(false)
  const [name, setName] = useState(initialName)
  const [nameError, setNameError] = useState('')
  const [isNameChanged, setIsNameChanged] = useState(false)

  // Handle back button press with unsaved changes
  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        if (isNameChanged) {
          // Could add an alert here asking if user wants to discard changes
          return false // Allow navigation
        }
        return false
      }

      return onBackPress
    }, [isNameChanged])
  )

  useEffect(() => {
    props?.navigation.setOptions({
      title: t('Account'),
      headerRight: null,
      headerTitleAlign: 'center',
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
      headerLeft: () => (
        <HeaderBackButton
          truncatedLabel=''
          backImage={() => (
            <View>
              <MaterialIcons
                name='arrow-back'
                size={25}
                color={currentTheme.newIconColor}
              />
            </View>
          )}
          onPress={() => {
            if (isNameChanged) {
              // Reset to original name if there are unsaved changes
              setName(initialName)
              setIsNameChanged(false)
            }
            navigationService.goBack()
          }}
        />
      )
    })
  }, [])

  function onCompleted() {
    FlashMessage({
      message: t('userInfoUpdated')
    })
    navigationService.goBack()
  }

  function onError(error) {
    FlashMessage({
      message: error?.message || t('somethingWentWrong')
    })
  }

  const validateName = async() => {
    setNameError('')
    const updatedName = name.trim()

    if (updatedName !== initialName) {
      if (!updatedName) {
        setNameError(t('nameError'))
        return false
      }
      return true
    }
    return true
  }

  const updateName = async() => {
    const isValid = await validateName()
    if (isValid && name.trim() !== initialName) {
      try {
        setLoadingMutation(true)
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('Not authenticated')

        const { error } = await supabase
          .from('profiles')
          .update({ name: name.trim() })
          .eq('id', user.id)

        if (error) throw error

        await refetchProfile()
        onCompleted()
      } catch (error) {
        onError(error)
      } finally {
        setLoadingMutation(false)
      }
    }
  }

  const handleNamePressUpdate = async() => {
    await updateName()
  }

  return (
    <>
      <View style={styles(currentTheme).mainView}>
        <View style={styles(currentTheme).mainContainer}>
          <View>
            <TextInput
              style={styles(currentTheme).textField}
              placeholderTextColor={currentTheme.fontSecondColor}
              value={name}
              onChangeText={(updatedName) => {
                setName(updatedName)
                setIsNameChanged(updatedName !== initialName)
              }}
            />
            {nameError !== '' && (
              <TextDefault
                style={styles().error}
                bold
                textColor={currentTheme.red600}
              >
                {nameError}
              </TextDefault>
            )}
          </View>

          <View style={styles(currentTheme).containerButton}>
            <TouchableOpacity
              activeOpacity={0.5}
              style={[
                styles(currentTheme).addButton,
                {
                  opacity: isNameChanged ? 1 : 0.5
                }
              ]}
              onPress={handleNamePressUpdate}
              disabled={!isNameChanged || loadingMutation}
            >
              <View style={styles(currentTheme).contentContainer}>
                {loadingMutation
                  ? (
                  <Spinner size='small' backColor='transparent' spinnerColor={currentTheme.white} />
                    )
                  : (
                  <TextDefault bold H5>
                    {t('saveBtn')}
                  </TextDefault>
                    )}
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </>
  )
}

export default EditName
