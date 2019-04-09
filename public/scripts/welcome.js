var loginData = {};

function handleLogin() {
	FB.getLoginStatus(function(response) {
		if(response.status == "connected") {
			
			let fbUserId = response.authResponse.userID;
			let fbToken = response.authResponse.accessToken;
			
			if(fbUserId != undefined && fbToken != undefined) {
				loginData.user = fbUserId;
				loginData.token = fbToken;
			} else {
				$("#loginErrorModal").modal("show");
				return;
			}
			
			$.ajax({
				method: 'post',
				url: '../login',
				data: loginData,
				complete: function(data,status,xhr){
					handleResponse(data, loginHandler);
				}
			});
		}
	});
}

function loginHandler(response) {
	if(response.cmd == "NewUser") {
		let families = response.families;
		for(i in families) {
			let famOption = document.createElement("option");
			famOption.text = families[i].names.join(", ");
			famOption.value = families[i].familyId;
			$("#familySelect").append(famOption);
		}
		$("#newUserModal").modal({backdrop: "static"});
	}
}

function loginNewUserForm() {
    let userData = handleUserForm();
    if (userData)
        loginData.userReg = userData;
    let familyData;
    let familyId = $("#familySelect").val();
    userData.familyId = familyId;
    if (familyId == "NewFamily") {
        familyData = handleFamilyForm();
        loginData.familyReg = familyData;
    }
    if (userData && (familyId != "NewFamily" || familyData))
        handleLogin();
    else {
        alert("Form invalid or some shit");
    }
	
}

$("#familySelect")[0].onchange = function () {
    let el = $("#familySelect")[0];
    if (el.options[el.selectedIndex].value === "NewFamily") {
        $("#familyFormDiv").collapse("show");
    } else {
        $("#familyFormDiv").collapse("hide");
    }
};

//ON PAGE LOAD
updateProgress(0);
addEmergencyContact();
addAdult();
addChild();