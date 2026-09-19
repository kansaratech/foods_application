import React from 'react'
import { View, Text, Pressable, Linking, Alert } from 'react-native'

export default function OrderContacts({ order, theme }) {
  if (!order || ['DELIVERED', 'COMPLETED', 'CANCELLED'].includes(order.orderStatus)) return null
  const contacts = [
    { label: 'Call restaurant / store', name: order.restaurant?.name, phone: order.restaurant?.phone, fallback: 'Contact number unavailable. Please use Get Help.' },
    ...(!order.isPickedUp ? [{ label: 'Call rider', name: order.rider?.name, phone: order.rider?.phone, fallback: order.rider?._id ? 'Contact number unavailable. Please use rider chat or Get Help.' : 'Rider contact will appear once assigned.' }] : [])
  ]
  return <View style={{ margin: 16, padding: 16, borderRadius: 16, backgroundColor: theme.gray100 }}>
    <Text style={{ color: theme.gray900 || theme.fontMainColor, fontSize: 17, fontWeight: '700', marginBottom: 12 }}>Need an order update?</Text>
    {contacts.map(contact => {
      const raw = contact.phone || ''
      const phone = raw.replace(/[\s().-]/g, '')
      const valid = /^[+\d\s().-]+$/.test(raw) && /^\+?\d{7,15}$/.test(phone)
      return <View key={contact.label} style={{ marginBottom: 12 }}>
        {!!contact.name && <Text style={{ color: theme.gray600, marginBottom: 8 }}>{contact.name}</Text>}
        {valid ? <Pressable accessibilityRole="button" accessibilityLabel={contact.label} onPress={() => Linking.openURL(`tel:${phone}`).catch(() => Alert.alert('Unable to open dialer', `Please call ${raw}`))} style={{ minHeight: 48, borderRadius: 10, padding: 12, backgroundColor: '#1c5bc7', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: '#fff', fontWeight: '600' }}>{contact.label} ? {raw}</Text>
        </Pressable> : <Text style={{ color: theme.gray600 }}>{contact.fallback}</Text>}
      </View>
    })}
  </View>
}
