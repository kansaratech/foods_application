import React, { useContext, useMemo } from 'react'
import { View } from 'react-native'
import TextDefault from '../Text/TextDefault/TextDefault'
import ThemeContext from '../../ui/ThemeContext/ThemeContext'
import { theme } from '../../utils/themeColors'
import styles from './styles'
import Ripple from 'react-native-material-ripple'
import ShimmerImage from '../ShimmerImage/ShimmerImage'

// Soft, deterministic tint per label so a section of image-less cards still
// reads as a considered set rather than a row of empty grey boxes.
const TINTS = [
  { bg: '#FFEDD9', fg: '#B45309' }, // amber
  { bg: '#E7F0FF', fg: '#1D4ED8' }, // blue
  { bg: '#E9F9EF', fg: '#047857' }, // green
  { bg: '#FDE8EF', fg: '#9D174D' }, // maroon/pink
  { bg: '#EFE9FB', fg: '#6D28D9' }, // purple
  { bg: '#FFF4E0', fg: '#C2410C' } // orange
]

const isRealImage = (url) =>
  typeof url === 'string' &&
  url.trim().length > 0 &&
  /^https?:\/\//.test(url.trim())

const CollectionCard = ({ onPress, image, name }) => {
  const themeContext = useContext(ThemeContext)
  const currentTheme = theme[themeContext.ThemeValue]

  const realImage = useMemo(() => {
    const raw = (image || '').split('#')[0]
    return isRealImage(raw) ? raw : null
  }, [image])

  const tint = useMemo(() => {
    const key = (name || '?').toUpperCase()
    let hash = 0
    for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0
    return TINTS[hash % TINTS.length]
  }, [name])

  const initials = useMemo(() => {
    const parts = (name || '').trim().split(/\s+/).filter(Boolean)
    if (parts.length === 0) return '•'
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }, [name])

  return (
    <Ripple
      activeOpacity={0.8}
      onPress={onPress}
      style={styles(currentTheme).collectionCard}
      rippleColor={'#F5F5F5'}
      rippleContainerBorderRadius={8}
      rippleDuration={300}
    >
      <View style={styles().brandImgContainer}>
        {realImage
          ? (
          <ShimmerImage
            imageUrl={realImage}
            style={styles().collectionImage}
            resizeMode='cover'
          />
            )
          : (
          <View
            style={[
              styles().collectionImage,
              {
                backgroundColor: tint.bg,
                alignItems: 'center',
                justifyContent: 'center'
              }
            ]}
          >
            <TextDefault
              style={{ fontSize: 22, fontWeight: '800', color: tint.fg }}
            >
              {initials}
            </TextDefault>
          </View>
            )}
      </View>
      <TextDefault
        Normal
        bolder
        style={{ padding: 8 }}
        textColor={currentTheme.gray700}
        isRTL
        numberOfLines={2}
        ellipsizeMode='tail'
        adjustsFontSizeToFit
        minimumFontScale={0.8}
      >
        {name}
      </TextDefault>
    </Ripple>
  )
}

export default React.memo(CollectionCard)
