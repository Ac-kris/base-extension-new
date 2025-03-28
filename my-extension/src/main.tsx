import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import './custom-styles.css';
import { initDevEnvironment } from './dev-utils';

// 初始化开发环境
initDevEnvironment();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
); 