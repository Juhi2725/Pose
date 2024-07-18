import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, Text, View, Dimensions, Platform } from 'react-native';
import { CameraType } from 'expo-camera/build/Camera.types';
import { Camera, CameraView } from 'expo-camera';
import * as tf from '@tensorflow/tfjs';
import * as posedetection from '@tensorflow-models/pose-detection';
import * as ScreenOrientation from 'expo-screen-orientation';
import { bundleResourceIO, cameraWithTensors } from '@tensorflow/tfjs-react-native';
import Svg, { Circle } from 'react-native-svg';
import { ExpoWebGLRenderingContext } from 'expo-gl';
import * as posenet from '@tensorflow-models/posenet';

// Import backends for TensorFlow.js
import '@tensorflow/tfjs-backend-cpu';
import '@tensorflow/tfjs-backend-webgl';
import '@tensorflow/tfjs-react-native';

const TensorCamera = cameraWithTensors(CameraView);

const IS_ANDROID = Platform.OS === 'android';
const IS_IOS = Platform.OS === 'ios';

const CAM_PREVIEW_WIDTH = Dimensions.get('window').width;
const CAM_PREVIEW_HEIGHT = CAM_PREVIEW_WIDTH / (IS_IOS ? 9 / 16 : 3 / 4);
const MIN_KEYPOINT_SCORE = 0.3;
const OUTPUT_TENSOR_WIDTH = 180;
const OUTPUT_TENSOR_HEIGHT = OUTPUT_TENSOR_WIDTH / (IS_IOS ? 9 / 16 : 3 / 4);
const AUTO_RENDER = false;
const LOAD_MODEL_FROM_BUNDLE = true;

export default function App() {
  const cameraRef = useRef(null);
  const [tfReady, setTfReady] = useState(false);
  const [model, setModel] = useState<posedetection.PoseDetector>();
  const [poses, setPoses] = useState<posedetection.Pose[]>();
  const [fps, setFps] = useState(60);
  const [orientation, setOrientation] = useState<ScreenOrientation.Orientation>();
  const [cameraType, setCameraType] = useState<CameraType>("front");
  const rafId = useRef<number | null>(null);

  useEffect(() => {
    async function prepare() {
      try {
        console.log('Preparing the app...');
        rafId.current = null;
    
        try {
          // Set initial orientation.
          const curOrientation = await ScreenOrientation.getOrientationAsync();
          console.log('Current orientation:', curOrientation);
          setOrientation(curOrientation);
        } catch (error) {
          console.error('Error getting orientation:', error);
        }
    
        try {
          // Listens to orientation change.
          ScreenOrientation.addOrientationChangeListener((event) => {
            console.log('Orientation changed:', event.orientationInfo.orientation);
            setOrientation(event.orientationInfo.orientation);
          });
        } catch (error) {
          console.error('Error adding orientation change listener:', error);
        }
    
        try {
          // Camera permission.
          const cameraPermission = await Camera.requestCameraPermissionsAsync();
          console.log('Camera permission:', cameraPermission);
        } catch (error) {
          console.error('Error requesting camera permissions:', error);
        }
    
        try {
          // Set TensorFlow backend and wait for it to be ready.
          tf.ENV.set('WEBGL_PACK', true);
          console.log('Waiting for tf.ready()...');
          await tf.ready();
          console.log('tf is ready');
        } catch (error) {
          console.error('Error setting up TensorFlow:', error);
        }
    
        try {
          // Load MoveNet model.
          console.log('Loading MoveNet model...');
          const movenetModelConfig : any = {
            modelType: posedetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
            enableSmoothing: true,
          };
    
          // Uncomment and modify if using offline model
          if (LOAD_MODEL_FROM_BUNDLE) {
            console.log('Loading MoveNet model from bundle...');
            const modelJson = require('./offline_model/model.json');
            const modelWeights1 = require('./offline_model/group1-shard1of2.bin');
            const modelWeights2 = require('./offline_model/group1-shard2of2.bin');
            movenetModelConfig.modelUrl = bundleResourceIO(modelJson, [
              modelWeights1,
              modelWeights2,
            ]);
          }
    
          const model = await posedetection.createDetector(
            posedetection.SupportedModels.MoveNet,
            movenetModelConfig
          );
          console.log('Model:', model);
          setModel(model);
        } catch (error) {
          console.error('Error loading MoveNet model:', error);
        }
    
        // Ready!
        setTfReady(true);
        console.log('TensorFlow is ready and the model is set');
      } catch (error) {
        console.error('Error in prepare function:', error);
      }
    }

    prepare();
  }, []);

  useEffect(() => {
    return () => {
      if (rafId.current != null && rafId.current !== 0) {
        cancelAnimationFrame(rafId.current);
        rafId.current = 0;
      }
    };
  }, []);
  const staticPoses : any = [
    {
      keypoints: [
        { part: 'nose', position: { x: 100, y: 100 }, score: 0.8 },
        { part: 'left_eye', position: { x: 90, y: 90 }, score: 0.7 },
        { part: 'right_eye', position: { x: 110, y: 90 }, score: 0.7 },
        // Add more keypoints as needed
      ],
      score: 0.9,
    },
  ];
  const handleCameraStream = async (
    images: IterableIterator<tf.Tensor3D>,
    updatePreview: () => void,
    gl: ExpoWebGLRenderingContext
  ) => {
    console.log('Handling camera stream...');
    //setPoses(staticPoses);
    const loop = async () => {
      try {
        const imageTensor = images.next().value as tf.Tensor3D;
        console.log('Received image tensor:', imageTensor);
  
        //const model = await posenet.load(); // Load PoseNet model
  
       // const startTs = Date.now();
        //let poses : any = [];
        try {
        //  let poses = staticPoses
         var poses : any = await model!.estimatePoses(imageTensor, undefined, Date.now());
          console.log('Poses:??', poses);
          setPoses(poses); 
          // Process poses as needed
        } catch (error) {
          console.error('Error in estimatePoses:', error);
          // Handle or log the error as needed
        }
  
      // const latency = Date.now() - startTs;
      // console.log('Latency:', latency);
      // setFps(Math.floor(1000 / latency));
       // Ensure poses is defined before calling setPoses
        tf.dispose([imageTensor]);
  
        if (rafId.current === 0) {
          console.log('rafId is 0, stopping loop.');
          return;
        }
  
        if (AUTO_RENDER) {
          console.log('Updating preview...1');
          try {
            await updatePreview();
            console.log('Updating preview succeeded.');
          } catch (updateError) {
            console.error('Error in updatePreview:', updateError);
            // Handle or log the error in updatePreview
          }
          console.log('Updating preview...2');
          gl.endFrameEXP();
          console.log('Updating preview...3');

        }
  
        try{
          rafId.current = requestAnimationFrame(loop)
;
        }
        catch (error) {
          console.error('Error in requestAnimationFrame:', error);
        }

        console.log('Requested animation frame.');
      } catch (error) {
        console.error('Error in handleCameraStream:', error);
        // Handle or log the error as needed
      }
    };
  
   // loop();
  };
  
  console.log('Poses:', poses);
  console.log('FPS:', fps);
  console.log('Camera Type:', cameraType);
  console.log('Orientation:', orientation);

  const renderPose = (poses: any[], cameraType: string, MIN_KEYPOINT_SCORE: number, getOutputTensorWidth: () => number, getOutputTensorHeight: () => number, isPortrait: () => boolean) => {
    console.log('Poses:', poses);
    
    if (poses != null && poses.length > 0) {
      const flipX = IS_ANDROID || cameraType === 'back';
      const keypoints = poses[0].keypoints
        .filter((k: any) => (k.score ?? 0) > MIN_KEYPOINT_SCORE)
        .map((k: any) => {
          const x = flipX ? getOutputTensorWidth() - k.position.x : k.position.x;
          const y = k.position.y;
          const cx = (x / getOutputTensorWidth()) * (isPortrait() ? CAM_PREVIEW_WIDTH : CAM_PREVIEW_HEIGHT);
          const cy = (y / getOutputTensorHeight()) * (isPortrait() ? CAM_PREVIEW_HEIGHT : CAM_PREVIEW_WIDTH);
  
          return (
            <Circle
              key={`skeletonkp_${k.part}`}
              cx={cx}
              cy={cy}
              r={4}
              strokeWidth={2}
              fill='#00AA00'
              // stroke='white' // Uncomment stroke if needed
            />
          );
        });
  
      return (
        <Svg width={isPortrait() ? CAM_PREVIEW_WIDTH : CAM_PREVIEW_HEIGHT} height={isPortrait() ? CAM_PREVIEW_HEIGHT : CAM_PREVIEW_WIDTH} style={styles.svg}>
          {keypoints}
        </Svg>
      );
    } else {
      return <View></View>; // Return an empty view if poses array is empty or null
    }
  };
  
  const renderFps = () => {
    return (
      <View style={styles.fpsContainer}>
        <Text>FPS: {fps}</Text>
      </View>
    );
  };

  const renderCameraTypeSwitcher = () => {
    return (
      <View
        style={styles.cameraTypeSwitcher}
        onTouchEnd={handleSwitchCameraType}
      >
        <Text>
          Switch to{' '}
          {cameraType === 'front' ? 'back' : 'front'} camera
        </Text>
      </View>
    );
  };

  const handleSwitchCameraType = () => {
    if (cameraType === 'front') {
      setCameraType('back');
    } else {
      setCameraType('front');
    }
  };

  const isPortrait = () => {
    return (
      orientation === ScreenOrientation.Orientation.PORTRAIT_UP ||
      orientation === ScreenOrientation.Orientation.PORTRAIT_DOWN
    );
  };

  const getOutputTensorWidth = () => {
    // On iOS landscape mode, switch width and height of the output tensor to
    // get better result. Without this, the image stored in the output tensor
    // would be stretched too much.
    //
    // Same for getOutputTensorHeight below.
    return isPortrait() || IS_ANDROID
      ? OUTPUT_TENSOR_WIDTH
      : OUTPUT_TENSOR_HEIGHT;
  };

  const getOutputTensorHeight = () => {
    return isPortrait() || IS_ANDROID
      ? OUTPUT_TENSOR_HEIGHT
      : OUTPUT_TENSOR_WIDTH;
  };

  const getTextureRotationAngleInDegrees = () => {
    // On Android, the camera texture will rotate behind the scene as the phone
    // changes orientation, so we don't need to rotate it in TensorCamera.
    if (IS_ANDROID) {
      return 0;
    }

    // For iOS, the camera texture won't rotate automatically. Calculate the
    // rotation angles here which will be passed to TensorCamera to rotate it
    // internally.
    switch (orientation) {
      // Not supported on iOS as of 11/2021, but add it here just in case.
      case ScreenOrientation.Orientation.PORTRAIT_DOWN:
        return 180;
      case ScreenOrientation.Orientation.LANDSCAPE_LEFT:
        return cameraType === 'front' ? 270 : 90;
      case ScreenOrientation.Orientation.LANDSCAPE_RIGHT:
        return cameraType === 'front' ? 90 : 270;
      default:
        return 0;
    }
  };

  if (!tfReady) {
    return (
      <View style={styles.loadingMsg}>
        <Text>Loading...ss</Text>
      </View>
    );
  } else {
    return (
      // Note that you don't need to specify `cameraTextureWidth` and
      // `cameraTextureHeight` prop in `TensorCamera` below.
      <View
        style={
          isPortrait() ? styles.containerPortrait : styles.containerLandscape
        }
      >
        <TensorCamera
          ref={cameraRef}
          style={styles.camera}
          autorender={AUTO_RENDER}
          facing={cameraType}
          // tensor related props
          resizeWidth={getOutputTensorWidth()}
          resizeHeight={getOutputTensorHeight()}
          resizeDepth={3}
          rotation={getTextureRotationAngleInDegrees()}
          onReady={handleCameraStream}
          useCustomShadersToResize={true} // Add this line
          cameraTextureWidth={640} // Add this line
          cameraTextureHeight={480} 
        />
        {renderPose(poses, cameraType, MIN_KEYPOINT_SCORE, getOutputTensorWidth, getOutputTensorHeight, isPortrait)}

        {renderFps()}
        {renderCameraTypeSwitcher()}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  containerPortrait: {
    position: 'relative',
    width: CAM_PREVIEW_WIDTH,
    height: CAM_PREVIEW_HEIGHT,
    marginTop: Dimensions.get('window').height / 2 - CAM_PREVIEW_HEIGHT / 2,
  },
  containerLandscape: {
    position: 'relative',
    width: CAM_PREVIEW_HEIGHT,
    height: CAM_PREVIEW_WIDTH,
    marginLeft: Dimensions.get('window').height / 2 - CAM_PREVIEW_HEIGHT / 2,
  },
  loadingMsg: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  camera: {
    width: '100%',
    height: '100%',
    zIndex: 1,
  },
  svg: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    zIndex: 30,
  },
  fpsContainer: {
    position: 'absolute',
    top: 10,
    left: 10,
    width: 80,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, .7)',
    borderRadius: 2,
    padding: 8,
    zIndex: 20,
  },
  cameraTypeSwitcher: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 180,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, .7)',
    borderRadius: 2,
    padding: 8,
    zIndex: 20,
  },
});