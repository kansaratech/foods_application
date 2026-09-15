import React, { useContext, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native'
import { WebView } from 'react-native-webview'
import { myOrders } from '../../apollo/queries'
import { createCashfreePaymentSession } from '../../apollo/mutations'
import gql from 'graphql-tag'
import useEnvVars from '../../../environment'
import { useApolloClient, useMutation } from '@apollo/client'
import UserContext from '../../context/User'
import ConfigurationContext from '../../context/Configuration'
import analytics from '../../utils/analytics'
import LiveActivityService from '../../utils/liveActivityService'

import { useTranslation } from 'react-i18next'

const MYORDERS = gql`
  ${myOrders}
`
const CREATE_CASHFREE_PAYMENT_SESSION = gql`
  ${createCashfreePaymentSession}
`

const isAllowedHost = (url, allowedHosts) => {
  try {
    const host = new URL(url).hostname.toLowerCase()
    return allowedHosts.some((allowedHost) => host === allowedHost || host.endsWith(`.${allowedHost}`))
  } catch {
    return false
  }
}

// WebView + return-URL-substring + myOrders polling pattern. Cashfree's
// hosted checkout is loaded via a small bridge page on the customer web app
// (localsell-web: /order/cashfree/start) that
// runs the Cashfree JS SDK on our behalf — there's no React Native SDK in
// use here, and this keeps the "how do we start a Cashfree payment" logic in
// exactly one place (that bridge page) shared across web and mobile.
function CashfreeCheckout(props) {
  const Analytics = analytics()

  const { SERVER_REST_URL, WEB_CLIENT_URL } = useEnvVars()
  const configuration = useContext(ConfigurationContext)
  const { t } = useTranslation()
  const [loading, loadingSetter] = useState(true)
  const [isConfirmingOrder, setIsConfirmingOrder] = useState(false)
  const [confirmationTimedOut, setConfirmationTimedOut] = useState(false)
  const [paymentFailed, setPaymentFailed] = useState(false)
  const [retrying, setRetrying] = useState(false)
  const { clearCart } = useContext(UserContext)
  const client = useApolloClient()
  const [createCashfreeSession] = useMutation(CREATE_CASHFREE_PAYMENT_SESSION)
  const { _id, orderId, paymentSessionId: initialPaymentSessionId } = props?.route.params
  const [paymentSessionId, setPaymentSessionId] = useState(initialPaymentSessionId)
  const isHandlingResultRef = useRef(false)
  const backendHost = useRef(null)
  const cashfreeAllowedHosts = useRef([
    'cashfree.com',
    'payments.cashfree.com',
    'api.cashfree.com',
    'sandbox.cashfree.com',
    'payments-test.cashfree.com'
  ])

  useEffect(() => {
    try {
      backendHost.current = new URL(SERVER_REST_URL).hostname.toLowerCase()
    } catch {
      backendHost.current = null
    }
  }, [SERVER_REST_URL])

  useLayoutEffect(() => {
    props?.navigation.setOptions({
      headerRight: null,
      title: t('cashfree')
    })
  }, [props?.navigation])

  useEffect(() => {
    async function Track() {
      await Analytics.track(Analytics.events.NAVIGATE_TO_CASHFREE)
    }
    Track()
  }, [])

  async function waitForConfirmedOrder() {
    const maxAttempts = 20

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const result = await client.query({
          query: MYORDERS,
          fetchPolicy: 'network-only'
        })
        const order = (result?.data?.orders ?? []).find((item) => item.orderId === orderId)

        const isPaidOrder =
          order && (String(order.paymentStatus).toUpperCase() === 'PAID' || Number(order.paidAmount || 0) > 0)
        const isFailedOrder = order && String(order.paymentStatus).toUpperCase() === 'FAILED'

        if (isPaidOrder) {
          if (order?._id && !order?.isPickedUp) {
            LiveActivityService.initiateForOrder({
              orderId: order._id.toString(),
              displayOrderId: order.orderId.toString()
            }).catch((error) => {
              console.warn('Live Activity could not be started', error?.message)
            })
          }
          await clearCart()
          props?.navigation.reset({
            routes: [
              { name: 'Main' },
              {
                name: 'OrderDetail',
                params: { _id: order._id }
              }
            ]
          })
          return
        }

        if (isFailedOrder) {
          setPaymentFailed(true)
          return
        }
      } catch (error) {
        console.log('Cashfree confirmation polling error', error)
      }

      await new Promise((resolve) => setTimeout(resolve, 3000))
    }

    setConfirmationTimedOut(true)
  }

  async function handleResponse(data) {
    if (data.url.includes('/order/cashfree/return')) {
      if (isHandlingResultRef.current) return
      isHandlingResultRef.current = true
      setIsConfirmingOrder(true)
      loadingSetter(false)
      await waitForConfirmedOrder()
    }
  }

  async function onRetryPayment() {
    setRetrying(true)
    try {
      const { data } = await createCashfreeSession({ variables: { orderId: _id } })
      const session = data?.createCashfreePaymentSession
      if (session?.success && session?.paymentSessionId) {
        isHandlingResultRef.current = false
        setPaymentFailed(false)
        setIsConfirmingOrder(false)
        loadingSetter(true)
        setPaymentSessionId(session.paymentSessionId)
      }
    } finally {
      setRetrying(false)
    }
  }

  const cashfreeMode = configuration?.cashfreeEnv === 'PRODUCTION' ? 'production' : 'sandbox'
  const startUrl = `${WEB_CLIENT_URL}/order/cashfree/start?paymentSessionId=${encodeURIComponent(
    paymentSessionId
  )}&mode=${cashfreeMode}`

  return (
    <View style={{ flex: 1 }}>
      <WebView
        style={{ display: isConfirmingOrder ? 'none' : 'flex' }}
        javaScriptEnabled={true}
        bounces={false}
        originWhitelist={['https://*', 'http://*']}
        onShouldStartLoadWithRequest={(request) => {
          const { url } = request
          if (!url) return false
          const allowedHosts = [...cashfreeAllowedHosts.current]
          if (backendHost.current) {
            allowedHosts.push(backendHost.current)
          }
          try {
            allowedHosts.push(new URL(WEB_CLIENT_URL).hostname.toLowerCase())
          } catch {
            // ignore malformed WEB_CLIENT_URL
          }
          return isAllowedHost(url, allowedHosts)
        }}
        onLoad={() => {
          loadingSetter(false)
        }}
        source={{ uri: startUrl }}
        scalesPageToFit={true}
        onNavigationStateChange={(data) => {
          handleResponse(data)
        }}
      />
      {loading ? <ActivityIndicator style={{ position: 'absolute', bottom: '50%', left: '50%' }} /> : null}
      {isConfirmingOrder ? (
        <View style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, backgroundColor: '#fff' }}>
          <ActivityIndicator size="large" />
          <Text style={{ marginTop: 20, fontSize: 22, fontWeight: '600', textAlign: 'center', color: '#111827' }}>
            {paymentFailed
              ? "Payment didn't go through"
              : confirmationTimedOut
                ? 'Payment submitted'
                : 'Confirming your payment'}
          </Text>
          <Text style={{ marginTop: 12, fontSize: 15, lineHeight: 22, textAlign: 'center', color: '#4B5563' }}>
            {paymentFailed
              ? 'Your Cashfree payment failed or was cancelled. Your order is still saved — you can retry the payment or pay cash on delivery instead.'
              : confirmationTimedOut
                ? "We're still waiting for Cashfree's confirmation. Your order may appear shortly in My Orders."
                : "We're waiting for Cashfree to confirm your payment."}
          </Text>
          <View style={{ flexDirection: 'row', marginTop: 24 }}>
            {paymentFailed ? (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={onRetryPayment}
                disabled={retrying}
                style={{ marginRight: 12, borderRadius: 999, backgroundColor: '#7AC943', paddingHorizontal: 20, paddingVertical: 12, opacity: retrying ? 0.6 : 1 }}
              >
                <Text style={{ color: '#fff', fontWeight: '600' }}>{retrying ? 'Starting...' : 'Retry payment'}</Text>
              </TouchableOpacity>
            ) : null}
            {confirmationTimedOut || paymentFailed ? (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  props?.navigation.reset({
                    routes: [{ name: 'Main' }]
                  })
                }}
                style={{ borderRadius: 999, backgroundColor: paymentFailed ? '#E5E7EB' : '#7AC943', paddingHorizontal: 20, paddingVertical: 12 }}
              >
                <Text style={{ color: paymentFailed ? '#111827' : '#fff', fontWeight: '600' }}>Go to home</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      ) : null}
    </View>
  )
}

export default CashfreeCheckout
