// useCreateAccount.web.js
// Google/Apple native sign-in SDKs don't run in a browser, so this variant
// keeps the shared login/navigation logic and disables the social buttons
// instead (they already have a "not configured" fallback message).

import { useState, useContext } from 'react'
import gql from 'graphql-tag'
import { login } from '../../apollo/mutations'
import ThemeContext from '../../ui/ThemeContext/ThemeContext'
import { theme } from '../../utils/themeColors'
import { useMutation } from '@apollo/client'
import { useNavigation } from '@react-navigation/native'
import * as Linking from 'expo-linking'
import { FlashMessage } from '../../ui/FlashMessage/FlashMessage'
import AuthContext from '../../context/Auth'
import { useTranslation } from 'react-i18next'
import useEnvVars from '../../../environment'

const LOGIN = gql`
  ${login}
`

export const useCreateAccount = () => {
  const navigation = useNavigation()
  const { t, i18n } = useTranslation()
  const [mutate] = useMutation(LOGIN, { onCompleted, onError })
  const [loginButton, loginButtonSetter] = useState(null)
  const [loading, setLoading] = useState(false)
  const { setTokenAsync } = useContext(AuthContext)
  const themeContext = useContext(ThemeContext)
  const [googleUser, setGoogleUser] = useState(null)
  const currentTheme = {
    isRTL: i18n.dir() === 'rtl',
    ...theme[themeContext.ThemeValue]
  }
  const { TERMS_AND_CONDITIONS, PRIVACY_POLICY } = useEnvVars()

  const signIn = async () => {
    FlashMessage({
      message: 'Social sign-in is only available in the mobile app.'
    })
  }

  const navigateToLogin = () => {
    navigation.navigate('Login')
  }

  const navigateToRegister = () => {
    navigation.navigate('Register')
  }

  const navigateToPhone = () => {
    navigation.navigate('PhoneNumber', {
      name: googleUser,
      phone: ''
    })
  }

  const navigateToMain = () => {
    navigation.navigate('Main', { screen: 'Discovery' })
  }

  async function mutateLogin(user) {
    try {
      mutate({ variables: { ...user, notificationToken: null } })
    } catch (error) {
      setLoading(false)
      loginButtonSetter(null)
    }
  }

  async function onCompleted(data) {
    if (data.login.isActive === false) {
      FlashMessage({ message: t('accountDeactivated') })
      setLoading(false)
      loginButtonSetter(null)
      return
    }

    try {
      const needsPhone = data?.login?.phone === ''
      if (!needsPhone) navigateToMain()

      await setTokenAsync(data.login.token)
      FlashMessage({ message: 'Successfully logged in' })

      if (needsPhone) navigateToPhone()
    } finally {
      setLoading(false)
      loginButtonSetter(null)
    }
  }

  function onError(error) {
    FlashMessage({
      message:
        error?.graphQLErrors?.[0]?.message ||
        error?.message ||
        'Login failed. Please try again.'
    })
    setLoading(false)
    loginButtonSetter(null)
  }

  const openTerms = () => {
    Linking.openURL(TERMS_AND_CONDITIONS)
  }

  const openPrivacyPolicy = () => {
    Linking.openURL(PRIVACY_POLICY)
  }

  return {
    enableApple: false,
    loginButton,
    loginButtonSetter,
    loading,
    setLoading,
    themeContext,
    mutateLogin,
    currentTheme,
    navigateToLogin,
    navigateToRegister,
    openTerms,
    openPrivacyPolicy,
    navigateToMain,
    navigation,
    signIn
  }
}
