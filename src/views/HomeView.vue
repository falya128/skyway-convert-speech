<script setup>
import { onMounted, ref } from 'vue'
import {
  SkyWayContext,
  SkyWayChannel,
  SkyWayStreamFactory,
  LocalAudioStream
} from '@skyway-sdk/core'
import skyway from '@/utils/skyway'
import axios from 'axios'

const tokenString = skyway.generateTokenString()
const video = await SkyWayStreamFactory.createCameraVideoStream()
const data = await SkyWayStreamFactory.createDataStream()
const context = await SkyWayContext.Create(tokenString)
const channel = await SkyWayChannel.FindOrCreate(context, {
  type: 'p2p',
  name: 'skyway-room-name'
})

const isJoined = ref(false)

const messages = ref([])
const MAX_MESSAGE_LENGTH = 3
const setMesssage = (data) => {
  messages.value.push(data)
  if (messages.value.length > MAX_MESSAGE_LENGTH) {
    messages.value.shift()
  }
}

let member
const join = async () => {
  member = await channel.join()
  await member.publish(video)
  await member.publish(data)

  const subscribeAndAttach = async (publication) => {
    if (publication.publisher.id === member.id) return

    const { stream } = await member.subscribe(publication.id)
    if (stream.contentType === 'data') {
      stream.onData.add((data) => {
        setMesssage(data)
      })
    } else {
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
  }
  channel.publications.forEach(subscribeAndAttach)
  channel.onStreamPublished.add((e) => {
    subscribeAndAttach(e.publication)
  })
  isJoined.value = true
}

const fetchAudio = async (text) => {
  const response = await axios.get(import.meta.env.VITE_FETCH_AUDIO_URL, {
    params: { text }
  })
  const base64Str = response.data
  const raw = atob(base64Str)
  return Uint8Array.from(Array.prototype.map.call(raw, (x) => x.charCodeAt(0)))
}

let audioPublication
onMounted(async () => {
  const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition
  const recognition = new SpeechRecognition()
  recognition.continuous = true
  recognition.lang = 'ja-JP'
  recognition.onresult = async (event) => {
    const text = event.results[event.resultIndex][0].transcript
    console.log({ text })
    data.write(text)

    const uint8Array = await fetchAudio(text)
    const audioContext = new AudioContext()
    const audioBuffer = await audioContext.decodeAudioData(uint8Array.buffer)
    const source = audioContext.createBufferSource()
    const mediaStreamDestination = audioContext.createMediaStreamDestination()
    source.buffer = audioBuffer
    source.connect(mediaStreamDestination)
    const { stream } = mediaStreamDestination
    const tracks = stream.getAudioTracks()
    const localAudioStream = new LocalAudioStream(tracks[0])
    if (audioPublication) {
      await member.unpublish(audioPublication.id)
    }
    audioPublication = await member.publish(localAudioStream)
    setTimeout(() => {
      source.start()
    }, 1000)
  }
  recognition.start()

  const localVideo = document.getElementById('local-video')
  video.attach(localVideo)
  await localVideo.play()
})
</script>

<template>
  <div class="mt-10 text-center bg-white">
    <div class="flex items-center justify-center gap-x-6 flex-col md:flex-row">
      <div class="w-4/5 md:w-2/5">
        <video id="local-video" playsinline autoplay muted class="bg-black" />
      </div>
      <div class="mt-4 md:mt-0 w-4/5 md:w-2/5">
        <template v-if="isJoined">
          <video id="remote-video" playsinline autoplay muted class="bg-black" />
          <audio id="remote-audio" playsinline autoplay muted controls class="mt-4" />
        </template>
        <button
          v-else
          class="bg-blue-500 text-white font-bold py-2 px-4 rounded mt-10"
          @click="join()"
        >
          参加する
        </button>
      </div>
    </div>
    <div class="m-6">
      <div v-for="(message, index) in messages.slice().reverse()" :key="index">
        {{ message }}
      </div>
    </div>
  </div>
</template>
