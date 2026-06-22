// 监听所有应用的 Toast
events.observeToast();
console.log("当前活动: " + currentActivity());
activityList = []
events.onToast(function(toast) {
    let pkg = toast.getPackageName();
    let text = toast.getText();
    
    console.log("Toast来自: " + pkg);
    console.log("当前活动: " + currentActivity());
    console.log("内容: " + text);
    // 只处理目标应用
    // if (pkg === "com.steampy.app") {
    //     console.log("✅ 目标应用加速成功");
        
    // }
});
while(true) {
    sleep(100);
    let current = currentActivity();
    if (!activityList.includes(current)) {
        activityList.push(current);
        console.log("当前活动: " + current);
    }
}

// com.qq.e.ads.PortraitADActivity   
// 当前活动: com.bytedance.sdk.openadsdk.stub.activity.Stub_Standard_Portrait_Activity 
// com.bytedance.sdk.openadsdk.stub.activity.Stub_Standard_Portrait_Activity
// 当前活动: uj.a  kj.b
// 坐标 973 182 1007 216    center 990 199

// 保持脚本运行
// sleep(30000);

// 临时脚本：按音量上键打印当前界面所有 
// TextViewtext=奖励将于15秒后发放 bounds=Rect(1626, 58 - 2001, 131) class=android.widget.TextView
events.observeKey();
events.onKeyDown("volume_up", function() {
    let all = className("android.widget.TextView").find();
    console.log("=== 当前所有文本控件 ===");
    for (let w of all) {
        console.log("text=" + w.text() + 
                    " bounds=" + w.bounds() + 
                    " class=" + w.className());
    }
});