// /*****************************
//  * environment.js
//  * path: '/environment.js' (root of your project)
//  ******************************/

import { useContext } from 'react'
import ConfigurationContext from './src/context/Configuration'
import * as Updates from 'expo-updates'

const SHARED_ENV_VARS = {
  GRAPHQL_URL: 'https://aws-server-v2.enatega.com/graphql',
  WS_GRAPHQL_URL: 'wss://aws-server-v2.enatega.com/graphql',
  SERVER_URL: 'https://aws-server-v2.enatega.com/graphql',
  SERVER_REST_URL: 'https://aws-server-v2.enatega.com/',
  SENTRY_DSN: 'https://4213c02977911e1b75898c93cc5517fb@o1103026.ingest.us.sentry.io/4508662470803456',
  SUPABASE_URL: 'https://cofsbcvztyzgisgvouqr.supabase.co',
  SUPABASE_ANON_KEY:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvZnNiY3Z6dHl6Z2lzZ3ZvdXFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUxNDg2NTYsImV4cCI6MjA5MDcyNDY1Nn0.YSnAneiEJPd7ODN2vb4dCXMw1-WMrwxMChINDg76KoY'
}

export const getEnvVars = (configuration, env = Updates.channel) => {
  if (env === 'production' || env === 'staging') {
    return {
      ...SHARED_ENV_VARS,
      IOS_CLIENT_ID_GOOGLE: configuration?.iOSClientID,
      ANDROID_CLIENT_ID_GOOGLE: configuration?.androidClientID,
      AMPLITUDE_API_KEY: configuration?.appAmplitudeApiKey,
      GOOGLE_MAPS_KEY: configuration?.googleApiKey,
      EXPO_CLIENT_ID: configuration?.expoClientID,
      SENTRY_DSN: configuration?.customerAppSentryUrl ?? SHARED_ENV_VARS.SENTRY_DSN,
      TERMS_AND_CONDITIONS: configuration?.termsAndConditions,
      PRIVACY_POLICY: configuration?.privacyPolicy,
      TEST_OTP: configuration?.testOtp,
      GOOGLE_PACES_API_BASE_URL: configuration?.googlePlacesApiBaseUrl
    }
  }

  return {
    ...SHARED_ENV_VARS,
    IOS_CLIENT_ID_GOOGLE: configuration?.iOSClientID,
    ANDROID_CLIENT_ID_GOOGLE: configuration?.androidClientID,
    AMPLITUDE_API_KEY: configuration?.appAmplitudeApiKey,
    GOOGLE_MAPS_KEY: configuration?.googleApiKey,
    EXPO_CLIENT_ID: configuration?.expoClientID,
    SENTRY_DSN: configuration?.customerAppSentryUrl ?? SHARED_ENV_VARS.SENTRY_DSN,
    TERMS_AND_CONDITIONS: configuration?.termsAndConditions,
    PRIVACY_POLICY: configuration?.privacyPolicy,
    TEST_OTP: configuration?.testOtp,
    GOOGLE_PACES_API_BASE_URL: configuration?.googlePlacesApiBaseUrl
  }
}

export const appEnv = getEnvVars(null)

const useEnvVars = (env = Updates.channel) => {
  const configuration = useContext(ConfigurationContext)
  return getEnvVars(configuration, env)
}

export default useEnvVars
