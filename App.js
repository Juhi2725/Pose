import "@mediapipe/face_detection";
import "@tensorflow/tfjs-core";
import "@tensorflow/tfjs-backend-webgl";

import React, { useRef, useEffect, useState, useCallback } from "react";
import Webcam from "react-webcam";
import * as tf from "@tensorflow/tfjs";
import * as faceDetection from "@tensorflow-models/face-detection";
import * as faceLandmarksDetection from "@tensorflow-models/face-landmarks-detection";
import "./App.css";
import { Image, Text, View } from "react-native";
import { filterByType } from "./helper";

const App = () => {
  const [logs, setLogs] = useState([]);
  const [capturedImage, setCapturedImage] = useState(null);
  const [frameCaptured, setFrameCaptured] = useState(false); // Flag to ensure only one frame capture
  const [faceDetected, setFaceDetected] = useState(false); // Flag to track if face is detected
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const [ctxTest, setCtxTest] = useState(null);
  const [userInFrame, setUserInFrame] = useState(false);

  const [timeLeft, setTimeLeft] = useState(null);

  const setupCamera = async () => {
    try {
      const video = webcamRef.current.video;
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" }, // Use 'environment' for the back camera
      });
      video.srcObject = stream;

      return new Promise((resolve) => {
        video.onloadedmetadata = () => {
          resolve(video);
        };
      });
    } catch (error) {
      console.error("Error accessing webcam: ", error);
      throw error;
    }
  };

  const loadModel = async () => {
    try {
      await tf.ready();

      const model = faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh;
      const detectorConfig = {
        runtime: "mediapipe",
        solutionPath: "https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh",
      };
      const detector = await faceLandmarksDetection.createDetector(
        model,
        detectorConfig
      );

      // Log model details
      console.log("Model loaded:", detector);
      setLogs((prevLogs) => [
        ...prevLogs,
        "Model loaded successfully.",
        `Model Type: ${detector.constructor.name}`,
        `Model Methods: ${Object.getOwnPropertyNames(
          Object.getPrototypeOf(detector)
        ).join(", ")}`,
      ]);

      return detector;
    } catch (error) {
      console.error("Error loading model:", error);
      setLogs((prevLogs) => [
        ...prevLogs,
        "Error loading model: " + error.message,
      ]);
      throw error;
    }
  };

  const capture = useCallback(() => {
    const imageSrc = webcamRef.current.getScreenshot();
    setCapturedImage(imageSrc);

    // Create a canvas to flip the image
    /*
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;

      // Flip the image horizontally
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(img, 0, 0);

      const flippedImageSrc = canvas.toDataURL("image/png");
      setCapturedImage(flippedImageSrc);
    };
*/
    //img.src = imageSrc;
  }, [webcamRef]);

  const drawStaticFrame = (ctx, canvas, prediction) => {
    const centerX = prediction.box.xMin + prediction.box.width / 2;
    const centerY = prediction.box.yMin + prediction.box.height / 2;
    const radiusX = prediction.box.width / 2; // Adjusted for a smaller oval
    const radiusY = prediction.box.height / 3; // Adjusted for a smaller oval

    // Clear the canvas before drawing
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const region = new Path2D();
    const points = prediction.keypoints;
    var upperPoint = 0;
    var lowerPoint = 1000;
    for (let i = 0; i < points.length; i++) {
      const point = points[i];

      if (point.name === "rightEye") {
        region.lineTo(point.x, point.y);
        if (point.y > upperPoint) {
          upperPoint = point.y;
        }
        if (point.y < lowerPoint) {
          lowerPoint = point.y;
        }
      }
    }

    //if (closePath) {
    region.closePath();
    //}
    ctx.lineWidth = 1; // Increased width of the oval frame
    ctx.strokeStyle = faceDetected ? "green" : "red"; // Change color based on face detection

    ctx.stroke(region);
  };

  const drawLeftEye = (ctx, canvas, prediction) => {
    // Clear the canvas before drawing

    const region = new Path2D();
    const points = prediction.keypoints;
    for (let i = 0; i < points.length; i++) {
      const point = points[i];
      if (point.name === "leftEye") {
        region.lineTo(point.x, point.y);
        // console.log("point x", point.x);
      }
    }

    //if (closePath) {
    region.closePath();
    //}
    ctx.lineWidth = 1; // Increased width of the oval frame
    ctx.strokeStyle = faceDetected ? "green" : "red"; // Change color based on face detection

    ctx.stroke(region);
  };

  const checkForBlink = (prediction) => {
    const points = prediction.keypoints;
    var upperPointRight = 0;
    var lowerPointRight = 1000;

    var upperPointLeft = 0;
    var lowerPointLeft = 1000;
    const rightEyePoints = filterByType("rightEye", points);
    const leftEyePoints = filterByType("leftEye", points);

    for (let i = 0; i < rightEyePoints.length; i++) {
      const point = rightEyePoints[i];
      if (point.y > upperPointRight) {
        upperPointRight = point.y;
      }
      if (point.y < lowerPointRight) {
        lowerPointRight = point.y;
      }
    }

    for (let i = 0; i < leftEyePoints.length; i++) {
      const point = leftEyePoints[i];
      if (point.y > upperPointLeft) {
        upperPointLeft = point.y;
      }
      if (point.y < lowerPointLeft) {
        lowerPointLeft = point.y;
      }
    }

    const { xMin, yMin, width, height } = prediction.box;
    const diffRight = upperPointRight - lowerPointRight;
    const diffLeft = upperPointLeft - lowerPointLeft;

    //console.log("left = ", diffLeft, " right = ", diffRight);
    if (diffLeft / height < 0.035 && diffRight / height < 0.035) {
      console.log("YOU JUST BLINKED");
      if (!frameCaptured) {
        //console.log("capturing");
        setFrameCaptured(true); // Set the flag to true after detecting the face
      }
    }
  };

  useEffect(() => {
    console.log("should capture");
    if (frameCaptured) {
      setTimeout(() => {
        setTimeLeft(3);
      }, 1000);
    }
  }, [frameCaptured]);

  useEffect(() => {
    console.log("should capture");
    if (timeLeft > 0) {
      setTimeout(() => {
        setTimeLeft(timeLeft - 1);
      }, 1000);
    } else {
      capture();
    }
  }, [timeLeft]);

  const checkPredictions = (predictions, canvas) => {
    if (predictions.length > 0) {
      // Process only the first detected face
      const prediction = predictions[0];
      //drawStaticFrame(ctx, canvas, prediction);
      //drawLeftEye(ctx, canvas, prediction);

      // Log face detection information
      setLogs((prevLogs) => [...prevLogs, `Face detected: true`]);
      //console.log(`eye`, JSON.stringify(prediction.box));

      // Bounding box coordinates
      const { xMin, yMin, width, height } = prediction.box;

      // Adjust for mirroring
      const videoScaleX =
        webcamRef.current.video.style.transform === "scaleX(-1)" ? -1 : 1;

      // Calculate the center of the face
      const centerX = xMin + width / 2;
      const centerY = yMin + height / 2;

      // Define the middle region of the canvas (e.g., the central 50% area)
      const middleRegion = {
        xMin: canvas.width * 0.45,
        xMax: canvas.width * 0.55,
        yMin: canvas.height * 0.25,
        yMax: canvas.height * 0.55,
      };

      const sizeConstraints = {
        widthMin: canvas.width / 5,
        widthMax: canvas.width / 2.5,
        heightMin: canvas.height / 4,
        heightMax: canvas.height / 2,
      };

      // Check if the face is in the middle region
      if (
        centerX * videoScaleX >= middleRegion.xMin &&
        centerX * videoScaleX <= middleRegion.xMax &&
        centerY >= middleRegion.yMin &&
        centerY <= middleRegion.yMax &&
        width <= sizeConstraints.widthMax &&
        width >= sizeConstraints.widthMin &&
        height <= sizeConstraints.heightMax &&
        width >= sizeConstraints.heightMin
      ) {
        setFaceDetected(true);
        checkForBlink(prediction);
      } else {
        setFaceDetected(false);
      }
    } else {
      setFaceDetected(false);
      setLogs((prevLogs) => [...prevLogs, `Face detected: false`]);
      console.log("no face detected");
    }
  };

  const detectFace = async (model, video) => {
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    // Set canvas size to match video dimensions
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Estimate faces in the video frame
    const predictions = await model.estimateFaces(video);

    checkPredictions(predictions, canvas);

    // Draw the static frame with the updated color

    // Request the next animation frame for continuous detection
    requestAnimationFrame(() => detectFace(model, video));
  };

  useEffect(() => {
    const main = async () => {
      try {
        const video = await setupCamera();
        video.play();

        const model = await loadModel();
        detectFace(model, video);
      } catch (error) {
        console.error("Error in main function: ", error);
      }
    };

    main();
  }, []);

  return (
    <div className="App">
      {capturedImage ? (
        <img src={capturedImage} alt="Captured" />
      ) : (
        <>
          <Webcam
            ref={webcamRef}
            className="webcam"
            screenshotFormat="image/png"
            videoConstraints={{
              facingMode: "user", // Use 'environment' for the back camera
            }}
            style={{ flex: 1 }}
          />
          <Image
            source={
              faceDetected
                ? require("./assets/v2_selfie_frame_green_dashed.png")
                : require("./assets/v2_selfie_frame_white_dashed.png")
            }
            style={{
              width: "100%",
              aspectRatio: 1.32,
            }}
            resizeMode="center"
          ></Image>

          <canvas ref={canvasRef} className="canvas"></canvas>
          {timeLeft != null && (
            <View style={{ flex: 1, position: "absolute" }}>
              <Text
                style={{
                  fontSize: 64,
                  width: "100%",
                  textAlign: "center",
                  color: "white",
                }}
              >
                {timeLeft}
              </Text>
            </View>
          )}
        </>
      )}
    </div>
  );
};

export default App;
