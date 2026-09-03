import React, { useState, useEffect } from 'react'
import { View, Modal, TouchableOpacity, Pressable, ScrollView, Dimensions } from 'react-native'
import * as Localization from 'expo-localization'
import AsyncStorage from '@react-native-async-storage/async-storage'
import i18next from 'i18next'
import { useTranslation } from 'react-i18next'
import { Feather } from '@expo/vector-icons'

import styles from './styles'
import TextDefault from '../Text/TextDefault/TextDefault'
import { alignment } from '../../utils/alignment'
import RadioButton from '../../ui/FdRadioBtn/RadioBtn'
import Spinner from '../Spinner/Spinner'

// Launch scope is English + Hindi only. Other locale files still ship in the
// repo but are intentionally not offered in the picker.
export const languageTypes = [
  { value: 'English', code: 'en', index: 0 },
  { value: 'हिंदी', code: 'hi', index: 1 }
]

const LanguageModal = ({ modalVisible, setModalVisible, currentTheme, showCrossButton, dontClose }) => {
  const { t } = useTranslation()
  const [activeRadio, activeRadioSetter] = useState(0)
  const [loadinglang, setLoadingLang] = useState(false)
  const [languageName, languageNameSetter] = useState('English')

  useEffect(() => {
    if (modalVisible) {
      determineInitialLanguage()
    }
  }, [modalVisible])

  async function determineInitialLanguage() {
    try {
      // First, check for stored language
      const storedLanguageCode = await AsyncStorage.getItem('enatega-language')

      // Get system language
      const systemLanguageCode = Localization?.locale?.split('-')[0]

      // Available language codes
      const availableLanguageCodes = languageTypes.map((lang) => lang.code)

      // Determine which language to use
      let languageToUse = 'en' // Default to English

      if (storedLanguageCode) {
        // Use stored language if it's valid
        languageToUse = storedLanguageCode
      } else if (availableLanguageCodes.includes(systemLanguageCode)) {
        // Use system language if it's available
        languageToUse = systemLanguageCode
      }

      // Find the index and name of the language
      const selectedLanguage = languageTypes.find((lang) => lang.code === languageToUse)

      if (selectedLanguage) {
        activeRadioSetter(selectedLanguage.index)
        languageNameSetter(selectedLanguage.value)
      }
    } catch (error) {
      console.error('Error determining initial language:', error)
    }
  }

  async function onSelectedLanguage() {
    try {
      setLoadingLang(true)
      const languageInd = activeRadio
      const languageCode = languageTypes[languageInd].code
      const languageVal = languageTypes[languageInd].value

      // Save language preferences
      await AsyncStorage.setItem('enatega-language', languageCode)
      await AsyncStorage.setItem('enatega-language-name', languageVal)

      // Change app language
      i18next.changeLanguage(languageCode)
      languageNameSetter(languageVal)
    } catch (error) {
      console.error('Error during language selection:', error)
    } finally {
      setLoadingLang(false)
      setModalVisible(!modalVisible)
    }
  }

  const handleClose = () => {
    if (!dontClose) {
      setModalVisible(false)
    }
  }

  return (
    <Modal animationType='slide' transparent={true} visible={modalVisible} onRequestClose={handleClose}>
      <View style={styles().layout}>
        <Pressable style={styles().backdrop} onPress={handleClose} />
        <View style={styles(currentTheme).modalContainer}>
          <View style={styles(currentTheme).flexRow}>
            <TextDefault textColor={currentTheme.fontMainColor} bolder H3 style={alignment.MBsmall}>
              {t('selectLanguage')}
            </TextDefault>
            {showCrossButton && <Feather name='x-circle' size={24} color={currentTheme.newFontcolor} onPress={handleClose} />}
          </View>

          <View style={styles(currentTheme).flexRow}>
            <TextDefault textColor={currentTheme.fontMainColor} style={alignment.MBsmall}>
              {t('description0')}
            </TextDefault>
          </View>

          <ScrollView
            style={{
              flex: 1,
              maxHeight: Dimensions.get('window').height * 0.5 // Limit height to 50% of screen
            }}
            contentContainerStyle={{
              flexGrow: 1,
              paddingVertical: 10
            }}
            showsVerticalScrollIndicator={false} // hide scroll indicator
            keyboardShouldPersistTaps='handled' // Allows tapping items while keyboard is open
          >
            {languageTypes.map((item, index) => (
              <TouchableOpacity activeOpacity={0.7} key={index} onPress={() => activeRadioSetter(item.index)} style={[styles(currentTheme).radioContainer]}>
                <RadioButton animation={'bounceIn'} size={13} outerColor={currentTheme.iconColorDark} innerColor={currentTheme.main} isSelected={activeRadio === item.index} onPress={() => activeRadioSetter(item.index)} />
                <TextDefault numberOfLines={1} textColor={currentTheme.fontMainColor} bold>
                  {item.value}
                </TextDefault>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TouchableOpacity activeOpacity={0.7} style={styles(currentTheme).emptyButton} onPress={onSelectedLanguage}>
            <TextDefault textColor={currentTheme.fontMainColor} center H5>
              {loadinglang ? <Spinner size={'small'} backColor={'transparent'} spinnerColor={currentTheme.iconColorDark} /> : t('continueBtn')}
            </TextDefault>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

export default LanguageModal
