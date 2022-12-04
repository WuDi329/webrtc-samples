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

//添加事件 canplay
// canplay 事件在终端可以播放媒体文件时（但估计还没有加载足够的数据来播放媒体直到其结束，即后续可能需要停止以进一步缓冲内容）被触发。
leftVideo.addEventListener('canplay', () => {
  let stream;
  const fps = 0;
  if (leftVideo.captureStream) {
    // The captureStream() property of the HTMLMediaElement interface 
    // returns a MediaStream object which is 
    // streaming a real-time capture of the content being rendered in the media element.
    stream = leftVideo.captureStream(fps);
  } else if (leftVideo.mozCaptureStream) {
    stream = leftVideo.mozCaptureStream(fps);
  } else {
    console.error('Stream capture is not supported');
    stream = null;
  }
  console.log('current stream')
  console.log(stream)
  rightVideo.srcObject = stream;
});
