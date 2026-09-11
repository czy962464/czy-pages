// kkso 接口统一管理
const BASE_URL = "https://kkso.net/api/other";

// 接口地址
export const API = {
  webSearch: `${BASE_URL}/web_search`,
  saveUrl: `${BASE_URL}/save_url`,
  saveUrlStatus: `${BASE_URL}/save_url_status`,
};

// 搜索空闲超时（多久没有新数据即中断），毫秒
export const SEARCH_IDLE_TIMEOUT = 10000;
// 转存状态轮询间隔，毫秒
export const POLL_INTERVAL = 1200;

// 关键词搜索（SSE 流式），返回原始 Response 供调用方读取流
export const searchWeb = ({ title, isType, signal }) => {
  const url = `${API.webSearch}?title=${encodeURIComponent(title)}&is_type=${isType}`;
  return fetch(url, { signal });
};

// 提交转存任务
export const saveUrl = async ({ url, title }) => {
  const res = await fetch(API.saveUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url: encodeURIComponent(url),
      title,
    }),
  });
  return res.json();
};

// 查询转存任务状态
export const getSaveUrlStatus = (taskId) => {
  const url = `${API.saveUrlStatus}?task_id=${taskId}&_=${Date.now()}`;
  return fetch(url).then((res) => res.json());
};
