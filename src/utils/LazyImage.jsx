import React, { useState, useRef, useEffect } from 'react';

/**
 * 智能懒加载图片组件
 * - 交叉观察器 (IntersectionObserver) 延迟加载
 * - 加载完成后淡入
 * - 加载失败显示友好占位
 */
const LazyImage = ({ src, alt, className, style, fallback = '🍳' }) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [imageSrc, setImageSrc] = useState('');
  const imgRef = useRef(null);
  const observerRef = useRef(null);

  useEffect(() => {
    if (!src) { setError(true); return; }

    // 如果已经支持 loading="lazy"，直接用浏览器原生
    if ('loading' in HTMLImageElement.prototype) {
      setImageSrc(src);
      return;
    }

    // 降级: IntersectionObserver
    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setImageSrc(src);
          observerRef.current?.disconnect();
        }
      },
      { rootMargin: '200px' }
    );

    if (imgRef.current) {
      observerRef.current.observe(imgRef.current);
    }

    return () => observerRef.current?.disconnect();
  }, [src]);

  const handleLoad = () => setLoaded(true);

  const handleError = () => {
    setError(true);
    setLoaded(true);
  };

  return (
    <div ref={imgRef} className={`${className || ''}`} style={{
      position: 'relative',
      overflow: 'hidden',
      background: 'var(--color-primary-bg)',
      ...style
    }}>
      {(imageSrc && !error) ? (
        <img
          src={imageSrc}
          alt={alt}
          onLoad={handleLoad}
          onError={handleError}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            opacity: loaded ? 1 : 0,
            transition: 'opacity 0.3s ease-in'
          }}
        />
      ) : (
        <div style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 'min(48px, 8vw)',
          color: 'var(--color-text-light)'
        }}>
          {fallback}
        </div>
      )}
    </div>
  );
};

export default LazyImage;
