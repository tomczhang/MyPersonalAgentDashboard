import React from 'react';
import ReactDOM from 'react-dom/client';
import { DirectionProvider } from '@/components/foundations/direction/direction';
import { App } from '@/App';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '@fontsource/noto-sans-sc/400.css';
import '@fontsource/noto-sans-sc/500.css';
import '@fontsource/noto-sans-sc/600.css';
import '@fontsource/noto-sans-sc/700.css';
import '@/styles/globals.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><DirectionProvider locale="zh-CN"><App /></DirectionProvider></React.StrictMode>,
);
