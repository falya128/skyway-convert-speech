<script setup>
import { onMounted, ref } from 'vue'
import axios from 'axios'
import {
  SkyWayContext,
  SkyWayChannel,
  SkyWayStreamFactory,
  LocalAudioStream
} from '@skyway-sdk/core'
import skyway from '@/utils/skyway'

const tokenString = skyway.generateTokenString()
const video = await SkyWayStreamFactory.createCameraVideoStream()
const data = await SkyWayStreamFactory.createDataStream()
const context = await SkyWayContext.Create(tokenString)
const channel = await SkyWayChannel.FindOrCreate(context, {
  type: 'p2p',
  name: 'skyway-room-name'
})

const isJoined = ref(false)
const selectedDialect = ref('標準語')

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

const convertText = async (text) => {
  const response = await axios.get(import.meta.env.VITE_CONVERT_TEXT_URL, {
    params: { text, dialect: selectedDialect.value }
  })
  return response.data.convertedText
}

let audioPublication
onMounted(async () => {
  const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition
  const recognition = new SpeechRecognition()
  recognition.continuous = true
  recognition.lang = 'ja-JP'
  recognition.onresult = async (event) => {
    const text = event.results[event.resultIndex][0].transcript
    if (text === '') return
    console.log({ text })

    const convertedText = await convertText(text)
    data.write(convertedText)
    const uint8Array = await fetchAudio(convertedText)
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
        <select
          class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500 mt-5"
          v-model="selectedDialect"
        >
          <option value="標準語">標準語</option>
          <option value="広島県の方言">広島弁</option>
          <option value="沖縄県の方言">沖縄弁</option>
          <option value="秋田県の方言">秋田弁</option>
        </select>
      </div>
      <div class="mt-4 md:mt-0 w-4/5 md:w-2/5">
        <template v-if="isJoined">
          <video id="remote-video" playsinline autoplay muted class="bg-black" />
          <audio id="remote-audio" playsinline autoplay controls class="mt-4" />
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
      <div v-for="(message, index) in messages.slice().reverse()" :key="index" class="my-2">
        {{ message }}
      </div>
    </div>
  </div>
</template>
