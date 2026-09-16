<template>
  <div style="padding: 16px">
    <h2 style="margin-bottom: 20px">KKSO 资源搜索</h2>

    <!-- 关键词输入框 -->
    <van-field
      v-model="keyword"
      placeholder="输入关键词"
      style="margin-bottom: 12px"
      @keyup.enter="handleSearch" />

    <!-- Tab切换搜索源，默认选中夸克 -->
    <van-tabs v-model:active="activeTab" style="margin-bottom: 16px">
      <van-tab title="夸克" name="0"></van-tab>
      <van-tab title="百度" name="2"></van-tab>
    </van-tabs>

    <!-- 搜索按钮 -->
    <van-button
      type="primary"
      block
      :loading="searchLoading"
      @click="handleSearch">
      搜索
    </van-button>

    <!-- 状态提示 -->
    <van-notice-bar :text="statusText" type="info" style="margin: 12px 0" />

    <!-- 搜索结果列表 -->
    <van-list>
      <van-cell
        v-for="(item, idx) in resultList"
        :key="idx"
        :title="item.title"
        clickable
        @click="handleItemClick(item)" />
    </van-list>

    <!-- 全局loading遮罩，新增取消按钮 -->
    <van-overlay
      :show="maskLoading"
      style="
        display: flex;
        align-items: center;
        justify-content: center;
        flex-direction: column;
        color: #fff;
        padding: 20px;
        box-sizing: border-box;
      ">
      <van-loading size="44px" color="#fff" />
      <p style="margin-top: 16px; margin-bottom: 20px; text-align: center">
        {{ loadingText }}
      </p>
      <van-button type="default" @click="cancelPoll" style="width: 140px"
        >取消任务</van-button
      >
    </van-overlay>

    <!-- 转存结果弹窗：修复，使用v-model，readonly只读 -->
    <van-popup
      v-model:show="modalShow"
      position="center"
      style="
        width: 90%;
        max-width: 520px;
        padding: 20px;
        border-radius: 12px;
        box-sizing: border-box;
      ">
      <h3 style="font-size: 18px; font-weight: bold; margin-bottom: 12px">
        {{ modalTitle }}
      </h3>
      <!-- ✅修复：readonly搭配v-model，popup条件渲染可以正常回显链接 -->
      <van-field
        readonly
        v-model="modalLink"
        style="word-break: break-all; margin-bottom: 14px" />
      <div style="display: flex; gap: 10px">
        <van-button type="primary" block @click="copyLink">复制链接</van-button>
        <van-button block @click="modalShow = false">关闭</van-button>
      </div>
    </van-popup>
  </div>
</template>

<script setup>
import { ref, onUnmounted } from "vue";
import { showToast } from "vant";
import {
  searchWeb,
  saveUrl,
  getSaveUrlStatus,
  SEARCH_IDLE_TIMEOUT,
  POLL_INTERVAL,
} from "@/api/kkso";

// 表单与状态
const keyword = ref("");
const activeTab = ref("0");
const searchLoading = ref(false);
const statusText = ref("等待搜索");
const resultList = ref([]);

// 转存loading
const maskLoading = ref(false);
const loadingText = ref("任务处理中...");
let pollTimer = null; // 保存轮询定时器，用于取消
let pollReject = null; // 保存轮询 Promise 的 reject，取消时释放挂起的等待

// 搜索请求控制
let searchController = null; // 当前搜索流，用于取消上一次请求
let searchSeq = 0; // 请求序号，防止旧请求的结果污染新搜索

// 弹窗
const modalShow = ref(false);
const modalTitle = ref("");
const modalLink = ref("");

// 搜索主逻辑 SSE fetch
const handleSearch = async () => {
  const kw = keyword.value.trim();
  if (!kw) return;

  // 取消上一次未完成的搜索流，避免旧请求的结果混入本次搜索
  if (searchController) searchController.abort();
  const controller = new AbortController();
  searchController = controller;
  const seq = ++searchSeq;

  resultList.value = [];
  searchLoading.value = true;
  statusText.value = "请求中...";

  // 空闲超时：任意阶段超过设定时长没有新数据就中断（覆盖整个流式读取过程）
  let timeoutId = null;
  const resetTimeout = () => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => controller.abort(), SEARCH_IDLE_TIMEOUT);
  };
  resetTimeout();

  try {
    const resp = await searchWeb({
      title: kw,
      isType: activeTab.value,
      signal: controller.signal,
    });
    resetTimeout();

    if (!resp.ok) throw new Error(`服务返回异常：${resp.status}`);

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      // 已被新的搜索替代，停止写入结果
      if (seq !== searchSeq) return;

      resetTimeout();
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop();

      for (const line of lines) {
        const trimLine = line.trim();
        if (!trimLine.startsWith("data: ")) continue;
        const dataStr = trimLine.replace("data: ", "");

        if (dataStr === "[DONE]") {
          statusText.value = "✅ 搜索完成，点击条目提交保存";
          continue;
        }
        try {
          const item = JSON.parse(dataStr);
          resultList.value.push(item);
        } catch (e) {
          // 忽略解析错误
        }
      }
    }
  } catch (err) {
    // 被新搜索取代，不更新状态（新搜索已接管 loading 与提示）
    if (seq !== searchSeq) return;
    if (err.name === "AbortError") {
      statusText.value = "⏱ 请求超时！网络或接口慢，可重试";
    } else {
      statusText.value = "❌ Failed to fetch，跨域拦截/接口离线";
    }
    console.error("搜索错误：", err);
  } finally {
    clearTimeout(timeoutId);
    if (seq === searchSeq) {
      searchLoading.value = false;
      searchController = null;
    }
  }
};

// 点击条目，提交保存url
const handleItemClick = async (item) => {
  // 先释放旧轮询，避免挂起的 Promise 泄漏
  releasePoll();

  maskLoading.value = true;
  loadingText.value = "正在提交任务...";
  try {
    const json = await saveUrl({ url: item.url, title: item.title });
    const taskId = json.data.task_id;
    loadingText.value = "✅ 任务已创建，正在轮询转存状态";
    // 轮询任务状态
    const taskResult = await pollTaskStatus(taskId);
    maskLoading.value = false;
    modalTitle.value = taskResult.title;
    modalLink.value = taskResult.url;
    modalShow.value = true;
  } catch (err) {
    // 旧任务已被释放（用户取消或重新提交），不覆盖当前状态
    if (err && err.cancelled) return;
    maskLoading.value = false;
    statusText.value = "❌ 请求失败，跨域或接口异常";
    console.error(err);
  }
};

// 清理轮询定时器与挂起句柄
const stopPoll = () => {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
  pollReject = null;
};

// 释放当前轮询任务，并以 cancelled 标记结束挂起的 Promise
const releasePoll = () => {
  const reject = pollReject;
  stopPoll();
  if (reject) {
    const err = new Error("任务已取消");
    err.cancelled = true;
    reject(err);
  }
};

// 轮询任务状态，失败自动终止
const pollTaskStatus = (taskId) => {
  return new Promise((resolve, reject) => {
    pollReject = reject;
    pollTimer = setInterval(async () => {
      try {
        const statusRes = await getSaveUrlStatus(taskId);
        // 轮询已被取消/释放，丢弃过期响应，避免误改界面状态
        if (!pollTimer) return;
        if (statusRes.code === 200) {
          const data = statusRes.data;
          loadingText.value = data.message;
          // 任务成功
          if (data.status === "success") {
            stopPoll();
            resolve(data);
          }
          // 任务转存失败，停止轮询并提示
          if (data.status === "fail") {
            stopPoll();
            maskLoading.value = false;
            showToast("转存失败，请稍后重试或更换资源");
            reject(new Error("转存失败"));
          }
        } else {
          // 接口code非200，视为失败
          stopPoll();
          maskLoading.value = false;
          showToast("转存失败，请稍后重试或更换资源");
          reject(new Error("接口返回异常"));
        }
      } catch (err) {
        if (!pollTimer) return;
        stopPoll();
        maskLoading.value = false;
        showToast("请求异常，转存失败");
        reject(err);
      }
    }, POLL_INTERVAL);
  });
};

// 取消轮询任务
const cancelPoll = () => {
  releasePoll();
  maskLoading.value = false;
  showToast("已取消当前转存任务");
};

// 离开页面时清理搜索流与轮询任务，避免残留请求
onUnmounted(() => {
  if (searchController) searchController.abort();
  releasePoll();
});

// 复制链接
const copyLink = async () => {
  try {
    await navigator.clipboard.writeText(modalLink.value);
    showToast("复制成功");
  } catch (e) {
    showToast("复制失败，请手动复制");
  }
};
</script>
