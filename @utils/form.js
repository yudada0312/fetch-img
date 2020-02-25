const Koa = require('koa');
const bodyParser = require('koa-bodyparser');

const app = new Koa();
app.use(bodyParser());

app.use(async ctx => {
  const vendorCode = ctx.request.body.vendor ?
      ctx.request.body.vendor : ctx.query.vendor;
  const paymentMode = ctx.request.body.type;
  const formMethod = ctx.request.body.method;
  const formAction = ctx.request.body.action;
  const formData = ctx.request.body.data;

  let html = ``;

  html += `<body>`;

  // ============================================================
  //   繪出欲傳送的表單資料 (未加密版)
  // ------------------------------------------------------------
  //   當原始資料如果有被加密，但想要在畫面又能看出到底傳了什麼東西
  //   就需要將「未加密」原始資料以參數名稱 raw_data 一併傳過來
  // ============================================================
  if (ctx.request.body.hasOwnProperty('raw_data')) {
    const rawData = ctx.request.body.raw_data;
    html += `<fieldset style="width: 75%;text-align: left;">`;
    html += `    <legend>${vendorCode} - ${paymentMode} (Raw Data)</legend>`;
    html += `    <div style="text-align: right;">`;
    for (let field in rawData) {
      if (rawData.hasOwnProperty(field)) {
        let value = rawData[field];
        html += `<div style="margin: 2px;">`;
        html += `  <label>${field}:</label>`;
        html += `  <input style="width: 60%;" name="${field}" value="${value}" />`;
        html += `</div>`;
      }
    }
    html += `  </div>`;
    html += `</fieldset>`;
  }
  // ============================================================
  //   繪出欲傳送的表單資料
  // ------------------------------------------------------------
  //   這邊指的是實際將傳送至金流商的參數
  // ============================================================
  html += `  <fieldset style="width: 75%;text-align: left;">`;
  html += `    <legend>${vendorCode} - ${paymentMode} (Form Data)</legend>`;
  html += `    <form id="form" style="text-align: right;" method="${formMethod}" action="${formAction}">`;
  for (let field in formData) {
    if (formData.hasOwnProperty(field)) {
      let value = formData[field];
      html += `<div style="margin: 2px;">`;
      html += `  <label>${field}:</label>`;
      html += `  <input style="width: 60%;" name="${field}" value="${value}" />`;
      html += `</div>`;
    }
  }
  html += `      <button id="submit" type="submit">Submit</button>`;
  html += `    </form>`;
  html += `  </fieldset>`;

  html += `</body>`;

  ctx.body = html;
});

export default app;