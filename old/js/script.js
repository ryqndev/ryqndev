var bgImageList = ['coverpicture.jpg', 'coverpicture2.jpg', 'coverpicture3.jpg' ];
var listIndex = 0, fadeEffect;

function startAnim(){
    document.getElementById('bgimage').style.opacity = 1;
    setTimeout(bgSlide, 2000);
}
function bgSlide(){
    document.getElementById('bgimage').style.opacity = 1;
    fadeEffect = setInterval(fadeToImage2, 20);
}
function transitionImages(){
    if((listIndex+1) == bgImageList.length){
        listIndex = 0;
    }else{
        listIndex++;
    }
    let nextImg = "url(./images/profile/" + bgImageList[listIndex] + ")";
    return nextImg;
}
function fadeToImage2(){
    var bgimagestyle = document.getElementById('bgimage').style;
    var iOpacityValue = bgimagestyle.opacity;
    iOpacityValue -= 0.03;
    bgimagestyle.opacity = iOpacityValue;
    if(iOpacityValue <= 0){
        clearInterval(fadeEffect);
        document.getElementById('bgimage').style.backgroundImage = transitionImages();
        document.getElementById('bgimage').style.opacity = 0;
        window.setTimeout(function(){
            showEffect = setInterval(fadeToImage, 40);
        }, 3000);
    }
}
function fadeToImage(){
    var bgimagestyle2 = document.getElementById('bgimage').style;
    var iOpacityValue2 = parseFloat(bgimagestyle2.opacity);
    iOpacityValue2 += 0.03;
    bgimagestyle2.opacity = iOpacityValue2;
    if(iOpacityValue2 >= 1){
        clearInterval(showEffect);
        document.getElementById('bgimage2').style.backgroundImage = transitionImages();
        window.setTimeout(function() {
            fadeEffect = setInterval(fadeToImage2, 40);
        }, 3000);   
    }
}