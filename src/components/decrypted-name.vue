<template>
  <span>
    {{ info.name }}
  </span>
</template>

<script>
  import { decrypt, generateKeyPair } from '../encryption.js'
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
        console.log('ENCRYPTED USER INFO TO USE....', encryptedUserInfo)
        if (false) {
          const { publicKey: theirPublicKey, encryptedInfo } = encryptedUserInfo[publicKey]
          try {
            this.info = JSON.parse(
              decrypt(mySecretKey, theirPublicKey, Buffer.from(encryptedInfo, 'base64'))
            )
          } catch (error) {
            console.warn(error)
            this.setAnonymous()
          }
        }
        else this.setAnonymous()
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