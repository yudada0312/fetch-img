import taskHelper from '../@utils/task-helper';
import cheerio from 'cheerio';
import url from 'url';

/**
 * 延遲處理
 *
 * @param ms
 * @returns {Promise<>}
 */
const delay = (ms) =>
    new Promise((resolve) => setTimeout(resolve, ms));

const waitForSelectorTimeout = 5000;

/**
 * 排除的銀行
 *
 * 說明： 因為綠界有可能動態「新增」或「移除」可用的銀行
 *       為了避免隨機選到已被移除銀行，這邊要改成從畫面
 *       剖析可選用銀行，然後排除不想使用的銀行
 */
const exceptBanks = [
  // -- 台灣土地銀行 --
  // '10002@11@ATM_LAND',

  // -- 元大銀行(原大眾) --
  '10002@13@ATM_TACHONG',

  // -- 台灣銀行 --
  // '10002@5@ATM_BOT',

  // -- 國泰世華銀行 --
  '10002@9@ATM_CATHAY',

  // -- 中國信託 --
  '10002@8@ATM_CHINATRUST',

  // -- 玉山銀行 --
  // '10002@2@ATM_ESUN',

  // -- 第一銀行 --
  // '10002@7@ATM_FIRST',

  // -- 台北富邦 --
  // '10002@6@ATM_FUBON',

  // -- 台新銀行 --
  '10002@1@ATM_TAISHIN',
];

/**
 * ATM 取號流程
 *
 * @param formPage
 * @returns {Promise<Object>}
 * @constructor
 */
async function ATM(formPage) {
  try {
    // --------------------------
    //   1) 開啟動態表單頁面並送出
    // --------------------------
    await formPage.$eval('#submit', link => link.click());

    // --------------------------
    //   2) 選擇 ATM 使用的銀行
    // --------------------------
    await formPage.waitForSelector('#ATMPaySubmit', {
      visible: true,
    });
    // 收集可選用的銀行選項
    let $2 = cheerio.load(await formPage.content());
    let bankOptions = {};
    let bankEnableOptions = [];

    console.log(`### 可選用[✔]的銀行列表 ###`);
    $2('select#selATMBank > option').not(function(el) {
      let optionVal = $2(this).attr('value');
      let optionLabel = $2(this).text();
      let exceptIt = optionVal === '' || exceptBanks.indexOf(optionVal) !== -1;
      // 顯示銀行列表
      let showIcon = exceptIt ? ' ' : '✔';
      if (optionVal !== '') {
        console.log(`[${showIcon}]: ${optionLabel} (${optionVal})`);
        bankOptions[optionVal] = optionLabel;
      }
      return exceptIt;
    }).each(function(i, el) {
      let optionVal = $2(el).attr('value');
      bankEnableOptions.push(optionVal);
    });
    // 在可用的銀行中，隨機選擇一個
    const randomBankIndex = bankEnableOptions[Math.floor(
        Math.random() * bankEnableOptions.length)];

    console.log(`隨機挑選: ${bankOptions[randomBankIndex]} (${randomBankIndex})`);

    while ((await formPage.$('.input-error-txt')) !== null) {
      await formPage.select('select#selATMBank', randomBankIndex);
      delay(1000);
    }
    await formPage.select('select#selATMBank', randomBankIndex);
    await formPage.$eval('#ATMPaySubmit', el => el.click());

    // --------------------------
    //   3) 剖析結果頁面
    // --------------------------
    await formPage.waitForSelector('.print', {
      visible: true,
      timeout: waitForSelectorTimeout,
    });
    let $3 = cheerio.load(await formPage.content());
    let data = [];
    $3('dd').each(function(i, elem) {
      data[i] = $3(elem).text().trim();
    });
    // 抓取銀行資料
    let bankData = [];
    $3('dd p').each(function(i, elem) {
      bankData[i] = $3(elem).text().trim();
    });

    // 組合結果物件並擷圖最終畫面
    await taskHelper.takeScreenshots(formPage);
    return {
      type: 'ATM',
      order_no: data[0],
      total_amount: data[10].replace(/\D/g, ''),
      expired_at: data[14],
      payment_no: '',
      atm_account: bankData[1].split('帳號 ')[1],
      atm_bank: bankData[0].split('銀行代碼 ')[1],
      barcode1: '',
      barcode2: '',
      barcode3: '',
      extra_info: []
    };
  } catch (err) {
    console.error(err);
    await taskHelper.takeHtml(formPage);
    await taskHelper.takeScreenshots(formPage);
  }
}

/**
 * CVS 取號流程
 *
 * @param formPage
 * @returns {Promise<void>}
 * @constructor
 */
async function CVS(formPage) {
  try {
    // --------------------------
    //   1) 開啟動態表單頁面並送出
    // --------------------------
    await formPage.$eval('#submit', link => link.click());

    // --------------------------
    //   2) 取得繳費代碼
    // --------------------------
    await formPage.waitForSelector('#CVSPaySubmit', {
      visible: true,
      timeout: waitForSelectorTimeout,
    });
    setTimeout(async function() {
      await formPage.$eval('#CVSPaySubmit', link => link.click());
    }, 1000);

    // --------------------------
    //   3) 剖析結果頁面
    // --------------------------
    await formPage.waitForSelector('.oif-hl', {
      visible: true,
      timeout: waitForSelectorTimeout,
    });
    let html = await formPage.content();
    let $ = cheerio.load(html);
    let data = [];

    // 收集取號資料
    $('dd').each(function(i, elem) {
      data[i] = $(elem).text().trim();
    });

    // 擷圖最終結果
    await taskHelper.takeScreenshots(formPage);
    return {
      type: 'CVS',
      order_no: data[0],
      total_amount: data[12].split(' ')[1].replace(/\D/g, ''),
      expired_at: data[14].split('\n')[0],
      payment_no: data[13],
      atm_account: '',
      atm_bank: '',
      barcode1: '',
      barcode2: '',
      barcode3: '',
      extra_info: []
    };
  } catch (err) {
    console.error(err);
    await taskHelper.takeScreenshots(formPage);
    await taskHelper.takeHtml(formPage);

  }
}

/**
 * BARCODE 取號流程
 *
 * @param formPage
 * @returns {Promise<void>}
 * @constructor
 */
async function BARCODE(formPage) {
  try {
    // --------------------------
    //   1) 開啟動態表單頁面並送出
    // --------------------------
    await formPage.$eval('#submit', link => link.click());

    // --------------------------
    //   2) 取得繳費條碼
    // --------------------------
    await formPage.waitForSelector('#BarCodePaySubmit', {
      visible: true,
    });
    setTimeout(async function() {
      await formPage.$eval('#BarCodePaySubmit', link => link.click());
    }, 1000);

    // --------------------------
    //   3) 剖析結果頁面
    // --------------------------
    await formPage.waitForSelector('#btnPrint', {
      visible: true,
    });
    let html = await formPage.content();
    let $ = cheerio.load(html);
    let data = [];

    // 收集取號資料
    $('.order-table dd').each(function(i, elem) {
      data[i] = $(elem).text().trim();
    });

    console.log(data);

    // 條碼部分
    let barCodes = [];
    $('.cord > img').each(function(i, barcode) {
      let parse = url.parse(
          $(barcode).prop('src').trim(),
          true,
      );
      barCodes[i] = parse.query.barcode;
    });

    console.log(barCodes);

    // 擷圖最終結果
    await taskHelper.takeScreenshots(formPage);
    return {
      type: 'BARCODE',
      order_no: data[0],
      total_amount: data[13].replace(/\D/g, ''),
      expired_at: data[3],
      payment_no: '',
      atm_account: '',
      atm_bank: '',
      barcode1: barCodes[0],
      barcode2: barCodes[1],
      barcode3: barCodes[2],
      extra_info: []
    };
  } catch (err) {
    console.error(err);
    await taskHelper.takeHtml(formPage);
    await taskHelper.takeScreenshots(formPage);
  }
}

export default {
  withATM: ATM,
  withCVS: CVS,
  withBARCODE: BARCODE,
};