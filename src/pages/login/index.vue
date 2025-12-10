<template>
  <div id="login-page">
    <section
      id="login-container"
      className="w-full h-full flex flex-col sm:max-w-screen-sm md:max-w-screen-md lg:max-w-screen-lg items-center gap-8 pt-16 px-4 sm:px-0 "
    >
      <!-- <div id="login-page-inner" style="max-width: 256px"> -->
      <!--   <img src="/logo-green.svg" /> -->
      <!--   <div style="margin: 16px"> -->
      <!--     <div class="login-button" @click="login('login.pilaproject.org')"> -->
      <!--       <img class="login-button-icon" src="/favicon.png" /> -->
      <!--       <div class="login-button-divider"></div> -->
      <!--       <div>{{ t("log-in-with") }} PILA</div> -->
      <!--     </div> -->
      <!--     <div class="login-button" @click="login('google')"> -->
      <!--       <img class="login-button-icon" src="/external-logos/google.png" /> -->
      <!--       <div class="login-button-divider"></div> -->
      <!--       <div>{{ t("log-in-with") }} Google</div> -->
      <!--     </div> -->
      <!--     <div class="login-button" @click="login('microsoft')"> -->
      <!--       <img class="login-button-icon" src="/external-logos/microsoft.png" /> -->
      <!--       <div class="login-button-divider"></div> -->
      <!--       <div>{{ t("log-in-with") }} Microsoft</div> -->
      <!--     </div> -->
      <!--     <div class="login-button" @click="login('classlink')"> -->
      <!--       <img class="login-button-icon" src="/external-logos/classlink.png" /> -->
      <!--       <div class="login-button-divider"></div> -->
      <!--       <div>{{ t("log-in-with") }} ClassLink</div> -->
      <!--     </div> -->
      <!--     <div class="login-button disabled"> -->
      <!--       <img class="login-button-icon" src="/external-logos/clever.png" /> -->
      <!--       <div class="login-button-divider"></div> -->
      <!--       <div>{{ t("log-in-with") }} Clever</div> -->
      <!--     </div> -->
      <!--   </div> -->
      <!---->
      <!--   <div v-if="error" class="error">{{ error }}</div> -->
      <!--   <div style="display: flex; margin: 16px 0; align-items: center;"> -->
      <!--     <img src="/mascotte.png" style="width: 92px" /> -->
      <!--     <div> -->
      <!--       <p style="padding: 16px; width: 450px; text-align: left;"> -->
      <!--         {{ t("create-an-account-or-log-in-with-the-service-tha") }} -->
      <!--       </p> -->
      <!--     </div> -->
      <!--   </div> -->
      <!-- </div> -->

      <figure id="login-box">
        <div id="login-bg-box">
          <img
            id="login-bg"
            src="/vertical_bg_cropped_logoed.png"
            alt="abc"
            width="{400}"
            height="{700}"
            draggable="{false}"
          />
        </div>
        <div id="login-channel-box">
          <div>
            <p id="login-header">Teacher Login</p>
          </div>
          <div id="login-auth-list-box">
            <div class="login-button" @click="login('google')">
              <img class="login-button-icon" src="/external-logos/google.png" />
              <div class="login-button-divider"></div>
              <div>เข้าสู่ระบบด้วย Google</div>
            </div>

            <div class="login-button" @click="login('line')">
              <img
                class="login-button-icon"
                src="/external-logos/btn_line.png"
              />
              <div class="login-button-divider"></div>
              <div>เข้าสู่ระบบด้วย Line</div>
            </div>

            <div
              class="login-button"
              style="color: #d7d7d7 !important; cursor: not-allowed"
            >
              <img
                class="login-button-icon"
                src="/external-logos/btn_microsoft.png"
              />
              <div class="login-button-divider"></div>
              <div>เข้าสู่ระบบด้วย Microsoft</div>
            </div>

            <div
              class="login-button"
              style="color: #d7d7d7 !important; cursor: not-allowed"
            >
              <img
                class="login-button-icon"
                src="/external-logos/btn_classlink.png"
              />
              <div class="login-button-divider"></div>
              <div>เข้าสู่ระบบด้วย Microsoft</div>
            </div>
          </div>

          <p className="text-center mt-8">
            สร้างบัญชีหรือเข้าสู่ระบบด้วยบริการที่คุณ ใช้ในโรงเรียนของคุณ
            หากบริการที่คุณใช้ปกติไม่อยู่ในตัวเลือก <br />
            กรุณาขอให้ครูของคุณติดต่อ edu.pila@oecd.org
          </p>
        </div>
      </figure>
    </section>
  </div>
</template>

<script>
import IconButton from "./../../components/icon-button.vue";

export default {
  components: { IconButton },
  props: {
    usernameProvider: {
      type: String,
      default: "@test-accounts.knowlearning.systems",
    },
  },
  data() {
    return {
      username: "",
      password: "",
      error: null,
    };
  },

  methods: {
    t(slug) {
      return this.$store.getters.t(slug);
    },
    async login(provider = this.usernameProvider) {
      const { username, password } = this;
      this.$emit("signingIn");
      await Agent.login(provider);
      //  TODO: handle username password login errors
    },
  },
};
</script>

<style scoped>
#login-page {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
  text-align: center;
  background: #f4f2e5;
}
#login-page-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
}
input {
  margin: 6px;
}
button.login {
  display: inline;
  margin: 4px 0;
}
.google-and-microsoft-wrapper {
  display: flex;
  justify-content: center;
  width: 270px;
}
.google-and-microsoft-wrapper > button {
  margin: 4px;
}
.error {
  margin-top: 10px;
}
.login-button {
  display: flex;
  align-items: center;
  text-align: center;
  justify-content: center;
  width: 100%;
  height: 32px;
  padding: 8px;
  margin: 0px;
  border-radius: 4px;
  box-shadow: rgba(99, 99, 99, 0.2) 0px 2px 8px 0px;
  cursor: pointer;
  color: #000000;
  background: #efefef;

  @media (min-width: 640px) {
    padding-top: 0.625rem;
    padding-bottom: 0.625rem;
  }
}
.login-button.disabled {
  filter: grayscale(100%);
  color: darkgrey;
  cursor: unset;
}

.login-button-icon {
  width: 24px;
}
.login-button-divider {
  height: 100%;
  margin: 8px;
  border-right: 1px solid #eeeeee;
}

@media (min-width: 1024px) {
  font-size: 1.5rem;
  line-height: 2rem;
}
#login-box {
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  gap: 1.5rem;
  align-items: center;
  border-radius: 0.5rem;
  width: 100%;
  height: 100%;
  text-align: center;
  background-color: #ffffff;
}

#login-bg-box {
  display: none;
  padding-left: 0.125rem;
  grid-column: span 5 / span 5;
  height: 100%;

  @media (min-width: 640px) {
    display: block;
  }
}

#login-bg {
  object-fit: cover;
  border-top-left-radius: 0.5rem;
  border-bottom-left-radius: 0.5rem;
  width: 100%;
  height: 100%;
}

#login-channel-box {
  display: flex;
  padding-left: 1.5rem;
  padding-right: 1.5rem;
  padding-top: 2rem;
  padding-bottom: 2rem;
  flex-direction: column;
  grid-column: span 12 / span 12;
  gap: 1.5rem;

  @media (min-width: 640px) {
    padding-left: 2.5rem;
    padding-right: 2.5rem;
    grid-column: span 7 / span 7;
  }

  @media (min-width: 1024px) {
    padding-left: 5rem;
    padding-right: 5rem;
  }
}

#login-header {
  font-size: 1.25rem;
  line-height: 1.75rem;
  font-weight: 700;
  text-align: center;
}

#login-auth-list-box {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 100%;
  text-align: center;

  @media (min-width: 640px) {
    max-width: 42rem;
  }
}

#login-container {
  display: flex;
  padding-left: 1rem;
  padding-right: 5rem;
  padding-top: 4rem;
  flex-direction: column;
  gap: 2rem;
  align-items: center;
  width: 100%;

  @media (min-width: 640px) {
    padding-left: 0;
    padding-right: 0;
    max-width: 640px;
  }
  @media (min-width: 768px) {
    max-width: 768px;
  }
  @media (min-width: 1024px) {
    max-width: 1024px;
  }
}
</style>
