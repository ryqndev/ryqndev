let isDisabled = false;
let navSize = -250;
const navProjects = {
    'aboutme': 0,
    'offluckas' : 1,
    'LITPCC': 2,
    'NewsAlligator': 3
};
const projectArray = ['aboutme', 'offluckas', 'LITPCC', 'NewsAlligator'];
const navLinks = {
    'aboutme': "#aboutme",
    'offluckas' : "https://offluckas.studio",
    'LITPCC': "https://litpcc.com",
    'NewsAlligator': "https://calhacks-2018.github.io/project/"
}
let navActive;
function load(){
    if(window.innerWidth < 768){
        navSize = -150;
    }
    document.getElementById('aboutme-page').style.visibility = 'hidden';
    document.getElementById('offluckas-page').style.visibility = 'hidden';
    document.getElementById('LITPCC-page').style.visibility = 'hidden';
    document.getElementById('NewsAlligator-page').style.visibility = 'hidden';
    setTimeout(function(){
        if(document.location.hash == ''){
            router('aboutme');
        }else{
            router(document.location.hash.substr(1));
        }
    }, 4000);
}
function router(page){
    if(!document.getElementById(page).classList.contains('active')){
        if(!isDisabled){
            isDisabled = true;
            document.getElementById('nav').childNodes.forEach(element => {
                if(element.nodeName != "#text"){
                    element.classList = "";
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
            });
            moveNav(page);
            document.getElementById(page + "-page").classList = 'page';
            void document.getElementById(page + "-page").offsetWidth;
            document.getElementById(page + "-page").style.visibility = 'visible';
            document.getElementById(page + "-page").classList = "page bg-whole fade reverse";
            setTimeout(function(){
                isDisabled = false;
            }, 1000);
        }
    }else{
        window.location = navLinks[page];
    }
}

function moveNav(page){
    if(navActive == null){
        document.documentElement.style.setProperty(`--nav-move`, navSize*(navProjects[page]) + 'px');
    }else{
        document.getElementById(navActive).classList.remove('active');
        let navDiff = navProjects[page] - navProjects[navActive];
        document.documentElement.style.setProperty(`--nav-move`, navSize*(navProjects[page]) + 'px');
    }
    document.getElementById(page).classList.add('active');
    navActive = page;
}

function wheeled(e){
    if(e.deltaY < 0){
        if(navProjects[navActive] - 1 > -1){
            router(projectArray[navProjects[navActive] - 1]);
        }
    }else{
        if(navProjects[navActive] + 1 < 4){
            router(projectArray[navProjects[navActive] + 1]);
        }
    }
}