import * as Minio from 'minio';

const defaultBucketName = 'number-taker';
const defaultRegion = 'us-east-1';
let minioClient;

/**
 * 初始化 minio client
 *
 * @param {string} bucketName 桶名
 * @param {string} region 區域
 * @returns {Promise<Object>}
 */
function init(bucketName, region) {

  bucketName = bucketName ? bucketName : defaultBucketName;
  region = region ? region : defaultRegion;

  return new Promise(function(resolve, reject) {

    if (minioClient) {
      return resolve({minioClient, bucketName, region});
    }

    // =================================
    //   透過環境變數準備 minio 客端連結器
    // ---------------------------------
    //   注意：
    //     透過環境變數得到的資料都是字串
    //     但傳參數的時候，需要給正確的資料類型
    // =================================
    minioClient = new Minio.Client({
      endPoint: process.env.MINIO_END_POINT,
      port: parseInt(process.env.MINIO_PORT),
      useSSL: process.env.MINIO_USE_SSL === 'true',
      accessKey: process.env.MINIO_ACCESS_KEY,
      secretKey: process.env.MINIO_SECRET_KEY,
    });
    resolve({minioClient, bucketName, region});
  /* 
  // 使用minio.ha7777.net主機 在這段會被出現 { [Error: socket hang up] code: 'ECONNRESET' } ，暫先不處理這段
    minioClient.bucketExists(bucketName, function(err, exists) {
      if (err) {
        reject(err);
      }
      if (!exists) {
        minioClient.makeBucket(bucketName, 'us-east-1', function(err) {
          resolve({minioClient, bucketName, region});
        });
      } else {
        resolve({minioClient, bucketName, region});
      }
    });
    */
  });
}

/**
 * 傳送檔案至 minio 伺服器
 *
 * @param {string} filePath 檔案路徑
 * @param {string} fileType 檔案類型
 * @param {string} fileStream 檔案串流資料
 * @param {string} bucketName 桶名
 * @param {string} region 區域
 * @returns {Promise<Object>}
 */
function send(filePath, fileType, fileStream, bucketName, region) {

  return init(bucketName, region).
      then(function({minioClient, bucketName, region}) {

        return new Promise(function(resolve, reject) {
          minioClient.putObject(
              bucketName,
              `${filePath}.${fileType}`,
              fileStream,
              function(err, etag) {
                if (err) {
                  reject(err);
                }
                resolve(`${filePath}.${fileType}`);
              },
          );
        });
      });
}

export default {
  init: init,
  send: send,
};
