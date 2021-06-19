
const useFonts = (name, src) => {
    const fontFace = new FontFace(name, `url(${src})`);
	const loadedFontFace = fontFace.load();

    loadedFontFace.then(src => document.fonts.add(src));

    return loadedFontFace;
}

export default useFonts;
