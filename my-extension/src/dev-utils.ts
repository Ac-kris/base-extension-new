import { bitable } from '@lark-base-open/js-sdk';

/**
 * 初始化开发环境
 * 根据飞书多维表格扩展开发指南，配置本地开发环境
 * https://open.feishu.cn/document/uAjLw4CM/uYjL24iN/base-extensions/base-automation-extensions/base-record-view-extension-development-guide
 */
export function initDevEnvironment() {
  // 检查是否在开发环境中
  const isDev = import.meta.env.DEV || window.location.hostname === 'localhost';
  
  if (isDev) {
    console.log('正在开发环境中运行，初始化模拟环境...');
    
    // 获取 blockTypeID，用于在开发环境中模拟飞书多维表格
    const blockTypeID = getBlockTypeID();
    if (blockTypeID) {
      console.log('加载扩展ID:', blockTypeID);
      
      // 在URL中添加debug参数，使应用能够在本地调试模式中运行
      const currentUrl = new URL(window.location.href);
      if (!currentUrl.searchParams.has('debug')) {
        currentUrl.searchParams.set('debug', 'true');
        currentUrl.searchParams.set('blockTypeID', blockTypeID);
        console.log('重定向到调试URL:', currentUrl.toString());
        window.location.href = currentUrl.toString();
        return;
      }
      
      // 在控制台中提供指导
      console.log('==== 本地开发指南 ====');
      console.log('1. 请打开飞书多维表格: https://base.feishu.cn/');
      console.log('2. 在多维表格中，点击添加扩展');
      console.log('3. 在扩展菜单中，选择"开发者模式"，并输入此URL:');
      console.log('   ' + window.location.href);
      console.log('========================');
    } else {
      console.error('未找到 blockTypeID，无法进入开发模式。请确保 block.json 文件存在且包含有效的 blockTypeID。');
    }
  }
}

/**
 * 从 block.json 文件中获取 blockTypeID
 */
function getBlockTypeID(): string | null {
  try {
    // 在实际环境中，我们会从 block.json 加载这个值，但在此处我们直接从已知文件读取
    return "blk_67e50ff2854ac00326351a15"; // 从 block.json 获取
  } catch (error) {
    console.error('获取 blockTypeID 失败:', error);
    return null;
  }
}

// 修改检查连接的方法，提供更详细的错误信息
export async function checkBitableConnection(): Promise<boolean> {
  try {
    // 检查 bitable 对象是否存在
    if (typeof bitable === 'undefined') {
      console.error('bitable 对象未定义，可能是未在飞书多维表格环境中运行');
      return false;
    }
    
    // 检查 bitable.base 是否存在
    if (!bitable.base) {
      console.error('bitable.base 未定义，可能是 SDK 版本不兼容');
      return false;
    }
    
    // 尝试调用一个简单的 API 检查连接
    console.log('尝试调用 bitable API 检查连接...');
    const selection = await bitable.base.getSelection();
    console.log('API 调用成功，返回结果:', selection);
    return true;
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error('检查飞书多维表格连接失败:', error.message);
    } else {
      console.error('检查飞书多维表格连接失败:', error);
    }
    return false;
  }
} 