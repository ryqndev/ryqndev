var username = 'Ryabn';

var url = 'https://api.github.com/users/' + username +  '/repos';

var data;

function getGithubUserData(){
    var xhr = new XMLHttpRequest;
    xhr.open('GET', url, true);
    xhr.send();
    
    xhr.onload = function(){
        if(xhr.readyState === xhr.DONE){
            if(xhr.status === 200){
                data = JSON.parse(xhr.responseText);
                createRepoCard();

            }
        } 
    };
}
function createRepoCard(){
    for(let i = 0; i < data.length; i++){
        extractRepoData(i);
    }
}
function openRepoInTab(url) {
    var win = window.open(url, '_blank');
    win.focus();
  }
function extractRepoData(n){
    var projectInfo = {
        'projectID' : 'id' + n,
        'name' : reformatName(data[n]['name']),
        'desc' : data[n]['description'],
        'link' : "openRepoInTab('" + data[n]['svn_url'] + "');",
        'lang' : data[n]['language'],
        'date' : dateFormat(data[n]['created_at']),
        'updated' : dateFormat(data[n]['updated_at']),
        'color': "hsl( " + parseInt(360/data.length) * n + ", 60%, 80%)"
    };
    if(projectInfo.desc == null) {
        projectInfo.desc = "No Description";
    }
    displayRepoData(projectInfo);
}
function reformatName(title){
    title = title.charAt(0).toUpperCase() + title.substring(1);
    for(let i = 1; i < title.length; i++){
        let c = title.charAt(i);
        if(c == '-' || c == '_' || c == '.' ){
            title = title = title.substring(0, i) + " " + title.substring(i + 1);
        }else if( isNaN(c) && c == c.toUpperCase()){
            title = title.substring(0, i) + " " + title.substring(i);
            i++;
        }
    }
    return title;
}

function dateFormat(date){
    var monthNames = ["Jan. ", "Feb. ", "Mar. ", "Apr. ", "May. ", "June. ", "July. ", "Aug. ", "Sept. ", "Oct. ", "Nov. ", "Dec. "];
    
    var year = date.substr(0,4);
    var month = monthNames[parseInt(date.substr(5,2))];
    var day = parseInt(date.substr(8,2));
    
    //super duper sorry non americans that don't use the weird us way of displaying dates. i know we're weird but just like there are 12 inches in a foot, dates are month/day/year
    return month + day + " " + year;
}

function displayRepoData(projectInfo){
    templatingJS('githubProject.html', projectInfo, 'github-repos');
}