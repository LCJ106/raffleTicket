var classNameSet = new Set(); // 用于存储已经打印过的className，避免重复打印

// 遍历当前页面的所有控件
function traverseViews(view) {
  if (view) {
    var className = view.className();
    var bounds = view.bounds();

    if (!classNameSet.has(className)) {
      
      classNameSet.add(className);
    }
    console.log(className, bounds, "; text:"+view.text()+"; id:"+view.id()+"; desc:"+view.desc());
    // 如果控件是容器类型，则继续遍历其子控件
    if (view.childCount() > 0) {
      for (var i = 0; i < view.childCount(); i++) {
        var childView = view.child(i);
        traverseViews(childView);
      }
    }
  }
}

// 获取当前页面的根控件
// var root = className("android.widget.FrameLayout").findOne();
var root = auto.windows[0];

// 开始遍历
traverseViews(root);
// 800 1580       

// 跳转后=》切回steampy
// // 20:15:38.642/V: 开始运行 [$remote/getNodeTree.js].
// 20:15:38.647/D: android.widget.FrameLayout Rect(0, 0 - 1080, 2400) ; text:; id:null; desc:null
// 20:15:38.648/D: android.widget.LinearLayout Rect(0, 0 - 1080, 2400) ; text:; id:null; desc:null
// 20:15:38.648/D: android.widget.FrameLayout Rect(0, 0 - 1080, 2400) ; text:; id:null; desc:null
// 20:15:38.648/D: android.widget.LinearLayout Rect(0, 0 - 1080, 2400) ; text:; id:com.miui.securitycore:id/action_bar_root; desc:null
// 20:15:38.648/D: android.widget.FrameLayout Rect(0, 0 - 1080, 2400) ; text:; id:android:id/content; desc:null
// 20:15:38.648/D: android.widget.FrameLayout Rect(0, 0 - 1080, 2400) ; text:; id:com.miui.securitycore:id/dialog_root_view; desc:null
// 20:15:38.648/D: android.view.View Rect(0, 0 - 1080, 2400) ; text:; id:com.miui.securitycore:id/dialog_dim_bg; desc:null
// 20:15:38.648/D: android.widget.LinearLayout Rect(33, 1705 - 1047, 2322) ; text:; id:com.miui.securitycore:id/parentPanel; desc:null
// 20:15:38.648/D: android.widget.LinearLayout Rect(33, 1771 - 1047, 1883) ; text:; id:com.miui.securitycore:id/topPanel; desc:null
// 20:15:38.648/D: android.widget.TextView Rect(132, 1771 - 948, 1839) ; text:请选择要使用的应用; id:com.miui.securitycore:id/alertTitle; desc:null
// 20:15:38.649/D: android.widget.ScrollView Rect(33, 1883 - 1047, 2096) ; text:; id:null; desc:null
// 20:15:38.649/D: android.view.ViewGroup Rect(33, 1883 - 1047, 2096) ; text:; id:com.miui.securitycore:id/contentPanel; desc:null
// 20:15:38.649/D: android.widget.FrameLayout Rect(33, 1883 - 1047, 2096) ; text:; id:android:id/custom; desc:null
// 20:15:38.649/D: android.widget.LinearLayout Rect(33, 1883 - 1047, 2096) ; text:; id:null; desc:null
// 20:15:38.649/D: android.widget.LinearLayout Rect(132, 1897 - 948, 2096) ; text:; id:null; desc:null
// 20:15:38.649/D: android.widget.LinearLayout Rect(182, 1897 - 540, 2096) ; text:; id:com.miui.securitycore:id/app1; desc:null
// 20:15:38.649/D: android.widget.FrameLayout Rect(299, 1897 - 422, 2020) ; text:; id:com.miui.securitycore:id/masklayout; desc:null
// 20:15:38.649/D: android.widget.ImageView Rect(299, 1897 - 422, 2020) ; text:; id:android:id/icon; desc:微信
// 20:15:38.649/D: android.widget.TextView Rect(325, 2020 - 397, 2096) ; text:微信; id:android:id/text1; desc:null
// 20:15:38.649/D: android.widget.LinearLayout Rect(540, 1897 - 898, 2096) ; text:; id:com.miui.securitycore:id/app2; desc:null
// 20:15:38.649/D: android.widget.FrameLayout Rect(657, 1897 - 780, 2020) ; text:; id:com.miui.securitycore:id/masklayout; desc:null
// 20:15:38.649/D: android.widget.ImageView Rect(657, 1897 - 780, 2020) ; text:; id:android:id/icon; desc:双开微信
// 20:15:38.649/D: android.widget.TextView Rect(683, 2020 - 755, 2096) ; text:微信; id:android:id/text1; desc:null
// 20:15:38.649/D: android.widget.LinearLayout Rect(33, 2118 - 1047, 2256) ; text:; id:com.miui.securitycore:id/buttonPanel; desc:null
// 20:15:38.649/D: android.widget.Button Rect(99, 2118 - 981, 2256) ; text:取消; id:android:id/button2; desc:null
// 20:15:38.650/V: [$remote/getNodeTree.js] 运行结束 (用时 0.008 秒)