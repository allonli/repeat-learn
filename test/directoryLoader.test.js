const fs = require('fs');
const path = require('path');
const DirectoryLoader = require('../src/renderer/services/DirectoryLoader');

// 测试目录路径
const TEST_DIR = process.argv[2] || '/Users/allonli/Downloads/vs';

/**
 * 运行目录加载器测试
 */
async function runDirectoryLoaderTest() {
  console.log('=== 目录加载器和文件名清理集成测试 ===');
  console.log(`目标目录: ${TEST_DIR}`);
  
  try {
    // 检查目录是否存在
    if (!fs.existsSync(TEST_DIR)) {
      console.error(`错误: 目录不存在 - ${TEST_DIR}`);
      process.exit(1);
    }
    
    // 首先，列出目录内容而不进行清理
    console.log('\n1. 列出目录内容（不清理）:');
    const initialResult = await DirectoryLoader.loadDirectory(TEST_DIR, false);
    
    console.log(`发现 ${initialResult.files.length} 个文件/文件夹`);
    
    // 显示前10个文件名
    const fileSamples = initialResult.files.slice(0, 10);
    console.log('\n文件名示例:');
    fileSamples.forEach((file, index) => {
      console.log(`${index + 1}. ${file.name} ${file.isDirectory ? '[目录]' : '[文件]'}`);
    });
    
    // 询问是否继续
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    readline.question('\n是否执行自动文件名清理？(y/n) ', async (answer) => {
      if (answer.toLowerCase() === 'y') {
        console.log('\n2. 执行目录加载和自动文件名清理:');
        console.log('正在处理...');
        
        const startTime = Date.now();
        const result = await DirectoryLoader.loadDirectory(TEST_DIR, true);
        const endTime = Date.now();
        
        console.log(`完成! 耗时: ${(endTime - startTime) / 1000} 秒`);
        console.log(`- 获取文件: ${result.files.length} 个`);
        console.log(`- 已清理: ${result.cleaned.length} 个文件名`);
        console.log(`- 错误: ${result.errors.length} 个`);
        
        if (result.cleaned.length > 0) {
          console.log('\n已重命名的文件:');
          result.cleaned.forEach((item, index) => {
            console.log(`${index + 1}. "${item.original}" -> "${item.cleaned}"`);
          });
        }
        
        if (result.errors.length > 0) {
          console.log('\n处理过程中出现以下错误:');
          result.errors.forEach((error, index) => {
            console.log(`${index + 1}. ${error}`);
          });
        }
        
        // 显示新的文件列表
        console.log('\n处理后的目录内容:');
        const updatedSamples = result.files.slice(0, 10);
        updatedSamples.forEach((file, index) => {
          console.log(`${index + 1}. ${file.name} ${file.isDirectory ? '[目录]' : '[文件]'}`);
        });
      } else {
        console.log('已取消文件名清理操作');
      }
      
      readline.close();
      console.log('\n测试完成!');
    });
    
  } catch (error) {
    console.error(`测试过程中出现错误: ${error.message}`);
    console.error(error.stack);
  }
}

// 运行测试
runDirectoryLoaderTest(); 