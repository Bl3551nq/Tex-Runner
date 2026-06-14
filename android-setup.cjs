const fs = require('fs');
const path = require('path');

console.log('🚀 Starting Capacitor Android overlay customization script...');

// Target paths
const androidPath = path.join(__dirname, 'android');
if (!fs.existsSync(androidPath)) {
  console.error('❌ Error: android/ directory not found. Run cap add android first.');
  process.exit(1);
}

// 1. Create Layout file for Floating window overlay
const layoutDir = path.join(androidPath, 'app/src/main/res/layout');
fs.mkdirSync(layoutDir, { recursive: true });
const layoutContent = `<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent"
    android:layout_height="wrap_content"
    android:orientation="vertical"
    android:background="@android:color/transparent">

    <!-- Draggable title bar / close button for the floating game -->
    <RelativeLayout
        android:layout_width="match_parent"
        android:layout_height="36dp"
        android:background="#66000000"
        android:paddingHorizontal="10dp"
        android:layout_marginHorizontal="8dp"
        android:elevation="4dp">

        <!-- Draggable handle -->
        <View
            android:id="@+id/dragHandle"
            android:layout_width="60dp"
            android:layout_height="4dp"
            android:layout_centerInParent="true"
            android:background="#AAFFFFFF" />

        <!-- Simple close button -->
        <ImageButton
            android:id="@+id/btnCloseOverlay"
            android:layout_width="32dp"
            android:layout_height="32dp"
            android:layout_alignParentRight="true"
            android:layout_centerVertical="true"
            android:background="?android:attr/selectableItemBackgroundBorderless"
            android:src="@android:drawable/ic_menu_close_clear_cancel"
            android:contentDescription="Close Frame"
            android:tint="#FFFFFF" />
    </RelativeLayout>

    <!-- Transparent WebView wrapper -->
    <android.webkit.WebView
        android:id="@+id/webViewOverlay"
        android:layout_width="match_parent"
        android:layout_height="320dp"
        android:layout_marginHorizontal="8dp"
        android:background="@android:color/transparent" />
</LinearLayout>
`;

fs.writeFileSync(path.join(layoutDir, 'layout_floating_window.xml'), layoutContent);
console.log('✅ Wrote layout_floating_window.xml');

// 2. Locate default package directories
const packageDir = path.join(androidPath, 'app/src/main/java/com/example/floatingdino');
fs.mkdirSync(packageDir, { recursive: true });

// 3. Write FloatingWindowService.kt
const serviceContent = `package com.example.floatingdino

import android.annotation.SuppressLint
import android.app.Service
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.graphics.PixelFormat
import android.os.Build
import android.os.IBinder
import android.view.Gravity
import android.view.LayoutInflater
import android.view.MotionEvent
import android.view.View
import android.view.WindowManager
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.ImageButton

class FloatingWindowService : Service() {

    private lateinit var windowManager: WindowManager
    private lateinit var floatingView: View
    private lateinit var webView: WebView

    override fun onBind(intent: Intent?): IBinder? = null

    @SuppressLint("ClickableViewAccessibility", "SetJavaScriptEnabled")
    override fun onCreate() {
        super.onCreate()

        windowManager = getSystemService(Context.WINDOW_SERVICE) as WindowManager

        // Inflate layout
        floatingView = LayoutInflater.from(this).inflate(R.layout.layout_floating_window, null)

        val layoutType = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
        } else {
            @Suppress("DEPRECATION")
            WindowManager.LayoutParams.TYPE_PHONE
        }

        // Setup Window parameters (allowing transparent, click-through margins, etc.)
        val params = WindowManager.LayoutParams(
            WindowManager.LayoutParams.MATCH_PARENT,
            WindowManager.LayoutParams.WRAP_CONTENT,
            layoutType,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
            PixelFormat.TRANSLUCENT
        ).apply {
            gravity = Gravity.CENTER
            x = 0
            y = 0
        }

        webView = floatingView.findViewById(R.id.webViewOverlay)
        
        // Critical WebView Transparency configurations
        webView.setBackgroundColor(Color.TRANSPARENT)
        webView.setLayerType(View.LAYER_TYPE_HARDWARE, null)

        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            useWideViewPort = true
            loadWithOverviewMode = true
            cacheMode = WebSettings.LOAD_DEFAULT
            mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
            allowFileAccess = true
            allowContentAccess = true
        }

        webView.webViewClient = object : WebViewClient() {
            override fun onPageFinished(view: WebView?, url: String?) {
                // Remove visual background structures from standard build webapp to remain completely floating transparent
                webView.evaluateJavascript(
                    "document.body.style.background = 'transparent'; " +
                    "const el = document.getElementById('root'); " +
                    "if(el) { el.style.background = 'transparent'; }", null
                )
            }
        }

        // Point directly to the locally packaged assets compilation!
        webView.loadUrl("file:///android_asset/public/index.html")

        windowManager.addView(floatingView, params)

        // Close service action
        floatingView.findViewById<ImageButton>(R.id.btnCloseOverlay).setOnClickListener {
            stopSelf()
        }

        // Implement smooth dragging behavior on drag handle
        val dragHandle = floatingView.findViewById<View>(R.id.dragHandle)
        dragHandle.setOnTouchListener(object : View.OnTouchListener {
            private var initialX = 0
            private var initialY = 0
            private var initialTouchX = 0f
            private var initialTouchY = 0f

            override fun onTouch(v: View?, event: MotionEvent?): Boolean {
                if (event != null) {
                    when (event.action) {
                        MotionEvent.ACTION_DOWN -> {
                            initialX = params.x
                            initialY = params.y
                            initialTouchX = event.rawX
                            initialTouchY = event.rawY
                            return true
                        }
                        MotionEvent.ACTION_MOVE -> {
                            params.x = initialX + (event.rawX - initialTouchX).toInt()
                            params.y = initialY + (event.rawY - initialTouchY).toInt()
                            windowManager.updateViewLayout(floatingView, params)
                            return true
                        }
                        else -> {}
                    }
                }
                return false
            }
        })
    }

    override fun onDestroy() {
        super.onDestroy()
        if (::floatingView.isInitialized) {
            windowManager.removeView(floatingView)
        }
    }
}
`;

fs.writeFileSync(path.join(packageDir, 'FloatingWindowService.kt'), serviceContent);
console.log('✅ Created FloatingWindowService.kt');

// 4. Update MainActivity.kt for instant permission requests
const mainActivityContent = `package com.example.floatingdino

import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.widget.Toast
import com.getcapacitor.BridgeActivity

class MainActivity : BridgeActivity() {

    private val OVERLAY_PERMISSION_REQ_CODE = 4567

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        checkOverlayPermission()
    }

    private fun checkOverlayPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            if (!Settings.canDrawOverlays(this)) {
                val intent = Intent(
                    Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                    Uri.parse("package:$packageName")
                )
                startActivityForResult(intent, OVERLAY_PERMISSION_REQ_CODE)
                Toast.makeText(this, "Enable 'Display over other apps' to float the Dino Game!", Toast.LENGTH_LONG).show()
            } else {
                startFloatingService()
            }
        } else {
            startFloatingService()
        }
    }

    @Deprecated("Deprecated in Java")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == OVERLAY_PERMISSION_REQ_CODE) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && Settings.canDrawOverlays(this)) {
                startFloatingService()
            } else {
                Toast.makeText(this, "Permission denied. Desktop overlay mode will not work.", Toast.LENGTH_LONG).show()
                finish()
            }
        }
    }

    private fun startFloatingService() {
        startService(Intent(this, FloatingWindowService::class.java))
        finish() // Instantly shut down main workspace and return to Android launcher/other apps!
    }
}
`;

fs.writeFileSync(path.join(packageDir, 'MainActivity.kt'), mainActivityContent);
console.log('✅ Overwrote MainActivity.kt with Custom Overlay behavior');

// Delete duplicate MainActivity.java if it exists to prevent duplicate class definition compilation errors
const javaActivityPath = path.join(packageDir, 'MainActivity.java');
if (fs.existsSync(javaActivityPath)) {
  fs.unlinkSync(javaActivityPath);
  console.log('✅ Deleted duplicate MainActivity.java');
}

// 5. Update AndroidManifest.xml with permission and service declaration
const manifestPath = path.join(androidPath, 'app/src/main/AndroidManifest.xml');
let manifest = fs.readFileSync(manifestPath, 'utf8');

// Insert permissions
const permissions = `
    <uses-permission android:name="android.permission.SYSTEM_ALERT_WINDOW" />
    <uses-permission android:name="android.permission.INTERNET" />
`;
if (!manifest.includes('SYSTEM_ALERT_WINDOW')) {
  manifest = manifest.replace('xmlns:android="http://schemas.android.com/apk/res/android">', 'xmlns:android="http://schemas.android.com/apk/res/android">' + permissions);
}

// Insert background service element inside <application>
const serviceDeclaration = `
        <service
            android:name=".FloatingWindowService"
            android:enabled="true"
            android:exported="false" />
    </application>
`;
if (!manifest.includes('FloatingWindowService')) {
  manifest = manifest.replace('</application>', serviceDeclaration);
}

fs.writeFileSync(manifestPath, manifest);
console.log('✅ Configured AndroidManifest.xml');

// 6. Support Kotlin build plugin in root build.gradle
const rootBuildGradlePath = path.join(androidPath, 'build.gradle');
if (fs.existsSync(rootBuildGradlePath)) {
  let rootGradle = fs.readFileSync(rootBuildGradlePath, 'utf8');
  if (!rootGradle.includes('kotlin-gradle-plugin')) {
    rootGradle = rootGradle.replace(
      "dependencies {",
      "dependencies {\n        classpath 'org.jetbrains.kotlin:kotlin-gradle-plugin:1.9.22'"
    );
    fs.writeFileSync(rootBuildGradlePath, rootGradle);
    console.log('✅ Added Kotlin classpath to root build.gradle');
  }
}

// 7. Apply kotlin-android plugin in app/build.gradle
const appBuildGradlePath = path.join(androidPath, 'app/build.gradle');
if (fs.existsSync(appBuildGradlePath)) {
  let appGradle = fs.readFileSync(appBuildGradlePath, 'utf8');
  if (!appGradle.includes("apply plugin: 'kotlin-android'") && !appGradle.includes("id 'org.jetbrains.kotlin.android'")) {
    appGradle = appGradle.replace(
      "apply plugin: 'com.android.application'",
      "apply plugin: 'com.android.application'\napply plugin: 'kotlin-android'"
    );
    fs.writeFileSync(appBuildGradlePath, appGradle);
    console.log('✅ Applied kotlin-android plugin in app/build.gradle');
  }
}

console.log('☀️ Customized setup completed successfully!');
