
// let intent = new Intent();
// intent.setComponent(new android.content.ComponentName(
//     "com.steampy.app",
//     "com.steampy.app.activity.buy.zeropurchase.info.ZeroBuyInfoActivity"
// ));
// intent.setFlags(
//     Intent.FLAG_ACTIVITY_NEW_TASK |
//     Intent.FLAG_ACTIVITY_CLEAR_TOP |
//     Intent.FLAG_ACTIVITY_SINGLE_TOP
// );
console.log(currentPackage());
console.log(currentActivity());
app.launchPackage("com.steampy.app");



// com.qq.e.ads.ADActivity 特殊广告页
// context.startActivity(intent);
// 微信小程序游戏对应广告活动 com.qq.e.ads.PortraitADActivity
// 选择双开微信时的运行包: com.miui.securitycore
// 选择双开微信时的运行活动：miuix.appcompat.app.k,com.miui.xspace.ui.activity.XSpaceResolveActivity
// com.miui.xspace.ui.activity.XSpaceResolveActivity 选择双开应用时这个活动会一直触发


// 当前活动: com.bytedance.sdk.openadsdk.stub.activity.Stub_Standard_Portrait_Activity 
// com.bytedance.sdk.openadsdk.stub.activity.Stub_Standard_Portrait_Activity
// 当前活动: uj.a  kj.b  com.steampy.app.activity.buy.zeropurchase.info.ZeroBuyInfoActivity
// 坐标 973 182 1007 216    center 990 199


// 临时脚本：按音量上键打印当前界面所有 
// TextViewtext=奖励将于15秒后发放 bounds=Rect(1626, 58 - 2001, 131) class=android.widget.TextView
// events.observeKey();
// events.onKeyDown("volume_up", function() {
//     let all = className("android.widget.TextView").find();
//     console.log("=== 当前所有文本控件 ===");
//     for (let w of all) {
//         console.log("text=" + w.text() + 
//                     " bounds=" + w.bounds() + 
//                     " class=" + w.className());
//     }
// });