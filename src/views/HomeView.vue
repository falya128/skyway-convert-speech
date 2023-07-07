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

const isJoined = ref(false)

// 相手が話したメッセージリスト
const messages = ref([])
const MAX_MESSAGE_LENGTH = 3
const setMesssage = (data) => {
  messages.value.push(data)
  if (messages.value.length > MAX_MESSAGE_LENGTH) {
    messages.value.shift()
  }
}

// 話した内容をサーバ側で指定の形式に変換
const convertSpeech = async (text) => {
  const response = await axios.get(import.meta.env.VITE_CONVERT_TEXT_URL, {
    params: { text }
  })
  return response.data.convertedText
}

// 指定されたテキストを音声に変換
const convertAudio = async (text) => {
  const response = await axios.get(import.meta.env.VITE_FETCH_AUDIO_URL, {
    params: { text }
  })
  const base64Str = response.data
  const raw = atob(base64Str)
  return Uint8Array.from(Array.prototype.map.call(raw, (x) => x.charCodeAt(0)))
}

// 文字起こし
let audioPublication
const startRecognition = async () => {
  window.SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition
  const recognition = new window.SpeechRecognition()
  recognition.lang = 'ja-JP'
  recognition.continuous = true
  recognition.onresult = async (event) => {
    // 話した内容を文字で取得
    const text = event.results[event.resultIndex][0].transcript
    if (text === '') return
    console.log({ text })

    // 文字データを加工して音声に変換
    const convertedText = await convertSpeech(text)
    const uint8Array = await convertAudio(convertedText)

    const audioContext = new AudioContext()
    const audioBuffer = await audioContext.decodeAudioData(uint8Array.buffer)
    const source = audioContext.createBufferSource()
    const mediaStreamDestination = audioContext.createMediaStreamDestination()
    source.buffer = audioBuffer
    source.connect(mediaStreamDestination)
    const { stream } = mediaStreamDestination
    setTimeout(() => {
      source.start()
    }, 1000)

    // 新しい Stream を Publish する
    if (audioPublication) {
      await member.unpublish(audioPublication.id)
    }
    const tracks = stream.getAudioTracks()
    const localAudioStream = new LocalAudioStream(tracks[0])
    audioPublication = await member.publish(localAudioStream)

    // 相手に文字データとして送信
    data.write(convertedText)
  }
  recognition.onend = () => {
    // Android で音声認識が終了してしまうため、終了したら文字起こしを再開させる
    startRecognition()
  }
  recognition.start()
}

// SkyWay の Channel 作成
const video = await SkyWayStreamFactory.createCameraVideoStream()
const data = await SkyWayStreamFactory.createDataStream()
const tokenString = skyway.generateTokenString()
const context = await SkyWayContext.Create(tokenString)
const channel = await SkyWayChannel.FindOrCreate(context, {
  type: 'p2p',
  name: 'skyway-room-name'
})

let member
const join = async () => {
  // Channel に参加
  member = await channel.join()
  await member.publish(video)
  await member.publish(data)

  // 文字起こし開始
  await startRecognition()

  // 相手から Publish された Stream を Subscribe する
  const subscribeAndAttach = async (publication) => {
    if (publication.publisher.id === member.id) return

    const { stream } = await member.subscribe(publication.id)
    if (stream.contentType === 'data') {
      // 相手が話したメッセージをテキストで表示
      stream.onData.add((data) => {
        setMesssage(data)
      })
    } else {
      switch (stream.track.kind) {
        case 'video':
          // 相手の映像を表示
          stream.attach(document.getElementById('remote-video'))
          break
        case 'audio':
          // 相手の音声を再生
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

onMounted(async () => {
  // 自分の映像を表示
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
