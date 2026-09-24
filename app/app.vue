<!-- app/app.vue -->
<template>
  <div>
    <NuxtLayout>
      <NuxtPage :transition="{ name: 'page', mode: 'out-in' }" />
    </NuxtLayout>
    <ToastContainer />
  </div>
</template>
