import React from 'react'
import { TextInput, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { scale } from '../../../utils/scaling'

function Search({ setSearch, search, newheaderColor, placeHolder }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: scale(12),
        borderWidth: 1,
        borderColor: '#e5e7eb',
        backgroundColor: newheaderColor || '#fff',
        paddingHorizontal: scale(12)
      }}
    >
      <Ionicons name='search' size={scale(18)} color='#6b7280' />
      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder={placeHolder}
        placeholderTextColor='#9ca3af'
        style={{
          flex: 1,
          paddingVertical: scale(12),
          paddingHorizontal: scale(8)
        }}
      />
    </View>
  )
}

export default React.memo(Search)
