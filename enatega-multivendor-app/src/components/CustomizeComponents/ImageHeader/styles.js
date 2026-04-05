import { Dimensions, StyleSheet } from 'react-native'
import { alignment } from '../../../utils/alignment'
const { height } = Dimensions.get('window')

export default StyleSheet.create({
  backgroundImage: {
    height: height * 0.25,
    objectFit: 'cover',
    ...alignment.Mmedium
  }
})
