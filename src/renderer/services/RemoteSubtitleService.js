const fs = require('fs');
const path = require('path');
const https = require('https');
const { Buffer } = require('buffer');
const { getVideoDurationInSeconds } = require('get-video-duration');

// 火山引擎字幕API凭证
const VOLC_APP_ID = '9671189695';
const VOLC_ACCESS_TOKEN = '51a-qFPpO-PtkrDmD1u3S4QA-bAxYlMa';

// API 端点
const SUBMIT_API_URL = 'https://openspeech.bytedance.com/api/v1/vc/submit';
const QUERY_API_URL = 'https://openspeech.bytedance.com/api/v1/vc/query';

class RemoteSubtitleService {
    constructor() {
        this.isDownloading = false;
        this.downloadProgress = 0;
        this.onProgressCallback = null;
        this.jobId = null;
    }

    /**
     * 提交字幕生成任务
     * @param {String} videoPath 视频文件路径
     * @param {Function} progressCallback 进度回调函数
     * @returns {Promise<String>} 任务ID
     */
    async submitSubtitleJob(videoPath, progressCallback) {
        progressCallback(10, "准备提交字幕任务...");
        
        try {
            // 检查文件是否存在
            if (!fs.existsSync(videoPath)) {
                console.error('视频文件不存在:', videoPath);
                throw new Error(`视频文件不存在: ${videoPath}`);
            }
            
            // 读取视频文件
            progressCallback(15, "读取视频文件...");
            const videoData = fs.readFileSync(videoPath);
            console.log('视频文件大小:', videoData.length, '字节');
            
            // 构建URL参数
            const params = {
                appid: VOLC_APP_ID,
                words_per_line: '70',
                max_lines: '2',
                with_speaker_info: 'True'
            };
            
            // 构建URL
            const url = `${SUBMIT_API_URL}?${new URLSearchParams(params).toString()}`;
            console.log('提交URL:', url);
            
            // 发送POST请求
            progressCallback(20, "发送请求...");
            
            // 使用Node.js的https模块直接发送请求
            return new Promise((resolve, reject) => {
                const urlObj = new URL(url);
                
                const options = {
                    hostname: urlObj.hostname,
                    port: 443,
                    path: urlObj.pathname + urlObj.search,
                    method: 'POST',
                    headers: {
                        'Accept': '*/*',
                        'Authorization': `Bearer; ${VOLC_ACCESS_TOKEN}`,
                        'Content-Type': 'audio/wav', 
                        'Content-Length': videoData.length
                    }
                };
                
                console.log('请求选项:', {
                    url: url,
                    method: 'POST',
                    headers: options.headers
                });
                
                const req = https.request(options, (res) => {
                    console.log('状态码:', res.statusCode);
                    console.log('响应头:', res.headers);
                    
                    let responseData = '';
                    
                    res.on('data', (chunk) => {
                        responseData += chunk;
                    });
                    
                    res.on('end', () => {
                        try {
                            console.log('原始响应:', responseData);
                            
                            // 解析响应
                            const response = JSON.parse(responseData);
                            console.log('响应数据:', response);
                            
                            if (response.code === 0 && response.id) {
                                this.jobId = response.id;
                                progressCallback(30, "任务提交成功");
                                resolve(response.id);
                            } else {
                                reject(new Error(`提交失败: ${response.message || '未知错误'} (代码: ${response.code || '未知'})`));
                            }
                        } catch (error) {
                            reject(new Error(`解析响应失败: ${error.message}, 原始数据: ${responseData}`));
                        }
                    });
                });
                
                req.on('error', (error) => {
                    console.error('请求错误:', error);
                    reject(error);
                });
                
                // 发送数据
                req.write(videoData);
                req.end();
                
                console.log('请求已发送');
            });
        } catch (error) {
            console.error('提交字幕任务失败:', error);
            throw error;
        }
    }

    /**
     * 查询字幕生成结果
     * @param {String} jobId 任务ID
     * @param {Function} progressCallback 进度回调函数
     * @returns {Promise<Object>} 字幕数据
     */
    async querySubtitleResult(jobId, progressCallback) {
        progressCallback(40, "查询字幕结果...");
        
        try {
            // 构建请求参数
            const params = {
                appid: VOLC_APP_ID,
                id: jobId
            };
            
            // 构建URL
            const url = `${QUERY_API_URL}?${new URLSearchParams(params).toString()}`;
            console.log('查询字幕URL:', url);
            
            // 使用Node.js的https模块直接发送GET请求
            return new Promise((resolve, reject) => {
                const urlObj = new URL(url);
                
                const options = {
                    hostname: urlObj.hostname,
                    port: 443,
                    path: urlObj.pathname + urlObj.search,
                    method: 'GET',
                    headers: {
                        'Accept': '*/*',
                        'Authorization': `Bearer; ${VOLC_ACCESS_TOKEN}`
                    }
                };
                
                console.log('查询请求选项:', options);
                
                const req = https.request(options, (res) => {
                    console.log('查询状态码:', res.statusCode);
                    console.log('查询响应头:', res.headers);
                    
                    let responseData = '';
                    
                    res.on('data', (chunk) => {
                        responseData += chunk;
                    });
                    
                    res.on('end', () => {
                        try {
                            console.log('查询原始响应:', responseData);
                            
                            // 解析响应
                            const response = JSON.parse(responseData);
                            console.log('查询响应数据:', response);
                            
                            if (response.code === 0) {
                                // 检查是否有utterances字段，这表示任务已完成
                                if (response.utterances && response.utterances.length > 0) {
                                    progressCallback(80, "字幕生成完成，准备下载...");
                                    resolve(response);
                                } else {
                                    // 检查是否有其他状态信息可以提供
                                    let statusMsg = "字幕生成中，请稍等...";
                                    if (response.status) {
                                        statusMsg = `字幕生成状态: ${response.status}`;
                                    } else if (response.message) {
                                        statusMsg = `字幕生成中: ${response.message}`;
                                    }
                                    
                                    progressCallback(50, statusMsg);
                                    resolve(null); // 尚未完成
                                }
                            } else {
                                console.error('查询结果返回错误代码:', response.code, response.message);
                                reject(new Error(`查询结果失败: ${response.message || '错误代码: ' + response.code}`));
                            }
                        } catch (error) {
                            console.error('解析查询响应失败:', error);
                            reject(new Error(`解析查询响应失败: ${error.message}, 原始数据: ${responseData}`));
                        }
                    });
                });
                
                // 处理错误
                req.on('error', (error) => {
                    console.error('查询请求错误:', error);
                    reject(new Error(`查询请求失败: ${error.message}`));
                });
                
                // 超时处理 - 30秒
                req.setTimeout(30000, () => {
                    req.abort();
                    reject(new Error('查询请求超时，请检查网络连接'));
                });
                
                // 结束请求
                req.end();
            });
        } catch (error) {
            console.error('查询字幕结果失败:', error);
            throw new Error(`查询字幕结果失败: ${error.message}`);
        }
    }

    /**
     * 将API返回的字幕数据转换为SRT格式
     * @param {Object} subtitleData API返回的字幕数据
     * @returns {String} SRT格式的字幕内容
     */
    convertToSRT(subtitleData) {
        if (!subtitleData || !subtitleData.utterances || subtitleData.utterances.length === 0) {
            console.error('无有效的字幕数据');
            return '';
        }
        
        // 输出返回的数据结构，以便调试
        console.log('字幕数据结构:', {
            id: subtitleData.id,
            code: subtitleData.code,
            message: subtitleData.message,
            duration: subtitleData.duration,
            utterancesCount: subtitleData.utterances.length
        });
        
        if (subtitleData.utterances.length > 0) {
            const firstUtterance = subtitleData.utterances[0];
            console.log('第一条字幕示例:', {
                text: firstUtterance.text,
                start_time: firstUtterance.start_time,
                end_time: firstUtterance.end_time,
                words_count: firstUtterance.words ? firstUtterance.words.length : 0
            });
        }
        
        const utterances = subtitleData.utterances;
        let srtContent = '';
        
        utterances.forEach((utterance, index) => {
            if (!utterance.text) return; // 跳过空文本
            
            // 根据API返回格式，时间是以毫秒为单位
            const startTime = this.formatSRTTime(utterance.start_time / 1000);
            const endTime = this.formatSRTTime(utterance.end_time / 1000);
            
            srtContent += `${index + 1}\n`;
            srtContent += `${startTime} --> ${endTime}\n`;
            srtContent += `${utterance.text}\n\n`;
        });
        
        return srtContent;
    }

    /**
     * 将秒数格式化为SRT时间格式 (HH:MM:SS,mmm)
     * @param {Number} seconds 秒数
     * @returns {String} SRT格式的时间
     */
    formatSRTTime(seconds) {
        // 确保seconds是数字
        seconds = parseFloat(seconds) || 0;
        
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        const ms = Math.floor((seconds - Math.floor(seconds)) * 1000);
        
        // 格式化为HH:MM:SS,mmm
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
    }

    /**
     * 计算文件大小（MB）
     * @param {String} filePath 文件路径
     * @returns {Number} 文件大小（MB）
     */
    getFileSizeMB(filePath) {
        try {
            const stats = fs.statSync(filePath);
            const fileSizeInBytes = stats.size;
            const fileSizeInMB = fileSizeInBytes / (1024 * 1024);
            return fileSizeInMB;
        } catch (error) {
            console.error('获取文件大小失败:', error);
            return 0;
        }
    }

    /**
     * 获取视频信息
     * @param {String} videoPath 视频文件路径
     * @returns {Promise<Object>} 视频信息对象
     */
    async getVideoInfo(videoPath) {
        try {
            // Use system ffprobe instead of bundled one
            const ffprobePath = '/opt/homebrew/bin/ffprobe';
            const durationInSeconds = await getVideoDurationInSeconds(videoPath, ffprobePath);
            console.log(`视频时长: ${durationInSeconds}秒`);
            
            // 获取文件信息
            const stats = fs.statSync(videoPath);
            const fileSizeInBytes = stats.size;
            const fileSizeInMB = fileSizeInBytes / (1024 * 1024);
            
            return {
                duration: durationInSeconds,
                size: fileSizeInBytes,
                sizeMB: fileSizeInMB,
                path: videoPath,
                filename: path.basename(videoPath)
            };
        } catch (error) {
            console.error('获取视频信息失败:', error);
            return {
                duration: 0,
                size: 0,
                sizeMB: 0,
                path: videoPath,
                filename: path.basename(videoPath)
            };
        }
    }

    /**
     * 从远程下载字幕
     * @param {String} videoPath 视频文件路径
     * @param {Function} progressCallback 进度回调函数
     * @returns {Promise<String>} SRT格式的字幕内容
     */
    async downloadSubtitle(videoPath, progressCallback) {
        try {
            this.isDownloading = true;
            this.downloadProgress = 0;
            this.onProgressCallback = progressCallback;
            
            // 安全处理路径中的特殊字符
            const safeVideoPath = decodeURIComponent(videoPath)
                .replace(/%20/g, ' ')
                .replace(/#/g, '%23');
            
            console.log('开始处理视频:', safeVideoPath);
            progressCallback(5, "准备处理视频...");
            
            // 获取视频信息
            const videoInfo = await this.getVideoInfo(safeVideoPath);
            console.log('视频信息:', JSON.stringify(videoInfo));
            
            if (videoInfo.duration <= 0) {
                throw new Error('无法获取视频信息，请检查视频文件');
            }
            
            progressCallback(10, `开始处理 ${videoInfo.sizeMB.toFixed(2)}MB 视频...`);
            
            console.log('开始时间戳:', new Date().toISOString());
            
            // 提交视频信息获取任务ID
            let jobId;
            try {
                jobId = await this.submitSubtitleJob(safeVideoPath, progressCallback);
                console.log('提交任务成功，任务ID:', jobId);
            } catch (submitError) {
                console.error('提交任务失败:', submitError);
                throw new Error(`提交字幕任务失败: ${submitError.message}`);
            }
            
            if (!jobId) {
                throw new Error('未能获取有效的任务ID');
            }
            
            // 轮询查询结果
            let subtitleData = null;
            let retryCount = 0;
            const maxRetries = 10; // 最多尝试180次
            
            // 初始进度
            let lastProgress = 30;
            progressCallback(lastProgress, `Subtitles downloading`);
            
            console.log('开始轮询查询结果, 最大重试次数:', maxRetries);
            const startPollTime = Date.now();
            
            while (!subtitleData && retryCount < maxRetries) {
                // 等待时间，前10次查询间隔5秒，之后间隔5秒
                const waitTime = retryCount < 10 ? 5000 : 5000;
                await new Promise(resolve => setTimeout(resolve, waitTime));
                
                try {
                    console.log(`进行第 ${retryCount + 1} 次查询...`);
                    const result = await this.querySubtitleResult(jobId, progressCallback);
                    
                    // 如果返回了有效的字幕数据
                    if (result && result.code === 0 && result.utterances && result.utterances.length > 0) {
                        subtitleData = result;
                        const endPollTime = Date.now();
                        const totalPollSeconds = (endPollTime - startPollTime) / 1000;
                        console.log(`查询成功，总共轮询时间: ${totalPollSeconds.toFixed(2)}秒`);
                        break;
                    }
                } catch (queryError) {
                    console.warn(`查询尝试 ${retryCount + 1} 失败:`, queryError.message);
                    // 继续尝试，不中断循环
                }
                
                retryCount++;
                
                // 进度递增，最高到达80%
                // 计算应该递增的百分比，基于总尝试次数，逐渐减缓增长速率
                const progressIncrement = (80 - lastProgress) / (maxRetries - retryCount + 20);
                lastProgress = Math.min(80, lastProgress + progressIncrement);
                
                const elapsedSeconds = Math.round(retryCount * (retryCount < 10 ? 5 : 5));
                const elapsedMinutes = Math.floor(elapsedSeconds / 60);
                const remainingSeconds = elapsedSeconds % 60;
                const timeDisplay = elapsedMinutes > 0 
                    ? `${elapsedMinutes}分${remainingSeconds}秒` 
                    : `${elapsedSeconds}秒`;
                
                progressCallback(
                    Math.round(lastProgress), 
                    `正在生成字幕 (${retryCount}/${maxRetries}), 已等待 ${timeDisplay}...`
                );
            }
            
            if (!subtitleData) {
                const endPollTime = Date.now();
                const totalPollSeconds = (endPollTime - startPollTime) / 1000;
                console.log(`查询超时，总共轮询时间: ${totalPollSeconds.toFixed(2)}秒`);
                throw new Error('字幕生成超时，请稍后重试或检查网络连接');
            }
            
            progressCallback(90, "转换字幕格式...");
            
            // 打印原始字幕数据用于调试
            console.log('原始字幕数据:', JSON.stringify(subtitleData, null, 2));
            
            // 将API返回的字幕数据转换为SRT格式
            const srtContent = this.convertToSRT(subtitleData);
            
            if (!srtContent) {
                throw new Error('生成的字幕为空');
            }
            
            // 显示结束时间
            console.log('结束时间戳:', new Date().toISOString());
            
            progressCallback(100, "Subtitle download completed");
            this.isDownloading = false;
            
            return srtContent;
        } catch (error) {
            console.error('字幕处理失败:', error);
            this.isDownloading = false;
            // 添加更多上下文到错误消息
            throw error instanceof Error 
                ? error 
                : new Error(`字幕处理失败: ${error}`);
        }
    }

    /**
     * 为了测试目的，生成示例SRT
     * @returns {String} 示例SRT内容
     */
    generateSampleSRT() {
        return `1
00:00:01,000 --> 00:00:05,000
这是从远程服务生成的示例字幕
This is a sample subtitle generated from remote service

2
00:00:06,000 --> 00:00:10,000
这是第二条字幕内容
This is the second subtitle entry

3
00:00:11,000 --> 00:00:15,000
这是第三条字幕内容
This is the third subtitle entry`;
    }

    /**
     * 保存字幕到文件
     * @param {String} content 字幕内容
     * @param {String} videoPath 视频文件路径
     * @returns {Promise<String>} 字幕文件路径
     */
    async saveSubtitleFile(content, videoPath) {
        // 处理路径中的特殊字符
        const sanitizedPath = decodeURIComponent(videoPath)
            .replace(/%20/g, ' ')
            .replace(/#/g, '%23');
        
        // 生成与视频同名的SRT文件名
        const srtPath = sanitizedPath.replace(/\.[^/.]+$/, '.srt');
        
        return new Promise((resolve, reject) => {
            fs.writeFile(srtPath, content, 'utf8', (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(srtPath);
                }
            });
        });
    }

    /**
     * 检查视频文件大小是否超过指定大小
     * @param {String} videoPath 视频文件路径
     * @param {Number} sizeMB 大小限制（MB）
     * @returns {Boolean} 是否超过
     */
    isVideoSizeAbove(videoPath, sizeMB = 50) {
        const fileSizeMB = this.getFileSizeMB(videoPath);
        return fileSizeMB > sizeMB;
    }
}

module.exports = new RemoteSubtitleService(); 