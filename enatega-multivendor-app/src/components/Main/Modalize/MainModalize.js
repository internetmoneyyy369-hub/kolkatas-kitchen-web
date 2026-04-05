import React from 'react'
import { TouchableOpacity, View } from 'react-native'
import { Modalize } from 'react-native-modalize'
import TextDefault from '../../Text/TextDefault/TextDefault'
import { scale } from '../../../utils/scaling'

function MainModalize({
  modalRef,
  currentTheme,
  modalHeader,
  modalFooter,
  setAddressLocation,
  profile,
  location
}) {
  const addresses = profile?.addresses || []

  return (
    <Modalize
      ref={modalRef}
      adjustToContentHeight
      modalStyle={{ backgroundColor: currentTheme?.themeBackground || '#fff' }}
      handleStyle={{ backgroundColor: currentTheme?.fontSecondColor || '#9ca3af' }}
    >
      <View style={{ padding: scale(16), gap: scale(12) }}>
        {typeof modalHeader === 'function' ? modalHeader() : null}
        {addresses.map((address) => {
          const selected = address?._id === location?._id || address?.selected
          return (
            <TouchableOpacity
              key={address?._id || address?.id}
              activeOpacity={0.8}
              onPress={() => setAddressLocation?.(address)}
              style={{
                padding: scale(12),
                borderRadius: scale(12),
                borderWidth: 1,
                borderColor: selected ? currentTheme?.main || '#111827' : currentTheme?.horizontalLine || '#e5e7eb'
              }}
            >
              <TextDefault bold>{address?.label || 'Address'}</TextDefault>
              <TextDefault numberOfLines={2}>{address?.deliveryAddress}</TextDefault>
            </TouchableOpacity>
          )
        })}
        {typeof modalFooter === 'function' ? modalFooter() : null}
      </View>
    </Modalize>
  )
}

export default React.memo(MainModalize)
