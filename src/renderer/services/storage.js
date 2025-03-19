// 本地存储工具函数
const LIBRARY_KEY = 'last-opened-library';

// 保存上次打开的库信息
export function saveLastOpenedLibrary(libraryPath) {
  try {
    localStorage.setItem(LIBRARY_KEY, libraryPath);
  } catch (error) {
    console.error('无法保存库路径:', error);
  }
}

// 获取上次打开的库信息
export function getLastOpenedLibrary() {
  try {
    return localStorage.getItem(LIBRARY_KEY);
  } catch (error) {
    console.error('无法获取库路径:', error);
    return null;
  }
}

// 清除库信息
export function clearLastOpenedLibrary() {
  try {
    localStorage.removeItem(LIBRARY_KEY);
  } catch (error) {
    console.error('无法清除库路径:', error);
  }
} 