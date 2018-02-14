var bgImageList = ['coverpicture.jpg', 'coverpicture2.jpg', 'coverpicture3.jpg' ];
var listIndex = 0, fadeEffect;

function startAnim(){
    document.getElementById('bgimage').style.opacity = 1;
    setTimeout(bgSlide, 2000);
}
function bgSlide(){
    document.getElementById('bgimage').style.opacity = 1;
    fadeEffect = setInterval(fadeToBlack, 20);
}
function transitionImages(){
    if((listIndex+1) == bgImageList.length){
        listIndex = 0;
    }else{
        listIndex++;
    }
    document.getElementById('bgimage').style.backgroundImage = "url(./images/profile/" + bgImageList[listIndex] + ")";
}
function fadeToBlack(){
    var bgimagestyle = document.getElementById('bgimage').style;
    var iOpacityValue = bgimagestyle.opacity;
    iOpacityValue -= 0.03;
    bgimagestyle.opacity = iOpacityValue;
    if(iOpacityValue <= 0){
        clearInterval(fadeEffect);
        transitionImages();
        document.getElementById('bgimage').style.opacity = 0;
        showEffect = setInterval(fadeToImage, 30);
    }
}
function fadeToImage(){
    var bgimagestyle2 = document.getElementById('bgimage').style;
    var iOpacityValue2 = parseFloat(bgimagestyle2.opacity);
    iOpacityValue2 += 0.03;
    bgimagestyle2.opacity = iOpacityValue2;
    if(iOpacityValue2 >= 1){
        clearInterval(showEffect);
        window.setTimeout(function() {
            fadeEffect = setInterval(fadeToBlack, 30);
        }, 2000);   
    }
}