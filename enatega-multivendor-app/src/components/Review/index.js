import React, { forwardRef, useEffect, useRef, useState } from 'react'
import { Dimensions, Image, StyleSheet, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native'
import { Modalize } from 'react-native-modalize'
import TextDefault from '../Text/TextDefault/TextDefault'
import CrossCirleIcon from '../../assets/SVG/cross-circle-icon'
import { scale } from '../../utils/scaling'
import StarIcon from '../../assets/SVG/star-icon'
import { styles } from './styles'
import Button from '../Button/Button'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../lib/supabase'

const SCREEN_HEIGHT = Dimensions.get('screen').height
const MODAL_HEIGHT = Math.floor(SCREEN_HEIGHT / 4)
const SNAP_HEIGHT = MODAL_HEIGHT

function Review({ onOverlayPress, theme, orderId, rating }, ref) {
  const { t } = useTranslation()

  const ratingRef = useRef()
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)

  function onCompleted() {
    setDescription('')
    ref?.current?.close()
  }
  function onError(error) {
    console.log(JSON.stringify(error))
  }
  const [showSection, setShowSection] = useState(false)
  const [order, setOrder] = useState()
  const onSelectRating = (rating) => {
    if (!showSection) { setShowSection(true) }
    ratingRef.current = rating
  }
  const fetchOrder = async() => {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        id,
        delivered_at,
        restaurant:restaurants(id, name, image),
        items:order_items(
          id,
          title,
          food:foods(title)
        )
      `)
      .eq('id', orderId)
      .single()

    if (error) {
      onError(error)
      return
    }

    setOrder({
      ...data,
      _id: data.id,
      deliveredAt: data.delivered_at,
      restaurant: data.restaurant,
      items: (data.items || []).map((item) => ({
        ...item,
        title: item.title || item.food?.title || ''
      }))
    })
  }
  useEffect(() => {
    if (!orderId) return
    fetchOrder()
  }, [orderId])

  const onSubmit = async() => {
    if (loading) return
    setLoading(true)

    try {
      const { data: authData } = await supabase.auth.getUser()
      const user = authData?.user
      if (!user) throw new Error('Not authenticated')
      if (!order?.restaurant?.id) throw new Error('Order restaurant not found')

      const { error } = await supabase
        .from('reviews')
        .upsert({
          order_id: orderId,
          restaurant_id: order.restaurant.id,
          user_id: user.id,
          rating: ratingRef.current,
          description
        }, { onConflict: 'order_id' })

      if (error) throw error
      onCompleted()
    } catch (error) {
      console.error('Error submitting review:', error)
      onError(error)
    } finally {
      setLoading(false)
    }
  }
  return (
    <Modalize snapPoint={SNAP_HEIGHT} handlePosition='inside' ref={ref} withHandle={false} adjustToContentHeight modalStyle={{ borderWidth: StyleSheet.hairlineWidth }} onOverlayPress={onOverlayPress}>
      <View style={styles.container(theme)}>
        <View style={styles.headingContainer(theme)}>
          <TextDefault bolder H3 textColor={theme.gray900}>
            {t('howWasOrder')}
          </TextDefault>
          <TouchableOpacity onPress={onCompleted}>
            <CrossCirleIcon stroke={theme.newIconColor}/>
          </TouchableOpacity>
        </View>
        <View style={styles.itemContainer(theme)}>
          <View style={{ justifyContent: 'space-evenly' }}>
            {order?.items?.slice(0, 2).map((item, index) => (<TextDefault key={`${item.food}-${index}`} H5 bold textColor={theme.gray900} isRTL >{item.title}</TextDefault>))}
            <View>
              {order?.deliveredAt && <TextDefault textColor={theme.gray500} isRTL>{(new Date(order?.deliveredAt).toString())}</TextDefault>}
            </View>
          </View>
          <View>
            <Image source={order?.restaurant?.image ? { uri: order?.restaurant?.image } : require('../../assets/images/food_placeholder.png') } style={styles.image}/>
          </View>
        </View>

        <View style={{ flexDirection: 'row' }}>
          <StarRating numberOfStars={5} onSelect={onSelectRating} defaultRating={rating} theme={theme} />
        </View>

        {(showSection || rating > 0) && <View>
          <TextDefault textColor={theme.gray900} H4 bolder style={{ marginVertical: scale(8) }} isRTL >{t('tellAboutExp')} {order?.restaurant?.name}</TextDefault>
          {/* <OutlinedTextField
            label={t('review')}
            placeholder={t('typeHere')}
            fontSize={scale(12)}
            maxLength={200}
            textAlignVertical="top"
            baseColor={theme.verticalLine}
            multiline={true}
            onChangeText={setDescription}
            placeholderTextColor={theme.newFontcolor}
            textColor={theme.newFontcolor}
          /> */}
          <TextInput
            label={t('review')}
            placeholder={t('typeHere')}
            placeholderTextColor={theme.placeholderColor}
            value={description}
            onChangeText={(text) => setDescription(text)}
            style={styles.modalInput(theme)}
          />
          <Button text={t('submit')}
            buttonProps={{ onPress: onSubmit, disabled: loading }}
            buttonStyles={{ borderRadius: 15, backgroundColor: theme.primary, margin: 10, opacity: loading ? 0.6 : 1 }} textStyles={{ margin: 10, alignSelf: 'center' }}
            textProps={{ H4: true, bold: true, textColor: theme.black }}/>
        </View>}
      </View>
    </Modalize>
  )
}

const StarRating = ({ numberOfStars = 5, onSelect, defaultRating = 0, theme }) => {
  const stars = Array.from({ length: numberOfStars }, (_, index) => index + 1)
  const [selected, setSelected] = useState(defaultRating)
  useEffect(() => {
    if (defaultRating) onSelect(defaultRating)
  }, [])
  const onPress = index => {
    onSelect(index)
    setSelected(index)
  }
  return (
    <View style={styles.starContainer(theme)}>
      {stars.map(index => <TouchableWithoutFeedback key={`star-${index}`} onPress={() => onPress(index)}>
        <View style={{ flex: 1 }}>
          <StarIcon isFilled={index <= selected}/>
        </View>
      </TouchableWithoutFeedback>)}
    </View>
  )
}

export default forwardRef(Review)
