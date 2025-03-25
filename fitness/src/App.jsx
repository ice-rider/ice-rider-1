import { BrowserRouter, Routes, Route } from "react-router-dom";
import MainPage from "./desktop/main_page";
import PoseDetectionComponent from "./desktop/Test";

export default function App () {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/*" element={<MainPage />} />
        <Route path="/test" element={<PoseDetectionComponent />} />
        
      </Routes>
    </BrowserRouter>
  )
}