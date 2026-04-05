import { useContext, useState } from 'react'
import { useNavigation } from '@react-navigation/native'
import { useTranslation } from 'react-i18next'
import UserContext from '../../context/User'
import { FlashMessage } from '../../ui/FlashMessage/FlashMessage'
import { supabase } from '../../lib/supabase'

export const useFavorite = (restaurantId) => {
  const { t } = useTranslation()
  const { profile, refetchProfile } = useContext(UserContext)
  const navigation = useNavigation()
  const [loading, setLoading] = useState(false)
  const favourites = profile?.favourite || []
  const isFavorite = profile ? favourites.includes(restaurantId) : false

  const toggleFavorite = async() => {
    if (loading) return
    if (profile) {
      try {
        setLoading(true)
        const nextFavourites = isFavorite
          ? favourites.filter((id) => id !== restaurantId)
          : [...favourites, restaurantId]

        const { error } = await supabase
          .from('profiles')
          .update({ favourite: nextFavourites })
          .eq('id', profile._id || profile.id)

        if (error) throw error

        await refetchProfile()
        FlashMessage({ message: t('favouritelistUpdated') })
      } catch (error) {
        FlashMessage({ message: error.message })
      } finally {
        setLoading(false)
      }
    } else {
      FlashMessage({ message: t('loginRequired') })
      navigation.navigate('CreateAccount')
    }
  }

  return { isFavorite, loading, toggleFavorite }
}
