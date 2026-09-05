import React, { useContext, useLayoutEffect } from 'react'
import { View, ScrollView } from 'react-native'
import { HeaderBackButton } from '@react-navigation/elements'
import { MaterialIcons } from '@expo/vector-icons'
import { useTranslation } from 'react-i18next'
import { SafeAreaView } from 'react-native-safe-area-context'
import ThemeContext from '../../ui/ThemeContext/ThemeContext'
import { theme } from '../../utils/themeColors'
import ConfigurationContext from '../../context/Configuration'
import TextDefault from '../../components/Text/TextDefault/TextDefault'
import { scale } from '../../utils/scaling'
import { alignment } from '../../utils/alignment'
import navigationService from '../../routes/navigationService'

// In-app Terms / Privacy screen. Content comes from the server configuration
// (configuration.termsAndConditions / configuration.privacyPolicy) so it can be
// updated without an app release — and never opens an external website.
function Legal(props) {
  const { t } = useTranslation()
  const themeContext = useContext(ThemeContext)
  const currentTheme = theme[themeContext.ThemeValue]
  const configuration = useContext(ConfigurationContext)

  const type = props?.route?.params?.type === 'privacy' ? 'privacy' : 'terms'
  const title = type === 'privacy' ? t('privacyPolicy') : t('serviceTerms')
  const raw =
    type === 'privacy'
      ? configuration?.privacyPolicy
      : configuration?.termsAndConditions
  const body =
    typeof raw === 'string' && raw.trim().length > 0 && raw.trim().length > 20
      ? raw.trim()
      : t('legalContentUnavailable')

  useLayoutEffect(() => {
    props?.navigation.setOptions({
      headerTitle: title,
      headerTitleAlign: 'center',
      headerRight: null,
      headerStyle: { backgroundColor: currentTheme.newheaderBG },
      headerTitleStyle: { color: currentTheme.newFontcolor },
      headerLeft: () => (
        <HeaderBackButton
          truncatedLabel=""
          backImage={() => (
            <View style={{ ...alignment.PLsmall, alignItems: 'center' }}>
              <MaterialIcons
                name="arrow-back"
                size={26}
                color={currentTheme.newIconColor}
              />
            </View>
          )}
          onPress={() => navigationService.goBack()}
        />
      )
    })
  }, [title, currentTheme])

  return (
    <SafeAreaView
      edges={['bottom', 'left', 'right']}
      style={{ flex: 1, backgroundColor: currentTheme.themeBackground }}
    >
      <ScrollView
        contentContainerStyle={{
          padding: scale(18),
          paddingBottom: scale(40)
        }}
        showsVerticalScrollIndicator={false}
      >
        {body.split('\n').map((line, i) => (
          <TextDefault
            key={i}
            textColor={currentTheme.fontMainColor}
            style={{
              lineHeight: scale(21),
              marginBottom: line.trim() === '' ? scale(6) : scale(2),
              fontWeight:
                i === 0 || /^\d+\.\s/.test(line) ? '700' : '400'
            }}
            small={line.trim() !== '' && i !== 0}
            H5={i === 0}
          >
            {line}
          </TextDefault>
        ))}
      </ScrollView>
    </SafeAreaView>
  )
}

export default Legal
