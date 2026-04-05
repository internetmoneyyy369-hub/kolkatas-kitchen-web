import React from 'react'
import { View } from 'react-native'
import TextDefault from '../Text/TextDefault/TextDefault'
import { scale } from '../../utils/scaling'

export function ActiveOrdersAndSections({ menuPageHeading, subHeading }) {
  return (
    <View style={{ paddingHorizontal: scale(16), paddingVertical: scale(12) }}>
      {!!menuPageHeading && (
        <TextDefault H4 bolder>
          {menuPageHeading}
        </TextDefault>
      )}
      {!!subHeading && (
        <TextDefault style={{ marginTop: scale(4) }}>
          {subHeading}
        </TextDefault>
      )}
    </View>
  )
}
