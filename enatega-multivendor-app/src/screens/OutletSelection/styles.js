import { StyleSheet } from 'react-native'
import { alignment } from '../../utils/alignment'
import { scale } from '../../utils/scaling'

const styles = (props = null) =>
  StyleSheet.create({
    flex: {
      flex: 1
    },
    screenBackground: {
      backgroundColor: props !== null ? props.themeBackground : 'white'
    },
    header: {
      padding: scale(15),
      ...alignment.PBsmall
    },
    listContent: {
      padding: scale(15),
      paddingBottom: scale(30)
    },
    card: {
      backgroundColor: props !== null ? props.cardBackground : '#fff',
      borderRadius: scale(10),
      padding: scale(15),
      ...alignment.MBmedium,
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 2
      },
      shadowOpacity: 0.1,
      shadowRadius: 3,
      elevation: 3,
      flexDirection: 'row',
      alignItems: 'center'
    },
    cardInfo: {
      flex: 1,
      ...alignment.MLsmall
    },
    outletImage: {
      width: scale(60),
      height: scale(60),
      borderRadius: scale(30)
    },
    badge: {
      paddingHorizontal: scale(8),
      paddingVertical: scale(4),
      borderRadius: scale(10),
      backgroundColor: props !== null ? props.iconColorPink : 'pink',
      alignSelf: 'flex-start',
      ...alignment.MTsmall
    },
    emptyContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      padding: scale(20),
      marginTop: scale(50)
    }
  })

export default styles
