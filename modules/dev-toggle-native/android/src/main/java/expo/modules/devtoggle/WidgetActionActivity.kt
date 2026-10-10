package expo.modules.devtoggle

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import android.view.WindowManager
import android.widget.Toast

class WidgetActionActivity : Activity() {

    companion object {
        private const val DEV_KEY = "development_settings_enabled"
        private const val USB_KEY = "adb_enabled"
        private const val WIRELESS_KEY = "adb_wifi_enabled"

        fun showToast(context: Context, message: String) {
            val show = {
                try {
                    Toast.makeText(context.applicationContext, message, Toast.LENGTH_SHORT).show()
                } catch (_: Exception) {
                    try {
                        Toast.makeText(context, message, Toast.LENGTH_SHORT).show()
                    } catch (_: Exception) {}
                }
            }

            if (Looper.myLooper() == Looper.getMainLooper()) {
                show()
            } else {
                Handler(Looper.getMainLooper()).post { show() }
            }
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Make window non-touchable and non-focusable so any touches pass straight through
        window.addFlags(
            WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE or
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
            WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS
        )
        window.setBackgroundDrawableResource(android.R.color.transparent)

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            overrideActivityTransition(OVERRIDE_TRANSITION_OPEN, 0, 0)
            overrideActivityTransition(OVERRIDE_TRANSITION_CLOSE, 0, 0)
        } else {
            @Suppress("DEPRECATION")
            overridePendingTransition(0, 0)
        }

        handleAction(intent)
        finishWithNoAnim()
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        handleAction(intent)
        finishWithNoAnim()
    }

    private fun finishWithNoAnim() {
        finish()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            overrideActivityTransition(OVERRIDE_TRANSITION_CLOSE, 0, 0)
        } else {
            @Suppress("DEPRECATION")
            overridePendingTransition(0, 0)
        }
    }

    private fun handleAction(intent: Intent?) {
        if (intent == null) return
        val cr = contentResolver
        val action = intent.action ?: return

        when (action) {
            DevToggleWidgetProvider.ACTION_TOGGLE_DEV -> {
                val current = try { Settings.Global.getInt(cr, DEV_KEY, 0) == 1 } catch (_: Exception) { false }
                val next = if (current) 0 else 1
                val success = try {
                    Settings.Global.putInt(cr, DEV_KEY, next)
                } catch (_: Exception) {
                    false
                }

                if (success) {
                    showToast(this, if (next == 1) "Developer Options: Enabled" else "Developer Options: Disabled")
                } else {
                    showToast(this, "Permission Required: Run ADB grant command")
                }
                DevToggleWidgetProvider.updateAllWidgets(this)
            }
            DevToggleWidgetProvider.ACTION_TOGGLE_USB -> {
                val devOn = try { Settings.Global.getInt(cr, DEV_KEY, 0) == 1 } catch (_: Exception) { false }
                val current = try { Settings.Global.getInt(cr, USB_KEY, 0) == 1 } catch (_: Exception) { false }
                val next = if (current) 0 else 1

                if (next == 1 && !devOn) {
                    showToast(this, "Developer Mode must be ON to enable USB Debugging")
                    DevToggleWidgetProvider.updateAllWidgets(this)
                    return
                }

                val success = try {
                    Settings.Global.putInt(cr, USB_KEY, next)
                } catch (_: Exception) {
                    false
                }

                if (success) {
                    showToast(this, if (next == 1) "USB Debugging: Enabled" else "USB Debugging: Disabled")
                } else {
                    showToast(this, "Permission Required: Run ADB grant command")
                }
                DevToggleWidgetProvider.updateAllWidgets(this)
            }
            DevToggleWidgetProvider.ACTION_TOGGLE_WIRELESS -> {
                val devOn = try { Settings.Global.getInt(cr, DEV_KEY, 0) == 1 } catch (_: Exception) { false }
                val current = try { Settings.Global.getInt(cr, WIRELESS_KEY, 0) == 1 } catch (_: Exception) { false }
                val next = if (current) 0 else 1

                if (next == 1 && !devOn) {
                    showToast(this, "Developer Mode must be ON to enable Wireless Debugging")
                    DevToggleWidgetProvider.updateAllWidgets(this)
                    return
                }

                val success = try {
                    Settings.Global.putInt(cr, WIRELESS_KEY, next)
                } catch (_: Exception) {
                    false
                }

                if (success) {
                    showToast(this, if (next == 1) "Wireless Debugging: Enabled" else "Wireless Debugging: Disabled")
                } else {
                    showToast(this, "Permission Required: Run ADB grant command")
                }
                DevToggleWidgetProvider.updateAllWidgets(this)
            }
        }
    }
}

