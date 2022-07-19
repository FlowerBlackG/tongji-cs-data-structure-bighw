/*
 * React 网页根引导工具。
 */

import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import AppMain from './pages/app-main/AppMain'

import 'antd/dist/antd.variable.min.css' // 开启 ant design.
import { ConfigProvider } from 'antd'

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

// 配置主题。
ConfigProvider.config({
  theme: {
    primaryColor: '#1781b5'
  }
})

root.render(
  <AppMain /> // app主页对象。
)
