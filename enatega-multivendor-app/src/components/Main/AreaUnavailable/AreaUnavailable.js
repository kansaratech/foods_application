import React, { useContext, useState } from 'react'
import {
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { MaterialIcons } from '@expo/vector-icons'
import { useMutation } from '@apollo/client'
import { useTranslation } from 'react-i18next'

import ThemeContext from '../../../ui/ThemeContext/ThemeContext'
import { theme } from '../../../utils/themeColors'
import TextDefault from '../../Text/TextDefault/TextDefault'
import Spinner from '../../Spinner/Spinner'
import { FlashMessage } from '../../../ui/FlashMessage/FlashMessage'
import { joinWaitlistMutation } from '../../../apollo/mutations'
import { scale } from '../../../utils/scaling'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Shown on the Discovery screen when the customer's chosen delivery location is
 * not covered by any active store. Honest messaging + a waitlist capture so we
 * know where to expand.
 */
export default function AreaUnavailable({
  location,
  nearestArea,
  nearestDistanceKm,
  onChangeLocation
}) {
  const { t, i18n } = useTranslation()
  const themeContext = useContext(ThemeContext)
  const currentTheme = {
    isRTL: i18n.dir() === 'rtl',
    ...theme[themeContext.ThemeValue]
  }

  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [done, setDone] = useState(false)

  const [joinWaitlist, { loading }] = useMutation(joinWaitlistMutation, {
    onCompleted: () => setDone(true),
    onError: () => FlashMessage({ message: t('area_na_error') })
  })

  const place = location?.deliveryAddress?.trim() || t('area_na_your_area')
  const nearLine = nearestArea
    ? nearestDistanceKm
      ? t('area_na_nearby', { area: nearestArea, km: Math.round(nearestDistanceKm) })
      : t('area_na_nearby_nodist', { area: nearestArea })
    : t('area_na_nearby_generic')

  const onSubmit = () => {
    if (!EMAIL_RE.test(email.trim())) {
      FlashMessage({ message: t('area_na_email_invalid') })
      return
    }
    joinWaitlist({
      variables: {
        input: {
          email: email.trim(),
          phone: phone.trim() || null,
          latitude: Number(location?.latitude),
          longitude: Number(location?.longitude),
          areaLabel: place,
          source: 'app'
        }
      }
    })
  }

  const inputStyle = {
    borderWidth: 1,
    borderColor: currentTheme.horizontalLine || '#E4E4E7',
    borderRadius: scale(8),
    paddingHorizontal: scale(12),
    paddingVertical: Platform.OS === 'ios' ? scale(12) : scale(8),
    fontSize: scale(12),
    color: currentTheme.fontMainColor,
    backgroundColor: currentTheme.themeBackground,
    width: '100%'
  }

  return (
    <SafeAreaView
      edges={['bottom', 'left', 'right']}
      style={{ flex: 1, backgroundColor: currentTheme.themeBackground }}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: 'center',
            alignItems: 'center',
            paddingHorizontal: scale(24),
            paddingVertical: scale(32)
          }}
          keyboardShouldPersistTaps='handled'
        >
          <View
            style={{
              width: scale(64),
              height: scale(64),
              borderRadius: scale(18),
              backgroundColor: '#16293f',
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: scale(18)
            }}
          >
            <MaterialIcons
              name={done ? 'check' : 'location-off'}
              size={scale(30)}
              color='#fff'
            />
          </View>

          {done
            ? (
            <>
              <TextDefault
                H3
                bolder
                textColor={currentTheme.fontMainColor}
                style={{ textAlign: 'center', marginBottom: scale(6) }}
              >
                {t('area_na_success_title')}
              </TextDefault>
              <TextDefault
                textColor={currentTheme.fontSecondColor}
                style={{ textAlign: 'center', marginBottom: scale(20) }}
              >
                {t('area_na_success_body', { place })}
              </TextDefault>
            </>
              )
            : (
            <>
              <TextDefault
                H3
                bolder
                textColor={currentTheme.fontMainColor}
                style={{ textAlign: 'center', marginBottom: scale(6) }}
              >
                {t('area_na_title', { place })}
              </TextDefault>
              <TextDefault
                textColor={currentTheme.fontSecondColor}
                style={{ textAlign: 'center', marginBottom: scale(18) }}
              >
                {nearLine} {t('area_na_expand_more')}
              </TextDefault>

              <View style={{ width: '100%', gap: scale(10), marginBottom: scale(14) }}>
                <TextInput
                  style={inputStyle}
                  value={email}
                  onChangeText={setEmail}
                  placeholder={t('area_na_email')}
                  placeholderTextColor={currentTheme.fontSecondColor}
                  keyboardType='email-address'
                  autoCapitalize='none'
                  autoCorrect={false}
                />
                <TextInput
                  style={inputStyle}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder={t('area_na_phone')}
                  placeholderTextColor={currentTheme.fontSecondColor}
                  keyboardType='phone-pad'
                />
              </View>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={onSubmit}
                disabled={loading}
                style={{
                  width: '100%',
                  backgroundColor: '#1c5bc7',
                  borderRadius: scale(8),
                  paddingVertical: scale(12),
                  alignItems: 'center',
                  marginBottom: scale(14),
                  opacity: loading ? 0.6 : 1
                }}
              >
                {loading
                  ? (
                  <Spinner backColor='transparent' spinnerColor='#fff' />
                    )
                  : (
                  <TextDefault bold H5 textColor='#fff'>
                    {t('area_na_notify')}
                  </TextDefault>
                    )}
              </TouchableOpacity>
            </>
              )}

          <TouchableOpacity activeOpacity={0.7} onPress={onChangeLocation}>
            <TextDefault bold H6 textColor='#16293f'>
              {t('area_na_change')}
            </TextDefault>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
