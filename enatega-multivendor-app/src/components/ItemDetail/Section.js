import { View } from 'react-native'
import React, { useContext } from 'react'
import TextDefault from '../Text/TextDefault/TextDefault'
import Row from './Row'
import { scale } from '../../utils/scaling'
import { useTranslation } from 'react-i18next'
import ThemeContext from '../../ui/ThemeContext/ThemeContext'
import { theme } from '../../utils/themeColors'
import { useRestaurant } from '../../ui/hooks'

const Section = ({ itemId, restaurantId }) => {
  const { t } = useTranslation()
  const themeContext = useContext(ThemeContext)
  const currentTheme = theme[themeContext.ThemeValue]
  const { loading, error, data } = useRestaurant(restaurantId)
  if (loading) return <View />
  if (error) return <View />
  const restaurant = data?.restaurant
  const relatedItems = (restaurant?.categories || [])
    .flatMap((category) => category?.foods || [])
    .filter((food) => food?._id !== itemId)

  if (relatedItems.length < 1) return <View />

  const slicedItems =
    relatedItems.length > 3 ? relatedItems.slice(0, 3) : relatedItems
  return (
    <View>
      <View style={{ marginBottom: scale(15) }}>
        <TextDefault H4 bolder textColor={currentTheme.newFontcolor} isRTL>{t('frequentlyBoughtTogether')}</TextDefault>
      </View>
      {slicedItems.map((foodItem) => (
        <Row key={foodItem?._id} foodItem={foodItem} restaurant={restaurant} />
      ))}
    </View>
  )
}
export default Section
