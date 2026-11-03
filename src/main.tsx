import React from 'react';
import ReactDOM from 'react-dom/client';
import { DirectionProvider } from '@/components/foundations/direction/direction';
import { App } from '@/App';
import '@/styles/globals.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><DirectionProvider locale="zh-CN"><App /></DirectionProvider></React.StrictMode>,
);
