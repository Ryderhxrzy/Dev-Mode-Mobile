/* MediaProjection feature disabled. This source is intentionally kept commented
 * so it can be restored later without recovering deleted code.
package expo.modules.devtoggle

import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.PixelFormat
import android.hardware.display.DisplayManager
import android.hardware.display.VirtualDisplay
import android.media.Image
import android.media.ImageReader
import android.media.projection.MediaProjection
import android.media.projection.MediaProjectionManager
import android.os.Handler
import android.os.HandlerThread
import android.util.DisplayMetrics
import android.view.WindowManager
import java.io.ByteArrayOutputStream
import java.io.OutputStream
import java.util.Collections
import java.util.concurrent.atomic.AtomicBoolean

/**
 * 100% Native, self-contained Android Screen Mirroring manager.
 * Uses standard Android MediaProjection and ImageReader to produce a low-latency
 * JPEG / MJPEG stream accessible by any web browser or desktop dashboard.
 */
object DevToggleScreenMirrorManager {
    private val isStreaming = AtomicBoolean(false)
    private var mediaProjection: MediaProjection? = null
    private var virtualDisplay: VirtualDisplay? = null
    private var imageReader: ImageReader? = null
    private var handlerThread: HandlerThread? = null
    private var backgroundHandler: Handler? = null

    @Volatile
    private var latestJpegBytes: ByteArray? = null
    private val activeStreams = Collections.synchronizedSet(mutableSetOf<OutputStream>())

    var streamWidth = 540
        private set
    var streamHeight = 1170
        private set
    var streamDpi = 320
        private set

    var currentDisplayId: Int = 0
        private set
    var isAppVirtualDisplay: Boolean = false
        private set

    fun isStreaming(): Boolean = isStreaming.get()

    @Synchronized
    fun start(context: Context, resultCode: Int, data: Intent) {
        if (isStreaming.get()) return

        try {
            val mpm = context.getSystemService(Context.MEDIA_PROJECTION_SERVICE) as? MediaProjectionManager ?: return
            val projection = mpm.getMediaProjection(resultCode, data) ?: return
            mediaProjection = projection

            val thread = HandlerThread("DevModeScreenCaptureThread").apply { start() }
            handlerThread = thread
            val handler = Handler(thread.looper)
            backgroundHandler = handler

            val wm = context.getSystemService(Context.WINDOW_SERVICE) as? WindowManager
            val metrics = DisplayMetrics()
            @Suppress("DEPRECATION")
            wm?.defaultDisplay?.getRealMetrics(metrics)

            val screenW = if (metrics.widthPixels > 0) metrics.widthPixels else 1080
            val screenH = if (metrics.heightPixels > 0) metrics.heightPixels else 2400
            streamDpi = if (metrics.densityDpi > 0) metrics.densityDpi else 320

            // 540p width gives an ideal balance of 30fps fluidity, 40-50ms latency, and low network load
            val targetWidth = 540
            val targetHeight = ((540.0 * screenH / screenW).toInt() / 2) * 2
            streamWidth = targetWidth
            streamHeight = targetHeight

            val reader = ImageReader.newInstance(targetWidth, targetHeight, PixelFormat.RGBA_8888, 2)
            imageReader = reader

            projection.registerCallback(object : MediaProjection.Callback() {
                override fun onStop() {
                    stop()
                }
            }, handler)

            val vd = projection.createVirtualDisplay(
                "DevModeScreenMirror",
                targetWidth,
                targetHeight,
                streamDpi,
                DisplayManager.VIRTUAL_DISPLAY_FLAG_AUTO_MIRROR,
                reader.surface,
                null,
                handler
            )
            virtualDisplay = vd
            currentDisplayId = vd?.display?.displayId ?: 0
            isAppVirtualDisplay = false

            attachFrameListener(reader, targetWidth, targetHeight, handler)
            isStreaming.set(true)
        } catch (_: Exception) {
            stop()
        }
    }

    @Synchronized
    fun startVirtualAppDisplay(context: Context, width: Int = 540, height: Int = 1170, dpi: Int = 320): Int {
        if (isStreaming.get()) stop()

        try {
            val dm = context.getSystemService(Context.DISPLAY_SERVICE) as? DisplayManager ?: return -1
            val thread = HandlerThread("DevModeVirtualAppDisplayThread").apply { start() }
            handlerThread = thread
            val handler = Handler(thread.looper)
            backgroundHandler = handler

            streamWidth = width
            streamHeight = height
            streamDpi = dpi

            val reader = ImageReader.newInstance(width, height, PixelFormat.RGBA_8888, 2)
            imageReader = reader

            val vd = dm.createVirtualDisplay(
                "DevModeVirtualAppDisplay",
                width,
                height,
                dpi,
                reader.surface,
                DisplayManager.VIRTUAL_DISPLAY_FLAG_PRESENTATION
            ) ?: return -1
            virtualDisplay = vd
            currentDisplayId = vd.display.displayId
            isAppVirtualDisplay = true

            attachFrameListener(reader, width, height, handler)
            isStreaming.set(true)
            return currentDisplayId
        } catch (_: Exception) {
            stop()
            return -1
        }
    }

    private fun attachFrameListener(reader: ImageReader, targetWidth: Int, targetHeight: Int, handler: Handler) {
        var lastFrameTime = 0L
        val minIntervalMs = 40L // cap at ~25 FPS to conserve CPU and battery

        reader.setOnImageAvailableListener({ ir ->
            val now = System.currentTimeMillis()
            if (now - lastFrameTime < minIntervalMs) {
                try { ir.acquireLatestImage()?.close() } catch (_: Exception) {}
                return@setOnImageAvailableListener
            }

            val image: Image? = try { ir.acquireLatestImage() } catch (_: Exception) { null }
            if (image == null) return@setOnImageAvailableListener

            try {
                lastFrameTime = now
                val plane = image.planes[0]
                val buffer = plane.buffer
                val pixelStride = plane.pixelStride
                val rowStride = plane.rowStride
                val rowPadding = rowStride - pixelStride * targetWidth

                val bitmapWidth = targetWidth + (rowPadding / pixelStride)
                val bmp = Bitmap.createBitmap(bitmapWidth, targetHeight, Bitmap.Config.ARGB_8888)
                bmp.copyPixelsFromBuffer(buffer)

                val cleanBmp = if (bitmapWidth != targetWidth) {
                    Bitmap.createBitmap(bmp, 0, 0, targetWidth, targetHeight).also {
                        if (it != bmp) bmp.recycle()
                    }
                } else {
                    bmp
                }

                val baos = ByteArrayOutputStream()
                cleanBmp.compress(Bitmap.CompressFormat.JPEG, 60, baos)
                cleanBmp.recycle()

                val jpeg = baos.toByteArray()
                latestJpegBytes = jpeg
                broadcastFrame(jpeg)
            } catch (_: Exception) {
            } finally {
                try { image.close() } catch (_: Exception) {}
            }
        }, handler)
    }

    @Synchronized
    fun stop() {
        if (!isStreaming.getAndSet(false)) return

        try { virtualDisplay?.release() } catch (_: Exception) {}
        try { imageReader?.close() } catch (_: Exception) {}
        try { mediaProjection?.stop() } catch (_: Exception) {}
        try { handlerThread?.quitSafely() } catch (_: Exception) {}

        virtualDisplay = null
        imageReader = null
        mediaProjection = null
        handlerThread = null
        backgroundHandler = null
        currentDisplayId = 0
        isAppVirtualDisplay = false

        synchronized(activeStreams) {
            for (stream in activeStreams) {
                try { stream.close() } catch (_: Exception) {}
            }
            activeStreams.clear()
        }
    }

    fun getLatestJpeg(): ByteArray? = latestJpegBytes

    private fun broadcastFrame(jpeg: ByteArray) {
        synchronized(activeStreams) {
            val iterator = activeStreams.iterator()
            while (iterator.hasNext()) {
                val stream = iterator.next()
                try {
                    stream.write("--frame\r\n".toByteArray(Charsets.US_ASCII))
                    stream.write("Content-Type: image/jpeg\r\n".toByteArray(Charsets.US_ASCII))
                    stream.write("Content-Length: ${jpeg.size}\r\n\r\n".toByteArray(Charsets.US_ASCII))
                    stream.write(jpeg)
                    stream.write("\r\n".toByteArray(Charsets.US_ASCII))
                    stream.flush()
                } catch (_: Exception) {
                    iterator.remove()
                }
            }
        }
    }

    fun handleStreamClient(output: OutputStream) {
        try {
            output.write("HTTP/1.1 200 OK\r\n".toByteArray(Charsets.US_ASCII))
            output.write("Content-Type: multipart/x-mixed-replace; boundary=--frame\r\n".toByteArray(Charsets.US_ASCII))
            output.write("Access-Control-Allow-Origin: *\r\n".toByteArray(Charsets.US_ASCII))
            output.write("Cache-Control: no-cache, no-store, must-revalidate\r\n".toByteArray(Charsets.US_ASCII))
            output.write("Connection: close\r\n\r\n".toByteArray(Charsets.US_ASCII))
            output.flush()

            latestJpegBytes?.let { jpeg ->
                try {
                    output.write("--frame\r\n".toByteArray(Charsets.US_ASCII))
                    output.write("Content-Type: image/jpeg\r\n".toByteArray(Charsets.US_ASCII))
                    output.write("Content-Length: ${jpeg.size}\r\n\r\n".toByteArray(Charsets.US_ASCII))
                    output.write(jpeg)
                    output.write("\r\n".toByteArray(Charsets.US_ASCII))
                    output.flush()
                } catch (_: Exception) { return }
            }

            activeStreams.add(output)

            while (isStreaming.get() && activeStreams.contains(output)) {
                try {
                    Thread.sleep(1000)
                } catch (_: InterruptedException) {
                    break
                }
            }
        } catch (_: Exception) {
        } finally {
            activeStreams.remove(output)
        }
    }
}
*/

