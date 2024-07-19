import '@mediapipe/face_detection';
import '@tensorflow/tfjs-core';
import '@tensorflow/tfjs-backend-webgl';

import React, { useRef, useEffect, useState } from 'react';
import Webcam from 'react-webcam';
import * as tf from '@tensorflow/tfjs';
import * as faceDetection from '@tensorflow-models/face-detection';
import './App.css';

const App = () => {
  const [logs, setLogs] = useState([]);
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);

  const setupCamera = async () => {
    try {
      const video = webcamRef.current.video;
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' }, // Use 'environment' for the back camera
      });
      video.srcObject = stream;

      return new Promise((resolve) => {
        video.onloadedmetadata = () => {
          resolve(video);
        };
      });
    } catch (error) {
      console.error('Error accessing webcam: ', error);
      alert('Unable to access webcam. Please check your permissions and try again.');
      throw error;
    }
  };

  const loadModel = async () => {
    try {
      await tf.ready();

      // Ensure that the correct model is being used
      // const model = faceDetection.SupportedModels.MediaPipeFaceDetector;

      // // Verify the supported runtimes
      // const detectorConfig = {
      //   runtime: 'tfjs', // or 'mediapipe'
      //   //source: 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-core'
      // };

      // // Create detector
      // const detector = await faceDetection.createDetector(model, detectorConfig);

      const model = faceDetection.SupportedModels.MediaPipeFaceDetector;
      const detectorConfig = {
        runtime: 'mediapipe',
        solutionPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/face_detection',
        // or 'base/node_modules/@mediapipe/face_detection' in npm.
      };
      const detector = await faceDetection.createDetector(model, detectorConfig);

      // Log model details
      console.log('Model loaded:', detector);
      setLogs((prevLogs) => [
        ...prevLogs,
        'Model loaded successfully.',
        `Model Type: ${detector.constructor.name}`,
        `Model Methods: ${Object.getOwnPropertyNames(Object.getPrototypeOf(detector)).join(', ')}`
      ]);

      return detector;
    } catch (error) {
      console.error('Error loading model:', error);
      setLogs((prevLogs) => [...prevLogs, 'Error loading model: ' + error.message]);
      throw error;
    }
  };

  const detectFace = async (model, video) => {
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    // Set canvas size to match video dimensions
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Clear the canvas before drawing
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Estimate faces in the video frame
    const predictions = await model.estimateFaces(video);

    if (predictions.length > 0) {
      // Process only the first detected face
      const prediction = predictions[0];

      // Log face detection information
      setLogs((prevLogs) => [
        ...prevLogs,
        `Face detected: (${JSON.stringify(prediction)})`
      ]);

      // Bounding box coordinates
      const { xMin, yMin, width, height } = prediction.box;

      // Adjust for mirroring
      const videoScaleX = webcamRef.current.video.style.transform === 'scaleX(-1)' ? -1 : 1;

      // Log bounding box details
      setLogs((prevLogs) => [
        ...prevLogs,
        `Bounding box: xMin (${xMin}), yMin (${yMin}), width (${width}), height (${height})`
      ]);

      // Draw bounding box on canvas
      ctx.beginPath();
      ctx.rect(xMin * videoScaleX, yMin, width * videoScaleX, height);
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'red';
      ctx.stroke();
    } else {
      // Log if no face is detected
      setLogs((prevLogs) => [...prevLogs, 'No face detected.']);
    }

    // Request the next animation frame for continuous detection
    setTimeout(() => requestAnimationFrame(() => detectFace(model, video)), 100);
  };

  useEffect(() => {
    const main = async () => {
      try {
        const video = await setupCamera();
        video.play();

        const model = await loadModel();
        detectFace(model, video);
      } catch (error) {
        console.error('Error in main function: ', error);
      }
    };

    main();
  }, []);

  return (
    <div className="App">
      <Webcam
        ref={webcamRef}
        className="webcam"
        videoConstraints={{
          facingMode: 'user', // Use 'environment' for the back camera
        }}
      />
      <canvas
        ref={canvasRef}
        className="canvas"
      ></canvas>
      <div className="log-container">
        {logs.map((log, index) => (
          <div key={index}>{log}</div>
        ))}
      </div>
    </div>
  );
};

export default App;
