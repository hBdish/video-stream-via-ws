
import './App.css'
import { useEffect, useRef, useState} from "react";

const ws = new WebSocket("ws://localhost:8081");



function App() {
  const mediaSource = useRef(new MediaSource())
  const sourceBuffer = useRef<SourceBuffer>();
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const arrayOfBlobs = useRef<Blob[]>([]);



  useEffect(() => {
    ws.onopen = () => {
      console.log("WebSocket connected");
    };

    ws.onmessage = (event) => {

      console.log("WebSocket message received", event.data);
      if (event.data instanceof Blob) {
        console.log(event.data)
      }
    };

    void handleConnect()

  }, []);



  async function appendToSourceBuffer() {

    if (!localVideoRef.current) return
    if (!sourceBuffer.current) return

    if (mediaSource.current.readyState === "open" && sourceBuffer && !sourceBuffer.current.updating) {

    const neVal = arrayOfBlobs.current.shift()

      if (!neVal) return

      sourceBuffer.current.appendBuffer(await neVal.arrayBuffer());

    }

    // Limit total buffer size
    if (localVideoRef.current.buffered.length && localVideoRef.current.buffered.end(0) - localVideoRef.current.buffered.start(0) > 2) {
      sourceBuffer.current.remove(0, localVideoRef.current.buffered.end(0) - 1200);
    }
  }


  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-expect-error
  const getUserMedia = (constraints): Promise<MediaStream> => {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      return navigator.mediaDevices.getUserMedia(constraints);
    }

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    const getUserMedia = navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;

    if (getUserMedia) {
      return new Promise((resolve, reject) => getUserMedia.call(navigator, constraints, resolve, reject));
    }

    return Promise.reject(new Error('getUserMedia is not supported in this browser.'));
  };

  const handleConnect = async () => {
    try {
      const stream = await getUserMedia({ video: true, audio: true });


      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm' // Определяем тип видео
      });

      mediaRecorder.ondataavailable =  (event) => {

        console.log(arrayOfBlobs.current)
        if (!localVideoRef.current) return
        arrayOfBlobs.current.push(event.data)
        localVideoRef.current.src = URL.createObjectURL(event.data)
      };

      mediaSource.current.addEventListener("sourceopen", function() {
        sourceBuffer.current = mediaSource.current.addSourceBuffer("video/webm; codecs=\"opus,vp8\"");
        sourceBuffer.current.addEventListener("updateend", appendToSourceBuffer);

      });

      mediaRecorder.start(1000); // Отправка данных каждые 1000 мс

    } catch (err) {
      console.error('Error accessing media devices:', err);
      alert(`Error accessing media devices: ${err}. Please check your browser permissions.`);
    }


  };



  return (
    <div>
      <video  ref={localVideoRef} autoPlay controls></video>
    </div>
  )
}

export default App
