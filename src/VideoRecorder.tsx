import {useState, useRef, useEffect} from "react";

const ws = new WebSocket("ws://localhost:8081");
ws.binaryType = 'arraybuffer'

const mimeType = 'video/webm; codecs="opus,vp8"';

const VideoRecorder = () => {
  const [permission, setPermission] = useState(false);

  const mediaRecorder = useRef<MediaRecorder>(null);

  const liveVideoFeed = useRef<HTMLVideoElement>(null);

  const wsVideoFeed = useRef<HTMLVideoElement>(null);

  const wsVideoSource = useRef<MediaSource>();

  const wsVideoSourceBuffer = useRef<SourceBuffer>();

  const [recordingStatus, setRecordingStatus] = useState("inactive");

  const [stream, setStream] = useState<MediaStream>();

  const [recordedVideo, setRecordedVideo] = useState(null);

  const [videoChunks, setVideoChunks] = useState([]);

  const arrayOfBlobs = useRef<Blob[]>([]);

  useEffect(() => {
    ws.onopen = () => {
      console.log("WebSocket connected");
    };

    wsVideoSource.current = new MediaSource()

    if (!wsVideoSource.current || !wsVideoFeed.current) return

    wsVideoFeed.current.src = URL.createObjectURL(wsVideoSource.current);

    wsVideoSource.current.addEventListener("sourceopen", function() {
      console.log("sourceopen")

      wsVideoSourceBuffer.current = wsVideoSource?.current?.addSourceBuffer(mimeType)
      wsVideoSourceBuffer?.current?.addEventListener("updateend", appendToSourceBuffer);
    });

  }, []);


  async function appendToSourceBuffer() {
    console.log("appendToSourceBuffer")
    console.log(wsVideoSource?.current?.readyState)

    if (wsVideoSource?.current?.readyState === "open" && wsVideoSourceBuffer.current && !wsVideoSourceBuffer.current.updating) {
      const val = arrayOfBlobs.current.shift()

      if (!val) return;

      wsVideoSourceBuffer.current.appendBuffer(await val.arrayBuffer());
    }

    // Limit total buffer size
    if (wsVideoFeed?.current?.buffered.length && wsVideoFeed.current.buffered.end(0) - wsVideoFeed.current.buffered.start(0) > 1200) {
      wsVideoSourceBuffer?.current?.remove(0, wsVideoFeed.current.buffered.end(0) - 1200);
    }
  }

  ws.onmessage =  (event) => {
    const blob = new Blob([event.data], {type: mimeType});
    arrayOfBlobs.current.push(blob)
    appendToSourceBuffer();
  };


  const getCameraPermission = async () => {
    setRecordedVideo(null);
    //get video and audio permissions and then stream the result media stream to the videoSrc variable
    if ("MediaRecorder" in window) {
      try {
        const videoConstraints = {
          audio: false,
          video: true,
        };
        const audioConstraints = { audio: true };

        // create audio and video streams separately
        const audioStream = await navigator.mediaDevices.getUserMedia(
          audioConstraints
        );
        const videoStream = await navigator.mediaDevices.getUserMedia(
          videoConstraints
        );

        setPermission(true);

        //combine both audio and video streams

        const combinedStream = new MediaStream([
          ...videoStream.getVideoTracks(),
          ...audioStream.getAudioTracks(),
        ]);

        setStream(combinedStream);

        if (!liveVideoFeed.current) return

        //set videostream to live feed player
        liveVideoFeed.current.srcObject = videoStream;

      } catch (err) {
        alert(err);
      }
    } else {
      alert("The MediaRecorder API is not supported in your browser.");
    }
  };

  const startRecording = async () => {
    setRecordingStatus("recording");

    if (!stream) return;

    const media = new MediaRecorder(stream, { mimeType });

    mediaRecorder.current = media;
    mediaRecorder.current.start(200);

    const localVideoChunks = [];

    mediaRecorder.current.ondataavailable = (event) => {
      // console.log(event.data)

      if (typeof event.data === "undefined") return;
      if (event.data.size === 0) return;
      localVideoChunks.push(event.data);

      ws.send(event.data)
    };


    setVideoChunks(localVideoChunks);
  };

  const stopRecording = () => {
    setPermission(false);
    setRecordingStatus("inactive");
    if (mediaRecorder.current) return

    mediaRecorder.current.stop();

    mediaRecorder.current.onstop = () => {
      const videoBlob = new Blob(videoChunks, { type: mimeType });
      const videoUrl = URL.createObjectURL(videoBlob);

      setRecordedVideo(videoUrl);

      setVideoChunks([]);
    };
  };

  return (
    <div>
      <h2>Video Recorder</h2>
      <main>
        <div className="video-controls">
          {!permission ? (
            <button onClick={getCameraPermission} type="button">
              Get Camera
            </button>
          ) : null}
          {permission && recordingStatus === "inactive" ? (
            <button onClick={startRecording} type="button">
              Start Recording
            </button>
          ) : null}
          {recordingStatus === "recording" ? (
            <button onClick={stopRecording} type="button">
              Stop Recording
            </button>
          ) : null}
        </div>
      </main>

      <div className="video-player">
        {!recordedVideo ? (
          <video ref={liveVideoFeed} autoPlay className="live-player"></video>
        ) : null}
        {recordedVideo ? (
          <div className="recorded-player">
            <video className="recorded" src={recordedVideo} controls></video>
            <a download href={recordedVideo}>
              Download Recording
            </a>
          </div>
        ) : null}
      </div>

      <div className="video-player">

          <video ref={wsVideoFeed} autoPlay className="live-player"></video>


      </div>
    </div>
  );
};

export default VideoRecorder;
