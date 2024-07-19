import '@mediapipe/face_detection';
import '@tensorflow/tfjs-core';
import '@tensorflow/tfjs-backend-webgl';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import Webcam from 'react-webcam';
import * as tf from '@tensorflow/tfjs';
import * as faceDetection from '@tensorflow-models/face-detection';
import './App.css';

const App = () => {
  const [logs, setLogs] = useState([]);
  const [capturedImage, setCapturedImage] = useState(null);
  const [frameCaptured, setFrameCaptured] = useState(false); // Flag to ensure only one frame capture
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
      throw error;
    }
  };

  const loadModel = async () => {
    try {
      await tf.ready();

      const model = faceDetection.SupportedModels.MediaPipeFaceDetector;
      const detectorConfig = {
        runtime: 'mediapipe',
        solutionPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/face_detection',
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

  const capture = useCallback(() => {
    const imageSrc = webcamRef.current.getScreenshot();

    // Create a canvas to flip the image
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;

      // Flip the image horizontally
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(img, 0, 0);

      const flippedImageSrc = canvas.toDataURL('image/png');
      setCapturedImage(flippedImageSrc);
    };

    img.src = imageSrc;
  }, [webcamRef]);

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

      // Calculate the center and radius for the round face
      const centerX = xMin + width / 2;
      const centerY = yMin + height / 2;
      const radius = Math.min(width, height) / 2;

      // Define the middle region of the canvas (e.g., the central 50% area)
      const middleRegion = {
        xMin: canvas.width * 0.25,
        xMax: canvas.width * 0.75,
        yMin: canvas.height * 0.25,
        yMax: canvas.height * 0.75,
      };

      // Check if the face is in the middle region
      if (centerX * videoScaleX >= middleRegion.xMin &&
          centerX * videoScaleX <= middleRegion.xMax &&
          centerY >= middleRegion.yMin &&
          centerY <= middleRegion.yMax) {
        // Draw a circle around the detected face
        ctx.beginPath();
        ctx.arc(centerX * videoScaleX, centerY, radius, 0, 2 * Math.PI);
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'red';
        ctx.stroke();

        if (!frameCaptured) {
          setFrameCaptured(true); // Set the flag to true after capturing the frame
          // Capture the image from the webcam after 3 seconds
          setTimeout(() => {
            capture();
            setLogs((prevLogs) => [...prevLogs, 'Image captured after 3 seconds.']);
          }, 3000);
        }
      } else {
        // Log if face is not in the middle region
        setLogs((prevLogs) => [...prevLogs, 'Face not in the middle region.']);
      }
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
      {
        capturedImage ? (
          <img src={capturedImage} alt="Captured" />
        ) :  
        <>
          <Webcam
            ref={webcamRef}
            className="webcam"
            screenshotFormat="image/png"
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
        </>
      }
    </div>
  );
};

export default App;
