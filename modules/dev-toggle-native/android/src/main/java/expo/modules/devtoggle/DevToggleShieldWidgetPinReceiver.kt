package expo.modules.devtoggle

import android.appwidget.AppWidgetManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.widget.Toast

class DevToggleShieldWidgetPinReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val appWidgetId = intent.getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID)
        val pkg = intent.getStringExtra("package_name")

        if (appWidgetId != AppWidgetManager.INVALID_APPWIDGET_ID && !pkg.isNullOrBlank()) {
            DevToggleShield1x1WidgetProvider.setWidgetPackage(context, appWidgetId, pkg)
            val appWidgetManager = AppWidgetManager.getInstance(context)
            val views = DevToggleShield1x1WidgetProvider.buildRemoteViews(context, appWidgetId)
            appWidgetManager.updateAppWidget(appWidgetId, views)
            val appLabel = AppShieldManager.getAppLabel(context, pkg)
            Toast.makeText(context, "1x1 Shield Widget pinned for $appLabel", Toast.LENGTH_SHORT).show()
        }
    }
}

