package expo.modules.devtoggle

import android.content.Context
import com.google.android.gms.tasks.Tasks
import com.google.mlkit.common.model.DownloadConditions
import com.google.mlkit.nl.translate.TranslateLanguage
import com.google.mlkit.nl.translate.Translation
import com.google.mlkit.nl.translate.Translator
import com.google.mlkit.nl.translate.TranslatorOptions
import java.util.Locale
import java.util.concurrent.ConcurrentHashMap

/** Localizes native widgets and notifications using the same ML Kit model as the app UI. */
object DevToggleLocalization {
    private const val PREFS_NAME = "devtoggle_local_prefs"
    private const val LANGUAGE_KEY = "language_preference"
    private val cache = ConcurrentHashMap<String, String>()
    private val translators = ConcurrentHashMap<String, Translator>()

    private fun targetLanguage(context: Context): String {
        val preference = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .getString(LANGUAGE_KEY, "auto") ?: "auto"
        val tag = if (preference == "auto") Locale.getDefault().language else preference
        return when (tag.lowercase(Locale.ROOT)) {
            "fil" -> "tl"
            "pt-br" -> "pt"
            "zh-cn", "zh-tw" -> "zh"
            else -> tag.substringBefore('-').lowercase(Locale.ROOT)
        }
    }

    private fun translatorFor(target: String): Translator? {
        if (target == "en") return null
        return translators[target] ?: run {
            val language = TranslateLanguage.fromLanguageTag(target) ?: return null
            Translation.getClient(
                TranslatorOptions.Builder()
                    .setSourceLanguage(TranslateLanguage.ENGLISH)
                    .setTargetLanguage(language)
                    .build()
            ).also { translators[target] = it }
        }
    }

    fun text(context: Context, source: String): String {
        val target = targetLanguage(context)
        if (target == "en" || source.isBlank()) return source
        val key = "$target:$source"
        cache[key]?.let { return it }
        val translator = translatorFor(target) ?: return source
        return try {
            Tasks.await(translator.downloadModelIfNeeded(DownloadConditions.Builder().build()))
            Tasks.await(translator.translate(source)).also { cache[key] = it }
        } catch (_: Exception) {
            source
        }
    }
}
