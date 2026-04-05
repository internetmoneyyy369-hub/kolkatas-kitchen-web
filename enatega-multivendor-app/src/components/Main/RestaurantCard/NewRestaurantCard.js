import React, { useContext } from 'react'
import { Image, TouchableOpacity, View } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import ThemeContext from '../../../ui/ThemeContext/ThemeContext'
import { theme } from '../../../utils/themeColors'
import TextDefault from '../../Text/TextDefault/TextDefault'
import { scale } from '../../../utils/scaling'

function NewRestaurantCard(props) {
  const navigation = useNavigation()
  const themeContext = useContext(ThemeContext)
  const currentTheme = theme[themeContext.ThemeValue]

  const imageSource = props?.image
    ? { uri: props.image }
    : require('../../../assets/images/food_placeholder.png')

  const handlePress = () => {
    navigation.navigate('Restaurant', {
      ...props,
      _id: props?._id || props?.id
    })
  }

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={handlePress}
      style={{
        width: scale(220),
        marginRight: scale(12),
        borderRadius: scale(16),
        overflow: 'hidden',
        backgroundColor: currentTheme.cardBackground || currentTheme.white,
        borderWidth: 1,
        borderColor: currentTheme.horizontalLine || '#e5e7eb'
      }}
    >
      <Image
        source={imageSource}
        style={{
          width: '100%',
          height: scale(120)
        }}
        resizeMode='cover'
      />
      <View style={{ padding: scale(12), gap: scale(4) }}>
        <TextDefault H5 bolder textColor={currentTheme.fontMainColor} numberOfLines={1}>
          {props?.name || props?.title || 'Restaurant'}
        </TextDefault>
        <TextDefault textColor={currentTheme.fontSecondColor} numberOfLines={1}>
          {props?.isOpen ? 'Open' : 'Closed'}
        </TextDefault>
        <TextDefault textColor={currentTheme.fontSecondColor} numberOfLines={1}>
          Rating {props?.reviewAverage ?? 0} ({props?.reviewCount ?? 0})
        </TextDefault>
      </View>
    </TouchableOpacity>
  )
}

export default React.memo(NewRestaurantCard)
