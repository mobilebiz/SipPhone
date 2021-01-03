/**
 * リダイレクト処理
 *  通話ステータスが no-answer だったら、TRANSRECに転送する
 * @param {Object}} context 
 * @param {Object} event 
 * @param {Function} callback 
 */
exports.handler = function(context, event, callback) {
  const status = event.CallStatus;
  const VoiceResponse = require('twilio').twiml.VoiceResponse;
  const response = new VoiceResponse();
  if (status === 'in-progress') {
    response.dial({
      callerId: context.TWILIO_NUMBER
    })
    .number(context.TRANSREC_NUMBER);
  } else {
    response.hangup();
  }
  callback(null, response);
};
