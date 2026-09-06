// Web stub for react-native-maps — the native module can't bundle for web
// (imports react-native/Libraries/Utilities/codegenNativeCommands). This keeps
// the customer app buildable/runnable in a browser; map screens render an
// inert placeholder instead of a real map.
import React from 'react'
import { View, Text, StyleSheet } from 'react-native'

export const PROVIDER_GOOGLE = 'google'
export const PROVIDER_DEFAULT = undefined

const styles = StyleSheet.create({
  fallback: {
    flex: 1,
    minHeight: 120,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e9eef2'
  },
  label: { color: '#6b7280', fontSize: 12 }
})

function MapView(props) {
  return (
    <View style={[styles.fallback, props.style]}>
      <Text style={styles.label}>Map is not available on web</Text>
      {props.children}
    </View>
  )
}

const Noop = () => null
MapView.Marker = Noop
MapView.Polygon = Noop
MapView.Callout = Noop
MapView.Animated = MapView

export const Marker = Noop
export const Polygon = Noop
export const Callout = Noop
export const Polyline = Noop

export default MapView
