<template>
  <div style="padding: 16px; max-width: 700px; margin: 0 auto">
    <h2 style="margin-bottom: 20px; text-align: center">飞机盘直链解析</h2>

    <!-- 输入飞机盘分享链接 -->
    <van-field
      v-model="shareUrl"
      placeholder="粘贴飞机盘分享链接，如 https://share.feijipan.com/s/xxxx"
      style="margin-bottom: 12px" />

    <van-button
      type="primary"
      block
      :loading="parseLoading"
      @click="handleParse">
      解析直链
    </van-button>

    <van-notice-bar :text="statusText" type="info" style="margin: 12px 0" />

    <!-- 结果弹窗 -->
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
      <h3 style="font-size: 18px; margin-bottom: 12px">{{ fileName }}</h3>
      <van-field
        readonly
        v-model="downUrl"
        label="下载直链"
        style="word-break: break-all; margin-bottom: 12px" />
      <van-field
        readonly
        v-model="fileSize"
        label="文件大小"
        style="margin-bottom: 14px" />
      <div style="display: flex; gap: 10px">
        <van-button type="primary" block @click="copyLink">复制链接</van-button>
        <van-button block @click="modalShow = false">关闭</van-button>
      </div>
    </van-popup>

    <!-- Loading遮罩 -->
    <van-overlay
      :show="parseLoading"
      style="
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        color: #fff;
      ">
      <van-loading size="44px" color="#fff" />
      <p style="margin-top: 16px">正在解析链接...</p>
      <van-button
        type="default"
        @click="cancelParse"
        style="margin-top: 20px; width: 140px"
        >取消</van-button
      >
    </van-overlay>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { showToast } from "vant";

const shareUrl = ref("");
const parseLoading = ref(false);
const statusText = ref("请输入飞机盘分享链接");
let abortCtrl = null;

//弹窗数据
const modalShow = ref(false);
const fileName = ref("");
const downUrl = ref("");
const fileSize = ref("");

const handleParse = async () => {
  const link = shareUrl.value.trim();
  if (!link) {
    showToast("请输入分享链接");
    return;
  }
  if (!link.startsWith("https://share.feijipan.com")) {
    showToast("链接不是飞机盘分享地址");
    return;
  }

  parseLoading.value = true;
  statusText.value = "请求解析API...";
  abortCtrl = new AbortController();
  try {
    const api = `https://api.528sq.cn/api/feijipan.php?url=${encodeURIComponent(link)}`;
    const res = await fetch(api, { signal: abortCtrl.signal });
    const json = await res.json();

    if (json.code === 200) {
      fileName.value = json.data.file_name;
      downUrl.value = json.data.down_url;
      fileSize.value = json.data.file_size;
      modalShow.value = true;
      statusText.value = "✅解析成功";
    } else {
      statusText.value = `❌${json.msg}`;
      showToast(`解析失败：${json.msg}`);
    }
  } catch (err) {
    if (err.name !== "AbortError") {
      statusText.value = "❌网络请求异常";
      showToast("请求失败，请稍后重试");
    }
  } finally {
    parseLoading.value = false;
    abortCtrl = null;
  }
};

const cancelParse = () => {
  if (abortCtrl) abortCtrl.abort();
  parseLoading.value = false;
};

const copyLink = async () => {
  try {
    await navigator.clipboard.writeText(downUrl.value);
    showToast("复制成功");
  } catch (e) {
    showToast("复制失败，请手动复制");
  }
};
</script>
