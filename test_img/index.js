// --- npm 套件 ---
import express from 'express';
import helmet from 'helmet';
import bodyParser from 'body-parser';

// --- 輔助套件 ---
import taskHelper from '../@utils/task-helper';

// ====================================
//   自行開發部分
// ====================================
// 初始應用
const app = express();
app.use(helmet());
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());


app.get('/', async (req, res) => {
  res.send('<form action="/" method="post"> test screenshot <br/>url:<input type="text" name="url" value="https://tw.yahoo.com"><input type="submit" value="download image" /></form>');
});
app.post('/', async (req, res) => {
  let browser = await taskHelper.getBrowser();
 const page = await browser.newPage();

  await page.goto(req.body.url);
 // await taskHelper.takeScreenshots(page);
  const base64Image = await page.screenshot({
    //encoding: "base64",
    type: 'jpeg',
    fullPage: true,
  });
  browser.close();
  const image = new Buffer.from(base64Image, "base64");
  
  res.attachment("screenshot.png");
  res.send(image);
});

export default app;