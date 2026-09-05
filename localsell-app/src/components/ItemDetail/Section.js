import { View } from 'react-native'
import React, { useContext } from 'react'
import TextDefault from '../Text/TextDefault/TextDefault'
import Row from './Row'
import { scale } from '../../utils/scaling'
import {
  relatedItems as relatedItemsQuery,
  restaurant as restaurantQuery
} from '../../apollo/queries'
import { gql, useApolloClient, useQuery } from '@apollo/client'
import { useTranslation } from 'react-i18next'
import ThemeContext from '../../ui/ThemeContext/ThemeContext'
import { theme } from '../../utils/themeColors'

const RELATED_ITEMS = gql`
  ${relatedItemsQuery}
`
const RESTAURANT = gql`
  ${restaurantQuery}
`

const Section = ({ itemId, restaurantId }) => {
  const { t } = useTranslation()
  const themeContext = useContext(ThemeContext)
  const currentTheme = theme[themeContext.ThemeValue]
  const client = useApolloClient()
  const { loading, error, data } = useQuery(RELATED_ITEMS, {
    variables: { itemId, restaurantId }
  })
  const result = client.readQuery({
    query: RESTAURANT,
    variables: { id: restaurantId }
  })

  // Prefer the merchant's own "frequently bought together" picks for this item;
  // fall back to the auto-generated relatedItems.
  const allFoods = (result?.restaurant?.categories ?? []).flatMap((c) => c.foods ?? [])
  const currentFood = allFoods.find((f) => f._id === itemId)
  const pairedIds = (currentFood?.pairedFoods ?? [])
    .filter((p) => !p.isOutOfStock)
    .map((p) => p._id)

  if (loading && !pairedIds.length) return <View />
  if (error && !pairedIds.length) return <View />
  const relatedItems = data?.relatedItems ?? []

  const slicedItems = (pairedIds.length ? pairedIds : relatedItems).slice(0, 3)
  if (slicedItems.length < 1) return <View />
  return (
    <View>
      <View style={{ marginBottom: scale(15) }}>
        <TextDefault H4 bolder textColor={currentTheme.newFontcolor} isRTL>{t('frequentlyBoughtTogether')}</TextDefault>
      </View>
      {slicedItems.map((id) => (
        <Row key={id} id={id} restaurant={result?.restaurant} />
      ))}
    </View>
  )
}
export default Section
