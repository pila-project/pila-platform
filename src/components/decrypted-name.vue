<template>
  <span>
    {{ info.name }}
  </span>
</template>

<script>
  import { decrypt, generateKeyPair } from '../encryption.js'
  import naclUtil from 'tweetnacl-util'

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
        const { publicKey: myPublicKey, secretKey: mySecretKey} = generateKeyPair(key)
        const serializedPublicKey = naclUtil.encodeBase64(myPublicKey)

        if (encryptedUserInfo[serializedPublicKey]) {
          const { publicKey: theirPublicKey, encryptedInfo } = encryptedUserInfo[serializedPublicKey]
          try {
            console.log('TRYING TO DECRYPT', theirPublicKey, encryptedInfo)
            this.info = JSON.parse(
              naclUtil.encodeUTF8(
                decrypt(
                  mySecretKey.slice(0, 32),
                  naclUtil.decodeBase64(theirPublicKey),
                  naclUtil.decodeBase64(encryptedInfo)
                )
              )
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