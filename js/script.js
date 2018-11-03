let isDisabled = false;
let navProjects = {
    'about': 0,
    'offluckas' : 1,
    'LITPCC': 2
};
let navActive;
function load(){
    document.getElementById('aboutme-page').style.visibility = 'hidden';
    document.getElementById('offluckas-page').style.visibility = 'hidden';
    document.getElementById('LITPCC-page').style.visibility = 'hidden';
    setTimeout(function(){
        if(document.location.hash == ''){
            router('aboutme');
        }else{
            router(document.location.hash.substr(1));
        }
    }, 4000);
}
function router(page){
    if(!document.getElementById(page).classList.contains('active') && !isDisabled){
        moveNav(page);
        isDisabled = true;
        document.getElementById('nav').childNodes.forEach(element => {
            if(element.nodeName != "#text"){
                console.log(element);
                if(element.firstChild.classList !== undefined){
                    element.classList.remove('active');
                    let el = document.getElementById(element.id + "-page");
                    if(el.style.visibility !== 'hidden'){
                        el.classList = 'page';
                        void el.offsetWidth;
                        el.classList = 'page bg-whole fade';
                        setTimeout(function(){
                            el.style.visibility = 'hidden';
                        }, 1000);
                    }else{
                        el.style.visibility = 'hidden';
                    }
                }
            }
        });
        document.getElementById(page + "-page").classList = 'page';
        void document.getElementById(page + "-page").offsetWidth;
        document.getElementById(page + "-page").style.visibility = 'visible';
        document.getElementById(page + "-page").classList = "page bg-whole fade reverse";
        setTimeout(function(){
            isDisabled = false;
        }, 1000);
    }
}
//(50vh - ${125*(navProjects[page]+1)}
const navSize = -200;
function moveNav(page){
    if(navActive == null){
        document.documentElement.style.setProperty(`--nav-move`, -200*(navProjects[page]) + 'px');
    }else{
        document.getElementById(navActive).classList.remove('active');
        let navDiff = navProjects[page] - navProjects[navActive];
        document.documentElement.style.setProperty(`--nav-move`, -200*(navProjects[page]) + 'px');
    }
    document.getElementById(page).classList.add('active');
    navActive = page;
}