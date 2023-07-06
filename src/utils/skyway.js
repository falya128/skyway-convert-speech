import { nowInSec, SkyWayAuthToken, uuidV4 } from '@skyway-sdk/core'

export default {
  generateTokenString: () => {
    const token = new SkyWayAuthToken({
      jti: uuidV4(),
      iat: nowInSec(),
      exp: nowInSec() + 60 * 60 * 24,
      scope: {
        app: {
          id: import.meta.env.VITE_SKYWAY_APP_ID,
          turn: true,
          actions: ['read'],
          channels: [
            {
              id: '*',
              name: '*',
              actions: ['write'],
              members: [
                {
                  id: '*',
                  name: '*',
                  actions: ['write'],
                  publication: {
                    actions: ['write']
                  },
                  subscription: {
                    actions: ['write']
                  }
                }
              ],
              sfuBots: [
                {
                  actions: ['write'],
                  forwardings: [
                    {
                      actions: ['write']
                    }
                  ]
                }
              ]
            }
          ]
        }
      }
    })
    return token.encode(import.meta.env.VITE_SKYWAY_SECRET_KEY)
  }
}
