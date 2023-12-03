<template>
  <span>
    {{ info.name }}
  </span>
</template>

<script>
  import { decrypt, generateKeyPair } from '../encryption.js'
  import { encodeBase64, decodeBase64, encodeUTF8 } from 'tweetnacl-util'

  export default {
    props: {
      user: String
    },
    data() {
      return {
        info: {
          name: '...'
        }
      }
    },
    async created() {
      const key = localStorage.getItem(`zkek-${this.$store.state.user}`)
      if (!key) this.setAnonymous()
      else {
        const encryptedUserInfo = await Agent.state('encrypted-user-info', this.user)
        const { secretKey: mySecretKey} = generateKeyPair(key)
        const toTry = Object.values(encryptedUserInfo)
        let success = false
        while (toTry.length && !success) {
          const { publicKey: theirPublicKey, encryptedInfo } = toTry.pop()
          try {
            this.info = JSON.parse(
              encodeUTF8(
                decrypt(
                  mySecretKey,
                  decodeBase64(theirPublicKey),
                  decodeBase64(encryptedInfo)
                )
              )
            )
            success = true
          } catch (error) { console.warn(error) }
        }
        if (!success) this.setAnonymous()
      }
    },
    methods: {
      setAnonymous() {
        this.info = {
          name: `${this.$store.getters.t('anonymous')}_${this.user.slice(0,4)}`
        }
      }
    }
  }
</script>