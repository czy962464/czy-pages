import { createRouter, createWebHashHistory, RouteRecordRaw } from "vue-router";
import Home from "@/views/home.vue";

const routes: Array<RouteRecordRaw> = [
  {
    path: "/",
    name: "Home",
    component: Home,
  },
  {
    path: "/kksoSearch",
    name: "KksoSearch",
    component: () => import("@/views/kksoSearch.vue"), // 懒加载组件
  },
  {
    path: "/zresoSearch",
    name: "ZresoSearch",
    component: () => import("@/views/zresoSearch.vue"), // 懒加载组件
  },
  {
    path: "/daohang",
    name: "Daohang",
    component: () => import("@/views/daohang.vue"), // 懒加载组件
  },
];

const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

export default router;
