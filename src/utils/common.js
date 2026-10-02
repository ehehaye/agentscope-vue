/** 凭证的展示名：优先取用户设置的名字，否则退化为短 id 前缀。 */
export function credentialLabel(credential) {
  return credential.data.name || credential.id.slice(0, 8);
}

/**
 * 把字符串复制到系统剪贴板。
 *
 * @param {string} text 要复制的文本。
 * @returns {Promise<boolean>} 复制成功返回 true，否则 false。
 */
export const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    let success = false;
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'absolute';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      success = document.execCommand('copy');
    } catch (execErr) {
      console.error('Failed to copy text: ', execErr);
    }
    document.body.removeChild(textarea);
    return success;
  }
};

/**
 * 把数字格式化为易读字符串：千位加逗号，超过千用 k/M/B 后缀。
 * @param {number} num 要格式化的数字
 * @returns {string} 如 "1,000"、"10.2k"、"1.5M"
 */
export function formatNumber(num) {
  if (num < 1000) {
    return num.toLocaleString();
  }

  const units = [
    { value: 1e9, suffix: 'B' },
    { value: 1e6, suffix: 'M' },
    { value: 1e3, suffix: 'k' },
  ];

  for (const { value, suffix } of units) {
    if (num >= value) {
      const formatted = num / value;
      const decimals = formatted >= 10 ? 1 : 2;
      return formatted.toFixed(decimals).replace(/\.0+$/, '') + suffix;
    }
  }

  return num.toLocaleString();
}

/**
 * 把秒数格式化为紧凑的可读时长字符串。
 * @param {number} seconds 要格式化的秒数
 * @param {{ leadingUnitOnly?: boolean }} [options] 是否只保留最高单位
 * @returns {string} 如 "45s"、"2m30s"、"3h"、"5d"、"2y"
 */
export const formatTime = (seconds, options = {}) => {
  const total = Math.floor(seconds);
  if (total < 60) {
    return `${total}s`;
  }
  if (total < 3600) {
    const minutes = Math.floor(total / 60);
    const remaining = total % 60;
    if (options.leadingUnitOnly || remaining === 0) {
      return `${minutes}m`;
    }
    return `${minutes}m${remaining}s`;
  }
  if (total < 86400) {
    return `${Math.floor(total / 3600)}h`;
  }
  if (total < 2629746) {
    return `${Math.floor(total / 86400)}d`;
  }
  if (total < 31556952) {
    return `${Math.floor(total / 2629746)}mo`;
  }
  return `${Math.floor(total / 31556952)}y`;
};

/**
 * 把 OKLCH 颜色转成 6 位 hex 字符串，兼容更多浏览器。仅供本文件内部使用。
 * @param {number} L 感知亮度（0..1）
 * @param {number} C 彩度（0..~0.4）
 * @param {number} H 色相角度（0..360）
 * @returns {string} hex 字符串（如 "#d7f2ec"）
 */
const oklchToHex = (L, C, H) => {
  const hrad = (H * Math.PI) / 180;
  const a = C * Math.cos(hrad);
  const b = C * Math.sin(hrad);
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ ** 3;
  const m = m_ ** 3;
  const s = s_ ** 3;
  const channels = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
  return (
    '#' +
    channels
      .map((c) => {
        const v = c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;
        return Math.round(Math.min(Math.max(v, 0), 1) * 255)
          .toString(16)
          .padStart(2, '0');
      })
      .join('')
  );
};

/**
 * 为回退头像生成确定、可读性好的配色对。
 * @param {string} seed 稳定标识，如卡片或 hub 名称
 * @returns {{ backgroundColor: string, color: string }}
 */
export const avatarTint = (seed) => {
  let hash = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  const hue = Math.abs(hash) % 360;
  return {
    backgroundColor: oklchToHex(0.94, 0.03, hue),
    color: oklchToHex(0.41, 0.075, hue),
  };
};

export const isValidJsonStr = (str = '') => {
  try {
    JSON.parse(str);
    return true;
  } catch (e) {
    return false;
  }
};
