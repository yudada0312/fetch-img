// --- npm 套件 ---
import express from 'express';
import helmet from 'helmet';
import bodyParser from 'body-parser';
import path from 'path';

// --- 輔助套件 ---
import logger from '../@utils/logger';
import taskHelper from '../@utils/task-helper';
import crawler from './crawler';
import crawlerForTest from './crawler_for_test';

// ====================================
//   自行開發部分
// ====================================
// 初始應用
const app = express();
app.use(helmet());
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());

app.post('*', async (req, res) => {

  // ====================================
  //   組合此次取號任務名稱
  // ====================================
  const taskName = taskHelper.getTaskName(
      req.body.vendor, // 金流商代碼
      req.body.type,   // 支付類型
      req.body.data['MerchantTradeNo'], // 交易訂單編號(每個金流商欄位名稱會有所不同）
      req.body.data['TotalAmount'],// 交易金額(每個金流商欄位名稱會有所不同）
  );

  // 最後回應結果
  let responseResult;
  // 瀏覽器
  let browser = await taskHelper.getBrowser();

  console.log(`==========================================================`);
  console.log(`    任務: ${taskName} 開始`);
  console.log(`----------------------------------------------------------`);
  console.log('爬蟲瀏覽器版本: ', await browser.version());
  console.log(`接收的表單資料:`);
  console.log(req.body);

  try {
    // ====================================
    //   準備表單參數頁面
    // ====================================
    const page = await browser.newPage();
    const formPage = await taskHelper.makeFormPage(page, req);

    // ====================================
    //   取得爬蟲處理器
    // ----------------------------------
    //   綠界的正式帳號與測試帳號的金流頁面不同
    //   為了便於程式碼的維護，將爬蟲處理器分開撰寫
    //
    //   如果串接的金流商沒有環境測試和正式之分
    //   就不需要特別分開寫
    // ====================================
    let payInfoCrawler = crawler;
    if (req.body['action'] ===
        'https://payment-stage.ecpay.com.tw/Cashier/AioCheckOut/V5') {
      payInfoCrawler = crawlerForTest;

      console.log(`!!!!`);
      console.log(`!! 使用「測試用」爬蟲處理器`);
      console.log(`!!!!`);
    }

    // ====================================
    //   依照不同的支付類型，執行不同的爬蟲程序
    // ====================================
    switch (req.body['type'].toUpperCase()) {
      case 'ATM':
        responseResult = await payInfoCrawler.withATM(formPage);
        break;
      case 'CVS':
        responseResult = await payInfoCrawler.withCVS(formPage);
        break;
      case 'BARCODE':
        responseResult = await payInfoCrawler.withBARCODE(formPage);
        break;
      default:
        break;
    }

  } catch (err) {
    console.error('取號錯誤', err);
  } finally {

    // 關閉瀏覽器(開發除錯時可以暫時註解掉)
   // browser.close();

    let {trackingUrl, handler} = taskHelper.uploadTaskTracks(taskName, req.body.bucketName);

    await handler.catch(function(err) {
      // 上傳失敗不應該影響取號結果
      console.error(``);
      console.error(`+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-`);
      console.error(`     警告： 追踨記錄 minio 上傳失敗    `);
      console.error(`+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-`);
      console.error(err);
      console.error(`+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-`);
      console.error(``);
    }).then(function() {
      // 輸出最終回應結果

      console.log(`最終回應結果:`);

      if (responseResult) {

        console.log(``);
        console.log(`     !! 成功 \\^o^/ 灑花 !! `);
        console.log(``);
        res.status(200).send(JSON.stringify(responseResult));
      } else {
        console.error(``);
        console.error(`     !! 取號失敗 T_T !! (追蹤原因: ${trackingUrl})`);
        console.error(``);
        responseResult = {
          crawl_status: 'error',
          msg: trackingUrl,
          order_no: req.body.data['MerchantTradeNo']
        } 
        res.status(400).send(JSON.stringify(responseResult));
      }
      console.log(responseResult);
      console.log(`----------------------------------------------------------`);
      console.log(`    任務: ${taskName} 結束`);
      console.log(`==========================================================`);
    });
  }

});

export default app;