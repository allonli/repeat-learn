const crypto = require('crypto');
const util = require('util');
const url = require('url');

/**
 * 不参与加签过程的 header key
 */
const HEADER_KEYS_TO_IGNORE = new Set([
    'authorization',
    'content-type',
    'content-length',
    'user-agent',
    'presigned-expires',
    'expect',
]);

class SignService {
    /**
     * 生成ISO8601格式的时间戳
     * @returns {string} ISO8601格式的时间戳
     */
    static getDateTimeNow() {
        const now = new Date();
        return now.toISOString().replace(/[:-]|\.\d{3}/g, '');
    }

    /**
     * 计算HMAC-SHA256哈希
     * @param {string|Buffer} secret 密钥
     * @param {string} message 消息
     * @returns {Buffer} HMAC哈希值
     */
    static hmac(secret, message) {
        return crypto.createHmac('sha256', secret).update(message, 'utf8').digest();
    }

    /**
     * 计算SHA256哈希
     * @param {string} message 消息
     * @returns {string} 十六进制哈希值
     */
    static hash(message) {
        return crypto.createHash('sha256').update(message, 'utf8').digest('hex');
    }

    /**
     * URI编码
     * @param {string} str 需要编码的字符串
     * @returns {string} 编码后的字符串
     */
    static uriEscape(str) {
        try {
            return encodeURIComponent(str)
                .replace(/[^A-Za-z0-9_.~\-%]+/g, escape)
                .replace(/[*]/g, (ch) => `%${ch.charCodeAt(0).toString(16).toUpperCase()}`);
        } catch (e) {
            return '';
        }
    }

    /**
     * 将查询参数对象转换为字符串
     * @param {Object} params 查询参数对象
     * @returns {string} 查询参数字符串
     */
    static queryParamsToString(params) {
        return Object.keys(params)
            .sort()
            .map((key) => {
                const val = params[key];
                if (typeof val === 'undefined' || val === null) {
                    return undefined;
                }
                const escapedKey = this.uriEscape(key);
                if (!escapedKey) {
                    return undefined;
                }
                if (Array.isArray(val)) {
                    return `${escapedKey}=${val.map(this.uriEscape).sort().join(`&${escapedKey}=`)}`;
                }
                return `${escapedKey}=${this.uriEscape(val)}`;
            })
            .filter((v) => v)
            .join('&');
    }

    /**
     * 获取需要签名的请求头
     * @param {Object} originHeaders 原始请求头
     * @param {Array<string>} needSignHeaders 需要签名的请求头列表
     * @returns {[string, string]} [签名的请求头键列表, 规范化的请求头字符串]
     */
    static getSignHeaders(originHeaders, needSignHeaders) {
        function trimHeaderValue(header) {
            return header?.toString?.().trim().replace(/\s+/g, ' ') ?? '';
        }

        let h = Object.keys(originHeaders);
        // 根据 needSignHeaders 过滤
        if (Array.isArray(needSignHeaders)) {
            const needSignSet = new Set([...needSignHeaders, 'x-date', 'host'].map((k) => k.toLowerCase()));
            h = h.filter((k) => needSignSet.has(k.toLowerCase()));
        }
        // 根据 ignore headers 过滤
        h = h.filter((k) => !HEADER_KEYS_TO_IGNORE.has(k.toLowerCase()));

        const signedHeaderKeys = h
            .slice()
            .map((k) => k.toLowerCase())
            .sort()
            .join(';');

        const canonicalHeaders = h
            .sort((a, b) => (a.toLowerCase() < b.toLowerCase() ? -1 : 1))
            .map((k) => `${k.toLowerCase()}:${trimHeaderValue(originHeaders[k])}`)
            .join('\n');

        return [signedHeaderKeys, canonicalHeaders];
    }

    /**
     * 生成签名
     * @param {Object} params 签名参数
     * @returns {string} 授权头字符串
     */
    static sign(params) {
        const {
            headers = {},
            query = {},
            region = '',
            serviceName = '',
            method = '',
            pathName = '/',
            accessKeyId = '',
            secretAccessKey = '',
            needSignHeaderKeys = [],
            bodySha,
        } = params;

        const datetime = headers['X-Date'];
        const date = datetime.substring(0, 8); // YYYYMMDD

        // 创建规范化请求
        const [signedHeaders, canonicalHeaders] = this.getSignHeaders(headers, needSignHeaderKeys);
        const canonicalRequest = [
            method.toUpperCase(),
            pathName,
            this.queryParamsToString(query) || '',
            `${canonicalHeaders}\n`,
            signedHeaders,
            bodySha || this.hash(''),
        ].join('\n');

        const credentialScope = [date, region, serviceName, 'request'].join('/');

        // 创建签名字符串
        const stringToSign = ['HMAC-SHA256', datetime, credentialScope, this.hash(canonicalRequest)].join('\n');

        // 计算签名
        const kDate = this.hmac(secretAccessKey, date);
        const kRegion = this.hmac(kDate, region);
        const kService = this.hmac(kRegion, serviceName);
        const kSigning = this.hmac(kService, 'request');
        const signature = this.hmac(kSigning, stringToSign).toString('hex');

        return [
            'HMAC-SHA256',
            `Credential=${accessKeyId}/${credentialScope},`,
            `SignedHeaders=${signedHeaders},`,
            `Signature=${signature}`,
        ].join(' ');
    }

    /**
     * 获取请求体的SHA256哈希值
     * @param {string|Buffer|URLSearchParams} body 请求体
     * @returns {string} 哈希值
     */
    static getBodySha(body) {
        const hash = crypto.createHash('sha256');
        if (typeof body === 'string') {
            hash.update(body);
        } else if (body instanceof url.URLSearchParams) {
            hash.update(body.toString());
        } else if (util.isBuffer(body)) {
            hash.update(body);
        }
        return hash.digest('hex');
    }

    /**
     * 生成完整的签名请求头
     * @param {Object} params 签名参数
     * @returns {Object} 包含签名的请求头
     */
    static generateSignature(params) {
        const {
            method,
            host,
            uri = '/',
            queryString = {},
            headers = {},
            payload = '',
            accessKeyId,
            secretKey,
            region,
            service,
            signedHeaders = [],
        } = params;

        // 准备签名参数
        const requestHeaders = { ...headers };
        if (!requestHeaders['X-Date']) {
            requestHeaders['X-Date'] = this.getDateTimeNow();
        }
        if (!requestHeaders['Host'] && host) {
            requestHeaders['Host'] = host;
        }
        
        const datetime = requestHeaders['X-Date'];
        const bodySha = this.getBodySha(payload);
        
        // 处理 queryString
        let query = {};
        if (typeof queryString === 'string') {
            if (queryString) {
                queryString.split('&').forEach(pair => {
                    if (!pair) return;
                    const [key, value] = pair.split('=');
                    if (key) query[key] = decodeURIComponent(value || '');
                });
            }
        } else {
            query = { ...queryString };
        }
        
        // 正规化 query object
        for (const [key, val] of Object.entries(query)) {
            if (val === undefined || val === null) {
                query[key] = '';
            }
        }

        // 生成签名
        const authorization = this.sign({
            headers: requestHeaders,
            query,
            region,
            serviceName: service,
            method,
            pathName: uri,
            accessKeyId,
            secretAccessKey: secretKey,
            needSignHeaderKeys: signedHeaders,
            bodySha,
        });

        // 返回完整的请求头
        return {
            headers: {
                ...requestHeaders,
                Authorization: authorization,
            }
        };
    }
}

// 优化导出逻辑
if (typeof module !== 'undefined' && module.exports) {
  // Node.js 环境
  module.exports = SignService;
} 