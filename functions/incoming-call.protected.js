/**
 * 着信処理
 *  SIP内線に転送する
 *  CallがCompletedしたらリダイレクトする
 * @param {Object}} context
 * @param {Object} event
 * @param {Function} callback
 */
const { KintoneRestAPIClient } = require('@kintone/rest-api-client');
let addressClient, historyClient, addressAppId, historyAppId;
exports.handler = function (context, event, callback) {
  const from = event.From.replace('+81', '0'); // E.164 -> 0AB〜J

  let fDeny = false; // 着信拒否フラグ
  let fromName = ''; // 電話帳に登録されている着信名

  // kintoneRestAPIClient
  const kintoneUrl = `https://${context.KINTONE_DOMAIN}.cybozu.com`;
  addressClient = new KintoneRestAPIClient({
    baseUrl: kintoneUrl,
    auth: {
      apiToken: context.ADDRESS_APP_TOKEN,
    },
  });
  historyClient = new KintoneRestAPIClient({
    baseUrl: kintoneUrl,
    auth: {
      apiToken: context.HISTORY_APP_TOKEN,
    },
  });
  addressAppId = context.ADDRESS_APP_ID;
  historyAppId = context.HISTORY_APP_ID;

  // 電話帳アプリからデータを取得
  addressClient.record
    .getRecords({
      app: addressAppId,
      fields: ['number', 'fromName', 'deny'],
      query: `number = "${from}"`,
      totalCount: true,
    })
    .then((resp) => {
      if (resp.totalCount === '0') {
        // 連絡帳にデータがない
        fromName = from;
        return addAddress(from);
      } else {
        console.dir(resp.records[0]);
        // 着信拒否のチェック
        if (
          resp.records[0].deny.value.filter((v) => v === '拒否する').length ===
          1
        )
          fDeny = true; // 着信拒否設定がされている
        // 着信名の確認
        fromName =
          resp.records[0].fromName.value !== ''
            ? resp.records[0].fromName.value
            : from;
        return true;
      }
    })
    .then(() => {
      // 着信履歴を追加
      return addHistory(from);
    })
    .then(() => {
      // TwiMLを返却する
      const VoiceResponse = require('twilio').twiml.VoiceResponse;
      const response = new VoiceResponse();
      if (fDeny) {
        // 着信拒否
        const message = `
      申し訳ございません。おかけになった電話番号からの着信は受け付けられません。
      `;
        const say = response.say(
          {
            language: 'ja-JP',
            voice: 'Polly.Mizuki',
          },
          message,
        );
        response.hangup();
      } else {
        // 通常
        const dial = response.dial({
          callerId: fromName,
          answerOnBridge: true,
          hangupOnStar: true,
          record: 'record-from-answer-dual',
        });
        dial.sip(`sip:2001@${context.SIP_DOMAIN}.sip.twilio.com`);
        dial.sip(`sip:2002@${context.SIP_DOMAIN}.sip.twilio.com`);
        dial.sip(`sip:2003@${context.SIP_DOMAIN}.sip.twilio.com`);
        response.redirect('./redirect');
      }
      callback(null, response);
    })
    .catch((err) => {
      console.error(err);
      callback(err);
    });
};

const addAddress = (from) => {
  return new Promise((resolve, reject) => {
    const record = {
      number: {
        value: from,
      },
    };
    addressClient.record
      .addRecord({
        app: addressAppId,
        record: record,
      })
      .then(() => {
        resolve();
      })
      .catch((err) => {
        reject(err);
      });
  });
};

const addHistory = (from) => {
  return new Promise((resolve, reject) => {
    const record = {
      number: {
        value: from,
      },
    };
    historyClient.record
      .addRecord({
        app: historyAppId,
        record: record,
      })
      .then(() => {
        resolve();
      })
      .catch((err) => {
        reject(err);
      });
  });
};
