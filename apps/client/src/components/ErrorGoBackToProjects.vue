<script lang="ts" setup>
import { ref } from 'vue'
const timeout = ref(5000)
const interval = 1000
setInterval(() => {
  if (timeout.value <= 1000) {
    window.location.replace('/projects')
  }
  if (timeout.value >= 1000) {
    timeout.value = timeout.value - interval
  }
}, interval)
</script>
<template>
  <div>
    <p>
      Ce bloc n'aurait pas dû s'afflicher...<br>
      Veuillez revenir à la <a href="/projects">liste des projets</a><br>
      <br>
      Redirection automatique dans {{ Math.round(timeout/1000) }} seconde{{ timeout > 1500 ?'s': '' }}
    </p>
  </div>
</template>
