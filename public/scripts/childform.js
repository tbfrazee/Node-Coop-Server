function addMedicalCondition() {
	addListItem('medicalConditions', 0,
		{
			field: "Name",
			width: 4
		},
		{
			field: "Description",
			type: "textarea",
			placeholder: "Symptoms, care instructions, etc.",
			width: 8
		}
	);
}

function addMedication() {
	addListItem('medication', 0,
		{
			field: "Name",
			width: 4
		},
		{
			field: "Instr",
			label: "Instructions for Use",
			width: 8,
			placeholder: "When, how, under what circumstances"
		}
	);
}

function addFoodAllergy() {
	addListItem('foodAllergies', 0,
		{
			field: "Name",
			label: "Food Item",
			width: 4
		},
		{
			field: "Instr",
			label: "Instructions if Exposed",
			width: 8
		}
	);
}

function addMedicineAllergy() {
	addListItem('medicineAllergies', 0,
		{
			field: "Name",
			label: "Medicine Name",
			width: 4
		},
		{
			field: "Instr",
			label: "Instructions if Exposed",
			width: 8
		}
	);
}

function addOtherAllergy() {
	addListItem('otherAllergies', 0,
		{
			field: "Name",
			label: "Allergen",
			width: 4
		},
		{
			field: "Instr",
			label: "Instructions if Exposed",
			width: 8
		}
	);
}

function submitChildForm() {
	for(let i = 0; i < 3; i++) {
		if(!validateFormPart(i))
			return false;
	}

	let data = {};
	$("#childForm").find(":input:not([type=button], [type=checkbox], [type=radio]), :checked").each(function(i, el) {
		data[this.name] = this.value;
	});
	$.ajax({
		method: 'post',
		url: '../submitChildForm',
		data: data,
		complete: function(data,status,xhr){
			handleResponse(data, cfHandler);
		}
	});
}

function nextClick() {
	progressNodeClick($("#progress").find("a").eq(progress.active).get(), progress.active);
}

function backClick() {
	progressNodeClick($("#progress").find("a").eq(progress.active - 2).get(), progress.active - 2);
}

function onProgressUpdate(page) {
	let isValid = true;
	if(page == 3) {
		for(let i = 0; i < 3; i++) {
			if(validateFormPart(i)) {
				$("#checkPage" + i).html('<span style="color: green; font-weight: bold;">Page ' + (i + 1) + ' ... Validated.</span>');
			} else {
				$("#checkPage" + i).html('<span style="color: red;">Page ' + (i + 1) + ' ... Error. Please review before submitting.</span>');
				isValid = false;
			}
		}
		if(isValid) {
			$("#submitBtn").removeAttr("disabled");
			$("#validationResult").html("Press submit to continue.");
		} else {
			$("#submitBtn").attr("disabled", true);
			$("#validationResult").html("Please fix red-highlighted fields before continuing.");
		}
	}
}

function validateFormPart(index) {
	if($("#childForm_" + index).length) {
		let form = $("#childForm_" + index)[0];
		return validateForm(form);
	} else {
		return true;
	}
}