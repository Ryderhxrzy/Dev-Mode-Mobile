package expo.modules.devtoggle

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.media.projection.MediaProjectionManager
import android.os.Build
import android.os.Bundle

/**
 * Transparent activity responsible for requesting the system-level
 * MediaProjection screen capture permission dialog and forwarding the approved
 * result token to DevToggleBridgeService.
 */
class DevToggleScreenCaptureActivity : Activity() {
    companion object {
        const val REQUEST_CODE = 4821
        const val ACTION_START = "expo.modules.devtoggle.START_SCREEN_CAPTURE"
        const val ACTION_STOP = "expo.modules.devtoggle.STOP_SCREEN_CAPTURE"

        fun start(context: Context) {
            val intent = Intent(context, DevToggleScreenCaptureActivity::class.java).apply {
                action = ACTION_START
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(intent)
        }

        fun stop(context: Context) {
            DevToggleScreenMirrorManager.stop()
            val serviceIntent = Intent(context, DevToggleBridgeService::class.java).apply {
                action = DevToggleBridgeService.ACTION_STOP_MEDIA_PROJECTION
            }
            try { context.startService(serviceIntent) } catch (_: Exception) {}
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        if (intent?.action == ACTION_STOP) {
            DevToggleScreenMirrorManager.stop()
            finish()
            return
        }

        val mpm = getSystemService(Context.MEDIA_PROJECTION_SERVICE) as? MediaProjectionManager
        if (mpm == null) {
            finish()
            return
        }
        @Suppress("DEPRECATION")
        startActivityForResult(mpm.createScreenCaptureIntent(), REQUEST_CODE)
    }

    @Deprecated("Deprecated in Java")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == REQUEST_CODE && resultCode == RESULT_OK && data != null) {
            val serviceIntent = Intent(this, DevToggleBridgeService::class.java).apply {
                action = DevToggleBridgeService.ACTION_START_MEDIA_PROJECTION
                putExtra(DevToggleBridgeService.EXTRA_RESULT_CODE, resultCode)
                putExtra(DevToggleBridgeService.EXTRA_DATA_INTENT, data)
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                startForegroundService(serviceIntent)
            } else {
                startService(serviceIntent)
            }
        }
        finish()
    }
}

