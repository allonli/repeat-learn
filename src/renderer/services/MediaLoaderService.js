const fs = require('fs');
const path = require('path');
const DirectoryLoader = require('./DirectoryLoader');

/**
 * 媒体文件类型
 */
const MEDIA_EXTENSIONS = new Set([
  '.mp4', '.avi', '.mov', '.mkv', '.wmv', '.flv',  // 视频
  '.mp3', '.wav', '.flac', '.aac', '.ogg',         // 音频
  '.srt', '.vtt', '.ass'                          // 字幕
]);

/**
 * 媒体加载服务
 * 负责加载媒体文件和目录，并在加载时自动清理文件名
 */
class MediaLoaderService {
  constructor() {
    this.isLoading = false;
    this.mediaFiles = [];
    this.lastDirectory = '';
    this.recentlyRenamed = [];
    this.errors = [];
  }

  /**
   * 获取当前加载状态
   * @returns {boolean} 是否正在加载
   */
  isLoadingMedia() {
    return this.isLoading;
  }

  /**
   * 加载目录中的媒体文件
   * @param {string} directoryPath 目录路径
   * @param {boolean} autoclean 是否自动清理文件名
   * @returns {Promise<Array>} 媒体文件列表
   */
  async loadMediaDirectory(directoryPath, autoclean = true) {
    this.isLoading = true;
    this.errors = [];
    this.recentlyRenamed = [];

    try {
      console.log(`开始加载目录: ${directoryPath}`);
      
      // 使用DirectoryLoader加载目录并清理文件名
      const result = await DirectoryLoader.loadDirectory(directoryPath, autoclean);
      
      // 记录重命名的文件
      this.recentlyRenamed = result.cleaned;
      
      // 记录错误
      this.errors = result.errors;
      
      // 过滤媒体文件
      this.mediaFiles = result.files.filter(file => {
        if (file.isDirectory) return false;
        const ext = path.extname(file.name).toLowerCase();
        return MEDIA_EXTENSIONS.has(ext);
      });
      
      // 按照文件名排序
      this.mediaFiles.sort((a, b) => a.name.localeCompare(b.name));
      
      this.lastDirectory = directoryPath;
      
      console.log(`已加载 ${this.mediaFiles.length} 个媒体文件, 重命名了 ${this.recentlyRenamed.length} 个文件`);
      
      return this.mediaFiles;
    } catch (error) {
      console.error(`加载媒体目录失败: ${error.message}`);
      this.errors.push(`加载失败: ${error.message}`);
      return [];
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * 获取最近重命名的文件列表
   * @returns {Array} 重命名的文件列表
   */
  getRecentlyRenamed() {
    return this.recentlyRenamed;
  }

  /**
   * 获取错误列表
   * @returns {Array} 错误列表
   */
  getErrors() {
    return this.errors;
  }

  /**
   * 获取当前加载的媒体文件
   * @returns {Array} 媒体文件列表
   */
  getMediaFiles() {
    return this.mediaFiles;
  }

  /**
   * 获取最后加载的目录
   * @returns {string} 目录路径
   */
  getLastDirectory() {
    return this.lastDirectory;
  }

  /**
   * 根据文件路径获取媒体文件对象
   * @param {string} filePath 文件路径
   * @returns {Object|null} 媒体文件对象或null
   */
  getMediaFileByPath(filePath) {
    return this.mediaFiles.find(file => file.path === filePath) || null;
  }
}

// 导出单例实例
module.exports = new MediaLoaderService(); 