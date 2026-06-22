var classNameSet = new Set(); // 用于存储已经打印过的className，避免重复打印

// 遍历当前页面的所有控件
function traverseViews(view) {
  if (view) {
    var className = view.className();
    var bounds = view.bounds();

    if (!classNameSet.has(className)) {
      
      classNameSet.add(className);
    }
    console.log(className, bounds, view.text());
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
var root = className("android.widget.FrameLayout").findOne();

// 开始遍历
traverseViews(root);
