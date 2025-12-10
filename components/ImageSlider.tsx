import React, { useState, useRef, useEffect } from 'react';

interface ImageSliderProps {
  beforeImage: string;
  afterImage: string;
}

const ImageSlider: React.FC<ImageSliderProps> = ({ beforeImage, afterImage }) => {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = () => setIsDragging(true);
  const handleMouseUp = () => setIsDragging(false);

  const handleMouseMove = (e: React.MouseEvent | MouseEvent) => {
    if (!isDragging || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e as any).clientX - rect.left) / rect.width;
    setSliderPosition(Math.max(0, Math.min(100, x * 100)));
  };

  const handleTouchMove = (e: React.TouchEvent | TouchEvent) => {
    if (!isDragging || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e as any).touches[0].clientX - rect.left) / rect.width;
    setSliderPosition(Math.max(0, Math.min(100, x * 100)));
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('mousemove', handleMouseMove);
      // @ts-ignore
      window.addEventListener('touchend', handleMouseUp);
      // @ts-ignore
      window.addEventListener('touchmove', handleTouchMove);
    } else {
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('mousemove', handleMouseMove);
      // @ts-ignore
      window.removeEventListener('touchend', handleMouseUp);
      // @ts-ignore
      window.removeEventListener('touchmove', handleTouchMove);
    }
    return () => {
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('mousemove', handleMouseMove);
      // @ts-ignore
      window.removeEventListener('touchend', handleMouseUp);
      // @ts-ignore
      window.removeEventListener('touchmove', handleTouchMove);
    };
  }, [isDragging]);

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-64 md:h-80 lg:h-96 overflow-hidden rounded-lg cursor-ew-resize select-none border border-slate-200"
      onMouseDown={handleMouseDown}
      onTouchStart={handleMouseDown}
    >
      {/* After Image (Background) - Cleaned */}
      <img 
        src={afterImage} 
        alt="Temiz (Boş)" 
        className="absolute top-0 left-0 w-full h-full object-cover" 
      />

      {/* Before Image (Clipped) - Original */}
      <div 
        className="absolute top-0 left-0 h-full overflow-hidden border-r-2 border-white/50"
        style={{ width: `${sliderPosition}%` }}
      >
        <img 
          src={beforeImage} 
          alt="Orijinal (Eşyalı)" 
          className="absolute top-0 left-0 max-w-none h-full object-cover"
          style={{ width: containerRef.current ? containerRef.current.offsetWidth : '100%' }} 
        />
      </div>

      {/* Slider Handle */}
      <div 
        className="absolute top-0 bottom-0 w-1 bg-white cursor-ew-resize shadow-[0_0_10px_rgba(0,0,0,0.5)]"
        style={{ left: `${sliderPosition}%` }}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg text-slate-600">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 15L12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9" />
          </svg>
        </div>
      </div>
      
      <div className="absolute top-4 left-4 bg-black/50 text-white px-2 py-1 rounded text-xs font-semibold">Orijinal (Eşyalı)</div>
      <div className="absolute top-4 right-4 bg-blue-600/80 text-white px-2 py-1 rounded text-xs font-semibold">EşyaSil Temiz</div>
    </div>
  );
};

export default ImageSlider;