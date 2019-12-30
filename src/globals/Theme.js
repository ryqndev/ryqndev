let setp = ( attr, val ) => { document.documentElement.style.setProperty(attr, val) }

const Theme = ( dark ) => {
    if(dark){
        setp('--dark-mode', '1'); // on
        setp('--background-color', '#151515'); // dark
        setp('--background-color-alt', '#ffffff'); // dark
        setp('--background-emphasis', '#000000'); // dark
        setp('--text-color', '#ffffff'); // white
        setp('--text-color-alt', '#000000'); // white
        setp('--emphasis-text', '#ffffff');
        setp('--accent-color', '#ff00ff'); // pink
        setp('--accent-color-alt', '#00ffff'); // pink
        setp('--emphasis-shadow', '#ff00ff'); // pink
    }else{
        setp('--dark-mode', '0'); // off
        setp('--background-color', '#ffeeee'); // dark
        setp('--background-color-alt', '#151515'); // dark
        setp('--background-emphasis', '#ffbbbb'); // dark
        setp('--text-color', '#000000'); // white
        setp('--text-color-alt', '#ffeeee'); // white
        setp('--emphasis-text', '#ff9999');
        setp('--accent-color', '#ff00ff'); // pink
        setp('--accent-color-alt', '#00ffff'); // pink
        setp('--emphasis-shadow', '#000000'); // pink
    }
}

export default Theme;