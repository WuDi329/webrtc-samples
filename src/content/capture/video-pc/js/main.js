/*
*  Copyright (c) 2016 The WebRTC project authors. All Rights Reserved.
*
*  Use of this source code is governed by a BSD-style license
*  that can be found in the LICENSE file in the root of the source
*  tree.
*/

'use strict';

const leftVideo = document.getElementById('leftVideo');
const rightVideo = document.getElementById('rightVideo');

let stream;

let pc1;
let pc2;
const offerOptions = {
  offerToReceiveAudio: 1,
  offerToReceiveVideo: 1
};

let startTime;

function maybeCreateStream() {
  if (stream) {
    return;
  }
  if (leftVideo.captureStream) {
    stream = leftVideo.captureStream();
    console.log('Captured stream from leftVideo with captureStream',
        stream);
    //在此调用call
    call();
  } else if (leftVideo.mozCaptureStream) {
    stream = leftVideo.mozCaptureStream();
    console.log('Captured stream from leftVideo with mozCaptureStream()',
        stream);
    //在此调用call
    call();
  } else {
    console.log('captureStream() not supported');
  }
}

// Video tag capture must be set up after video tracks are enumerated.
leftVideo.oncanplay = maybeCreateStream;
// 0	No information is available about the media resource.
// 1	Enough of the media resource has been retrieved that the metadata attributes are initialized. Seeking will no longer raise an exception.
// 2  Data is available for the current playback position, but not enough to actually play more than one frame.
// 3	Data for the current playback position as well as for at least a little bit of time into the future is available 
//    (in other words, at least two frames of video, for example).
// 4 	Enough data is available—and the download rate is high enough—that the media can be played through to the end without interruption.
if (leftVideo.readyState >= 3) { // HAVE_FUTURE_DATA
  // Video is already ready to play, call maybeCreateStream in case oncanplay
  // fired before we registered the event handler.
  // 防止在注册事件之前，就已经触发了oncanplay，这里手动触发。
  maybeCreateStream();
}

leftVideo.play();

rightVideo.onloadedmetadata = () => {
  console.log(`Remote video videoWidth: ${rightVideo.videoWidth}px,  videoHeight: ${rightVideo.videoHeight}px`);
};

rightVideo.onresize = () => {
  console.log(`Remote video size changed to ${rightVideo.videoWidth}x${rightVideo.videoHeight}`);
  // We'll use the first onresize callback as an indication that
  // video has started playing out.
  // 使用第一个onresize回调作为视频开始播放的信号
  if (startTime) {
    const elapsedTime = window.performance.now() - startTime;
    console.log('Setup time: ' + elapsedTime.toFixed(3) + 'ms');
    //后面将不会再次触发
    startTime = null;
  }
};

function call() {
  console.log('Starting call');
  //第一次获得starttime
  startTime = window.performance.now();

  //获得 videotracks & audiotracks
  const videoTracks = stream.getVideoTracks();
  const audioTracks = stream.getAudioTracks();

  if (videoTracks.length > 0) {
    console.log(`Using video device: ${videoTracks[0].label}`);
  }
  if (audioTracks.length > 0) {
    console.log(`Using audio device: ${audioTracks[0].label}`);
  }

  // 创建RTCPeerConnection
  // 并且分别为两个PC添加onIcecandidate的回调函数
  const servers = null;
  pc1 = new RTCPeerConnection(servers);
  console.log('Created local peer connection object pc1');
  pc1.onicecandidate = e => onIceCandidate(pc1, e);
  pc2 = new RTCPeerConnection(servers);
  console.log('Created remote peer connection object pc2');
  pc2.onicecandidate = e => onIceCandidate(pc2, e);

  // 分别为两个PC添加oniceconnectionstatechange 的回调函数
  pc1.oniceconnectionstatechange = e => onIceStateChange(pc1, e);
  pc2.oniceconnectionstatechange = e => onIceStateChange(pc2, e);

  // 为pc2添加 track 的回调函数
  // a new track has been added to an RTCRtpReceiver which is part of the connection.
  pc2.ontrack = gotRemoteStream;

  //添加track为peerconnection
  // The RTCPeerConnection method addTrack() adds a new media track to the set of tracks which will be transmitted to the other peer.>
  stream.getTracks().forEach(track => pc1.addTrack(track, stream));
  console.log('Added local stream to pc1');

  console.log('pc1 createOffer start');
  // createOffer， 第一步
  pc1.createOffer(onCreateOfferSuccess, onCreateSessionDescriptionError, offerOptions);
}

function onCreateSessionDescriptionError(error) {
  console.log(`Failed to create session description: ${error.toString()}`);
}

function onCreateOfferSuccess(desc) {
  console.log(`Offer from pc1 ${desc.sdp}`);
  console.log('pc1 setLocalDescription start');
  //createOfferSuccess然后setLocalDescription
  pc1.setLocalDescription(desc, () => onSetLocalSuccess(pc1), onSetSessionDescriptionError);
  console.log('pc2 setRemoteDescription start');
  pc2.setRemoteDescription(desc, () => onSetRemoteSuccess(pc2), onSetSessionDescriptionError);
  console.log('pc2 createAnswer start');
  // Since the 'remote' side has no media stream we need
  // to pass in the right constraints in order for it to
  // accept the incoming offer of audio and video.
  pc2.createAnswer(onCreateAnswerSuccess, onCreateSessionDescriptionError);
}

function onSetLocalSuccess(pc) {
  console.log(`${getName(pc)} setLocalDescription complete`);
}

function onSetRemoteSuccess(pc) {
  console.log(`${getName(pc)} setRemoteDescription complete`);
}

function onSetSessionDescriptionError(error) {
  console.log(`Failed to set session description: ${error.toString()}`);
}

// 将event中的stream添加到ritghtVideo中
function gotRemoteStream(event) {
  if (rightVideo.srcObject !== event.streams[0]) {
    rightVideo.srcObject = event.streams[0];
    console.log('pc2 received remote stream', event);
  }
}

function onCreateAnswerSuccess(desc) {
  console.log(`Answer from pc2:
${desc.sdp}`);
  console.log('pc2 setLocalDescription start');
  pc2.setLocalDescription(desc, () => onSetLocalSuccess(pc2), onSetSessionDescriptionError);
  console.log('pc1 setRemoteDescription start');
  pc1.setRemoteDescription(desc, () => onSetRemoteSuccess(pc1), onSetSessionDescriptionError);
}

// onIceCandidate的回调函数，传入的pc是自己
function onIceCandidate(pc, event) {
  // 对手添加IceCandidate
  getOtherPc(pc).addIceCandidate(event.candidate)
      .then(
        // 如果成功，那么将会调用onAddIceCandidateSuccess，这里其实是一句输出
          () => onAddIceCandidateSuccess(pc),
          err => onAddIceCandidateError(pc, err)
      );
      //最后这里再输出 get ICE candidate
  console.log(`${getName(pc)} ICE candidate: 
${event.candidate ?
    event.candidate.candidate : '(null)'}`);
}

function onAddIceCandidateSuccess(pc) {
  console.log(`${getName(pc)} addIceCandidate success`);
}

function onAddIceCandidateError(pc, error) {
  console.log(`${getName(pc)} failed to add ICE Candidate: ${error.toString()}`);
}

//输出以下当前的iceConnectionState
function onIceStateChange(pc, event) {
  if (pc) {
    console.log(`${getName(pc)} ICE state: ${pc.iceConnectionState}`);
    console.log('ICE state change event: ', event);
  }
}

function getName(pc) {
  return (pc === pc1) ? 'pc1' : 'pc2';
}

//由于是点对点传输，所以可以轻松获得另外一个。
function getOtherPc(pc) {
  return (pc === pc1) ? pc2 : pc1;
}
