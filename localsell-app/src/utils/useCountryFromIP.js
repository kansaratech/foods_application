import { useEffect, useState } from 'react'
import countryCallingCodes from '../screens/PhoneNumber/countryCodes'

// LocalSell operates in India only — the phone country is always IN (+91),
// regardless of the device locale. (Kept as a function so the rest of the hook
// is untouched; flip this back to locale detection if the product expands.)
function getDeviceRegionCode() {
  return 'IN'
}

function buildCountryFromRegion(code) {
  const normalizedCode = code || 'IN'
  const callingCode = countryCallingCodes[normalizedCode] || countryCallingCodes.IN || '91'
  return {
    callingCode: [callingCode.toString()],
    cca2: normalizedCode,
    currency: [],
    flag: 'flag-' + normalizedCode.toLowerCase(),
    name: normalizedCode,
    region: '',
    subregion: ''
  }
}

// SEC-008: The previous implementation sent the user's IP to api.ipify.org and
// then ipinfo.io on every mount, disclosing PII to third parties with no
// consent. Country is now derived on-device from the locale/region — no network
// request is made and no IP is collected. The hook API is unchanged for callers.
export const useCountryFromIP = () => {
  const initialRegion = getDeviceRegionCode()
  const [country, setCountry] = useState(buildCountryFromRegion(initialRegion))
  const [currentCountry, setCurrentCountry] = useState(initialRegion)
  // Kept for backwards compatibility with consumers; no IP is ever collected.
  const [ipAddress] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [trigger, setTrigger] = useState(0)

  const detectCountry = () => {
    // India-only — always IN, never read the device locale.
    setCurrentCountry('IN')
    setCountry(buildCountryFromRegion('IN'))
    setIsLoading(false)
  }

  useEffect(() => {
    detectCountry()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger])

  const refetch = () => {
    setTrigger((prev) => prev + 1)
  }

  return {
    country,
    currentCountry,
    setCurrentCountry,
    ipAddress,
    isLoading,
    error,
    refetch,
    setCountry
  }
}
