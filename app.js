importClass(android.provider.Settings);

if (!Settings.canDrawOverlays(context)) {
    toast("未获得悬浮窗权限，正在跳转至设置页...");
    floaty.requestPermission();
    var count = 0;
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
                <input id="intervalInput" inputType="number" text="3" textSize="12sp" w="60" marginLeft="2" marginRight="2" />
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
let lock = threads.lock();

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
            // interval大于1保证检测进程已经解除阻塞
            sleep(interval * 1000);
            if (!running) break;
            lock.lock();
            try {
                swipeDown(distance);
            } finally {
                lock.unlock();
                console.log("已执行一次滑动释放锁，等待下一次...");
            }
        }
    });

    monitorThread = threads.start(function () {
        while (running) { // 只要开关开着，就一直循环
            console.log("正在监控界面...");
            // 找到列表容器
            let recycler = id("recyclerView").findOnce();
            if (recycler) {
                let items = recycler.children();
                for (let i = 0; i < items.length; i++) {
                    let child = items[i];
                    let target = child.findOne(id("actButton"));
                    if (target) {
                        lock.lock(); //申请锁    
                        try {
                            console.log("找到观看视频按钮，已申请到锁，准备点击");
                            target.click();
                        } finally {
                            lock.unlock(); //释放锁
                        }
                        sleep(1000);
                        break; //不再检查后面的行
                    }
                }
            }

            let buyButton = className("android.widget.TextView")
                .textMatches(/^我要.*|.*加速.*/)
                .findOnce();
            if (buyButton) {
                lock.lock(); //申请锁
                try {
                    console.log("检测到我要***按钮，已申请到锁，正在点击...");
                    let bounds = buyButton.bounds();
                    let x = bounds.centerX();
                    let y = bounds.centerY();
                    click(x, y);
                } finally {
                    lock.unlock(); //释放锁
                }
                sleep(20000);; // 点击后跳转到新应用，睡眠20秒
                console.log("已经跳转20s，正在申请锁，准备切回steampy");
                // 加锁切回原应用
                lock.lock();
                try {
                    app.launchPackage("com.steampy.app");
                } finally {
                    lock.unlock();
                }
                console.log("已释放锁，切回 com.steampy.app");
                sleep(1000); // 等待界面稳定
            }


            sleep(100);
        }
    });
});

// 监听所有应用的 Toast
events.observeToast();
events.onToast(function (toast) {
    let pkg = toast.getPackageName();
    let text = toast.getText();

    // 只处理目标应用
    if (pkg === "com.steampy.app" && text == "观看结束，广告奖励发放有延迟，稍后查看") {
        closeAdsThread = threads.start(function () {
            lock.lock();
            try {
                console.log("观看完成，正在关闭广告界面...");
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
                    // 点击右上角关闭按钮
                    click(990, 199);
                    console.log("已点击右上角关闭按钮");          
                    if (currentActivity().endsWith("Portrait_Activity")) {
                        // 点击右上角另一个位置的关闭按钮
                        click(990, 95.5);
                         // 点击左上角关闭按钮
                        click(86, 176);
                        console.log("已点击左上角关闭按钮");
                    }
                }
            } finally {
                lock.unlock();
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
