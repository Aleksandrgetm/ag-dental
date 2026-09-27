<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { getHealth } from '../services/api'

const apiStatus = ref('Checking...')
const databaseStatus = ref('Checking...')

onMounted(async () => {
  try {
    const health = await getHealth()

    apiStatus.value = health.status
    databaseStatus.value = health.database
  } catch (error) {
    console.error(error)

    apiStatus.value = 'error'
    databaseStatus.value = 'error'
  }
})
</script>

<template>
  <v-container class="py-16">
    <v-row justify="center">
      <v-col cols="12" md="8" class="text-center">
        <h1>AG Zobārstniecība</h1>

        <p class="mt-4">
          Dental Clinic
        </p>

        <v-btn
          class="mt-6"
          color="primary"
          size="large"
        >
          Pieteikt vizīti
        </v-btn>

        <v-card class="mt-10 pa-6">
          <div>
            API:
            <strong>{{ apiStatus }}</strong>
          </div>

          <div class="mt-2">
            Database:
            <strong>{{ databaseStatus }}</strong>
          </div>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>