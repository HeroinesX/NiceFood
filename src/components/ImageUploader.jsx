import React, { useState, useRef } from 'react';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

/**
 * 图片上传组件
 * 支持拖拽、粘贴、点击选择
 *
 * Props:
 *   type: 'avatar' | 'post'      上传类型
 *   onUpload: (url) => void      上传成功回调
 *   currentUrl: string           当前图片URL (用于预览)
 *   className: string            容器样式
 */
const ImageUploader = ({ type = 'post', onUpload, currentUrl, className }) => {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(currentUrl || '');
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef(null);

  const handleFile = async (file) => {
    if (!file) return;

    // 校验格式
    if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)) {
      alert('只支持 JPG、PNG、GIF、WebP 格式');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('图片不能超过 5MB');
      return;
    }

    // 本地预览
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target.result);
    reader.readAsDataURL(file);

    // 上传
    setUploading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) { alert('请先登录'); return; }

      const res = await fetch(`${API_BASE}/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ image: reader.result, type })
      });

      if (!res.ok) throw new Error('上传失败');
      const data = await res.json();
      onUpload?.(data.url);
    } catch (err) {
      alert(err.message);
      setPreview(currentUrl || '');
    } finally {
      setUploading(false);
    }
  };

  const handleChange = (e) => {
    if (e.target.files?.[0]) handleFile(e.target.files[0]);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
  };

  const handlePaste = (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        handleFile(item.getAsFile());
        break;
      }
    }
  };

  const isAvatar = type === 'avatar';

  return (
    <div
      className={className || ''}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      onPaste={handlePaste}
      tabIndex={0}
      onClick={() => fileRef.current?.click()}
      style={{
        cursor: 'pointer',
        textAlign: 'center',
        borderRadius: isAvatar ? '50%' : 'var(--radius-md)',
        overflow: 'hidden',
        border: dragOver ? '2px dashed var(--color-primary)' : (preview ? 'none' : '2px dashed var(--color-border)'),
        background: dragOver ? 'var(--color-primary-bg)' : 'var(--color-bg)',
        transition: 'all 0.2s',
        position: 'relative',
        width: isAvatar ? 80 : '100%',
        height: isAvatar ? 80 : 160,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: isAvatar ? '0 auto 8px' : 0,
      }}
    >
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        onChange={handleChange}
        style={{ display: 'none' }}
      />

      {uploading && (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'rgba(255,255,255,0.8)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 2, fontSize: 14, color: 'var(--color-primary)', fontWeight: 600
        }}>
          ⏳ 上传中...
        </div>
      )}

      {preview ? (
        <img
          src={preview}
          alt="预览"
          style={{
            width: '100%',
            height: '100%',
            objectFit: isAvatar ? 'cover' : 'contain',
            background: '#f5f5f5'
          }}
        />
      ) : (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 4,
          color: 'var(--color-text-light)',
          fontSize: 12
        }}>
          <span style={{ fontSize: isAvatar ? 28 : 32 }}>📷</span>
          <span>{isAvatar ? '点击选择头像' : '点击或拖拽上传图片'}</span>
          {!isAvatar && <span style={{ fontSize: 11 }}>支持 JPG / PNG / GIF，最大 5MB</span>}
        </div>
      )}

      {/* 删除按钮 */}
      {preview && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setPreview('');
            onUpload?.('');
          }}
          style={{
            position: 'absolute',
            top: 4, right: 4,
            width: 24, height: 24,
            borderRadius: '50%',
            background: 'rgba(0,0,0,0.5)',
            color: 'white',
            border: 'none',
            fontSize: 14,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 3
          }}
          title="删除图片"
        >✕</button>
      )}
    </div>
  );
};

export default ImageUploader;
