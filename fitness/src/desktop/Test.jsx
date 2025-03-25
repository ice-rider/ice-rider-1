import { useEffect, useRef, useState } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as poseDetection from '@tensorflow-models/pose-detection';

const PoseDetectionComponent = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isModelLoading, setIsModelLoading] = useState(true);
  const [error, setError] = useState(null);

  // Отфильтрованные соединения (без глаз и ушей)
  const CONNECTIONS = [
    [5, 6],   // Плечи
    [5, 7],   // Левое плечо - локоть
    [7, 9],   // Левый локоть - запястье
    [6, 8],   // Правое плечо - локоть
    [8, 10],  // Правый локоть - запястье
    [5, 11],  // Левое плечо - бедро
    [6, 12],  // Правое плечо - бедро
    [11, 12], // Бедра
    [11, 13], // Левое бедро - колено
    [13, 15], // Левое колено - лодыжка
    [12, 14], // Правое бедро - колено
    [14, 16], // Правое колено - лодыжка
  ];

  // Фильтр точек: оставляем только нос (индекс 0) и точки тела
  const isAllowedKeypoint = (index) => ![1, 2, 3, 4].includes(index);

  // Инициализация модели MoveNet Thunder
  useEffect(() => {
    const initModel = async () => {
      try {
        await tf.ready();
        return await poseDetection.createDetector(
          poseDetection.SupportedModels.MoveNet,
          {
            modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
          }
        );
      } catch (err) {
        setError('Ошибка загрузки модели');
        console.error(err);
      }
    };

    initModel().then(detector => {
      startCamera(detector);
      setIsModelLoading(false);
    });
  }, []);

  // Запуск камеры
  const startCamera = async (detector) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play();
          detectPose(detector);
        };
      }
    } catch (err) {
      setError('Ошибка доступа к камере');
      console.error(err);
    }
  };

  // Отрисовка результатов
  const drawResults = (poses) => {
    const ctx = canvasRef.current.getContext('2d');
    const video = videoRef.current;
    
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    const scaleX = video.videoWidth / video.clientWidth;
    const scaleY = video.videoHeight / video.clientHeight;

    // Отрисовка соединений
    CONNECTIONS.forEach(([start, end]) => {
      const startPoint = poses.keypoints[start];
      const endPoint = poses.keypoints[end];
      
      if (startPoint.score > 0.3 && endPoint.score > 0.3) {
        ctx.beginPath();
        ctx.moveTo((video.videoWidth - startPoint.x) / scaleX, startPoint.y / scaleY);
        ctx.lineTo((video.videoWidth - endPoint.x) / scaleX, endPoint.y / scaleY);
        ctx.strokeStyle = '#00FF00';
        ctx.lineWidth = 3;
        ctx.stroke();
      }
    });

    // Отрисовка точек
    poses.keypoints.forEach((keypoint, index) => {
      if (!isAllowedKeypoint(index)) return;
      
      if (keypoint.score > 0.3) {
        ctx.beginPath();
        ctx.arc(
          (video.videoWidth - keypoint.x) / scaleX,
          keypoint.y / scaleY,
          5, 0, 2 * Math.PI
        );
        ctx.fillStyle = index === 0 ? '#FF0000' : '#0000FF';
        ctx.fill();
      }
    });
  };

  // Обнаружение позы
  const detectPose = async (detector) => {
    if (!detector || !videoRef.current || !canvasRef.current) return;

    try {
      // Установка размеров canvas как у видео
      canvasRef.current.width = videoRef.current.clientWidth;
      canvasRef.current.height = videoRef.current.clientHeight;

      // Обнаружение позы
      const poses = await detector.estimatePoses(videoRef.current);
      
      if (poses.length > 0) {
        drawResults(poses[0]);
      }
      
      requestAnimationFrame(() => detectPose(detector));
    } catch (err) {
      console.error('Ошибка обнаружения позы:', err);
    }
  };

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div style={{ 
      position: 'relative', 
      maxWidth: '800px',
      margin: '0 auto',
      backgroundColor: '#000'
    }}>
      <video 
        ref={videoRef}
        style={{ 
          transform: 'scaleX(-1)',
          width: '100%',
          height: 'auto',
          display: 'block'
        }}
        muted
        playsInline
      />
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
        }}
      />
      {isModelLoading && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          color: '#fff'
        }}>
          Загрузка модели Thunder...
        </div>
      )}
    </div>
  );
};

export default PoseDetectionComponent;