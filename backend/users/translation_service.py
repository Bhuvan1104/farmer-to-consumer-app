import asyncio
import inspect

try:
    from googletrans import Translator
except Exception:
    Translator = None

SUPPORTED_LANGS = {"en", "hi", "te", "ta"}


class _NoOpTranslation:
    def __init__(self, text, lang="en"):
        self.text = text
        self.lang = lang


class _FallbackTranslator:
    def detect(self, text):
        return _NoOpTranslation(text=text, lang="en")

    def translate(self, text, dest="en"):
        return _NoOpTranslation(text=text, lang=dest)


def normalize_lang(lang):
    lang = str(lang or "en").strip().lower()
    if "-" in lang:
        lang = lang.split("-", 1)[0]
    return lang if lang in SUPPORTED_LANGS else "en"


def _resolve(maybe_obj):
    if inspect.isawaitable(maybe_obj):
        try:
            return asyncio.run(maybe_obj)
        except RuntimeError:
            loop = asyncio.new_event_loop()
            try:
                return loop.run_until_complete(maybe_obj)
            finally:
                loop.close()
    return maybe_obj


class MessageTranslator:
    def __init__(self):
        self.translator = Translator() if Translator is not None else _FallbackTranslator()

    def detect_lang(self, text):
        try:
            detected = _resolve(self.translator.detect(text))
            return normalize_lang(getattr(detected, "lang", "en"))
        except Exception:
            return "en"

    def translate(self, text, dest_lang):
        dest_lang = normalize_lang(dest_lang)
        if not text:
            return ""
        if dest_lang == "en":
            try:
                translated = _resolve(self.translator.translate(text, dest="en"))
                return translated.text
            except Exception:
                return text
        try:
            translated = _resolve(self.translator.translate(text, dest=dest_lang))
            return translated.text
        except Exception:
            return text
