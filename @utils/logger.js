import format from 'date-fns/format';
import localeTW from 'date-fns/locale/zh-TW';

let logRecords = [];

// =================================
//   覆寫(擴充) 原生 console 的函式
// ---------------------------------
//   除了會執行原生 console 函式行為
//   還會將輸出的部分轉存至陣列中
//
//   注意！此 lib 應該優先載入，才能覆寫
//   所有執行過程中的 console 函式行為
// =================================
function init() {
  ['log', 'error', 'info'].forEach((type) => {
    const originalFunc = console[type];

    console[type] = function() {
      // 執行原生 console 函式應該做的行為
      originalFunc.apply(console, [].slice.call(arguments));

      // 重組輸出字串，例如：2019-10-10 17:40:16
      // [輸出] 2019-10-10 17:40:16 - ERROR {message content}
      const timeStamp = format(new Date(), 'yyyy-MM-dd HH:mm:ss', {
        locale: localeTW,
      });
      let string = `${timeStamp} - ${
          type === 'log' ? 'DEBUG' : type.toUpperCase()
      } `;
      // 將輸出字串追加至記錄器裡面
      logRecords.push([string].concat([].slice.call(arguments)));
    };
  });
}

init();

/**
 * 取得記錄器串流
 *
 * @returns {Buffer}
 */
const asBuffer = () => {
  let logStr = '';
  let finalLog = [];
  finalLog = logRecords.map(m => {
    let str = m.reduce((pre, cur) => {
      let tempCur = cur;
      let tempPre = pre;
      // 判斷是不是為錯誤訊息
      if (Object.prototype.toString.call(tempCur) === '[object Error]') {
        // 錯誤訊息的話就把 error message 與 錯誤發生的位置傳回去
        tempCur = tempCur.stack;
      }
      // 判斷是否為物件，如果是就轉成 json 格式
      if (Object.prototype.toString.call(tempCur) === '[object Object]') {
        tempPre += '\n';
        tempCur = JSON.stringify(tempCur);
        // 把物件拆開斷行，遇到 , 或 { 就在後面補上斷行符號
        tempCur = tempCur.replace(/,|{/g, x => x + '\n\t');
        // 把物件拆開斷行，遇到 } 就在前面補上斷行符號
        tempCur = tempCur.replace(/}/g, x => '\n' + x);
      }
      return tempPre + '' + tempCur;
    });
    str += '\n';
    return str;
  });
  // 把所有訊息串起來
  if (finalLog.length) {
    logStr = finalLog.reduce((pre, cur) => pre + '' + cur);
  }
  return Buffer.from(logStr);
};

/**
 * 清空記錄器陣列
 *
 * @returns {Array}
 */
const clear = () => {
  logRecords = [];
};

/**
 * 取得記錄器陣列
 *
 * @returns {Array}
 */
const asArray = () => {
  return logRecords;
};

export default {
  init: init,
  asArray: asArray,
  asBuffer: asBuffer,
  clear: clear,
};
