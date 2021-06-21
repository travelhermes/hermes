/* jshint esversion: 8 */
const pageLang = document.querySelector('html').lang;
const currentLang = document.querySelector('input#currentLang').value;

const urlParams = new URLSearchParams(window.location.search);
const langParam = urlParams.get('lang');

// If langParam is not set and pageLanguage differs, redirect
if (langParam == null && pageLang !== currentLang) {
    window.location = `/privacy/${currentLang}/`;
    // If langParam is set and differs, redirect
} else if (langParam != null && langParam !== pageLang) {
    window.location = `/privacy/${langParam}/?lang=${langParam}`;
}
