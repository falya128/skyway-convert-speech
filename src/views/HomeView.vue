<script setup>
import { onMounted, ref } from 'vue'
import { SkyWayContext, SkyWayChannel, SkyWayStreamFactory } from '@skyway-sdk/core'
import skyway from '@/utils/skyway'

const isJoined = ref(false)
const tokenString = skyway.generateTokenString()
const { audio, video } = await SkyWayStreamFactory.createMicrophoneAudioAndCameraStream()

const join = async () => {
  const context = await SkyWayContext.Create(tokenString)
  const channel = await SkyWayChannel.FindOrCreate(context, {
    type: 'p2p',
    name: 'skyway-room-name'
  })
  const member = await channel.join()
  await member.publish(audio)
  await member.publish(video)

  const subscribeAndAttach = async (publication) => {
    if (publication.publisher.id === member.id) return

    const { stream } = await member.subscribe(publication.id)
    switch (stream.track.kind) {
      case 'video':
        stream.attach(document.getElementById('remote-video'))
        break
      case 'audio':
        stream.attach(document.getElementById('remote-audio'))
        break
      default:
        return
    }
  }
  channel.publications.forEach(subscribeAndAttach)
  channel.onStreamPublished.add((e) => {
    subscribeAndAttach(e.publication)
  })
  isJoined.value = true
}

onMounted(async () => {
  const localVideo = document.getElementById('local-video')
  video.attach(localVideo)
  await localVideo.play()
})
</script>

<template>
  <div class="py-5 md:py-10 text-center bg-white">
    <div class="flex items-center justify-center gap-x-6 flex-col md:flex-row">
      <video id="local-video" playsinline autoplay muted class="bg-black w-4/5 md:w-2/5" />
      <div class="mt-4 md:mt-0 w-4/5 md:w-2/5">
        <video id="remote-video" playsinline autoplay class="bg-black w-full" />
        <audio id="remote-audio" playsinline autoplay muted controls class="mt-4" />
      </div>
    </div>

    <button
      :class="{ 'opacity-50 cursor-not-allowed': isJoined }"
      :disabled="isJoined"
      class="bg-blue-500 text-white font-bold py-2 px-4 rounded mt-10"
      @click="join()"
    >
      参加する
    </button>
  </div>
</template>
