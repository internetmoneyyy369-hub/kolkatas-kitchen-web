import React from 'react'
import { View } from 'react-native'

const STATUS_STEPS = ['PENDING', 'ACCEPTED', 'ASSIGNED', 'PICKED', 'DELIVERED']

export function checkStatus(status) {
  const normalizedStatus = status || 'PENDING'
  const index = Math.max(STATUS_STEPS.indexOf(normalizedStatus), 0)

  return {
    index,
    statusText: normalizedStatus
  }
}

export function ProgressBar({
  currentTheme,
  item,
  customWidth
}) {
  const { index } = checkStatus(item?.orderStatus)
  const progress = STATUS_STEPS.length > 1 ? index / (STATUS_STEPS.length - 1) : 0

  return (
    <View
      style={{
        width: customWidth || '100%',
        height: 6,
        borderRadius: 999,
        backgroundColor: currentTheme?.gray300 || '#d1d5db',
        overflow: 'hidden'
      }}
    >
      <View
        style={{
          width: `${progress * 100}%`,
          height: '100%',
          borderRadius: 999,
          backgroundColor: currentTheme?.main || '#10b981'
        }}
      />
    </View>
  )
}

export default ProgressBar
