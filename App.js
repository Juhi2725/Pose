import React, { useState } from "react";
import "./App.css";
import { Text, TouchableOpacity, View } from "react-native";
import VideoNormalizer from "./components/VideoNormalizer/VideoNormalizer";
import ImageNormalizer from "./components/ImageNormalizer/ImageNormazlier";
import BlinkDetector from "./components/BlinkDetector/BlinkDetector";

const App = () => {
  //temporary way to access different test cases
  //0 = menu - 1 = face recognition 2 = document
  const [testType, setTestType] = useState(0);

  return (
    <div className="App">
      {testType === 0 && (
        <View style={{ flex: 1, alignItems: "center" }}>
          <Text style={{ color: "black", flex: 1, textAlign: "center" }}>
            Select Test Type
          </Text>
          <TouchableOpacity
            style={{
              width: 300,
              height: 40,
              backgroundColor: "grey",
              borderRadius: 8,
              marginTop: 16,
              justifyContent: "center",
            }}
            onPress={() => setTestType(1)}
          >
            <Text style={{ color: "white", textAlign: "center" }}>
              Face recognition
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{
              width: 300,
              height: 40,
              backgroundColor: "grey",
              borderRadius: 8,
              marginTop: 16,
              justifyContent: "center",
            }}
            onPress={() => setTestType(2)}
          >
            <Text style={{ color: "white", textAlign: "center" }}>
              Document Scan
            </Text>
          </TouchableOpacity>
        </View>
      )}
      {testType === 1 && <BlinkDetector></BlinkDetector>}

      {testType === 2 && (
        <>
          {<VideoNormalizer></VideoNormalizer>}

          {/*<ImageNormalizer></ImageNormalizer>*/}
        </>
      )}
    </div>
  );
};

export default App;
