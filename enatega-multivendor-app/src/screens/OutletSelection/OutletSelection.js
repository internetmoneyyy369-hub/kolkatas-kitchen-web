import React, { useContext } from 'react'
import { View, SafeAreaView, FlatList, TouchableOpacity, ActivityIndicator, Image } from 'react-native'
import TextDefault from '../../components/Text/TextDefault/TextDefault'
import ThemeContext from '../../ui/ThemeContext/ThemeContext'
import { theme } from '../../utils/themeColors'
import { useTranslation } from 'react-i18next'
import { useOutletSelection } from './useOutletSelection'
import styles from './styles'
import Spinner from '../../components/Spinner/Spinner'
import { scale } from '../../utils/scaling'
import { IMAGE_LINK } from '../../utils/constants'

function OutletSelection() {
  const { t, i18n } = useTranslation()
  const themeContext = useContext(ThemeContext)
  const currentTheme = { isRTL: i18n.dir() === 'rtl', ...theme[themeContext.ThemeValue] }

  const { outlets, loading, selectOutlet, refresh } = useOutletSelection()

  const renderOutlet = ({ item }) => (
    <TouchableOpacity
      activeOpacity={0.8}
      style={styles(currentTheme).card}
      onPress={() => selectOutlet(item)}
    >
      <Image
        source={{ uri: item.image || IMAGE_LINK }}
        style={styles().outletImage}
      />
      <View style={styles().cardInfo}>
        <TextDefault H5 bolder isRTL>
          {item.name}
        </TextDefault>
        <TextDefault textColor={currentTheme.fontSecondColor} isRTL>
          {item.address}
        </TextDefault>

        {item.distance !== undefined && (
          <View style={styles(currentTheme).badge}>
            <TextDefault small textColor={currentTheme.white} bold>
              {(item.distance / 1000).toFixed(1)} km away
            </TextDefault>
          </View>
        )}
      </View>
    </TouchableOpacity>
  )

  const renderEmpty = () => (
    <View style={styles().emptyContainer}>
      <TextDefault H4 bolder textColor={currentTheme.fontMainColor}>
        {t('No outlets found')}
      </TextDefault>
      <TextDefault textColor={currentTheme.fontSecondColor} style={{ marginTop: scale(10), textAlign: 'center' }}>
        {t('We couldn\'t find any outlets nearby. Please try again later or check your location.')}
      </TextDefault>
      <TouchableOpacity
        style={[styles(currentTheme).badge, { marginTop: scale(20) }]}
        onPress={refresh}
      >
        <TextDefault textColor={currentTheme.white} bold style={{ padding: scale(5) }}>
          {t('Refresh')}
        </TextDefault>
      </TouchableOpacity>
    </View>
  )

  return (
    <SafeAreaView style={styles(currentTheme).flex}>
      <View style={[styles(currentTheme).flex, styles(currentTheme).screenBackground]}>
        <View style={styles(currentTheme).header}>
          <TextDefault H3 bolder isRTL>
            {t('Select an Outlet')}
          </TextDefault>
          <TextDefault textColor={currentTheme.fontSecondColor} isRTL>
            {t('Choose an outlet to view its specific menu and begin your order.')}
          </TextDefault>
        </View>

        {loading
          ? (
          <View style={[styles().flex, { justifyContent: 'center', alignItems: 'center' }]}>
            <Spinner />
          </View>
            )
          : (
          <FlatList
            data={outlets}
            keyExtractor={item => item.id || item._id}
            renderItem={renderOutlet}
            contentContainerStyle={styles().listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={renderEmpty}
          />
            )}
      </View>
    </SafeAreaView>
  )
}

export default OutletSelection
