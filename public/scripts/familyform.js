function submitFamilyForm() {
	let familyData = handleNewFamilyForm();
	if(familyData) {
		$.ajax({
			method: 'post',
			url: '../submitFamilyForm',
			data: familyData,
			complete: function(response,status,xhr){
				handleResponse(response);
			}
		});
	}
}

function handleFamilyForm() {
	if(typeof document.createElement("input").checkValidity == "function") {
		//HTML5 Form Validation will work!
		if(validateForm(document.getElementById("familyForm"))) {
			let familyData = {};
			let varFields = ["emergencyContacts", "adults", "children", "pets"];
			
			for(i = 0; i < varFields.length; i++) {
				familyData[varFields[i]] = [];
			}
			
			$("#familyForm").find(":input:not([type=button], [type=checkbox], [type=radio]), :checked").each(function(i, el) {
				for(i = 0; i < varFields.length; i++) {
					if(this.name.includes(varFields[i])) {
						let regex = new RegExp("^(" + varFields[i] + ")(.*)(\\d+)$");
						let matches = regex.exec(this.name);
						let field = matches[2];
						let index = parseInt(matches[3]);
						if(!familyData[varFields[i]][index]) {
							familyData[varFields[i]].splice(index, 0, {});
						}
						familyData[varFields[i]][index - 1][field] = this.value;
					} else if(i == varFields.length - 1) {
						familyData[this.name] = this.value;
					}
				}
			});
			return familyData;
		}
	} else {
		alert("Your browser is too old. Whomp whomp.");
	}
}

function makeChildProfileModal() {
	let ct = $("#childProfiles").children().length;
	let modalOptions = {
		id: "childProfileModal" + ct,
		title: "New Child Profile",
		body: $("#childProfileTemplate").html()
	};
	let modalDiv = makeModal(modalOptions);
	return modalDiv;
}

/*******
//New Family Modal Form
*******/

function addNewChildProfile() {
	let modal = makeChildProfileModal();
	$(modal).modal('show');
}

function addEmergencyContact(name, phone) {
	let c1 = {field: "Name", width: 8, value: name};
	let c2 = {field: "Phone", type: "tel", width: 4, pattern: "\\d{3}-?\\d{3}-?\\d{4}", placeholder: "XXX-XXX-XXXX", value: phone};
	addListItem('emergencyContacts', 1, c1, c2);
}

function addAdult(name, relation) {
	let c1 = {field: "Name", width: 8, value: name};
	let c2 = {field: "Relation", width: 4, value: relation, required: false};
	addListItem('houseAdults', 1, c1, c2);
}

function addChild(name, birthdate) {
	let c1 = {field: "Name", width: 8, value: name};
	let c2 = {field: "Birthdate", type: "date", width: 4, value: birthdate};
	addListItem('houseChildren', 1, c1, c2);
}

function addPet(name, type, breed) {
	let c1 = {field: "Name", width: 4, value: name};
	let c2 = {field: "Type", width: 4, value: type};
	let c3 = {field: "Breed", width: 4, value: breed};
	addListItem('housePets', 0, c1, c2, c3);
}