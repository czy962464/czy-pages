<template>
  <div class="layout-wrap">
    <!-- 移动端顶部栏 -->
    <div class="mobile-header">
      <van-button icon="more-o" size="small" @click="showSidePopup = true" />
      <div class="mobile-logo">🧭 资源导航</div>
    </div>

    <!-- PC侧边栏 -->
    <aside class="sidebar">
      <div class="logo">🧭 资源导航</div>
      <van-sidebar v-model="activeIndex" class="custom-sidebar">
        <van-sidebar-item v-for="cat in categoryList" :key="cat" :title="cat" />
      </van-sidebar>
    </aside>

    <!-- 移动端侧边弹窗 -->
    <van-popup
      v-model:show="showSidePopup"
      position="left"
      style="width: 220px; height: 100%">
      <div class="popup-sidebar">
        <div class="logo">🧭 资源导航</div>
        <van-sidebar
          v-model="activeIndex"
          @change="showSidePopup = false"
          class="custom-sidebar">
          <van-sidebar-item
            v-for="cat in categoryList"
            :key="cat"
            :title="cat" />
        </van-sidebar>
      </div>
    </van-popup>

    <!-- 主内容区 -->
    <main class="main-wrap">
      <!-- 搜索 -->
      <div class="search-bar">
        <van-field
          v-model="searchKey"
          placeholder="搜索工具、网站名称..."
          clearable
          left-icon="search"
          class="search-field" />
      </div>

      <!-- 卡片列表 -->
      <div class="card-container">
        <a
          v-for="item in filterSiteList"
          :key="item.name"
          class="site-card"
          :href="item.url"
          target="_blank"
          rel="noopener noreferrer">
          <div class="card-title">
            <span class="icon">{{ item.icon }}</span>
            <span>{{ item.name }}</span>
          </div>
          <div class="card-desc">{{ item.desc }}</div>
          <div class="card-tags">
            <van-tag round size="medium" type="primary">{{
              item.category
            }}</van-tag>
          </div>
        </a>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, watch } from "vue";
import { siteData } from "@/data/siteData";

const searchKey = ref("");
const activeIndex = ref(0); // van-sidebar 绑定的是索引，0 = 全部
const showSidePopup = ref(false);

const categoryList = computed(() => {
  const cats = new Set(siteData.map((i) => i.category));
  return ["全部", ...cats];
});

// 当前选中的分类，由索引派生
const activeCat = computed(() => categoryList.value[activeIndex.value]);

// 数据源更新后，若选中索引已越界，回落到“全部”
watch(categoryList, (list) => {
  if (activeIndex.value >= list.length) activeIndex.value = 0;
});

const filterSiteList = computed(() => {
  let list = siteData;
  if (activeCat.value !== "全部") {
    list = list.filter((item) => item.category === activeCat.value);
  }
  if (searchKey.value.trim()) {
    const key = searchKey.value.trim().toLowerCase();
    list = list.filter(
      (item) =>
        item.name.toLowerCase().includes(key) ||
        item.desc.toLowerCase().includes(key),
    );
  }
  return list;
});
</script>

<style scoped>
.layout-wrap {
  display: flex;
  min-height: 100vh;
  background-color: #f5f7fa;
}

/* 移动端顶部栏 默认隐藏 */
.mobile-header {
  display: none;
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 50px;
  background: #fff;
  z-index: 10;
  padding: 0 16px;
  align-items: center;
  gap: 12px;
  border-bottom: 1px solid #eee;
  box-sizing: border-box;
}
.mobile-logo {
  font-size: 18px;
  font-weight: bold;
}

/* 侧边栏 PC端 - 卡片容器 */
.sidebar {
  width: 220px;
  background: #ffffff;
  padding: 24px 16px;
  flex-shrink: 0;
  box-sizing: border-box;
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  margin: 16px;
  height: calc(100vh - 32px);
  overflow-y: auto;
}
.logo {
  font-size: 22px;
  font-weight: bold;
  margin-bottom: 32px;
  padding-left: 4px;
}
.popup-sidebar {
  padding: 24px 16px;
  height: 100%;
  box-sizing: border-box;
  background: #fff;
}

/* 覆盖van-sidebar默认样式 */
:deep(.custom-sidebar) {
  width: 100%;
  border: none !important;
}
:deep(.custom-sidebar .van-sidebar-item) {
  width: 100% !important;
  padding: 12px 12px !important;
  font-size: 16px;
  border-radius: 8px;
  margin-bottom: 6px;
  transition: all 0.2s ease;
  box-sizing: border-box;
  background-color: transparent;
}
/* 鼠标移入单项效果 */
:deep(.custom-sidebar .van-sidebar-item:hover) {
  background-color: #f0f2f7;
}
/* 选中项样式 */
:deep(.custom-sidebar .van-sidebar-item--select) {
  background-color: #e9edf5;
  color: #000;
}

/* 主区域 */
.main-wrap {
  flex: 1;
  padding: 24px 32px;
  overflow: auto;
}
.search-bar {
  margin-bottom: 24px;
  max-width: 600px;
}
.search-field {
  background: #fff;
  border-radius: 8px;
}

.card-container {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 16px;
}
.site-card {
  display: flex;
  flex-direction: column;
  background: #fff;
  border-radius: 10px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid #e8e8e8;
  color: inherit;
  text-decoration: none;
}
.site-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}
.card-title {
  display: flex;
  align-items: center;
  font-weight: 600;
  font-size: 16px;
  gap: 8px;
  margin-bottom: 8px;
}
.card-desc {
  font-size: 13px;
  color: #666;
  margin-bottom: 10px;
  line-height: 1.4;
}
/* 标签固定在卡片底部，使同一行卡片的标签水平对齐 */
.card-tags {
  margin-top: auto;
  padding-top: 4px;
}

/* 媒体查询 移动端 <768px */
@media (max-width: 768px) {
  .mobile-header {
    display: flex;
  }
  .layout-wrap {
    flex-direction: column;
    padding-top: 50px;
  }
  .sidebar {
    display: none;
  }
  .main-wrap {
    padding: 16px;
  }
  .card-container {
    grid-template-columns: 1fr;
  }
}
</style>
