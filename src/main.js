/*
 * @Author: chuzhengyang.ex
 * @Date: 2025-05-13 10:34:19
 * @LastEditors: chuzhengyang.ex
 * @LastEditTime: 2025-05-13 11:19:18
 * @Description: 
 * @FilePath: \czy-pages\src\main.js
 */
import './assets/main.css'

import { createApp } from 'vue'
import App from './App.vue'
import router from './router/index.ts'

createApp(App).use(router).mount('#app')
