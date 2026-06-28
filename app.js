importClass(android.provider.Settings);
auto();
if (!Settings.canDrawOverlays(context)) {
    toast("未获得悬浮窗权限，正在跳转至设置页...");
    floaty.requestPermission();
    let count = 0;
    while (!floaty.checkPermission() && count < 20) {
        sleep(500);
        count++;
    }
}

if (!Settings.canDrawOverlays(context)) {
    toast("未获得悬浮窗权限，脚本退出");
    exit();
}

var window = floaty.window(
    <frame id="container" w="match_parent" h="match_parent">
        <vertical bg="#cc1a1a2e" padding="10" w="160" gravity="center">
            <text id="titleBar" text="≡ 自动滑动" textColor="#ffffff" textSize="13sp" gravity="center" w="*" marginBottom="6" />
            <horizontal>
                <text text="间隔" textColor="#ffffff" textSize="11sp" gravity="center" />
                <input id="intervalInput" inputType="number" text="10" textSize="12sp" w="60" marginLeft="2" marginRight="2" />
                <text text="秒" textColor="#ffffff" textSize="11sp" gravity="center" />
            </horizontal>
            <horizontal marginTop="2">
                <text text="距离" textColor="#ffffff" textSize="11sp" gravity="center" />
                <input id="distanceInput" inputType="number" text="500" textSize="12sp" w="60" marginLeft="2" marginRight="2" />
                <text text="px" textColor="#ffffff" textSize="11sp" gravity="center" />
            </horizontal>
            <horizontal marginTop="6" gravity="center">
                <button id="startBtn" text="运行" textSize="11sp" w="60" h="32" />
                <button id="stopBtn" text="停止" textSize="11sp" w="60" h="32" marginLeft="6" enabled="false" />
            </horizontal>
            <text id="statusText" text="未运行" textColor="#aaffffff" textSize="10sp" gravity="center" marginTop="2" />
            <button id="closeBtn" text="✕" textSize="10sp" w="28" h="24" padding="0" gravity="center" layout_gravity="right|top" marginTop="-130" marginRight="-4" />
        </vertical>
    </frame>
);

window.setPosition(30, 200);
// setScreenMetrics(1080, 2400);

// ========== 1. 记录进程ID ==========
let myPid = android.os.Process.myPid();
console.log("═══════════════════════");
console.log("脚本启动 PID: " + myPid);
console.log("时间: " + new Date().toLocaleString());
console.log("═══════════════════════");

// // ========== 2. 心跳定时器（每500ms输出一次）==========
// let beatCount = 0;
// let heartBeat = setInterval(() => {
//     beatCount++;
//     let time = new Date().toLocaleTimeString();
//     let mem = getMemoryInfo();  // 获取内存信息
//     console.log("💓 心跳 #" + beatCount + " | " + time + " | 内存: " + mem + "MB");
// }, 500);

// // ========== 3. 获取内存信息的辅助函数 ==========
// function getMemoryInfo() {
//     let runtime = java.lang.Runtime.getRuntime();
//     let used = (runtime.totalMemory() - runtime.freeMemory()) / 1024 / 1024;
//     return used.toFixed(2);
// }

var inputList = [window.intervalInput, window.distanceInput];

function clearFocus() {
    window.disableFocus();
    inputList.forEach(function (input) {
        input.clearFocus();
    });
}

inputList.forEach(function (input) {
    input.on("touch_down", function () {
        window.requestFocus();
        input.requestFocus();
    });
});

var running = false;
var thread = null;
var monitorThread = null;
var closeAdsThread = null;
let appTimeMonitorTimer = null;
let appTimeMonitorThread = null;
var isPaused = threads.atomic(0);
// 点击几种广告按钮后，跳转回steampy前，阻塞 thread
var speedBtnIntc = threads.atomic(0);
// var lockScreen = threads.lock();
var lockScreen = new java.util.concurrent.locks.ReentrantLock();
let enterTime = 0;         // 进入当前 App 的时间戳
let actionTriggered = false; // 本次停留是否已触发过操作
let androidCurrentPackage = ""; 
const deviceWidth = device.width;
const deviceHeight = device.height;
const steampyPkg = "com.steampy.app";
const steampyActivity = "com.steampy.app.activity.buy.zeropurchase.info.ZeroBuyInfoActivity";
const rewardToastText = "观看结束，广告奖励发放有延迟，稍后查看";
const endToastText = "今日已无广告了";
const adsActivityKeyWord = "Portrait";
const subActivity1 = "uj.a";
const subActivity2 = "kj.b";
// 跳转其他app后 20s后返回
const otherAppSleepTime = 15 * 1000;
// 在其他app停留的最长时间
const otherAppMaxTime = 20 * 1000;


var downX, downY, winX, winY, isDragging = false;
function onWindowStateChanged(event) {
    let packageName = event.packageName;
    let currentClassName = event.className;
    // console.log(packageName +"  " + className);
    if (packageName === steampyPkg && currentClassName === steampyActivity) {
        threads.start(function () {
            let isExistWatchVideo = false;
            let recycler = id("recyclerView").findOne(1000);
            if (recycler) {
                let items = recycler.children();
                for (let i = 0; i < items.length; i++) {
                    if(isExistWatchVideo){
                        recycleView(items[i]);
                    }
                    let target = items[i].findOne(id("actButton"));
                    if (target) {
                        isExistWatchVideo = true;
                        if (lockScreen.tryLock(3000, java.util.concurrent.TimeUnit.MILLISECONDS)) {
                            try {
                                console.log("找到观看视频按钮,申请到锁：");
                                target.click();
                            } finally { 
                                    lockScreen.unlock();
                                    // 解除对滑动屏幕线程的阻塞   
                                    speedBtnIntc.set(0);
                            }                            
                        }else{
                            console.log("观看视频按钮点击不成功，未申请到锁");
                        }
                        recycleView(target);
                    }
                    recycleView(items[i]);
                }
                items = null;
            }
            recycleView(recycler);
        });
    }
}

auto.registerEvent("WINDOW_STATE_CHANGED", function (event) {
    if(!running){
        return;
    }
    onWindowStateChanged(event);
});
window.titleBar.setOnTouchListener(function (view, event) {
    switch (event.getAction()) {
        case event.ACTION_DOWN:
            isDragging = false;
            downX = event.getRawX();
            downY = event.getRawY();
            winX = window.getX();
            winY = window.getY();
            return true;
        case event.ACTION_MOVE:
            var dx = event.getRawX() - downX;
            var dy = event.getRawY() - downY;
            if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
                isDragging = true;
            }
            window.setPosition(winX + dx, winY + dy);
            return true;
        case event.ACTION_UP:
            if (!isDragging) {
                clearFocus();
            }
            return true;
    }
    return false;
});

window.container.setOnTouchListener(function (view, event) {
    if (event.getAction() == event.ACTION_DOWN) {
        clearFocus();
    }
    return false;
});


window.startBtn.on("click", function () {
    clearFocus();
    var interval = parseInt(window.intervalInput.text());
    var distance = parseInt(window.distanceInput.text());

    if (isNaN(interval) || interval <= 0) {
        toast("请输入有效间隔时间");
        return;
    }
    if (isNaN(distance) || distance <= 0) {
        toast("请输入有效滑动距离");
        return;
    }

    running = true;
    window.startBtn.setEnabled(false);
    window.stopBtn.setEnabled(true);
    window.intervalInput.setEnabled(false);
    window.distanceInput.setEnabled(false);
    window.statusText.setText("运行中: 每" + interval + "秒滑动");

    onWindowStateChanged({packageName: steampyPkg, className: steampyActivity});

    thread = threads.start(function () {
        while (running) {
            // interval大于1保证检测进程已经解除阻塞
            sleep(interval * 1000);
            if (!running) break;
            if (isPaused.get() === 1 && speedBtnIntc.get() === 1) {
                sleep(1000);
                console.log("滑动线程被关闭广告线程阻塞");
                continue;
            }
            lockScreen.lockInterruptibly();
            try {
                swipeDown(distance);
            } finally {
                lockScreen.unlock();
                console.log("已执行一次滑动释放锁，等待下一次...");
            }
        }
    });

    monitorThread = threads.start(function () {
        let nextPrintTime = Date.now() + 10000;
        let clickAdsButtonCount = 0;
        while (running) { // 只要开关开着，就一直循环
            if (isPaused.get() === 1) {
                sleep(1000);
                console.log("监控线程被关闭广告线程阻塞");
                continue;
            }
            let now = Date.now();
            // 间隔大于等于5秒
            if (now > nextPrintTime) {
                console.log("monitorThread心跳" + new Date().toLocaleTimeString());
                nextPrintTime = now + 10000; // 更新标记时间
            }
            // // 找到列表容器
            // let recycler = id("recyclerView").findOnce();
            // if (recycler) {
            //     let items = recycler.children();
            //     for (let i = 0; i < items.length; i++) {
            //         let child = items[i];
            //         let target = child.findOne(id("actButton"));
            //         if (target) {
            //             lockScreen.lock(); //申请锁    
            //             try {
            //                 console.log("找到观看视频按钮，已申请到锁，准备点击");
            //                 target.click();
            //             } finally {
            //                 lockScreen.unlock(); //释放锁
            //             }
            //             sleep(1000);
            //             break; //不再检查后面的item
            //         }
            //     }
            // }

            // 检测为微信小游戏广告
            let gameButton = className("android.widget.TextView")
                .textMatches(/.*微信.*/)
                .findOnce();
            if (gameButton) {
                let bounds = gameButton.bounds();
                let x = bounds.centerX();
                let y = bounds.centerY();
                recycleView(gameButton);
                lockScreen.lockInterruptibly(); //申请锁
                try {
                    console.log("检测到小游戏广告，已申请到锁，准备点击..." + "按钮文本：" + gameButton.text());                   
                    click(x, y);
                    sleep(500);
                    // id : com.miui.securitycore:id/app1   id : com.miui.securitycore:id/app2;
                    let wxView = id("app1").findOnce();
                    if (wxView) {
                        console.log("点击weixin");
                        wxView.click();
                        recycleView(wxView);
                    }
                } finally {
                    lockScreen.unlock(); //释放锁
                }
                sleep(otherAppSleepTime); // 点击后跳转到wx休眠
                console.log("微信小程序已经跳转" + otherAppSleepTime / 1000 + "s，正在申请锁，准备切回steampy");
                lockScreen.lockInterruptibly();
                try {
                    app.launchPackage(steampyPkg);
                } finally {
                    lockScreen.unlock();
                    console.log("已释放锁，从微信切回" + steampyPkg);
                }
                sleep(1000); // 等待界面稳定
                continue;
            }

            sleep(100);//有时候会检测到左上角 去加速，“我要***”会过一会才出现
            let buyButton = className("android.widget.TextView")
                .textMatches(/^我要.*/)
                .findOnce();
            if(buyButton){
                console.log("检测到我要***按钮：" + buyButton.text());
            }

            let speedButton = className("android.widget.TextView")
                .textMatches(/.*加速.*/)
                .findOnce();

            let clickAdsButton = className("android.widget.TextView")
                .textMatches(/点击广告拿奖励/)
                .findOnce();

            let continueBtn = className("android.widget.TextView")
                                 .textMatches(/.*继续.*/)
                                 .findOnce() || 
                              className("android.widget.Button")
                                 .textMatches(/.*继续.*/)
                                 .findOnce();

            /* 广告页的干扰项，广告中的“继续” 文本不是目标文本
               目标文本是不可识别的弹窗，处理逻辑是检测到 加速=》点击固定位置
               为了避免干扰项，正常走到 speedbtn的处理逻辑 1.提前使干扰的continuebtn=null
               坐标明显不对的就是干扰的continuebtn
               2. 把continuebtn的逻辑移到speedbtn后边，不要跟buybtn合并
            // */
            // if(continueBtn){  
            //     if(continueBtn.centerX() <= deviceWidth/4 || continueBtn.centerY() <= deviceHeight/4 || 
            //         continueBtn.centerY() >= deviceHeight*3/4){
            //         console.log("按钮文本是:"+ continueBtn.text());
            //         continueBtn = null;                  
            //     }
            // }


            //monitor休眠时 toast已领取奖励，monitor休眠后点击跳过，出现的弹窗
            // 需要进行点击避免卡死
            // let continueBtnGetReward = id("continue_button").findOnce();

            if (buyButton || speedButton || continueBtn || clickAdsButton ) {
                lockScreen.lockInterruptibly(); //申请锁
                try {
                    let x, y, bounds;
                    let xOffset = 0;
                    let yOffset = 0;
                    // let btn = buyButton || continueBtn;
                    if (buyButton) {
                        console.log("检测到可点击广告按钮" + buyButton.text() + "，已申请到锁，正在点击...");
                        bounds = buyButton.bounds();
                        x = bounds.centerX();
                        y = bounds.centerY();
                    }else if (speedButton) {
                        // 识别不到中间的弹窗  使用固定位置
                        console.log("检测到按钮:" + speedButton.text() + "，已申请到锁，正在点击...");
                        // x = 555;
                        x = 800;
                        y = 1460;
                    } else if (continueBtn) {
                        console.log("检测到按钮:" + continueBtn.text() + "，已申请到锁，正在点击...");
                        bounds = continueBtn.bounds();
                        x = bounds.centerX();
                        y = bounds.centerY();
                    } else {
                        // clickAdsButtonCount++;
                        // if (clickAdsButtonCount === 1) {
                            sleep(1000);
                            let newClickAdsButton = className("android.widget.TextView")
                                .textMatches(/点击广告拿奖励/)
                                .findOnce();
                            // bounds = clickAdsButton.bounds();
                            // x = bounds.centerX();
                            // y = bounds.centerY();
                            // console.log("首次检测到广告的位置 点击坐标: " + x + ", " + y);
                            // if (!newClickAdsButton) {
                            //     console.log("等待100ms后页面就检测不到");
                            // }else{
                                bounds = newClickAdsButton.bounds();
                                x = bounds.centerX();
                                y = bounds.centerY();
                                console.log("等待100ms后检测到广告的位置 点击坐标: " + newClickAdsButton.bounds().centerX() 
                                + ", " + newClickAdsButton.bounds().centerY());
                            // }
                            recycleView(newClickAdsButton);
                            // continue;
                        // } else {
                        //     clickAdsButtonCount = 0;
                        //     bounds = clickAdsButton.bounds();
                        //     x = bounds.centerX();
                        //     y = bounds.centerY() - 80;//文字位置偏下，向上偏移
                        //     // sleep(5000);
                        //     longClick(x, y);
                        //     console.log("检测到按钮:" + clickAdsButton.text() + "点击坐标: " + x + ", " + y);
                        //     sleep(5000);
                        //     if(currentPackage() != steampyPkg){
                        //         console.log("第二次检测手势按钮点击成功");
                        //     }
                        // }
                    }
                    gesture(120, [x, y], [x, y]);
                    sleep(100);
                    if(currentPackage() === steampyPkg && bounds) {  // 没发生跳转，可能按钮在靠右边的位置
                        xOffset = bounds.width()/3;
                        // x += 60;
                        x += xOffset;
                        click(x, y);
                        sleep(100);
                        if(currentPackage() === steampyPkg){
                            yOffset = bounds.height()*0.37;
                            y += yOffset;
                            click(x, y);
                        }
                    }
                    let wxView = id("app1").findOnce();
                    // 弹出双开应用，表明是小程序广告，要进行选择
                    if (wxView) {
                        wxView.click();
                        recycleView(wxView);

                    }
                    console.log("监控线程最终点击位置 点击坐标: " + x + ", " + y);
                    // 点击广告页的弹窗，页面没有跳转，所以需要进入下一次循环来继续识别按钮
                    if(currentPackage() === steampyPkg){
                        continue;
                    }
                    //发生了跳转，是继续按钮，跳转后需要滑动屏幕，解除滑动线程的阻塞 
                    //其他场景是点击观看视频 后 在windowschanged中解除阻塞
                    if (continueBtn) {
                        console.log("点了很久也没跳转，而且有continuebtn，解除对滑动线程的阻塞");
                        speedBtnIntc.set(0);
                    }
                } finally {
                    lockScreen.unlock(); //释放锁
                    recycleView(buyButton);
                    recycleView(speedButton);
                    recycleView(clickAdsButton);
                    recycleView(continueBtn);
                }
                // sleep(otherAppSleepTime); // 点击后跳转到新应用，monitorThread睡眠20秒
                // console.log("已经跳转20s，正在申请锁，准备切回steampy");
                // pkg = currentPackage();
                // activity = currentActivity();
                // if (pkg === steampyPkg && activity.includes(adsActivityKeyWord)) {
                    // 看的是原应用的广告，无需跳转，直接退出广告，没有toast通知
                    // 有这种情况吗 待确定
                    // console.log("浏览steampy广告未发生跳转，正在申请锁，准备退出广告")
                    // exitAds();
                // } else if (pkg !== steampyPkg) {
                    // pkg !== steampyPkg才进行切回
                    // 有可能跳转时就产生了奖励toast,这时在toast处理函数中切回steampy并关闭广告,
                    // 则monitorThread休眠20s后不用再切回steampy，
                    
                    // 切回后无需滑动屏幕，设置speedBtnIntc阻塞该线程
                    // speedBtnIntc.set(1);
                    // sleep(100);//休眠100ms让滑动线程被speedBtnIntc阻塞
                    // 加锁切回原应用
                    // lockScreen.lockInterruptibly();
                    // try {
                    //     app.launchPackage(steampyPkg);
                    // } finally {
                    //     lockScreen.unlock();
                    //     console.log("已释放锁，切回" + steampyPkg);
                    // }
                // }
                sleep(1000); // 等待界面稳定
                continue;
            }
            sleep(1000);
        }
    });

    appTimeMonitorThread = threads.start(function () {
        // 定时检测循环
        appTimeMonitorTimer = setInterval(() => {
            let pkg = currentPackage(); // 获取当前前台包名（需无障碍权限）

            // 如果包名为空（如锁屏、桌面切换中），忽略本次检测
            if (!pkg) return;

            if (pkg !== androidCurrentPackage) {
                // 切换到了新 App，重置所有状态
                androidCurrentPackage = pkg;
                enterTime = Date.now();
                actionTriggered = false;
            } else if (pkg !== steampyPkg) {
                // 非 steampyPkg，计算已停留时间
                let elapsed = Date.now() - enterTime;
                // if (!actionTriggered && elapsed >= otherAppMaxTime) {
                if (elapsed >= otherAppMaxTime) {
                    actionTriggered = true; // 防止重复触发
                    console.log("超时发生，准备切回，已停留在" + pkg + elapsed + "ms");

                    //超时切回的逻辑都移植到这里 切回后无需滑动屏幕，设置speedBtnIntc阻塞该线程
                    speedBtnIntc.set(1);
                    sleep(100);//休眠100ms让滑动线程被speedBtnIntc阻塞

                    // 切回steampy
                    lockScreen.lockInterruptibly();
                    try {
                        app.launchPackage(steampyPkg);
                        sleep(100);
                        //特殊广告页，停在这里会接收不到toast，需要跳转
                        if (currentActivity() === "com.qq.e.ads.ADActivity") {
                            console.log("尝试关闭京东广告页面")
                            click(1020.5, 167);
                        }
                    } finally {
                        lockScreen.unlock();
                    }
                    
                }
            }
            if (pkg === steampyPkg && !isSteamPyActivity(currentActivity())) {
                // 海南合创共响网络科技有限公司
                let quickApp = className("android.widget.TextView")
                    .textMatches(/^海南合创共响网络科技有限公司.*/)
                    .findOnce();
                if (quickApp) {
                    console.log("quickapp");
                    click(163, 166);
                }
            }
            
                
       
        }, 1000); // 每秒检测一次，平衡性能与精确度
    });

    


});

// 监听所有应用的 Toast
events.observeToast();
events.onToast(function (toast) {
    let pkg = toast.getPackageName();
    let text = toast.getText();

    // 只处理目标应用
    if (pkg === steampyPkg ) {
        if (text === rewardToastText) {
            closeAdsThread = threads.start(function () {
                isPaused.set(1);
                try {
                    sleep(500); 
                    let pkgAfterSleep = currentPackage();
                    console.log("已接收到奖励toast，已休眠500ms确保阻塞其他进程，此时pkg: " + pkgAfterSleep);
                    if (pkgAfterSleep !== steampyPkg) {
                        // 说明点击广告时直接发放奖励，点击后跳转到了其他app，需要先回到steampy再执行退出操作
                        console.log("奖励toast播报时切到了其他app，正在申请锁切回" + steampyPkg);
                        lockScreen.lockInterruptibly();
                        try {
                            app.launchPackage(steampyPkg);
                            sleep(100);
                            if (currentPackage() !== steampyPkg){
                                console.log("二次跳转");
                                app.launchPackage(steampyPkg);
                            }
                        } finally {
                            lockScreen.unlock();
                        }
                    }
                    exitAds();
                } finally {
                    isPaused.set(0);
                }
            });
        }else if(text === endToastText){
            toast("奖券达到上限");
            exit();
        }
    }
})
events.on("exit", function(){
    stopScript();
    auto.removeEvent("WINDOW_STATE_CHANGED");
    events.removeAllListeners("toast");
    events.removeAllTouchListeners();
    events.removeToastObserver();
    if(appRunningTimer){
        clearInterval(appRunningTimer);
        appRunningTimer = null;
    }
    window.close();
    
})

window.closeBtn.on("click", function () {
    exit();
});

window.stopBtn.on("click", function () {
    clearFocus();
    stopScript();
    restoreDefaultWindow();
    toast("脚本已停止");
});

function restoreDefaultWindow(){
    window.startBtn.setEnabled(true);
    window.stopBtn.setEnabled(false);
    window.intervalInput.setEnabled(true);
    window.distanceInput.setEnabled(true);
    window.statusText.setText("未运行");
}
function stopScript() {
    running = false;
    // if (thread) {
    //     thread.interrupt();
    //     thread = null;
    // }
    // if (monitorThread) {
    //     monitorThread.interrupt();
    //     monitorThread = null;
    // }
    // if (closeAdsThread) {
    //     closeAdsThread.interrupt();
    //     closeAdsThread = null;
    // }
    // if(appTimeMonitorThread){
    //     appTimeMonitorThread.interrupt();
    //     appTimeMonitorThread = null;
    // }

    if (appTimeMonitorTimer) {
        clearInterval(appTimeMonitorTimer);
        appTimeMonitorTimer = null;
    }  
    threads.shutDownAll();
    auto.clearCache();
}

function swipeDown(distance) {
    var x = device.width / 2;
    var y1 = device.height * 0.7;
    var y2 = y1 - distance;
    swipe(x, y1, x, y2, 600);
}

function exitAds() {
    lockScreen.lockInterruptibly();
    sleep(1000); // 等待界面稳定
    let originActivity = currentActivity()
    if(isSteamPyActivity(originActivity)){
        console.log(originActivity+ "查看日志,发生重复退出广告");
        return;
    }
    console.log("观看完成，已获得锁，正在关闭广告界面...");
    try {
        // 1. 先退出干扰弹窗
        let skipDisturbButton = className("android.widget.Button").text("坚持退出").findOnce();
        if (skipDisturbButton) {
            skipDisturbButton.click();
            console.log("已点击坚持退出按钮，正在退出干扰弹窗" + "，当前活动: " + currentActivity());
            recycleView(skipDisturbButton);
        }
        // 2. 有跳过按钮则点击跳过按钮
        let skipButton = className("android.widget.TextView")
            .textMatches(/.*跳过.*/)
            .findOnce();
        if (skipButton) {
            console.log("检测到跳过按钮，正在点击...");
            let bounds = skipButton.bounds();
            recycleView(skipButton);
            let x = bounds.centerX();
            let y = bounds.centerY();
            click(x, y);
        } else {
            // 3. 尝试 点击右上角和左上角
            click(990, 199);
            console.log("已点击右上角坐标" + "，当前活动: " + currentActivity());
            sleep(100);
            if (!isSteamPyActivity(currentActivity())) {
                // if (currentActivity().endsWith("Portrait_Activity")) {
                // 点击右上角另一个位置的关闭按钮
                // click(990, 95.5);
                gesture(120, [987.5, 95.5], [992, 98]);
                // 点击左上角关闭按钮
                click(86, 176);
                console.log("点击了(86, 176)" + "已点击左上角关闭按钮")
            }
        }
    } finally {
        lockScreen.unlock();
    }
}

function recycleView(view) {
    if (view) {
        view.recycle();
        view = null;
    }
}

function isSteamPyActivity(activity){
    if(activity === steampyActivity || activity === subActivity1 || activity === subActivity2){
        return true;
    }
    return false;
}

let appRunningTimer = setInterval(() => { }, 1000);

// ^	匹配行的开始 $	匹配行的结束 .	匹配除换行符以外的任意字符。 *	匹配前面的子表达式零次或多次
// ?	匹配前面的子表达式零次或一次  +	匹配前面的子表达式一次或多次
// {n}	匹配前面出现的子表达式恰好 n 次  {n,}	匹配前面出现的子表达式至少 n 次
//  {n,m}	匹配前面出现的子表达式至少 n 次，至多 m 次


// id("ff60eb").waitFor()
// id("bc542e").findOne().click()
// centerX(790).centerY(94, 95)
// id("cccdd1").findOne().click()
// className("android.widget.TextView").text("打开App体验15秒，即可获得奖励").findOne().click()
