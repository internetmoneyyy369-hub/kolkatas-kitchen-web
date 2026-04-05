import React, { useEffect, useState, useContext } from 'react'
import {
  View,
  Text,
  Modal,
  Button,
  Linking,
  Platform,
  StyleSheet
} from 'react-native'
import * as Application from 'expo-application'
import { useTranslation } from 'react-i18next'
import ThemeContext from '../../ui/ThemeContext/ThemeContext'
import { theme } from '../../utils/themeColors'
import styles from './styles'
import TextDefault from '../Text/TextDefault/TextDefault'
import { supabase } from '../../lib/supabase'

const compareVersions = (version1, version2) => {
  const v1Parts = version1.split('.').map(Number)
  const v2Parts = version2.split('.').map(Number)

  for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
    const v1 = v1Parts[i] || 0
    const v2 = v2Parts[i] || 0

    if (v1 > v2) return 1
    if (v1 < v2) return -1
  }

  return 0
}

const ForceUpdate = () => {
  const [isUpdateModalVisible, setIsUpdateModalVisible] = useState(false)
  const [currentVersion, setCurrentVersion] = useState(null)
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)
  const { t } = useTranslation()
  const themeContext = useContext(ThemeContext)
  const currentTheme = theme[themeContext.ThemeValue]

  useEffect(() => {
    const fetchCurrentVersion = async() => {
      try {
        const appVersion = await Application.nativeApplicationVersion
        setCurrentVersion(appVersion)

        const { data: versions, error } = await supabase
          .from('app_versions')
          .select('*')
          .eq('is_active', true)

        if (error) throw error

        const groupedVersions = (versions || []).reduce((acc, item) => {
          acc[item.platform] = item
          return acc
        }, {})

        setData({
          getVersions: {
            customerAppVersion: {
              ios: groupedVersions.ios?.version || appVersion,
              android: groupedVersions.android?.version || appVersion
            }
          }
        })
      } catch (error) {
        console.warn('Force update check failed:', error.message)
      } finally {
        setLoading(false)
      }
    }

    fetchCurrentVersion()
  }, [])

  useEffect(() => {
    const checkUpdate = () => {
      if (data?.getVersions && currentVersion) {
        const { customerAppVersion } = data.getVersions

        // New Version
        const new_version =
          Platform.OS === 'ios'
            ? customerAppVersion.ios
            : customerAppVersion.android

        if (compareVersions(currentVersion, new_version) < 0) {
          setIsUpdateModalVisible(true)
        }
      }
    }

    checkUpdate()
  }, [data, currentVersion])

  const handleUpdate = async() => {
    try {
      const storeUrl =
        Platform.OS === 'ios'
          ? 'https://apps.apple.com/pk/app/enatega-multivendor/id1526488093'
          : 'https://play.google.com/store/apps/details?id=com.enatega.multivendor&pli=1'

      await Linking.openURL(storeUrl)
    } catch (err) {
      console.error('Error opening store URL:', err)
    }
  }

  if (loading) return <Text>Loading...</Text>

  return (
    <Modal
      visible={isUpdateModalVisible}
      transparent={true}
      animationType='fade'
      onRequestClose={() => {}}
    >
      <View style={styles().modalContainer}>
        <View style={styles(currentTheme).modalContent}>
          <TextDefault
            bold
            textColor={currentTheme.fontMainColor}
            style={styles(currentTheme).title}
          >
            {t('UpdateAvailable')}
          </TextDefault>
          <TextDefault style={styles(currentTheme).message}>
            {t('UpdateAvailableText')}
          </TextDefault>
          <Button title={t('UpdateNow')} onPress={handleUpdate} />
        </View>
      </View>
    </Modal>
  )
}

export default ForceUpdate
