// 监听所有应用的 Toast
events.observeToast();
console.log("当前活动: " + currentActivity());
activityList = []
pkgList = []
events.onToast(function(toast) {
    let pkg = toast.getPackageName();
    let text = toast.getText();
    
    // console.log("Toast来自: " + pkg);
    // console.log("当前活动: " + currentActivity());
    // console.log("内容: " + text);
    // 只处理目标应用
    // if (pkg === "com.steampy.app") {
    //     console.log("✅ 目标应用加速成功");
        
    // }
});
while(true) {   
    sleep(100);
    let current = currentActivity();
    android.widget.FrameLayout
    let pkg = currentPackage();
    if(current!="android.widget.FrameLayout"){
         console.log("当前活动: " + current);
    }
    if (!pkgList.includes(pkg)) {
        pkgList.push(pkg);
        
        // console.log("活动列表"+ activityList + " 包列表" + pkgList);
    }
    if (!activityList.includes(current)) {
        activityList.push(current);
        // console.log("当前活动: " + current);
        // console.log("活动列表"+ activityList + " 包列表" + pkgList);
    }
}

events.observeKey();
events.onKeyDown("volume_up", function() {
    let current = currentActivity();
    let pkg = currentPackage();
    console.log("当前包: " + pkg);
    console.log("当前活动: " + current);
    exit();
});

// 微信小程序游戏对应广告活动 com.qq.e.ads.PortraitADActivity
// 选择双开微信时的运行包: com.miui.securitycore
// 选择双开微信时的运行活动：miuix.appcompat.app.k,com.miui.xspace.ui.activity.XSpaceResolveActivity
// com.miui.xspace.ui.activity.XSpaceResolveActivity 选择双开应用时这个活动会一直触发


// 当前活动: com.bytedance.sdk.openadsdk.stub.activity.Stub_Standard_Portrait_Activity 
// com.bytedance.sdk.openadsdk.stub.activity.Stub_Standard_Portrait_Activity
// 当前活动: uj.a  kj.b
// 坐标 973 182 1007 216    center 990 199

// 保持脚本运行
// sleep(30000);

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