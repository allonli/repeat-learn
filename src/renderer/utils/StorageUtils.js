/**
 * 本地存储工具类
 * 提供对localStorage的包装，用于保存和获取数据
 */
class StorageUtils {
  /**
   * 保存数据到localStorage
   * @param {string} key - 存储键名
   * @param {any} value - 要保存的值（会被JSON.stringify处理）
   * @returns {boolean} - 操作是否成功
   */
  static save(key, value) {
    try {
      localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
      return true;
    } catch (error) {
      console.error(`无法保存数据 [${key}]:`, error);
      return false;
    }
  }

  /**
   * 从localStorage获取数据
   * @param {string} key - 存储键名
   * @param {boolean} parse - 是否解析JSON（默认为true）
   * @returns {any} - 获取的值，如果出错则返回null
   */
  static get(key, parse = true) {
    try {
      const value = localStorage.getItem(key);
      if (value === null) return null;
      
      return parse ? JSON.parse(value) : value;
    } catch (error) {
      console.error(`无法获取数据 [${key}]:`, error);
      return null;
    }
  }

  /**
   * 从localStorage移除数据
   * @param {string} key - 存储键名
   * @returns {boolean} - 操作是否成功
   */
  static remove(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error(`无法删除数据 [${key}]:`, error);
      return false;
    }
  }

  /**
   * 清除localStorage中的所有数据
   * @returns {boolean} - 操作是否成功
   */
  static clear() {
    try {
      localStorage.clear();
      return true;
    } catch (error) {
      console.error('无法清除localStorage:', error);
      return false;
    }
  }
}

module.exports = StorageUtils; 