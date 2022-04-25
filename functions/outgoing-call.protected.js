/**
 * 発信処理
 *  SIP内線もしくは外線に転送する
 * @param {Object}} context
 * @param {Object} event
 * @param {Function} callback
 */
exports.handler = function (context, event, callback) {
  const to = event.To.match(/sip:(.+)@/)[1]; // SIP URI から宛先番号を抜き出す
  const from = event.From.match(/sip:(.+)@/)[1]; // SIP URI から発信元番号を抜き出す
  const fSip = to.length === 4 ? true : false; // SIP内線フラグ
  const VoiceResponse = require('twilio').twiml.VoiceResponse;
  const response = new VoiceResponse();
  let dial;
  if (fSip) {
    // SIP内線発信
    dial = response.dial({
      callerId: from,
    });
    dial.sip(`sip:${to}@${context.SIP_DOMAIN}.sip.twilio.com`);
  } else {
    // 外線発信
    dial = response.dial({
      record: 'record-from-answer-dual',
      callerId: context.TWILIO_NUMBER,
    });
    if (to.substring(0, 1) === '0') {
      // 国内宛
      dial.number(`+81${to.substring(1)}`);
    } else {
      // 国外宛
      dial.number(`+${to}`);
    }
  }
  callback(null, response);
};
