<script setup lang="ts">
withDefaults(defineProps<{ direction?: 'right' | 'left' | 'external' }>(), { direction: 'right' });
</script>
<template><svg class="arrow-icon" aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path v-if="direction==='external'" d="M5 19 19 5M5 5h14v14"/><path v-else-if="direction==='left'" d="M20 12H4m7-7-7 7 7 7"/><path v-else d="M4 12h16m-7-7 7 7-7 7"/></svg></template>
<style scoped>.arrow-icon { display: inline-block; width: 1em; height: 1em; flex: none; vertical-align: -.12em; }</style>
