importClass(android.provider.Settings);

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
                <input id="intervalInput" inputType="number" text="5" textSize="12sp" w="60" marginLeft="2" marginRight="2" />
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
setScreenMetrics(1080, 2400);

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
let isPaused = threads.atomic(0);
let lockScreen = threads.lock();
let wxGameSleepTime = 5000;

var downX, downY, winX, winY, isDragging = false;
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

window.closeBtn.on("click", function () {
    stopScript();
    window.close();
    exit();
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


    thread = threads.start(function () {
        while (running) {
            if (isPaused.get() === 1) {
                sleep(1000);
                console.log("滑动线程被关闭广告线程阻塞");
                continue;
            }
            // interval大于1保证检测进程已经解除阻塞
            sleep(interval * 1000);
            if (!running) break;
            lockScreen.lock();
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
            // 找到列表容器
            let recycler = id("recyclerView").findOnce();
            if (recycler) {
                let items = recycler.children();
                for (let i = 0; i < items.length; i++) {
                    let child = items[i];
                    let target = child.findOne(id("actButton"));
                    if (target) {
                        lockScreen.lock(); //申请锁    
                        try {
                            console.log("找到观看视频按钮，已申请到锁，准备点击");
                            target.click();
                        } finally {
                            lockScreen.unlock(); //释放锁
                        }
                        sleep(1000);
                        break; //不再检查后面的item
                    }
                }
            }

            // 检测为微信小游戏广告
            let gameButton = className("android.widget.TextView")
                .textMatches(/.*微信小游戏.*/)
                .findOnce();
            if (gameButton) {
                lockScreen.lock(); //申请锁
                try {
                    console.log("检测到小游戏广告，已申请到锁，准备点击...");
                    let bounds = gameButton.bounds();
                    let x = bounds.centerX();
                    let y = bounds.centerY();
                    click(x, y);
                    sleep(100);
                    let wxView = id("icon").className("android.widget.ImageView")
                        .desc("微信").findOnce().parent();
                    if (wxView) {
                        let wxBounds = wxView.bounds();
                        let wxX = wxBounds.centerX();
                        let wxY = wxBounds.centerY();
                        click(wxX, wxY);
                    }
                } finally {
                    lockScreen.unlock(); //释放锁

                }

                sleep(wxGameSleepTime); // 点击后跳转到wx休眠5s
                console.log("微信小程序已经跳转5s，正在申请锁，准备切回steampy");
                lockScreen.lock();
                try {
                    app.launchPackage("com.steampy.app");
                } finally {
                    lockScreen.unlock();
                    console.log("已释放锁，切回 com.steampy.app");
                }
                sleep(1000); // 等待界面稳定
                continue;
            }


            let buyButton = className("android.widget.TextView")
                .textMatches(/^我要.*/)
                .findOnce();

            let speedButton = className("android.widget.TextView")
                .textMatches(/.*加速.*/)
                .findOnce();

            let clickAdsButton = className("android.widget.TextView")
                .textMatches(/点击广告拿奖励/)
                .findOnce();

            if (buyButton || speedButton || clickAdsButton) {
                lockScreen.lock(); //申请锁
                try {
                    let x, y;
                    if (buyButton) {
                        console.log("检测到按钮:" + buyButton.text() + "，已申请到锁，正在点击...");
                        let bounds = buyButton.bounds();
                        x = bounds.centerX();
                        y = bounds.centerY();
                    } else if (speedButton) {
                        console.log("检测到按钮:" + speedButton.text() + "，已申请到锁，正在点击...");
                        // x = 555;
                        x = 800;
                        y = 1460;
                    } else {
                        clickAdsButtonCount++;
                        if (clickAdsButtonCount === 1) {
                            sleep(100);
                            let newClickAdsButton = className("android.widget.TextView")
                                .textMatches(/点击广告拿奖励/)
                                .findOnce();
                            let bounds = clickAdsButton.bounds();
                            x = bounds.centerX();
                            y = bounds.centerY();
                            console.log("首次点击广告位置 点击坐标: " + x + ", " + y);
                            continue;
                        } else {
                            clickAdsButtonCount = 0;
                            console.log("检测到按钮:" + clickAdsButton.text() + "，已申请到锁，正在点击...");
                            let bounds = clickAdsButton.bounds();
                            x = bounds.centerX();
                            y = bounds.centerY() - 80;//文字位置偏下，向上偏移
                            console.log(clickAdsButton.text() + "点击坐标: " + x + ", " + y);

                            clickWithFlash(x, y);
                        }
                    }
                    click(x, y);
                    console.log("监控线程最终点击位置 点击坐标: " + x + ", " + y);
                } finally {
                    lockScreen.unlock(); //释放锁
                }
                sleep(20000);; // 点击后跳转到新应用，睡眠20秒
                console.log("已经跳转20s，正在申请锁，准备切回steampy");
                pkg = currentPackage();
                activity = currentActivity();
                if (pkg === "com.steampy.app" && activity !== "com.steampy.app.activity.buy.zeropurchase.info.ZeroBuyInfoActivity") {
                    // 看的是原应用的广告，无需跳转，直接退出广告，没有toast通知
                    console.log("浏览steampy广告未发生跳转，正在申请锁，准备退出广告")
                    exitAds(lockScreen);
                } else if (pkg !== "com.steampy.app") {
                    // 有可能跳转时就产生了奖励toast,这时在toast处理函数中切回steampy并关闭广告，
                    // 这种情况下monitorThread休眠20s后不用再切回steampy
                    // 加锁切回原应用
                    lockScreen.lock();
                    try {
                        app.launchPackage("com.steampy.app");
                    } finally {
                        lockScreen.unlock();
                        console.log("已释放锁，切回 com.steampy.app");
                    }
                }
                sleep(1000); // 等待界面稳定
                continue;
            }



            sleep(1000);
        }
    });
});

// 监听所有应用的 Toast
events.observeToast();
events.onToast(function (toast) {
    let pkg = toast.getPackageName();
    let text = toast.getText();

    // 只处理目标应用
    if (pkg === "com.steampy.app" && text === "观看结束，广告奖励发放有延迟，稍后查看") {
        closeAdsThread = threads.start(function () {
            isPaused.set(1);
            try {
                sleep(500);
                let pkgAfterSleep = currentPackage();
                console.log("已接收到奖励toast，已阻塞其他进程，已休眠500ms，此时pkg: " + pkgAfterSleep);
                if (pkgAfterSleep !== "com.steampy.app") {
                    // 说明点击广告时直接发放奖励，点击后跳转到了其他app，需要先回到steampy再执行退出操作
                    console.log("奖励toast播报时切到了其他app，正在申请锁切回steampy");
                    lockScreen.lock();
                    try {
                        app.launchPackage("com.steampy.app");
                    } finally {
                        lockScreen.unlock();
                    }
                }
                exitAds(lockScreen);
            } finally {
                isPaused.set(0);
            }
        });
    }
})

window.stopBtn.on("click", function () {
    clearFocus();
    stopScript();
    toast("脚本已停止");
});

function stopScript() {
    running = false;
    if (thread) {
        thread.interrupt();
        thread = null;
    }
    if (monitorThread) {
        monitorThread.interrupt();
        monitorThread = null;
    }
    if (closeAdsThread) {
        closeAdsThread.interrupt();
        closeAdsThread = null;
    }
    window.startBtn.setEnabled(true);
    window.stopBtn.setEnabled(false);
    window.intervalInput.setEnabled(true);
    window.distanceInput.setEnabled(true);
    window.statusText.setText("未运行");
}

function swipeDown(distance) {
    var x = device.width / 2;
    var y1 = device.height * 0.7;
    var y2 = y1 - distance;
    swipe(x, y1, x, y2, 600);
}

function exitAds(lock) {
    lock.lock();
    sleep(1000); // 等待界面稳定
    console.log("观看完成，已获得锁，正在关闭广告界面...");
    try {
        // 1. 先退出干扰弹窗
        let skipDisturbButton = className("android.widget.Button").text("坚持退出").findOnce();
        if (skipDisturbButton) {
            skipDisturbButton.click();
            console.log("已点击坚持退出按钮，正在退出干扰弹窗" + "，当前活动: " + currentActivity());
        }
        // 2. 有跳过按钮则点击跳过按钮
        let skipButton = className("android.widget.TextView")
            .textMatches(/.*跳过.*/)
            .findOnce();
        if (skipButton) {
            console.log("检测到跳过按钮，正在点击...");
            let bounds = skipButton.bounds();
            let x = bounds.centerX();
            let y = bounds.centerY();
            click(x, y);
        } else {
            // 3. 尝试 点击右上角和左上角
            click(990, 199);
            console.log("已点击右上角坐标" + "，当前活动: " + currentActivity());
            sleep(100);
            if (!currentActivity().endsWith("ZeroBuyInfoActivity")) {
                // if (currentActivity().endsWith("Portrait_Activity")) {
                // 点击右上角另一个位置的关闭按钮
                click(990, 95.5);
                // 992 98
                console.log("点击了(990, 95.5)")
                // 点击左上角关闭按钮
                click(86, 176);
                console.log("点击了(86, 176)")
                console.log("已点击左上角关闭按钮");
            }
        }
    } finally {
        lockScreen.unlock();
    }
}

function clickWithFlash(x, y) {
    // 1. 创建一个浮窗，显示红色圆点
    let w = floaty.window(
        <frame w="80" h="80">
            <view w="80" h="80" bg="#FFFF0000" alpha="0.6" radius="40" />
        </frame>
    );
    // 将浮窗定位到点击坐标（让圆点中心对准点击位置）
    w.setPosition(x - 40, y - 40);
}
setInterval(() => { }, 1000);

// ^	匹配行的开始 $	匹配行的结束 .	匹配除换行符以外的任意字符。 *	匹配前面的子表达式零次或多次
// ?	匹配前面的子表达式零次或一次  +	匹配前面的子表达式一次或多次
// {n}	匹配前面出现的子表达式恰好 n 次  {n,}	匹配前面出现的子表达式至少 n 次
//  {n,m}	匹配前面出现的子表达式至少 n 次，至多 m 次


// id("ff60eb").waitFor()
// id("bc542e").findOne().click()
// centerX(790).centerY(94, 95)
// id("cccdd1").findOne().click()
// className("android.widget.TextView").text("打开App体验15秒，即可获得奖励").findOne().click()
