import React, { createContext, useState, useEffect } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'

export const OutletContext = createContext()

export const OutletProvider = ({ children }) => {
  const [outlet, setOutlet] = useState(null)

  useEffect(() => {
    // Load previously selected outlet on mount
    const loadOutlet = async() => {
      try {
        const storedOutlet = await AsyncStorage.getItem('selectedOutlet')
        if (storedOutlet) {
          setOutlet(JSON.parse(storedOutlet))
        }
      } catch (e) {
        console.error('Failed to load outlet', e)
      }
    }
    loadOutlet()
  }, [])

  const handleSetOutlet = async(selectedOutlet) => {
    try {
      if (selectedOutlet) {
        await AsyncStorage.setItem('selectedOutlet', JSON.stringify(selectedOutlet))
      } else {
        await AsyncStorage.removeItem('selectedOutlet')
      }
      setOutlet(selectedOutlet)
    } catch (e) {
      console.error('Failed to save outlet', e)
    }
  }

  return (
    <OutletContext.Provider value={{ outlet, setOutlet: handleSetOutlet }}>
      {children}
    </OutletContext.Provider>
  )
}

export default OutletContext
