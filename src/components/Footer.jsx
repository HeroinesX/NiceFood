import React from 'react';

const Footer = () => {
  const year = new Date().getFullYear();

  return (
    <footer style={{
      textAlign: 'center',
      padding: '24px 16px 96px',
      fontSize: 13,
      color: '#B8A9A9',
      borderTop: '1px solid #F0E6E0',
      marginTop: 40,
      background: 'linear-gradient(0deg, #FFF8F5 0%, transparent 100%)'
    }}>
      {/* GitHub */}
      <a
        href="https://github.com/HeroinesX"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          color: '#FF6B35',
          textDecoration: 'none',
          fontWeight: 700,
          fontSize: 14,
          transition: 'opacity 0.2s',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6
        }}
        onMouseOver={e => e.currentTarget.style.opacity = '0.7'}
        onMouseOut={e => e.currentTarget.style.opacity = '1'}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
        </svg>
        HeroinesX
      </a>

      {/* 微信 */}
      <div style={{ marginTop: 8 }}>
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          color: '#07C160',
          fontWeight: 500,
          cursor: 'pointer',
          fontSize: 13
        }}
          onClick={() => {
            // 显示微信号提示
            alert('微信号: HeroinesX');
          }}
          onMouseOver={e => e.currentTarget.style.opacity = '0.7'}
          onMouseOut={e => e.currentTarget.style.opacity = '1'}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 01.213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 00.167-.054l1.903-1.114a.864.864 0 01.717-.098 10.16 10.16 0 002.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 01-1.162 1.178A1.17 1.17 0 014.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 01-1.162 1.178 1.17 1.17 0 01-1.162-1.178c0-.651.52-1.18 1.162-1.18zm5.34 2.867c-1.797-.052-3.746.512-5.28 1.786-1.72 1.428-2.687 3.72-1.78 6.22.942 2.453 3.666 4.229 6.884 4.229.826 0 1.622-.12 2.361-.336a.722.722 0 01.598.082l1.584.926a.272.272 0 00.14.045c.134 0 .24-.11.24-.245 0-.06-.024-.12-.04-.178l-.325-1.233a.49.49 0 01.177-.554C23.028 18.48 24 16.82 24 14.98c0-3.21-2.931-5.837-7.062-6.122zm-1.89 2.19c.535 0 .969.44.969.982a.976.976 0 01-.969.983.976.976 0 01-.969-.983c0-.542.434-.982.97-.982zm4.844 0c.535 0 .969.44.969.982a.976.976 0 01-.969.983.976.976 0 01-.969-.983c0-.542.434-.982.97-.982z"/>
          </svg>
          微信: HeroinesX
        </span>
      </div>

      <p style={{ margin: '12px 0 0', fontSize: 12, letterSpacing: 0.5 }}>
        Power By HeroinesX · © {year}
      </p>
    </footer>
  );
};

export default Footer;
