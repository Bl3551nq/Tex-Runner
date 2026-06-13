# Android Floating Overlay App Integration Guide (without background)

This guide provides the complete blueprint and source code required to wrap your transparent Dino Game into a floating Android overlay window that floats over any other active application on a device without a background!

---

## 🚀 Architectural Overview

To make a web app float on top of other Android apps:
1. **System Permission**: Acquire the `SYSTEM_ALERT_WINDOW` permission (often called *Draw over other apps* or *Overlay Permission*).
2. **Background Service**: Maintain an Android `Service` running in the background. This service adds a `WebView` directly into Android's native system `WindowManager` above all other view layers.
3. **Transparent WebView Configuration**: Enable hardware acceleration, DOM storage, and set both the WebView container and client paint layer to use transparent backgrounds.
4. **Deploying / Building**: You can either build it locally with Android Studio, or automatically via a GitHub Action / specialized web builder (like Capacitor, Cordova, or custom wrapper templates).

---

## 🛠️ Step-by-Step Android Template Files

Below is the exact production-ready Kotlin code and XML configuration required to integrate this React web app into a floating container.

### 1. `AndroidManifest.xml` (Permissions & Service Declaration)
Define internet, network state, and system overlay permissions. Register the floating service inside the `<application>` tag.

```xml
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.example.floatingdino">

    <!-- Essential overlay permission -->
    <uses-permission android:name="android.permission.SYSTEM_ALERT_WINDOW" />
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="Floating Dino"
        android:theme="@style/Theme.AppCompat.Translucent">

        <!-- Entry activity to request Overlay permission -->
        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:theme="@style/Theme.AppCompat.Translucent.NoTitleBar">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>

        <!-- Background service handling overlay rendering -->
        <service
            android:name=".FloatingWindowService"
            android:enabled="true"
            android:exported="false" />
    </application>
</manifest>
```

---

### 2. `MainActivity.kt` (Permission Verification & Launcher)
This invisible launcher checks if the user has authorized "Draw over other apps." If approved, it launches the Service and immediately exits so it doesn't leave a main screen app trail.

```kotlin
package com.example.floatingdino

import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity

class MainActivity : AppCompatActivity() {

    private val OVERLAY_PERMISSION_REQ_CODE = 1234

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Verify overlay capability
        checkOverlayPermission()
    }

    private fun checkOverlayPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            if (!Settings.canDrawOverlays(this)) {
                // Direct user to Android Settings panel
                val intent = Intent(
                    Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                    Uri.parse("package:$packageName")
                )
                startActivityForResult(intent, OVERLAY_PERMISSION_REQ_CODE)
                Toast.makeText(this, "Please authorize 'Draw over other apps'", Toast.LENGTH_LONG).show()
            } else {
                startFloatingService()
            }
        } else {
            startFloatingService()
        }
    }

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == OVERLAY_PERMISSION_REQ_CODE) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && Settings.canDrawOverlays(this)) {
                startFloatingService()
            } else {
                Toast.makeText(this, "Overlay permission is mandatory!", Toast.LENGTH_LONG).show()
                finish()
            }
        }
    }

    private fun startFloatingService() {
        startService(Intent(this, FloatingWindowService::class.java))
        finish() // Exit launcher instantly so user returns to home screen
    }
}
```

---

### 3. `FloatingWindowService.kt` (High-Performance Overlay Renderer)
This service spawns a WebKit WebView inside a floating block. Setting WebViews to transparent requires configuring `backgroundColor = Color.TRANSPARENT` and disabling standard background canvases.

```kotlin
package com.example.floatingdino

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

    @SuppressLint("ClickableViewAccessibility")
    override fun onCreate() {
        super.onCreate()

        windowManager = getSystemService(Context.WINDOW_SERVICE) as WindowManager

        // Inflate your floating widget layout container
        floatingView = LayoutInflater.from(this).inflate(R.layout.layout_floating_window, null)

        // Layout Parameters for System Overlay Windows
        val layoutType = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
        } else {
            @Suppress("DEPRECATION")
            WindowManager.LayoutParams.TYPE_PHONE
        }

        val params = WindowManager.LayoutParams(
            WindowManager.LayoutParams.MATCH_PARENT, // Takes full screen widths to allow ducking tap zone
            WindowManager.LayoutParams.WRAP_CONTENT,
            layoutType,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
            PixelFormat.TRANSLUCENT // Crucial for transparency support!
        ).apply {
            gravity = Gravity.BOTTOM or Gravity.CENTER_HORIZONTAL
            x = 0
            y = 20
        }

        // Initialize WebView
        webView = floatingView.findViewById(R.id.webViewOverlay)
        
        // Critical WebView Transparency configurations
        webView.setBackgroundColor(Color.TRANSPARENT)
        webView.setLayerType(View.LAYER_TYPE_HARDWARE, null)

        // Web App settings optimization
        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            useWideViewPort = true
            loadWithOverviewMode = true
            cacheMode = WebSettings.LOAD_DEFAULT
        }

        webView.webViewClient = object : WebViewClient() {
            override fun onPageFinished(view: WebView?, url: String?) {
                // Ensure page styles inside webview render clean transparent nodes
                webView.evaluateJavascript(
                    "document.body.style.background = 'transparent';", null
                )
            }
        }

        // Load your hosted/deployed web app URL (Use Shared App URL)
        webView.loadUrl("https://ais-pre-6g6ze4otgaoktxjja5tktj-930700759373.europe-west2.run.app")

        // Add Floating overlay into standard Window view cycle
        windowManager.addView(floatingView, params)

        // Handle Close Button action
        floatingView.findViewById<ImageButton>(R.id.btnCloseOverlay).setOnClickListener {
            stopSelf()
        }

        // Custom touch implementation for dragging the floating window if needed
        val dragHandle = floatingView.findViewById<View>(R.id.dragHandle)
        dragHandle.setOnTouchListener(object : View.OnTouchListener {
            private var initialX = 0
            private var initialY = 0
            private var initialTouchX = 0f
            private var initialTouchY = 0f

            override fun onTouch(v: View?, event: MotionEvent?): Boolean {
                event?.let {
                    when (it.action) {
                        MotionEvent.ACTION_DOWN -> {
                            initialX = params.x
                            initialY = params.y
                            initialTouchX = it.rawX
                            initialTouchY = it.rawY
                            return true
                        }
                        MotionEvent.ACTION_MOVE -> {
                            params.x = initialX + (it.rawX - initialTouchX).toInt()
                            params.y = initialY - (it.rawY - initialTouchY).toInt() // invert Android Y orientation values
                            windowManager.updateViewLayout(floatingView, params)
                            return true
                        }
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
```

---

### 4. `layout_floating_window.xml` (The Floating View Design)
Place this under your active Android resources `res/layout/layout_floating_window.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent"
    android:layout_height="wrap_content"
    android:orientation="vertical"
    android:background="@android:color/transparent">

    <!-- Compact Floating Utility bar -->
    <RelativeLayout
        android:layout_width="match_parent"
        android:layout_height="36dp"
        android:background="#2E000000"
        android:paddingHorizontal="10dp">

        <!-- Small draggable handle -->
        <View
            android:id="@+id/dragHandle"
            android:layout_width="60dp"
            android:layout_height="4dp"
            android:layout_centerInParent="true"
            android:background="#88FFFFFF" />

        <!-- Simple exit controller -->
        <ImageButton
            android:id="@+id/btnCloseOverlay"
            android:layout_width="32dp"
            android:layout_height="32dp"
            android:layout_alignParentRight="true"
            android:layout_centerVertical="true"
            android:background="?android:attr/selectableItemBackgroundBorderless"
            android:src="@android:drawable/ic_menu_close_clear_cancel"
            android:tint="#FFFFFF" />
    </RelativeLayout>

    <!-- Transparent Web Window -->
    <android.webkit.WebView
        android:id="@+id/webViewOverlay"
        android:layout_width="match_parent"
        android:layout_height="440dp"
        android:background="@android:color/transparent" />
</LinearLayout>
```

---

## 🛠️ Offline & Static Compilation Alternatives

If you prefer building this app offline, or hosting locally directly inside the APK without making external database calls programmatically:

1. **Deploy Production Web App Bundle**:
   Run `npm run build` inside AI Studio or your GitHub IDE directory.
2. **Move files into Android resources**:
   Copy all contents of your created `dist/` folder into the Android project's `app/src/main/assets/` directory.
3. **Point WebView to Local Assets**:
   Change the `loadUrl` source inside your Kotlin file to:
   ```kotlin
   webView.loadUrl("file:///android_asset/index.html")
   ```
   This loads the app entirely locally without needing cellular/wifi connections!
