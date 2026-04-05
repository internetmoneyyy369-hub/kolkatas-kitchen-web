import React from 'react'
import { TouchableOpacity, View } from 'react-native'
import { EvilIcons, Feather } from '@expo/vector-icons'
import TextDefault from '../../Text/TextDefault/TextDefault'
import { scale } from '../../../utils/scaling'

function Location({
  locationIcon,
  locationLabel,
  location,
  navigation,
  addresses = [],
  forwardIcon = false,
  screenName
}) {
  const selectedAddress = addresses.find((item) => item?.selected) || addresses[0]

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => navigation?.navigate('CartAddress', { screenName })}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: scale(12)
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
        <EvilIcons name='location' size={scale(28)} color={locationIcon || '#111827'} />
        <View style={{ flex: 1 }}>
          <TextDefault bold textColor={locationLabel || '#111827'}>
            Deliver to
          </TextDefault>
          <TextDefault numberOfLines={2} textColor={location || '#6b7280'}>
            {selectedAddress?.deliveryAddress || 'Select a delivery address'}
          </TextDefault>
        </View>
      </View>
      {forwardIcon && <Feather name='chevron-right' size={scale(20)} color={locationIcon || '#111827'} />}
    </TouchableOpacity>
  )
}

export default React.memo(Location)
