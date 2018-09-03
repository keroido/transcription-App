// プロパティ取得
var PROPERTIES = PropertiesService.getScriptProperties();

//LINEの設定
var LINE_ACCESS_TOKEN = PROPERTIES.getProperty('LINE_ACCESS_TOKEN');
var LINE_END_POINT = "https://api.line.me/v2/bot/message/reply";

//Google Cloud Vision APIから設定
var VISION_ACCESS_TOKEN = PROPERTIES.getProperty('VISION_ACCESS_TOKEN');

//ログ出力用にGoogle Docs連携する
var GOOGLE_DOCS_ID = PROPERTIES.getProperty('GOOGLE_DOCS_ID');
var doc = DocumentApp.openById(GOOGLE_DOCS_ID);

function doGet(){
}

function doPost(e){
 
 try{
   
   //デバッグのとき
   if (typeof e === "undefined"){
     var url = "http://blog.re-presentation.jp/wp-content/uploads/2016/01/WS001349-1024x576.jpg" 
     Logger.log("[DEBUG] END POINT: %s", url) 
   } else {  
       Logger.log("[INFO] POSTリクエストが呼び出されました")
       var json = JSON.parse(e.postData.contents);
       var reply_token= json.events[0].replyToken;
       var messageId = json.events[0].message.id; //送られたメッセージのID
       var url = 'https://api.line.me/v2/bot/message/'+ messageId +'/content/' //バイナリファイルの画像が取得できるエンドポイント
       Logger.log("LINE END POINT FOUND: %s", url) 
   }
   //LINEから画像を受け取って、base64形式で取得したblobファイルを返す
   var imageResponse = getImageResponse(url);
   var blobBase64 = Utilities.base64Encode(imageResponse.getContent())
   
   //blobファイルを、Google Vision APIにかませて、テキストを取得する
   var text = getText(blobBase64)
   
   //取得した画像に文字が含まれていない場合、もしくはエラーが起こった場合
   if (typeof text === "undefined"){
     text = "画像から文字を検出できませんでした。"
   }
   
   //Lineにテキストファイルを返す
   postLine(text, reply_token);
 } catch (e){
   Logger.log("Failed: %s", e)
   text = "すまん、今日文字起こしバイト入りすぎてめっちゃ疲れてしもうた。明日またお願いしますわ。もしくは \n このURLから自分で作ってくれや。もう疲れた \n "
   postLine(text, reply_token);
   doc.getBody().appendParagraph(Logger.getLog()) 
 }
 doc.getBody().appendParagraph(Logger.getLog())  
}  
 
 
function getImageResponse(url){
/*
* Lineに送られた画像ファイルを、base64形式に変換したBLOBオブジェクトを返す
* @param {object}: URL
* @return {Blob}: LINEに送られた画像ファイルのバイナリ 
*/
 try{
   var res = UrlFetchApp.fetch(url, {
     'headers': {
       'Content-Type': 'application/json; charset=UTF-8',
       'Authorization': 'Bearer ' + LINE_ACCESS_TOKEN,
     },
     'method': 'get'
   });
   return res;
 //エラーが起こった場合、
 } catch (e) {
   Logger.log("Error at function getImageResponse(url): %s",e)
 }
   
}
function getText(blobBase64){
/*
* LINEに送られた画像ファイルのバイナリから、Google Vision APIにかませて文字起こししたテキストを取得する
* @param{blob}: LINEに送られた画像ファイルのバイナリ
* @return {String}: テキスト形式の画像
* reference: 
*/
 try{
   var payload = JSON.stringify({
     "requests":[
       {
         "image": {
           "content": blobBase64
         }, 
         "features": [
           {
             "type": "LABEL_DETECTION", 
             "maxResults": 3
           }, 
           {
             "type": "TEXT_DETECTION",
             "maxResults": 1
           }
         ]
       }
     ]
   });
   var requestUrl = 'https://vision.googleapis.com/v1/images:annotate?key=' + VISION_ACCESS_TOKEN;
   var response = UrlFetchApp.fetch(requestUrl, {
           method: 'POST', 
           contentType: 'application/json', 
           payload: payload, 
           muteHttpExceptions: true
       });
   response = response.getContentText();
   Logger.log(response)
   var json = JSON.parse(response);
   var responses = json.responses
   for (i in responses){
     if (responses[i].fullTextAnnotation.text){
       text = responses[i].fullTextAnnotation.text
       Logger.log("以下のテキストを検出しました:%s", text)
       return text;
       }
   }
 } catch (e){
     Logger.log("Error at function getText(blobBase64): %s",e)  
 }
}
function postLine(text,reply_token){
/*
* LINEにテキストを返します
* @param{String}: 文字起こししたテキスト
*/
 try{    
   var messages = [
     {
       "type": "text",
       "text": text
     }
   ]
   var res = UrlFetchApp.fetch(LINE_END_POINT, {
     'headers': {
       'Content-Type': 'application/json; charset=UTF-8',
       'Authorization': 'Bearer ' + LINE_ACCESS_TOKEN,
     },
     'method': 'post',
     'payload': JSON.stringify({
       'replyToken': reply_token,
       'messages': messages,
     }),
   });
 } catch (e){
   Logger.log("Error at function postLine(text,reply_token): %s",e)  
 }
}