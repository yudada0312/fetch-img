import puppeteer from 'puppeteer-core';
import chrome from 'chrome-aws-lambda';
import format from 'date-fns/format';
import localeTW from 'date-fns/locale/zh-TW';
import minioUploader from './minio-uploader';
import logger from './logger';

/**
 * 收集快照的 beffer 容器
 *
 * @type {!Array<Buffer>}
 */
let screenshotsBuffers = [];

/**
 * 收集 HTML 的 beffer 容器
 *
 * @type {!Array<Buffer>}
 */
let htmlBuffers = [];

/**
 * 取得瀏覽器
 *
 * @returns {!Promise<!Puppeteer.Browser>}
 */
async function getBrowser() {
  return await puppeteer.launch({
    ignoreHTTPSErrors : true,
    args: process.env.CHROME_EXECUTABLE_PATH === undefined ?
        chrome.args : [],
    headless: process.env.CHROME_EXECUTABLE_PATH === undefined ?
        chrome.headless : false,
    executablePath: process.env.CHROME_EXECUTABLE_PATH === undefined ?
        await chrome.executablePath : process.env.CHROME_EXECUTABLE_PATH,
  });
}

/**
 * 取得表單參數頁面
 *
 * @param page
 * @param req
 * @returns {Promise<void>}
 */
async function makeFormPage(page, req) {
  await page.setRequestInterception(true);

  function postData(interceptedRequest) {
    const headers = Object.assign({}, interceptedRequest.headers(), {
      'content-type': 'application/json',
    });
    const postData = JSON.stringify(req.body);
    interceptedRequest.continue({
      headers,
      postData,
    });
  }

  // 註冊一次的 request (為了能發送表單資料)
  page.once('request', postData);

  // 組合 Now 主機上動態表單位置
  let formUrl = req.headers['x-forwarded-proto'] + '://'
      + req.headers['x-now-deployment-url'] + '/form';

  await page.goto(formUrl);

  // 關閉 requestInterception 行為
  await page.setRequestInterception(false);

  return await takeScreenshots(page);
}

/**
 * 進行頁面快照
 *
 * @param {!Promise<!Puppeteer.Page>} page
 * @returns {!Promise<!Puppeteer.Page>}
 */
async function takeScreenshots(page) {
  const base64Image = await page.screenshot({
    type: 'jpeg',
    fullPage: true,
  });
  let buffer = new Buffer.from(base64Image, 'binary');
  screenshotsBuffers.push(buffer);
  return page;
}

/**
 * 進行 HTML 收集
 *
 * @param {!Promise<!Puppeteer.Page>} page
 * @returns {!Promise<!Puppeteer.Page>}
 */
async function takeHtml(page) {
  const html = await page.content();
  let buffer = Buffer.from(html);
  htmlBuffers.push(buffer);
  return page;
}

/**
 * 取得訂單取號器任務名稱
 *
 * @param {string} vendorCode 金流商代碼
 * @param {string} paymentType 支付方式
 * @param {string} orderNo 訂單號碼
 * @param {int} totalAmount 總金額
 * @returns {string}
 */
function getTaskName(vendorCode, paymentType, orderNo, totalAmount) {
  vendorCode = vendorCode ? vendorCode.toString().toLowerCase() : '';
  paymentType = paymentType ? paymentType.toString().toLowerCase() : '';
  orderNo = orderNo ? orderNo.toString().toLowerCase() : '';
  totalAmount = totalAmount ? totalAmount : '';
  let time = format(new Date(), 'HH:mm:ss', {
    locale: localeTW,
  });
  return [
    time, vendorCode, paymentType, orderNo, totalAmount,
  ].join('-');
}

/**
 * 上傳任務相關記錄至 minio 服務器
 *
 * @param {string} taskName 任務名稱
 * @returns {Promise<String[]>}
 */

/**
 *
 * @param taskName
 * @returns {Promise<{handler: *, tracking: *}>}
 */
/*function uploadTaskTracks(taskName, bucketName) {

  console.log(``);
  console.log(`    |-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-`);
  console.log(`    |  上傳資料 minio 伺服器   `);
  console.log(`    |-----------------------------------------------`);

  // 上傳程序收集器
  let uploadProcess = [];
  // 以執行時間的(年-月-日)來當來資料夾位置
  const runDay = format(new Date(), 'yyyy-MM-dd', {
    locale: localeTW,
  });

  // --------------
  //   快照
  // --------------
  console.log(`    | > 寫入任務所有快照圖片收集，共 ${screenshotsBuffers.length} 張`);
  for (const buffer of screenshotsBuffers) {
    let index = screenshotsBuffers.indexOf(buffer);
    let filePath = `${runDay}/${taskName}/screenshots-${index}`;
    uploadProcess.push(minioUploader.send(filePath, 'jpg', buffer, bucketName));
  }
  screenshotsBuffers = [];

  // ------------
  //   HTML
  // ------------
  console.log(`    | > 寫入任務所有 HTML 收集，共 ${htmlBuffers.length} 筆`);
  for (const buffer of htmlBuffers) {
    let index = htmlBuffers.indexOf(buffer);
    let filePath = `${runDay}/${taskName}/html-${index}`;
    uploadProcess.push(minioUploader.send(filePath, 'html', buffer, bucketName));
  }
  htmlBuffers = [];

  // ----------------
  //   LOG
  // ----------------
  // 追踨檔位置
  const scheme = process.env.MINIO_USE_SSL === 'true' ? 'https' : 'http';
  const domain = process.env.MINIO_END_POINT;
  const port = process.env.MINIO_PORT;
  const bucket = (bucketName) ? bucketName : 'number-taker';
  const taskPath = `minio/${bucket}/${runDay}/${taskName}`;
  const trackingUrl = `${scheme}://${domain}:${port}/${taskPath}/`;

  console.log(`    | > 寫入任務 logs 記錄檔，共 ${logger.asArray().length + 7} 行`);
  console.log(`    |`);
  console.log(`    |  Tracking URL:`);
  console.log(`    |      ${trackingUrl}`);
  console.log(`    |`);
  console.log(`    |-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-`);
  console.log(``);

  let buffer = logger.asBuffer();
  let filePath = `${runDay}/${taskName}/console`;
  uploadProcess.push(minioUploader.send(filePath, 'log', buffer, bucketName));
  logger.clear();

  return {
    trackingUrl: trackingUrl,
    handler: Promise.all(uploadProcess),
  };
}*/

export default {
  getBrowser: getBrowser,
  makeFormPage: makeFormPage,
  takeScreenshots: takeScreenshots,
  takeHtml: takeHtml,
  getTaskName: getTaskName,
  //uploadTaskTracks: uploadTaskTracks,
};